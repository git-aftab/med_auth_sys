from typing import List, Dict, Any
from fastapi import WebSocket, WebSocketDisconnect
import json


class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"WebSocket client connected. Total active connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            print(f"WebSocket client disconnected. Total active connections: {len(self.active_connections)}")

    async def broadcast(self, data: Dict[str, Any]):
        """
        Broadcast JSON verification event payload to all connected WebSocket clients.
        """
        if not self.active_connections:
            return

        disconnected_clients = []
        message = json.dumps(data, default=str)

        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                print(f"Error sending message to WebSocket client: {e}")
                disconnected_clients.append(connection)

        for client in disconnected_clients:
            self.disconnect(client)


# Singleton instance for application-wide use
ws_manager = ConnectionManager()
