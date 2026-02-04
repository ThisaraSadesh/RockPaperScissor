import express from "express";
import dotenv from "dotenv";
import http from 'http'
import { startWebSocketServer } from "./src/websocketserver/wss.js";

dotenv.config();

const app = express();
const port = process.env.PORT;
app.use(express.json());

const server=http.createServer(app);
startWebSocketServer(server);

server.listen(port, () => {
  console.log(`http server running on port :${port}`);
});
