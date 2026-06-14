import uuid
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.cache.context_cache import context_cache
from app.models import ChatMessage, ResearchSession, WorkflowStatus
from app.providers import openai_client
from app.services.session_service import SessionService

CHAT_SYSTEM = """You are a sales research assistant helping prepare for a business meeting.
Answer questions based ONLY on the research report provided. Be concise and actionable.
If information is not in the report, say so and suggest what to ask in the meeting."""


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
    async def send_message(db: AsyncSession, session_id: UUID, message: str) -> ChatMessage:
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

        user_prompt = f"""Research Report Context:
{report_context}

Conversation History:
{history_text}

User Question: {message}"""

        response_text, tokens, cost = await openai_client.complete_text(CHAT_SYSTEM, user_prompt)

        user_msg = ChatMessage(
            id=uuid.uuid4(),
            session_id=session_id,
            role="user",
            content=message,
            tokens=0,
        )
        assistant_msg = ChatMessage(
            id=uuid.uuid4(),
            session_id=session_id,
            role="assistant",
            content=response_text,
            tokens=tokens,
        )
        db.add(user_msg)
        db.add(assistant_msg)

        session.total_tokens += tokens
        session.total_cost_usd += cost

        await db.flush()
        return assistant_msg
