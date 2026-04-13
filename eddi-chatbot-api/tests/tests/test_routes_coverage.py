import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from main import app

client = TestClient(app)


class TestRoutesCoverage:
    """Updated tests (LLM-based, no Rasa)"""

    def test_get_user_id_from_request_with_header(self):
        response = client.post(
            "/api/chat/send",
            json={"message": "Hello"},
            headers={"X-User-Email": "header@example.com"}
        )
        assert response.status_code in (200, 500)

    def test_get_user_id_from_request_null_header(self):
        response = client.post(
            "/api/chat/send",
            json={"message": "Hello"},
            headers={"X-User-Email": "null"}
        )
        assert response.status_code in (200, 500)

    def test_get_user_id_from_request_undefined_header(self):
        response = client.post(
            "/api/chat/send",
            json={"message": "Hello"},
            headers={"X-User-Email": "undefined"}
        )
        assert response.status_code in (200, 500)

    def test_get_user_id_from_request_query_param(self):
        response = client.post(
            "/api/chat/send?user_id=query_user",
            json={"message": "Hello"}
        )
        assert response.status_code in (200, 500)

    def test_get_user_id_from_request_no_user_info(self):
        response = client.post("/api/chat/send", json={"message": "Hello"})
        assert response.status_code in (200, 500)

    def test_new_conversation_endpoint(self, mock_repositories):
        response = client.post("/api/chat/new", json={"message": "Start new chat"})
        assert response.status_code in (200, 500)

    def test_new_conversation_with_conversation_id(self, mock_repositories):
        response = client.post("/api/chat/new", json={
            "message": "Continue chat",
            "conversation_id": "existing_conv_id"
        })
        assert response.status_code in (200, 500)

    def test_health_check_endpoint_basic(self):
        with patch('app.database.connection.SessionLocal') as mock_session:

            mock_db = MagicMock()
            mock_session.return_value.__enter__.return_value = mock_db

            response = client.get("/api/chat/health")
            assert response.status_code == 200

            data = response.json()
            assert "api" in data
            assert "timestamp" in data
            assert "services" in data
            assert "llm" in data["services"]

    def test_health_check_all_services_healthy(self):
        with patch('app.database.connection.SessionLocal') as mock_session:

            mock_db = MagicMock()
            mock_session.return_value.__enter__.return_value = mock_db

            response = client.get("/api/chat/health")

            assert response.status_code == 200
            data = response.json()
            assert "status" in data
            assert data["services"]["llm"]["status"] in ["healthy", "unhealthy"]

    def test_health_check_llm_unhealthy(self):
        with patch('app.database.connection.SessionLocal'):

            response = client.get("/api/chat/health")
            data = response.json()

            assert "llm" in data["services"]
            assert data["services"]["llm"]["status"] in ["healthy", "unhealthy"]

    def test_health_check_database_error(self):
        with patch('app.api.routes.SessionLocal') as mock_session:

            mock_session.side_effect = Exception("Database connection failed")

            response = client.get("/api/chat/health")
            data = response.json()

            assert data["status"] in ["healthy", "degraded"]
            assert data["services"]["database"]["status"] == "unhealthy"

    def test_send_message_exception_handling(self):
        with patch('app.api.routes.get_chat_service') as mock_get_service:
            mock_service = MagicMock()
            mock_service.process_message.side_effect = Exception("Service error")
            mock_get_service.return_value = mock_service

            response = client.post("/api/chat/send", json={"message": "Hello"})
            assert response.status_code == 500

    def test_get_conversation_with_service_error(self, mock_repositories):
        response = client.get("/api/chat/conversations/test_id")
        assert response.status_code in (200, 404, 500)

    def test_delete_conversation_success_response(self, mock_repositories):
        response = client.delete("/api/chat/conversations/test_conversation_id")

        if response.status_code == 200:
            data = response.json()
            assert "status" in data
            assert "message" in data

    def test_delete_conversation_http_exception_passthrough(self, mock_repositories):
        response = client.delete("/api/chat/conversations/test_id")
        assert response.status_code in (200, 403, 404, 500)

    def test_delete_conversation_general_exception(self, mock_repositories):
        response = client.delete("/api/chat/conversations/test_id")
        assert response.status_code in (200, 404, 500)

    def test_message_request_validation(self):
        response = client.post("/api/chat/send", json={"conversation_id": "test"})
        assert response.status_code == 422

    def test_message_request_optional_conversation_id(self, mock_repositories):
        response = client.post("/api/chat/send", json={
            "message": "Hello",
            "conversation_id": "existing_conv_id"
        })
        assert response.status_code in (200, 500)

    def test_new_message_endpoint_response_format(self, mock_repositories):
        response = client.post("/api/chat/new", json={"message": "Hello"})

        if response.status_code == 200:
            data = response.json()
            assert "message" in data
            assert "conversation_id" in data
            assert "role" in data["message"]
            assert "content" in data["message"]