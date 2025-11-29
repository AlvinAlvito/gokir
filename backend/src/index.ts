import "dotenv/config";
import app from "./app.js";
import http from "http";
import { createSocketServer } from "./lib/socket.js";

const PORT = process.env.PORT || 4000;
const server = http.createServer(app);
createSocketServer(server);

server.listen(PORT, () => {
  console.log(`Gokir backend running at http://localhost:${PORT}`);
});
