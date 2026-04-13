import os
import secrets
import hashlib
import base64

from dotenv import load_dotenv
load_dotenv()

from contextlib import asynccontextmanager
from urllib.parse import urlencode

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, JSONResponse, FileResponse
from starlette.middleware.sessions import SessionMiddleware

import httpx

from app.api.routes import chat_router
from app.api.provision_routes import provision_router
from app.worker import task_app

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create database tables if they don't exist
    from app.database.connection import engine
    from app.models.base import Base
    Base.metadata.create_all(bind=engine)

    # Open procrastinate connection pool so API can defer tasks
    async with task_app.open_async():
        yield


app = FastAPI(title="Chatbot API", lifespan=lifespan)

okta_client_id = os.getenv("EDDI_OKTA_CLIENT_ID")
okta_client_secret = os.getenv("EDDI_OKTA_CLIENT_SECRET")
okta_redirect_uri = os.getenv("EDDI_OKTA_REDIRECT_URI")
session_secret_key = os.getenv("EDDI_SESSION_SECRET_KEY")
eddi_chatbot_app_url = os.getenv("EDDI_CHATBOT_APP_URL")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3005",
                   "http://localhost:3000",
                   "http://localhost:3001",
                   "http://localhost:43000",
                   "https://hnb-dev.p2.paas.citizensbank.com",
                   "https://eddi-chatbot.p2.ocp.citizensbank.com", "https://dbq-dev-chatbot.p2.ocp.citizensbank.com"], 
    allow_credentials=True,
    allow_methods=["OPTIONS", "*"],  # Explicitly include OPTIONS
    allow_headers=["*"],
)

app.add_middleware(SessionMiddleware, secret_key=session_secret_key, max_age=3600)

@app.get("/auth/login")
async def login(request: Request):
    """Login endpoint to initiate the session"""
    
    state = secrets.token_urlsafe(16)  # Generate a secure random state string
    code_verifier = secrets.token_urlsafe(64)  # Generate a secure random code verifier string
    
    # calculate code challenge
    hashed = hashlib.sha256(code_verifier.encode('ascii')).digest()
    encoded = base64.urlsafe_b64encode(hashed)
    code_challenge = encoded.decode('ascii').strip('=')
    
    auth_url = f"https://citizensbankdev.oktapreview.com/oauth2/default/v1/authorize"
    params = {
        "client_id": okta_client_id,
        "scope": "openid profile email",
        "redirect_uri": okta_redirect_uri,
        "state": state, 
        'code_challenge': code_challenge,
        'code_challenge_method': 'S256',
        'response_type': 'code',
        'response_mode': 'query'
    }
    
    redirect_url = f"{auth_url}?{urlencode(params)}"
    request.session["code_verifier"] = code_verifier
    request.session["state"] = state
    return RedirectResponse(url=redirect_url)
    
    
    
@app.get("/auth/callback")
async def auth_callback(request:Request, code: str, state: str):
    """Callback endpoint to handle the authentication response"""
    token_url = f"https://citizensbankdev.oktapreview.com/oauth2/default/v1/token"
    code_verifier = request.session.get("code_verifier")
        
    data = {

        "code_verifier": code_verifier,
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": okta_redirect_uri,
    }
    
    headers = {
        "Content-Type": "application/x-www-form-urlencoded",
    }
    
    # Exchange the authorization code for an access token
    async with httpx.AsyncClient(verify=False) as client:
        response = await client.post(token_url, data=data, auth=(okta_client_id, okta_client_secret))  # Disable SSL verification
        response_data = response.json()
        
    # Store the access token in the session
    request.session["id_token"] = response_data.get("id_token")
    request.session["access_token"] = response_data.get("access_token")
    
    return RedirectResponse(url=eddi_chatbot_app_url)


@app.get("/auth/user")
async def get_user(request: Request):
    """Endpoint to get user information"""
    
    access_token = request.session.get("access_token")
    
    if not access_token:
        return JSONResponse(
            content={"error": "User not authenticated"},
            status_code=401
        )
    
    user_info_url = "https://citizensbankdev.oktapreview.com/oauth2/default/v1/userinfo"
    
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }
    
    try:
        async with httpx.AsyncClient(verify=False) as client:
            response = await client.get(user_info_url, headers=headers)
            response.raise_for_status()
            
            user_info = response.json()
            data = {
                "name": user_info.get("name"),
                "email": user_info.get("email"),
                "preferred_username": user_info.get("preferred_username"),
                "given_name": user_info.get("given_name"),
                "family_name": user_info.get("family_name"),
            }
            
            return data
    except httpx.HTTPStatusError as http_err:
        return JSONResponse(
            content={"error": f"HTTP error occurred: {http_err.response.status_code} - {http_err.response.text}"},
            status_code=http_err.response.status_code
        )
    except httpx.RequestError as req_err:
        return JSONResponse(
            content={"error": f"Request error occurred: {str(req_err)}"},
            status_code=500
        )
    except httpx.TimeoutException:
        return JSONResponse(
            content={"error": "Request timed out"},
            status_code=504
        )
    except httpx.ConnectError:
        return JSONResponse(
            content={"error": "Connection error occurred"},
            status_code=502
        )
    except Exception as err:
        return JSONResponse(
            content={"error": f"An error occurred: {str(err)}"},
            status_code=500
        )

    
@app.get("/auth/logout")
async def logout(request: Request):
    """Logout endpoint to clear the session"""
    
    # Clear the session data
    request.session.clear()
    
    # Redirect to the login page or any other page
    return JSONResponse(
        content={"message": "Logged out successfully"},
        status_code=200
    )

@app.get("/download/{file_name}")
async def download_file(file_name: str):
    
    # Sanitize filename first to avoid path traversal attacks
    file_name = os.path.basename(file_name)
    
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
        headers={
            "Content-Disposition": f"attachment; filename=\"{file_name}\""
        }
    )

# Include routers
app.include_router(chat_router, prefix="/api")
app.include_router(provision_router, prefix="/api")

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
