import { on } from "events";
import { WebSocketServer, WebSocket } from "ws";

const gameroom = new Map();
gameroom.set("room1", {
  players: [],
});

const onMessage = (socket, data, roomMap) => {
  let message;
  try {
    message = JSON.parse(data.toString());
  } catch (err) {
    console.log("Invalid JSON received:", data.toString());
    return; 
  }
  const roomName = "room1";

  if (!roomMap.has(roomName)) {
    roomMap.set(roomName, { players: [] });
  }

  const room = roomMap.get(roomName);

  switch (message.type) {
    case "join_game": {
      const alreadyJoined = room.players.find((p) => p.socket === socket);
      if (alreadyJoined) return;

      const playerIp = socket._socket.remoteAddress;

      room.players.push({
        playerIp,
        isReady: true,
        socket,
      });

      const playerCount = room.players.length;

      if (playerCount === 1) {
        socket.send(
          JSON.stringify({
            message: "Waiting for opponent",
            playerCount,
          }),
        );
      } else {
        for (const player of room.players) {
          if (player.socket.readyState === WebSocket.OPEN) {
            player.socket.send(
              JSON.stringify({
                message: "Ready to Start",
                playerCount,
              }),
            );
          }
        }
      }

      break;
    }

    case "start_game": {
      if (room.players.length === 2) {
        for (const player of room.players) {
          if (player.socket.readyState === WebSocket.OPEN) {
            player.socket.send(
              JSON.stringify({
                message: "Game Started!",
              }),
            );
          }
        }
      }

      onStartGame(room);
      break;
    }
    case "move": {
      const player = room.players.find((p) => p.socket === socket);
      if (!player) return;

      player.move = message.choice.toLowerCase(); // store player's move
      break;
    }

    default:
      console.log("Unknown message type:", message.type);
  }
};

const decideWinner = (move1, move2) => {
  if (move1 === move2) return "draw";
  if (
    (move1 === "rock" && move2 === "scissors") ||
    (move1 === "scissors" && move2 === "paper") ||
    (move1 === "paper" && move2 === "rock")
  ) {
    return "player1";
  }
  return "player2";
};

const onStartGame = (room) => {
  for (const player of room.players) {
    if (player.socket.readyState === WebSocket.OPEN) {
      player.socket.send(
        JSON.stringify({
          message:
            "Choose your move before 3 seconds!  1.Rock 2.Paper 3.Scissors",
        }),
      );
    }
  }

  room.players.forEach((p) => (p.move = null));

  setTimeout(() => {
    const [p1, p2] = room.players;

    // Assign default move if player didn't respond
    if (!p1.move)
      p1.move = ["rock", "paper", "scissors"][Math.floor(Math.random() * 3)];
    if (!p2.move)
      p2.move = ["rock", "paper", "scissors"][Math.floor(Math.random() * 3)];

    const winner = decideWinner(p1.move, p2.move);

    // Send result to both
    p1.socket.send(
      JSON.stringify({
        yourMove: p1.move,
        opponentMove: p2.move,
        result:
          winner === "draw" ? "draw" : winner === "player1" ? "win" : "lose",
      }),
    );

    p2.socket.send(
      JSON.stringify({
        yourMove: p2.move,
        opponentMove: p1.move,
        result:
          winner === "draw" ? "draw" : winner === "player2" ? "win" : "lose",
      }),
    );
  }, 10000);
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

      room.players = room.players.filter((p) => p.socket !== socket);
    });
  });
};
