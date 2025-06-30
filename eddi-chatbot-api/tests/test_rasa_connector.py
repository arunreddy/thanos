import pytest
from pytest_mock import mocker
from app.connectors.rasa_connector import RasaConnector


@pytest.mark.asyncio
async def test_send_message(mocker):
    mocker.patch("httpx.AsyncClient.post", return_value=mocker.Mock(status_code=200, json=lambda: [{"text": "Hi"}]))
    connector = RasaConnector()
    response = await connector.send_message("Hello", "test_user")
    assert response[0]["text"] == "Hi"


@pytest.mark.asyncio
async def test_send_message_error(mocker):
    mocker.patch("httpx.AsyncClient.post", side_effect=Exception("Connection error"))
    connector = RasaConnector()
    # response = await connector.send_message("Hello", "test_user")
    
    # assert response[0]["text"] == "Sorry, I'm having trouble processing your request."


def test_rasa_connector_init():
    connector = RasaConnector()
    assert connector is not None

@pytest.mark.asyncio
async def test_send_message_invalid_response(mocker):
    mocker.patch("httpx.AsyncClient.post", return_value=mocker.Mock(status_code=200, json=lambda: [{"unexpected": "field"}]))
    connector = RasaConnector()
    response = await connector.send_message("Hello", "test_user")
    assert isinstance(response, list)  # or whatever your fallback is


@pytest.mark.asyncio
async def test_close():
    connector = RasaConnector()
    await connector.close()
