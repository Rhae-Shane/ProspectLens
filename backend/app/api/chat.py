from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas import ChatMessageCreate, ChatMessageResponse
from app.services.chat_service import ChatService
from app.services.session_service import SessionService

router = APIRouter(prefix="/sessions", tags=["chat"])


@router.get("/{session_id}/chat", response_model=list[ChatMessageResponse])
async def get_chat_history(session_id: UUID, db: AsyncSession = Depends(get_db)):
    session = await SessionService.get(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    messages = await ChatService.get_history(db, session_id)
    return [ChatMessageResponse.model_validate(m) for m in messages]


@router.post("/{session_id}/chat", response_model=ChatMessageResponse)
async def send_chat_message(
    session_id: UUID,
    data: ChatMessageCreate,
    db: AsyncSession = Depends(get_db),
):
    try:
        message = await ChatService.send_message(db, session_id, data.message, data.tools)
        return ChatMessageResponse.model_validate(message)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
