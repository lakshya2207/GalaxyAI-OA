import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
import cors from "cors";  // Import CORS

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;

// Initialize the Next.js app
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    // Use CORS middleware before handling requests
    cors()(req, res, () => {
      // Custom webhook handling
      if (req.url === "/api/webhook1" && req.method === "POST") {
        handleWebhook(req, res, "webhookEvent1");
      } else if (req.url === "/api/webhook2" && req.method === "POST") {
        handleWebhook(req, res, "webhookEvent2");
      } else if (req.url === "/api/webhook3" && req.method === "POST") {
        handleWebhook(req, res, "webhookEvent3");
      } else {
        // For all other requests (including API routes), pass to Next.js handler
        handler(req, res);
      }
    });
  });

  const io = new Server(httpServer);

  // Track active connections by user ID
  const users = new Map();

  io.on("connection", (socket) => {
    console.log("A user connected: ", socket.id);
    const userId = socket.handshake.query.userId;

    if (userId) {
      if (users.has(userId)) {
        const previousSocket = users.get(userId);
        previousSocket.disconnect(true);
      }
      users.set(userId, socket);
      console.log(`User ${userId} connected with socket ID: ${socket.id}`);
    }

    socket.on("disconnect", () => {
      if (userId) {
        users.delete(userId);
        console.log(`User ${userId} disconnected`);
      }
    });

    socket.on("webhookEvent1", (data) => {
      console.log("Received webhookEvent1:", data);
      io.emit("webhookEvent1", { message: "done", orgUrl: data.secure_url });
    });

    socket.on("webhookEvent2", (data) => {
      console.log("Received webhookEvent2:", data);
      io.emit("webhookEvent2", { message: "done", videoUrl: data.video_url });
    });

    socket.on("add", (payload) => io.emit("add", payload));
    socket.on("minus", (payload) => io.emit("minus", payload));
  });

  // Start the server
  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });

  function handleWebhook(req, res, eventType) {
    let body = "";
    req.on("data", (chunk) => (body += chunk.toString()));
    req.on("end", () => {
      try {
        const parsedBody = JSON.parse(body);
        const { secure_url, payload } = parsedBody;
        let dataToEmit;

        if (eventType === "webhookEvent1" && secure_url) {
          dataToEmit = { message: "done", orgUrl: secure_url };
        } else if (eventType === "webhookEvent2" && payload?.video_url) {
          dataToEmit = { message: "done", videoUrl: payload.video_url };
        } else if (eventType === "webhookEvent3" && secure_url) {
          dataToEmit = { message: "done", captionedVideoUrl: secure_url };
        }

        if (dataToEmit) {
          io.emit(eventType, dataToEmit);
          res.statusCode = 200;
          res.end(`${eventType} received`);
        } else {
          res.statusCode = 400;
          res.end(`Invalid or missing data for ${eventType}`);
        }
      } catch (error) {
        console.error("Error parsing webhook:", error);
        res.statusCode = 400;
        res.end("Invalid JSON or malformed payload");
      }
    });
  }
});
