from setuptools import setup, find_packages

setup(
    name="chatbot-api",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        "fastapi>=0.115.12",
        "httpx>=0.28.1", 
        "pydantic>=2.10.6",
        "uvicorn>=0.34.0",
    ],
)