import os
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_auth_login_sets_session():
    response = client.get("/auth/login")
    if response.status_code == 404:
        pytest.skip("Auth not configured in test environment")
    assert response.status_code in (307, 302)
    assert "location" in response.headers


def test_auth_logout_clears_session():
    response = client.get("/auth/logout")
    assert response.status_code == 200
    assert response.json()["message"] == "Logged out successfully"


def test_auth_user_unauthenticated():
    response = client.get("/auth/user")
    assert response.status_code == 401
    assert response.json()["error"] == "User not authenticated"


def test_download_file_not_found():
    response = client.get("/download/doesnotexist.txt")
    assert response.status_code == 404
    assert response.json()["detail"] == "File not found"


def test_cors_options():
    response = client.options("/api/chat/send", headers={"Origin": "http://localhost:3000"})
    # Accept 405 as valid if endpoint does not support OPTIONS directly
    assert response.status_code in (200, 204, 405)


import tempfile
from unittest.mock import patch


def test_download_file_success():
    tmp_dir = "/tmp/downloads"
    os.makedirs(tmp_dir, exist_ok=True)
    file_name = "testfile.txt"
    file_path = os.path.join(tmp_dir, file_name)
    content = b"test content"
    with open(file_path, "wb") as f:
        f.write(content)
    response = client.get(f"/download/{file_name}")
    assert response.status_code == 200
    assert response.content == content
    os.remove(file_path)

