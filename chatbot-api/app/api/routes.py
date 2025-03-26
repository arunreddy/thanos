from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.chat_service import ChatService

chat_router = APIRouter()
chat_service = ChatService()


class MessageRequest(BaseModel):
    message: str
    user_id: str = "anonymous"
    conversation_id: Optional[str] = None


class MessageResponse(BaseModel):
    response: str
    conversation_id: str


class ChatHistory(BaseModel):
    conversation_id: str
    messages: List[dict]


@chat_router.post("/chat", response_model=MessageResponse)
async def send_message(request: MessageRequest):
    try:
        response = await chat_service.process_message(message=request.message, user_id=request.user_id, conversation_id=request.conversation_id)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@chat_router.get("/history/{conversation_id}", response_model=ChatHistory)
async def get_chat_history(conversation_id: str):
    try:
        history = chat_service.get_conversation_history(conversation_id)
        return ChatHistory(conversation_id=conversation_id, messages=history)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))
