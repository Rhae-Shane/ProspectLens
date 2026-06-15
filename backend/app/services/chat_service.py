import uuid
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.cache.context_cache import context_cache
from app.models import ChatMessage, WorkflowStatus
from app.services.chat_agent import run_chat_agent
from app.services.chat_tools import ChatToolContext, normalize_tool_ids
from app.services.session_service import SessionService

CHAT_SYSTEM = """You are a sales research assistant helping prepare for a business meeting.

You have tools to answer follow-up questions. Use them strategically:

1. **search_report** — Check the briefing first when the answer may already exist.
2. **company_enrichment** — For revenue, employees, funding, HQ, tech stack (prefer over generic web search).
3. **recent_news** — For what happened lately, announcements, or news since the report.
4. **web_search** — For current facts missing from the report and enrichment.
5. **deep_research** — For complex multi-part research questions needing synthesis.
6. **scrape_website** — To read a specific page (pricing, careers, docs); default to company website if no URL given.

Guidelines:
- Prefer the report and report-native tools before paid external lookups when possible.
- For revenue/headcount/funding questions, try search_report then company_enrichment, then web_search.
- Synthesize tool results into concise, actionable answers for sales meeting prep.
- Cite sources when using external tools."""


class ChatService:
    @staticmethod
    async def get_history(db: AsyncSession, session_id: UUID) -> list[ChatMessage]:
        result = await db.execute(
            select(ChatMessage)
            .where(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.created_at)
        )
        return list(result.scalars().all())

    @staticmethod
    async def send_message(
        db: AsyncSession,
        session_id: UUID,
        message: str,
        tools: list[str] | None = None,
    ) -> ChatMessage:
        session = await SessionService.get(db, session_id)
        if not session:
            raise ValueError("Session not found")
        if session.status != WorkflowStatus.COMPLETED:
            raise ValueError("Report must be completed before chatting")

        report_context = await context_cache.get_report_context(str(session_id))
        if not report_context and session.report:
            from app.services.workflow_service import WorkflowService

            report_context = WorkflowService._build_report_context(session.report.content)
            await context_cache.set_report_context(str(session_id), report_context)

        history = await ChatService.get_history(db, session_id)
        history_text = "\n".join(f"{m.role}: {m.content}" for m in history[-6:])
        report_context = report_context or ""
        report_content = session.report.content if session.report else {}
        company_context = f"Company: {session.company_name}\nWebsite: {session.website}"
        enabled_tools = normalize_tool_ids(tools)
        tool_context = ChatToolContext(
            company_name=session.company_name,
            website=session.website,
            company_context=company_context,
            report_context=report_context,
            report_content=report_content,
        )

        user_prompt = f"""Research Report Context:
{report_context}

Company Context:
{company_context}

Conversation History:
{history_text}

User Question: {message}"""

        response_text, tools_used, tokens, cost = await run_chat_agent(
            system_prompt=CHAT_SYSTEM,
            user_prompt=user_prompt,
            tool_context=tool_context,
            user_enabled_tools=enabled_tools,
            allow_auto_tools=True,
        )

        user_metadata: dict = {}
        if enabled_tools:
            user_metadata["tools"] = sorted(enabled_tools)

        assistant_metadata: dict = {}
        if tools_used:
            assistant_metadata["tools_used"] = tools_used

        user_msg = ChatMessage(
            id=uuid.uuid4(),
            session_id=session_id,
            role="user",
            content=message,
            tokens=0,
            metadata=user_metadata,
        )
        assistant_msg = ChatMessage(
            id=uuid.uuid4(),
            session_id=session_id,
            role="assistant",
            content=response_text,
            tokens=tokens,
            metadata=assistant_metadata,
        )
        db.add(user_msg)
        db.add(assistant_msg)

        session.total_tokens += tokens
        session.total_cost_usd += cost

        await db.flush()
        return assistant_msg
