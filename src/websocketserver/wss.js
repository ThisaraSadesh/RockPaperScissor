import { WebSocketServer, WebSocket } from "ws";

const gameroom = new Map();
gameroom.set("room1", {
  players: [], 
});

const onMessage = (socket, data, roomMap) => {
  const message = JSON.parse(data.toString());
  const roomName = "room1";

  if (!roomMap.has(roomName)) {
    roomMap.set(roomName, { players: [] });
  }

  const room = roomMap.get(roomName);

  switch (message.type) {
    case "join_game": {
      const alreadyJoined = room.players.find(p => p.socket === socket);
      if (alreadyJoined) return;

      const playerIp = socket._socket.remoteAddress;

      room.players.push({
        playerIp,
        isReady: true,
        socket, 
      });

      const playerCount = room.players.length;

      if (playerCount === 1) {
        socket.send(JSON.stringify({
          message: "Waiting for opponent",
          playerCount,
        }));
      } else {
        for (const player of room.players) {
          if (player.socket.readyState === WebSocket.OPEN) {
            player.socket.send(JSON.stringify({
              message: "Ready to Start",
              playerCount,
            }));
          }
        }
      }

      break;
    }

    case "start_game": {
      
      if (room.players.length === 2) {
        for (const player of room.players) {
          if (player.socket.readyState === WebSocket.OPEN) {
            player.socket.send(JSON.stringify({
              message: "Game Started!",
            }));
          }
        }
      }
      break;
    }

    default:
      console.log("Unknown message type:", message.type);
  }
};

export const startWebSocketServer = (server) => {
  const wss = new WebSocketServer({
    server,
    path: "/ws",
  });

  wss.on("connection", (socket) => {
    console.log("New client connected");

    socket.on("message", (data) => {
      onMessage(socket, data, gameroom);
    });

    socket.on("close", () => {
      console.log("Client disconnected");

      const room = gameroom.get("room1");
      if (!room) return;

      room.players = room.players.filter(p => p.socket !== socket);
    });
  });
};
