from typing import Any, Dict, List, Literal, Optional

from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
import asyncio

from app.services.chat_service import ChatService
from app.database import get_db, SessionLocal
from sqlalchemy.orm import Session

chat_router = APIRouter(prefix="/chat", tags=["chat"])


def get_chat_service(db: Session = Depends(get_db)) -> ChatService:
    return ChatService(db=db)


def get_user_id_from_request(request: Request) -> str:
    user_email = request.headers.get("X-User-Email")
    if user_email and user_email != "null" and user_email != "undefined":
        return user_email
    return request.query_params.get("user_id", "anonymous")


def extract_auth_headers(request: Request) -> Dict[str, Any]:
    allowed_headers = [
        "X-User-Email",
        "X-User-Id",
        "X-Source-Id",
        "X-Jwt-Token",
        "X-User-Role",
    ]
    return {
        name: request.headers.get(name)
        for name in allowed_headers
        if request.headers.get(name)
    }


class MessageRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None


class MessageResponse(BaseModel):
    message: Dict[str, Any]
    conversation_id: str


class ChatHistory(BaseModel):
    conversation_id: str
    messages: List[Dict[str, Any]]


class CreateConversationRequest(BaseModel):
    title: str
    topic: Optional[str] = None


class UpdateConversationRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None


class FeedbackRequest(BaseModel):
    feedback_type: Literal["positive", "negative"]
    category: Optional[str] = None
    comment: Optional[str] = None


@chat_router.post("/new", response_model=MessageResponse)
async def new_conversation(
    request: MessageRequest,
    http_request: Request,
    service: ChatService = Depends(get_chat_service),
):
    user_id = get_user_id_from_request(http_request)
    auth_headers = extract_auth_headers(http_request)
    response = await service.process_message(
        message=request.message,
        user_id=user_id,
        conversation_id=request.conversation_id,
        auth_headers=auth_headers,
    )
    return {
        "message": {
            "id": response.get("message_id"),
            "role": "assistant",
            "content": response["response"],
            "buttons": response.get("buttons", []),
            "custom": response.get("custom", {}),
        },
        "conversation_id": response["conversation_id"],
    }


@chat_router.post("/send", response_model=MessageResponse)
async def send_message(
    request: MessageRequest,
    http_request: Request,
    service: ChatService = Depends(get_chat_service),
):
    try:
        user_id = get_user_id_from_request(http_request)
        auth_headers = extract_auth_headers(http_request)

        response = await service.process_message(
            message=request.message,
            user_id=user_id,
            conversation_id=request.conversation_id,
            auth_headers=auth_headers,
        )

        return {
            "message": {
                "id": response.get("message_id"),
                "role": "assistant",
                "content": response["response"],
                "buttons": response.get("buttons", []),
                "custom": response.get("custom", {}),
            },
            "conversation_id": response["conversation_id"],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@chat_router.get("/conversations/{conversation_id}", response_model=ChatHistory)
async def get_conversation(
    conversation_id: str,
    service: ChatService = Depends(get_chat_service),
):
    try:
        history = service.get_conversation_history(conversation_id)
        return ChatHistory(conversation_id=conversation_id, messages=history)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@chat_router.get("/conversations", response_model=List[Dict[str, Any]])
async def get_conversations(
    http_request: Request,
    service: ChatService = Depends(get_chat_service),
):
    user_id = get_user_id_from_request(http_request)
    return service.get_user_conversations(user_id)


@chat_router.delete("/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    service: ChatService = Depends(get_chat_service),
):
    try:
        success = service.conversation_repo.delete_conversation(conversation_id)
        if success:
            return {"status": "success", "message": f"Conversation {conversation_id} deleted"}
        raise HTTPException(status_code=404, detail=f"Conversation {conversation_id} not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@chat_router.post("/conversations", response_model=Dict[str, Any])
async def create_conversation(
    request: CreateConversationRequest,
    http_request: Request,
    service: ChatService = Depends(get_chat_service),
):
    user_id = get_user_id_from_request(http_request)
    try:
        return service.create_conversation_for_user(user_id, request.title, request.topic)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@chat_router.put("/conversations/{conversation_id}", response_model=Dict[str, Any])
async def update_conversation(
    conversation_id: str,
    request: UpdateConversationRequest,
    http_request: Request,
    service: ChatService = Depends(get_chat_service),
):
    user_id = get_user_id_from_request(http_request)
    try:
        conversation = service.conversation_repo.get_conversation_by_id(conversation_id)
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")

        user = service.user_repo.get_user_by_email(user_id)
        if not user or conversation.user_id != user.id:
            raise HTTPException(status_code=403, detail="Access denied")

        updates = {}
        if request.title is not None:
            updates["title"] = request.title
        if request.description is not None:
            updates["description"] = request.description

        updated = service.conversation_repo.update_conversation(conversation_id, **updates)
        return updated.to_dict() if updated else {}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@chat_router.post("/messages/{message_id}/feedback")
async def submit_feedback(
    message_id: str,
    request: FeedbackRequest,
    http_request: Request,
    service: ChatService = Depends(get_chat_service),
):
    user_id = get_user_id_from_request(http_request)
    try:
        feedback = service.submit_feedback(
            message_id=message_id,
            user_id=user_id,
            feedback_type=request.feedback_type,
            category=request.category,
            comment=request.comment,
        )
        return feedback
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@chat_router.delete("/messages/{message_id}/feedback")
async def delete_feedback(
    message_id: str,
    http_request: Request,
    service: ChatService = Depends(get_chat_service),
):
    user_id = get_user_id_from_request(http_request)
    try:
        success = service.delete_feedback(message_id=message_id, user_id=user_id)
        if success:
            return {"status": "success"}
        raise HTTPException(status_code=404, detail="Feedback not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@chat_router.get("/health")
async def health_check():
    """Check system health including database and LLM connectivity"""
    health_status = {
        "api": "healthy",
        "services": {},
    }

    # Check database
    try:
        from sqlalchemy import text
        with SessionLocal() as db:
            db.execute(text("SELECT 1"))
            health_status["services"]["database"] = {
                "status": "healthy",
                "type": "postgresql",
            }
    except Exception as e:
        health_status["services"]["database"] = {
            "status": "unhealthy",
            "type": "postgresql",
            "error": str(e),
        }

    # LLM status (mock for now)
    health_status["services"]["llm"] = {
        "status": "healthy",
        "type": "mock",
    }

    all_healthy = all(
        svc.get("status") == "healthy"
        for svc in health_status["services"].values()
    )
    health_status["status"] = "healthy" if all_healthy else "degraded"

    return health_status
