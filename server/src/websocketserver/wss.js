import { WebSocketServer, WebSocket } from "ws";

const gameroom = new Map();
gameroom.set("room1", {
  players: [],
});
let playerIdCounter = 0;

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

      const playerId = `Player${++playerIdCounter}`;
      const playerIp= socket._socket.remoteAddress;
      const playerNumber = room.players.length + 1; // Assign player number
      room.players.push({
        playerIp,
        playerId,
        playerNumber,
        isReady: true,
        socket,
      });

      const playerCount = room.players.length;

      if (playerCount === 1) {
        socket.send(
          JSON.stringify({
            message: "Waiting for opponent",
            playerCount,
            playerNumber: 1,
            totalPlayers: 1,
            players: room.players.map((p) => p.playerId),
          }),
        );
            } else if (playerCount === 2) {
        // Broadcast to ALL players when room is full
        room.players.forEach((player, index) => {
          if (player.socket.readyState === WebSocket.OPEN) {
            player.socket.send(
              JSON.stringify({
                message: "Ready to Start",
                playerCount,
                playerNumber: index + 1,
                totalPlayers: 2,
                players: room.players.map((p) => p.playerId),
                
              }),
            );
          }
        });
      }

      break;
    }

    case "start_game": {
      const player = room.players.find((p) => p.socket === socket);
      const playerNumber = player ? room.players.indexOf(player) + 1 : null;
      
      if (room.players.length === 2) {
        room.players.forEach((player, index) => {
          if (player.socket.readyState === WebSocket.OPEN) {
            player.socket.send(
              JSON.stringify({
                message: "Game Started!",
                playerNumber: index + 1,
                totalPlayers: 2,
              }),
            );
          }
        });
      } else if (playerNumber) {
        // Send player number even if waiting for opponent
        socket.send(
          JSON.stringify({
            message: "Waiting for opponent",
            playerNumber: playerNumber,
            totalPlayers: room.players.length,
          }),
        );
      }

      onStartGame(room);
      break;
    }
    case "move": {
      const player = room.players.find((p) => p.socket === socket);
      if (!player) return;

      player.move = message.choice.toLowerCase();
      break;
    }

    default:
      console.log("Unknown message type:", message.type);
  }
};

const decideWinner = (move1, move2) => {
  if (!move1 && !move2) return "draw";
  
  if (!move1) return "player2";
  
  if (!move2) return "player1";
  
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
            "Choose your move before 10 seconds! 1.Rock 2.Paper 3.Scissors",
        }),
      );
    }
  }

  room.players.forEach((p) => (p.move = null));

  setTimeout(() => {
    // Check if we still have 2 players
    if (room.players.length < 2) {
      console.log("Not enough players to continue game");
      for (const player of room.players) {
        if (player.socket.readyState === WebSocket.OPEN) {
          player.socket.send(
            JSON.stringify({
              message: "Game cancelled - opponent disconnected",
            }),
          );
        }
      }
      return;
    }

    const [p1, p2] = room.players;

    // Validate players exist
    if (!p1 || !p2) {
      console.log("Missing player data");
      return;
    }

    // Assign random moves if not chosen
    // if (!p1.move)
    //   p1.move = ["rock", "paper", "scissors"][Math.floor(Math.random() * 3)];
    // if (!p2.move)
    //   p2.move = ["rock", "paper", "scissors"][Math.floor(Math.random() * 3)];

    const winner = decideWinner(p1.move, p2.move);

    // Send results only if sockets are still open
    if (p1.socket.readyState === WebSocket.OPEN) {
      p1.socket.send(
        JSON.stringify({
          yourMove: p1.move,
          opponentMove: p2.move,
          result:
            winner === "draw" ? "draw" : winner === "player1" ? "win" : "lose",
        }),
      );
    }

    if (p2.socket.readyState === WebSocket.OPEN) {
      p2.socket.send(
        JSON.stringify({
          yourMove: p2.move,
          opponentMove: p1.move,
          result:
            winner === "draw" ? "draw" : winner === "player2" ? "win" : "lose",
        }),
      );
    }
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
      
      // Remove disconnected player
      room.players = room.players.filter((p) => p.socket !== socket);
      
      // Notify remaining players about the updated list
      for (const player of room.players) {
        if (player.socket.readyState === WebSocket.OPEN) {
          player.socket.send(
            JSON.stringify({
              message: room.players.length === 1 ? "Waiting for opponent" : "Ready to Start",
              playerCount: room.players.length,
              players: room.players.map((p) => p.playerId),
            })
          );
        }
      }
    });
  });
};
