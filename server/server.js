import express from "express";
import dotenv from "dotenv";
import http from 'http'
import { startWebSocketServer } from "./src/websocketserver/wss.js";
import cors from 'cors';

dotenv.config();

const app = express();
const port = process.env.PORT;
app.use(cors({
  origin: "*",  // Allow all origins for local network access
  credentials: true
}));

app.use(express.json());

const server=http.createServer(app);
startWebSocketServer(server);

server.listen(port, () => {
  console.log(`http server running on port :${port}`);
});
