from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncio

from chatbot import initialize_agent

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str


agent_executor, config = initialize_agent()


@app.post("/api/chat")
async def chat_endpoint(chat_request: ChatRequest):
    user_message = chat_request.message

    # Run agent for the input message and collect output
    responses = []
    async for event in agent_executor.astream(
        {"messages": [{"role": "user", "content": user_message}]},
        config,
        stream_mode="values",
    ):
        # Assuming last message is agent response
        last_msg = event["messages"][-1].content
        responses.append(last_msg)

    # Return concatenated or last response
    reply = responses[-1] if responses else "No response"
    return {"reply": reply}


# Mount the frontend directory after defining all routes
app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")
