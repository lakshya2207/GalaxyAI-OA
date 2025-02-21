import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;

// Initialize the Next.js app
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    // Handle API requests for webhooks manually
    if (req.url === "/api/webhook1" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk) => (body += chunk.toString()));
      req.on("end", () => {
        try {
          const { secure_url } = JSON.parse(body);
          if (secure_url) {
            io.emit("webhookEvent1", { message: "done", orgUrl: secure_url });
            res.statusCode = 200;
            res.end("Webhook received");
          } else {
            res.statusCode = 400;
            res.end("secure_url missing");
          }
        } catch (error) {
          res.statusCode = 400;
          res.end("Invalid JSON");
        }
      });
    } else if (req.url === "/api/webhook2" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk) => (body += chunk.toString()));
      req.on("end", () => {
        try {
          const parsedBody = JSON.parse(body);
          const { payload } = parsedBody;

          if (payload) {
            const { video_url, message } = payload;
            if (video_url) {
              io.emit("webhookEvent2", { message: "done", downloadLink: video_url });
              res.statusCode = 200;
              res.end("Webhook2 received with video_url");
            } else if (message) {
              io.emit("webhookEvent2", { message: "Quota exceeded", details: message });
              res.statusCode = 200;
              res.end("Quota exceeded notification received");
            } else {
              res.statusCode = 400;
              res.end("video_url or message missing in payload");
            }
          } else {
            res.statusCode = 400;
            res.end("Payload is missing or malformed");
          }
        } catch (error) {
          console.error("Error parsing the webhook2 payload:", error);
          res.statusCode = 400;
          res.end("Invalid JSON or malformed payload");
        }
      });
    } else if (req.url === "/api/webhook3" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk) => (body += chunk.toString()));
      req.on("end", () => {
        try {
          const { secure_url } = JSON.parse(body);
          if (secure_url) {
            io.emit("webhookEvent3", { message: "done", captionedVideoUrl: secure_url });
            res.statusCode = 200;
            res.end("Webhook3 received");
          } else {
            res.statusCode = 400;
            res.end("secure_url missing");
          }
        } catch (error) {
          res.statusCode = 400;
          res.end("Invalid JSON");
        }
      });
    } else {
      // Handle Next.js pages
      handler(req, res);
    }
  });

  const io = new Server(httpServer);

  // To track active connections by user (you could use a session ID or user ID)
  const users = new Map(); // Store user connections by userId

  io.on("connection", (socket) => {
    console.log("A user connected: ", socket.id);

    // Example: Track user by their ID (you could pass a token or user session data)
    const userId = socket.handshake.query.userId; // Assuming user ID is passed as a query parameter

    if (userId) {
      // Check if the user is already connected
      if (users.has(userId)) {
        // Disconnect the previous connection (if necessary)
        const previousSocket = users.get(userId);
        previousSocket.disconnect(true); // Forcefully disconnect the old socket
      }

      // Add the new socket connection for the user
      users.set(userId, socket);
      console.log(`User ${userId} connected with socket ID: ${socket.id}`);
    }

    socket.on("disconnect", () => {
      if (userId) {
        users.delete(userId);
        console.log(`User ${userId} disconnected`);
      }
    });

    // Handle other events or broadcasting to clients
    socket.on("webhookEvent1", (data) => {
      console.log("Received webhookEvent1:", data);
      io.emit("webhookEvent1", { message: "done", orgUrl: data.secure_url });
    });

    socket.on("webhookEvent2", (data) => {
      console.log("Received webhookEvent2:", data);
      io.emit("webhookEvent2", { message: "done", videoUrl: data.video_url });
    });

    // Handle more events like add or minus
    socket.on("add", (payload) => {
      io.emit("add", payload);
    });
    socket.on("minus", (payload) => {
      io.emit("minus", payload);
    });
  });

  // Start the server
  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
