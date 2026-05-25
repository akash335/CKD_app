"""WebSocket endpoint and connection manager for chat."""

from collections import defaultdict

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect, status

from app.database.session import SessionLocal
from app.services.chat import is_conversation_participant

router = APIRouter(tags=["Chat WebSocket"])


class ChatConnectionManager:
    def __init__(self) -> None:
        self.active_connections: dict[str, dict[str, list[WebSocket]]] = defaultdict(dict)

    async def connect(self, conversation_id: str, user_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections[conversation_id].setdefault(user_id, []).append(websocket)

    def disconnect(self, conversation_id: str, user_id: str, websocket: WebSocket) -> None:
        user_connections = self.active_connections.get(conversation_id, {}).get(user_id, [])
        if websocket in user_connections:
            user_connections.remove(websocket)

        if not user_connections and conversation_id in self.active_connections:
            self.active_connections[conversation_id].pop(user_id, None)

        if conversation_id in self.active_connections and not self.active_connections[conversation_id]:
            self.active_connections.pop(conversation_id, None)

    async def broadcast(self, conversation_id: str, payload: dict) -> None:
        conversation_connections = list(self.active_connections.get(conversation_id, {}).items())
        for user_id, sockets in conversation_connections:
            for websocket in list(sockets):
                try:
                    await websocket.send_json(payload)
                except RuntimeError:
                    self.disconnect(conversation_id, user_id, websocket)

    def is_user_online(self, user_id: str) -> bool:
        return any(user_id in users for users in self.active_connections.values())


chat_manager = ChatConnectionManager()


@router.websocket("/ws/chat/{conversation_id}")
async def chat_websocket(
    websocket: WebSocket,
    conversation_id: str,
    user_id: str | None = Query(default=None),
):
    if not user_id:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    db = SessionLocal()
    try:
        if not is_conversation_participant(db, conversation_id, user_id):
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        await chat_manager.connect(conversation_id, user_id, websocket)
        await websocket.send_json({"type": "connected", "conversation_id": conversation_id})

        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        chat_manager.disconnect(conversation_id, user_id, websocket)
        db.close()
