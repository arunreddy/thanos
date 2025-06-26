import os
from contextlib import asynccontextmanager

from app.api.routes import chat_router, chat_service
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await chat_service.close()


app = FastAPI(title="Chatbot API", lifespan=lifespan)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:43000", "http://localhost:5174"],  # NextJS frontend URL
    allow_credentials=True,
    allow_methods=["OPTIONS", "GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)


@app.get("/download/{file_name}")
async def download_file(file_name: str):
    print("-----> DOWNLOAD FILE", file_name)
    file_path = f"/tmp/downloads/{file_name}"
    # check if file exists, if not return 404 error.
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    # Get file extension
    _, ext = os.path.splitext(file_name)
    ext = ext.lower()
    # Map common extensions to media types
    media_types = {
        ".pdf": "application/pdf",
        ".txt": "text/plain",
        ".csv": "text/csv",
        ".json": "application/json",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".zip": "application/zip",
        ".doc": "application/msword",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".xls": "application/vnd.ms-excel",
        ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }
    media_type = media_types.get(ext, "application/octet-stream")

    return FileResponse(
        path=file_path,
        filename=file_name,
        media_type=media_type,
    )


# Include routers
app.include_router(chat_router, prefix="/api")

# if __name__ == "__main__":
#     import uvicorn

#     uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
