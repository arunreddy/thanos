# run.py
import uvicorn

if __name__ == "__main__":
    uvicorn.run("src.eddi_chatbot_api.main:app", host="0.0.0.0", port=8000, reload=True)
