from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services.usage_service import UsageService

router = APIRouter(prefix="/usage", tags=["usage"])


@router.get("/api-keys")
async def get_api_key_usage(db: AsyncSession = Depends(get_db)):
    return await UsageService.get_api_key_usage(db)
