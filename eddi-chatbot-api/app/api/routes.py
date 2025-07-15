# app/api/routes.py (update)
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
import httpx
import asyncio

from app.services.chat_service import ChatService
from app.database import get_db, SessionLocal
from sqlalchemy.orm import Session

chat_router = APIRouter(prefix="/chat", tags=["chat"])

# Global chat service for backwards compatibility (in-memory)
chat_service = ChatService()

def get_chat_service(db: Session = Depends(get_db)) -> ChatService:
    """Get ChatService with database session"""
    return ChatService(db=db)

def get_user_id_from_request(request: Request) -> str:
    """Extract user ID from request headers or fallback to anonymous"""
    # Try to get user email from X-User-Email header first
    user_email = request.headers.get("X-User-Email")
    if user_email and user_email != "null" and user_email != "undefined":
        return user_email
    
    # Fallback to query parameter for backwards compatibility
    user_id = request.query_params.get("user_id", "anonymous")
    return user_id


class MessageRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    # user_id will be extracted from request headers automatically


class MessageResponse(BaseModel):
    message: Dict[str, Any]  # Contains role, content
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

@chat_router.post("/new", response_model=MessageResponse)
async def new_conversation(request: MessageRequest, http_request: Request, service: ChatService = Depends(get_chat_service)):
    user_id = get_user_id_from_request(http_request)
    response = await service.process_message(message=request.message, user_id=user_id, conversation_id=request.conversation_id)
    return {"message": {"role": "assistant", "content": response["response"], "buttons": response.get("buttons", [])}, "conversation_id": response["conversation_id"]}


@chat_router.post("/send", response_model=MessageResponse)
async def send_message(request: MessageRequest, http_request: Request, service: ChatService = Depends(get_chat_service)):
    try:
        user_id = get_user_id_from_request(http_request)
        response = await service.process_message(message=request.message, user_id=user_id, conversation_id=request.conversation_id)

        # Format the response to match what the frontend expects
        print("-----> RESPONSE", response)
        return {
            "message": {"role": "assistant", "content": response["response"], "buttons": response.get("buttons", []), "custom": response.get("custom", {})},
            "conversation_id": response["conversation_id"],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@chat_router.get("/conversations/{conversation_id}", response_model=ChatHistory)
async def get_conversation(conversation_id: str, service: ChatService = Depends(get_chat_service)):
    try:
        history = service.get_conversation_history(conversation_id)
        return ChatHistory(conversation_id=conversation_id, messages=history)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@chat_router.get("/conversations", response_model=List[Dict[str, Any]])
async def get_conversations(http_request: Request, service: ChatService = Depends(get_chat_service)):
    """Get conversations for a user. Falls back to in-memory if database not available."""
    user_id = get_user_id_from_request(http_request)
    
    try:
        # Try to get user conversations from database
        conversations = service.get_user_conversations(user_id)
        if conversations:
            return conversations
    except Exception as e:
        print(f"Database error, falling back to in-memory: {e}")
    
    # Fall back to in-memory storage for backwards compatibility
    conversations = []
    for conv_id, messages in chat_service.conversations.items():
        if messages:
            # Filter by user_id if available in message data
            user_messages = [msg for msg in messages if msg.get("user_id") == user_id]
            if not user_messages and user_id != "anonymous":
                continue  # Skip conversations that don't belong to this user
                
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
async def delete_conversation(conversation_id: str, service: ChatService = Depends(get_chat_service)):
    try:
        # Try to delete from database first
        if service.db and service.conversation_repo:
            success = service.conversation_repo.delete_conversation(conversation_id)
            if success:
                return {"status": "success", "message": f"Conversation {conversation_id} deleted"}
        
        # Fall back to in-memory deletion
        if conversation_id in chat_service.conversations:
            del chat_service.conversations[conversation_id]
            return {"status": "success", "message": f"Conversation {conversation_id} deleted"}
        else:
            raise HTTPException(status_code=404, detail=f"Conversation {conversation_id} not found")
    except HTTPException as e:
        raise e  # Re-raise HTTP exceptions
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# New endpoints for user-specific conversation management
@chat_router.get("/users/{user_id}/conversations", response_model=List[Dict[str, Any]])
async def get_user_conversations(user_id: str, limit: int = 20, offset: int = 0, service: ChatService = Depends(get_chat_service)):
    """Get conversations for a specific user"""
    try:
        conversations = service.get_user_conversations(user_id, limit=limit, offset=offset)
        return conversations
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# New conversation management endpoints
@chat_router.post("/conversations", response_model=Dict[str, Any])
async def create_conversation(request: CreateConversationRequest, http_request: Request, service: ChatService = Depends(get_chat_service)):
    """Create a new conversation for the authenticated user"""
    user_id = get_user_id_from_request(http_request)
    try:
        conversation = service.create_conversation_for_user(user_id, request.title, request.topic)
        return conversation
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@chat_router.put("/conversations/{conversation_id}", response_model=Dict[str, Any])
async def update_conversation(conversation_id: str, request: UpdateConversationRequest, http_request: Request, service: ChatService = Depends(get_chat_service)):
    """Update conversation metadata"""
    user_id = get_user_id_from_request(http_request)
    try:
        if not service.db or not service.conversation_repo:
            raise HTTPException(status_code=501, detail="Database not available for conversation updates")
        
        # Verify conversation belongs to user
        conversation = service.conversation_repo.get_conversation_by_id(conversation_id)
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        # Get user to verify ownership
        user = service.user_repo.get_user_by_email(user_id)
        if not user or conversation.user_id != user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Update conversation
        updates = {}
        if request.title is not None:
            updates["title"] = request.title
        if request.description is not None:
            updates["description"] = request.description
        
        updated_conversation = service.conversation_repo.update_conversation(conversation_id, **updates)
        return updated_conversation.to_dict() if updated_conversation else {}
        
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@chat_router.post("/users/{user_id}/conversations")
async def create_user_conversation(user_id: str, title: str, topic: Optional[str] = None, service: ChatService = Depends(get_chat_service)):
    """Create a new conversation for a user (legacy endpoint)"""
    try:
        conversation = service.create_conversation_for_user(user_id, title, topic)
        return conversation
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@chat_router.get("/health")
async def health_check():
    """Check system health including Rasa connectivity"""
    health_status = {
        "api": "healthy",
        "timestamp": int(asyncio.get_event_loop().time()),
        "services": {}
    }
    
    # Check Rasa NLU service
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            # Try to reach Rasa health endpoint
            rasa_url = "http://thanos-chatbot-nlu:5005"
            response = await client.get(f"{rasa_url}/")
            
            if response.status_code == 200:
                health_status["services"]["rasa"] = {
                    "status": "healthy",
                    "url": rasa_url,
                    "response_time_ms": response.elapsed.total_seconds() * 1000
                }
            else:
                health_status["services"]["rasa"] = {
                    "status": "unhealthy",
                    "url": rasa_url,
                    "error": f"HTTP {response.status_code}"
                }
    except httpx.TimeoutException:
        health_status["services"]["rasa"] = {
            "status": "unhealthy",
            "url": "http://thanos-chatbot-nlu:5005",
            "error": "Connection timeout"
        }
    except httpx.ConnectError:
        health_status["services"]["rasa"] = {
            "status": "unhealthy", 
            "url": "http://thanos-chatbot-nlu:5005",
            "error": "Connection refused"
        }
    except Exception as e:
        health_status["services"]["rasa"] = {
            "status": "unhealthy",
            "url": "http://thanos-chatbot-nlu:5005", 
            "error": str(e)
        }
    
    # Check database connectivity (if available)
    try:
        with SessionLocal() as db:
            # Simple query to check DB
            from sqlalchemy import text
            db.execute(text("SELECT 1"))
            health_status["services"]["database"] = {
                "status": "healthy",
                "type": "postgresql"
            }
    except Exception as e:
        health_status["services"]["database"] = {
            "status": "unhealthy",
            "type": "postgresql",
            "error": str(e)
        }
    
    # Overall status
    all_healthy = all(
        service.get("status") == "healthy" 
        for service in health_status["services"].values()
    )
    health_status["status"] = "healthy" if all_healthy else "degraded"
    
    return health_status
