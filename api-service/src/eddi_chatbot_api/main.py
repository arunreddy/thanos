import json
import logging
from typing import Dict, List

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Database Observability Chatbot API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development - restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Active WebSocket connections
active_connections: Dict[str, WebSocket] = {}


@app.get("/")
async def root():
    """Health check endpoint."""
    return {"status": "online", "service": "api-gateway"}


@app.get("/status")
async def status():
    """Detailed service status."""
    return {
        "status": "operational",
        "connections": {
            "websocket": len(active_connections),
        },
    }


@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    """WebSocket endpoint for real-time chat."""
    await websocket.accept()
    active_connections[client_id] = websocket

    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            message = json.loads(data)
            logger.info(f"Received message from {client_id}: {message}")

            # Simple echo response for now
            # In a complete implementation, we would:
            # 1. Send the message to NLU service
            # 2. Get intent and entities
            # 3. Invoke task processor if needed
            # 4. Send response back

            response = {"type": "response", "text": f"Echo: {message.get('text', '')}", "timestamp": message.get("timestamp")}

            await websocket.send_json(response)

    except WebSocketDisconnect:
        logger.info(f"Client {client_id} disconnected")
    except Exception as e:
        logger.error(f"Error in WebSocket connection: {e}")
    finally:
        if client_id in active_connections:
            del active_connections[client_id]


@app.post("/api/message")
async def process_message(message: dict):
    """HTTP endpoint for processing messages."""
    # Simple echo response for now
    return {"type": "response", "text": f"Echo: {message.get('text', '')}", "timestamp": message.get("timestamp")}


# Include routers when we add them
# app.include_router(chat_router, prefix="/api/chat", tags=["chat"])
# app.include_router(tasks_router, prefix="/api/tasks", tags=["tasks"])

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
