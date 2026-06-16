"""Semantic RAG over completed research reports using pgvector."""

from __future__ import annotations

import uuid
from typing import Any
from uuid import UUID

from langchain_openai import OpenAIEmbeddings
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.logging_config import get_logger
from app.models import ReportRagChunk

logger = get_logger(__name__)
settings = get_settings()

EMBEDDING_MODEL = settings.openai_embedding_model
DEFAULT_TOP_K = 8
CHUNK_MAX_CHARS = 1200
MAX_DISTANCE = 0.75  # cosine distance; lower = more similar


def _cosine_distance(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b, strict=True))
    norm_a = sum(x * x for x in a) ** 0.5
    norm_b = sum(y * y for y in b) ** 0.5
    if norm_a == 0 or norm_b == 0:
        return 1.0
    similarity = dot / (norm_a * norm_b)
    return 1.0 - similarity


def _truncate(text: str, limit: int = CHUNK_MAX_CHARS) -> str:
    text = text.strip()
    if len(text) <= limit:
        return text
    return text[: limit - 3].rstrip() + "..."


def _add_chunk(
    chunks: list[dict[str, str]],
    *,
    section: str,
    title: str,
    text: str,
) -> None:
    cleaned = _truncate(text)
    if len(cleaned) < 40:
        return
    chunks.append({"section": section, "title": title, "text": cleaned})


def _format_list_items(items: list[Any], *, label_key: str = "title", body_key: str = "description") -> str:
    lines: list[str] = []
    for item in items:
        if isinstance(item, str):
            lines.append(f"- {item}")
        elif isinstance(item, dict):
            label = str(item.get(label_key) or item.get("name") or item.get("question") or item.get("signal") or "")
            body = str(
                item.get(body_key)
                or item.get("detail")
                or item.get("description")
                or item.get("evidence")
                or item.get("rationale")
                or ""
            )
            if label and body:
                lines.append(f"- {label}: {body}")
            elif label:
                lines.append(f"- {label}")
    return "\n".join(lines)


def build_report_chunks(report_content: dict[str, Any]) -> list[dict[str, str]]:
    """Turn a saved report into RAG-ready text chunks."""
    chunks: list[dict[str, str]] = []
    structured = report_content.get("structured") or {}

    snap = structured.get("company_snapshot") or {}
    if snap:
        snap_text = "\n".join(
            f"{key.replace('_', ' ').title()}: {value}"
            for key, value in snap.items()
            if value and str(value).strip() and str(value) != "Not confirmed"
        )
        _add_chunk(chunks, section="company_snapshot", title="Company Snapshot", text=snap_text)

    overview = structured.get("company_overview") or {}
    if overview.get("description"):
        _add_chunk(chunks, section="company_overview", title="Company Overview", text=str(overview["description"]))
    metrics = overview.get("key_metrics") or []
    if metrics:
        metric_text = "\n".join(
            f"{m.get('label', 'Metric')}: {m.get('value', '')} {m.get('change', '')}".strip()
            for m in metrics
            if isinstance(m, dict)
        )
        _add_chunk(chunks, section="company_overview", title="Key Metrics", text=metric_text)
    news = overview.get("recent_news") or []
    if news:
        _add_chunk(
            chunks,
            section="company_overview",
            title="Recent News",
            text=_format_list_items(news, label_key="title", body_key="source"),
        )

    products = structured.get("products_services") or {}
    if products.get("portfolio_summary") or products.get("summary"):
        _add_chunk(
            chunks,
            section="products_services",
            title="Product Portfolio",
            text=str(products.get("portfolio_summary") or products.get("summary")),
        )
    core = products.get("core_products") or structured.get("products") or []
    if core:
        _add_chunk(
            chunks,
            section="products_services",
            title="Core Products",
            text=_format_list_items(core, label_key="name", body_key="description"),
        )

    tc = structured.get("target_customers_overview") or {}
    segments = tc.get("segments") or structured.get("target_customers") or []
    if segments:
        _add_chunk(
            chunks,
            section="target_customers",
            title="Target Customers",
            text=_format_list_items(segments, label_key="name", body_key="description"),
        )
    industries = tc.get("industry_distribution") or []
    if industries:
        ind_text = "\n".join(
            f"- {i.get('name', 'Industry')}: {i.get('percent', i.get('count', ''))}%"
            for i in industries
            if isinstance(i, dict)
        )
        _add_chunk(chunks, section="target_customers", title="Industry Distribution", text=ind_text)

    stakeholders = structured.get("stakeholders_overview") or {}
    execs = stakeholders.get("executives") or structured.get("stakeholders") or []
    if execs:
        _add_chunk(
            chunks,
            section="stakeholders",
            title="Key Stakeholders",
            text=_format_list_items(execs, label_key="name", body_key="title"),
        )

    signals = structured.get("business_signals") or {}
    key_signals = signals.get("key_signals") or structured.get("signals") or []
    if key_signals:
        _add_chunk(
            chunks,
            section="business_signals",
            title="Business Signals",
            text=_format_list_items(key_signals, label_key="title", body_key="description"),
        )

    risks = structured.get("risks_challenges") or {}
    top_risks = risks.get("top_risks") or structured.get("risks") or []
    if top_risks:
        _add_chunk(
            chunks,
            section="risks_challenges",
            title="Risks & Challenges",
            text=_format_list_items(top_risks, label_key="title", body_key="description"),
        )

    discovery = structured.get("discovery_questions_overview") or {}
    questions = discovery.get("questions") or structured.get("discovery_questions") or []
    if questions:
        _add_chunk(
            chunks,
            section="discovery_questions",
            title="Discovery Questions",
            text=_format_list_items(questions, label_key="question", body_key="rationale"),
        )

    outreach = structured.get("outreach_overview") or {}
    strategies = outreach.get("strategies") or []
    if strategies:
        _add_chunk(
            chunks,
            section="outreach_strategy",
            title="Outreach Strategies",
            text=_format_list_items(strategies, label_key="name", body_key="description"),
        )

    unknowns = structured.get("unknowns_overview") or {}
    unknown_items = unknowns.get("unknown_items") or structured.get("unknowns") or []
    if unknown_items:
        if isinstance(unknown_items[0], str):
            _add_chunk(
                chunks,
                section="unknowns",
                title="Unknowns",
                text="\n".join(f"- {u}" for u in unknown_items[:20]),
            )
        else:
            _add_chunk(
                chunks,
                section="unknowns",
                title="Unknowns",
                text=_format_list_items(unknown_items, label_key="unknown", body_key="why_it_matters"),
            )

    sources = structured.get("sources_overview") or {}
    source_list = sources.get("sources") or structured.get("sources") or []
    if source_list:
        src_text = "\n".join(
            f"- {s.get('title', 'Source')}: {s.get('url', '')}"
            for s in source_list[:15]
            if isinstance(s, dict)
        )
        _add_chunk(chunks, section="sources", title="Sources", text=src_text)

    legacy_sections = [
        ("company_overview", "Company Overview"),
        ("products_services", "Products & Services"),
        ("target_customers", "Target Customers"),
        ("business_signals", "Business Signals"),
        ("risks_challenges", "Risks & Challenges"),
        ("outreach_strategy", "Outreach Strategy"),
    ]
    covered = {c["section"] for c in chunks}
    for key, title in legacy_sections:
        if key in covered:
            continue
        val = report_content.get(key)
        if isinstance(val, str) and val.strip():
            _add_chunk(chunks, section=key, title=title, text=val)

    return chunks


def format_rag_context(chunks: list[dict[str, Any]]) -> str:
    if not chunks:
        return "No relevant report excerpts found."
    parts = []
    for index, chunk in enumerate(chunks, start=1):
        title = chunk.get("title", "Section")
        section = chunk.get("section", "")
        text = chunk.get("text", "")
        score = chunk.get("score")
        header = f"[{index}] {title}"
        if section:
            header += f" ({section})"
        if score is not None:
            header += f" — relevance {score:.2f}"
        parts.append(f"{header}\n{text}")
    return "\n\n".join(parts)


class ReportRAG:
    def __init__(self) -> None:
        self._embeddings = OpenAIEmbeddings(
            model=EMBEDDING_MODEL,
            api_key=settings.openai_api_key or "sk-placeholder",
        )

    async def index_report(
        self,
        session_id: str,
        report_content: dict[str, Any],
        db: AsyncSession,
    ) -> int:
        chunks = build_report_chunks(report_content)
        if not chunks:
            logger.warning("rag_index_empty", session_id=session_id)
            return 0

        session_uuid = UUID(session_id)
        await db.execute(delete(ReportRagChunk).where(ReportRagChunk.session_id == session_uuid))

        texts = [f"{c['title']}\n{c['text']}" for c in chunks]
        vectors = await self._embeddings.aembed_documents(texts)

        for index, (chunk, vector) in enumerate(zip(chunks, vectors, strict=True)):
            db.add(
                ReportRagChunk(
                    id=uuid.uuid4(),
                    session_id=session_uuid,
                    chunk_index=index,
                    section=chunk.get("section", ""),
                    title=chunk.get("title", ""),
                    text=chunk.get("text", ""),
                    embedding=vector,
                )
            )

        await db.flush()
        logger.info("rag_indexed_pgvector", session_id=session_id, chunks=len(chunks))
        return len(chunks)

    async def chunk_count(self, session_id: str, db: AsyncSession) -> int:
        from sqlalchemy import func as sa_func

        result = await db.execute(
            select(sa_func.count())
            .select_from(ReportRagChunk)
            .where(ReportRagChunk.session_id == UUID(session_id))
        )
        return int(result.scalar() or 0)

    async def ensure_indexed(
        self,
        session_id: str,
        report_content: dict[str, Any],
        db: AsyncSession,
    ) -> int:
        count = await self.chunk_count(session_id, db)
        if count > 0:
            return count
        return await self.index_report(session_id, report_content, db)

    async def retrieve(
        self,
        session_id: str,
        query: str,
        db: AsyncSession,
        *,
        top_k: int = DEFAULT_TOP_K,
    ) -> list[dict[str, Any]]:
        query_vec = await self._embeddings.aembed_query(query)
        session_uuid = UUID(session_id)

        stmt = (
            select(ReportRagChunk)
            .where(ReportRagChunk.session_id == session_uuid)
            .order_by(ReportRagChunk.embedding.cosine_distance(query_vec))
            .limit(top_k)
        )
        result = await db.execute(stmt)
        rows = result.scalars().all()

        chunks: list[dict[str, Any]] = []
        for row in rows:
            distance = _cosine_distance(query_vec, list(row.embedding))
            if distance > MAX_DISTANCE:
                continue
            similarity = round(1.0 - distance, 3)
            chunks.append(
                {
                    "section": row.section,
                    "title": row.title,
                    "text": row.text,
                    "score": similarity,
                }
            )
        return chunks

    async def search(
        self,
        session_id: str,
        query: str,
        report_content: dict[str, Any],
        db: AsyncSession,
        *,
        top_k: int = DEFAULT_TOP_K,
    ) -> tuple[str, list[dict[str, Any]]]:
        await self.ensure_indexed(session_id, report_content, db)
        chunks = await self.retrieve(session_id, query, db, top_k=top_k)
        return format_rag_context(chunks), chunks


report_rag = ReportRAG()
