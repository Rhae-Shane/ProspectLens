from fastapi import APIRouter

from app.services.chat_tools import get_chat_tools

router = APIRouter(prefix="/chat", tags=["chat"])


@router.get("/tools")
async def list_chat_tools():
    return get_chat_tools()
