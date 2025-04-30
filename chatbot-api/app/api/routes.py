# app/api/routes.py (update)
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.chat_service import ChatService

chat_router = APIRouter(prefix="/chat", tags=["chat"])
chat_service = ChatService()


class MessageRequest(BaseModel):
    message: str
    user_id: str = "anonymous"
    conversation_id: Optional[str] = None


class MessageResponse(BaseModel):
    message: Dict[str, Any]  # Contains role, content
    conversation_id: str


class ChatHistory(BaseModel):
    conversation_id: str
    messages: List[Dict[str, Any]]


@chat_router.post("/new", response_model=MessageResponse)
async def new_conversation(request: MessageRequest):
    response = await chat_service.process_message(message=request.message, user_id=request.user_id, conversation_id=request.conversation_id)
    return {"message": {"role": "assistant", "content": response["response"], "buttons": response.get("buttons", [])}, "conversation_id": response["conversation_id"]}


@chat_router.post("/{conversation_id}", response_model=MessageResponse)
async def send_message(request: MessageRequest, conversation_id: str):
    try:
        response = await chat_service.process_message(message=request.message, user_id=request.user_id, conversation_id=conversation_id)

        # Format the response to match what the frontend expects
        return {"message": {"role": "assistant", "content": response["response"], "buttons": response.get("buttons", [])}, "conversation_id": response["conversation_id"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@chat_router.get("/conversations/{conversation_id}", response_model=ChatHistory)
async def get_conversation(conversation_id: str):
    try:
        history = chat_service.get_conversation_history(conversation_id)
        return ChatHistory(conversation_id=conversation_id, messages=history)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@chat_router.get("/conversations", response_model=List[Dict[str, Any]])
async def get_conversations():
    # Get a list of all conversations with basic metadata
    conversations = []
    for conv_id, messages in chat_service.conversations.items():
        if messages:
            # Get the first user message as the title, fallback to "New Conversation"
            title = "New Conversation"
            for msg in messages:
                if msg["role"] == "user":
                    title = msg["content"][:30] + ("..." if len(msg["content"]) > 30 else "")
                    break

            # Get the latest timestamp
            latest_ts = messages[-1]["timestamp"] if messages else None

            conversations.append({"id": conv_id, "title": title, "updated_at": latest_ts})

    # Sort by most recent first
    conversations.sort(key=lambda x: x["updated_at"] if x["updated_at"] else "", reverse=True)
    return conversations


@chat_router.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str):
    try:
        if conversation_id in chat_service.conversations:
            del chat_service.conversations[conversation_id]
            return {"status": "success", "message": f"Conversation {conversation_id} deleted"}
        else:
            raise HTTPException(status_code=404, detail=f"Conversation {conversation_id} not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
