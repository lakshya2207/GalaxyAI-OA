const express = require('express');
const next = require('next');
const http = require('http');
const socketIo = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = express();
  const httpServer = http.createServer(server);
  const io = socketIo(httpServer);

  // To track active connections by user (you could use a session ID or user ID)
  const users = new Map(); // Store user connections by userId

  io.on('connection', (socket) => {
    console.log('A user connected: ', socket.id);

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

    socket.on('disconnect', () => {
      if (userId) {
        users.delete(userId);
        console.log(`User ${userId} disconnected`);
      }
    });

    // Handle other events or broadcasting to clients
    socket.on('webhookEvent1', (data) => {
      console.log('Received webhookEvent1:', data);
      io.emit('webhookEvent1', { message: 'done', orgUrl: data.secure_url });
    });

    socket.on('webhookEvent2', (data) => {
      console.log('Received webhookEvent2:', data);
      io.emit('webhookEvent2', { message: 'done', videoUrl: data.video_url });
    });
  });

  // API Route Example (you already have this in your code)
  server.use('/api', (req, res) => {
    if (req.url === '/webhook1' && req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => body += chunk.toString());
      req.on('end', () => {
        try {
          const { secure_url } = JSON.parse(body);
          if (secure_url) {
            io.emit('webhookEvent1', { message: 'done', orgUrl: secure_url });
            res.status(200).send('Webhook received');
          } else {
            res.status(400).send('secure_url missing');
          }
        } catch (error) {
          res.status(400).send('Invalid JSON');
        }
      });
    }
    if (req.url === '/webhook3' && req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => body += chunk.toString());
      req.on('end', () => {
        try {
          const { secure_url } = JSON.parse(body);
          if (secure_url) {
            console.log('Webhook3 receive ')
            console.log(secure_url)
            console.log('secure_url')
            io.emit('webhookEvent3', { message: 'done', captionedVideoUrl: secure_url });
            res.status(200).send('Webhook received');
          } else {
            res.status(400).send('secure_url missing');
          }
        } catch (error) {
          res.status(400).send('Invalid JSON');
        }
      });
    }

    if (req.url === '/webhook2' && req.method === 'POST') {
      let body = '';

      // Listen to the data events and accumulate chunks into the body variable
      req.on('data', (chunk) => body += chunk.toString());

      // Once all the data is received, process it
      req.on('end', () => {
        try {
          // Log the raw request body for debugging
          console.log('Received webhook2 payload:', body);

          // Try parsing the body as JSON
          const parsedBody = JSON.parse(body);
          console.log('Parsed webhook2 payload:', parsedBody);

          // Extract the payload and ensure it's structured correctly
          const { payload } = parsedBody;

          // Ensure payload exists and contains necessary information
          if (payload) {
            const { video_url, message } = payload;

            // Log the extracted fields for debugging
            console.log('Video URL:', video_url);
            console.log('Message:', message);

            if (video_url) {
              // Emit the event with the extracted video URL
              io.emit('webhookEvent2', { message: 'done', downloadLink: video_url });
              res.status(200).send('Webhook2 received with video_url');
            } else if (message) {
              // Handle the case where there's a message but no video URL
              io.emit('webhookEvent2', { message: 'Quota exceeded', details: message });
              res.status(200).send('Quota exceeded notification received');
            } else {
              res.status(400).send('video_url or message missing in payload');
            }
          } else {
            res.status(400).send('Payload is missing or malformed');
          }
        } catch (error) {
          // If JSON parsing fails, log the error and respond with a 400
          console.error('Error parsing the webhook2 payload:', error);
          res.status(400).send('Invalid JSON or malformed payload');
        }
      });
    }
  });

  // Default handler for all other pages
  server.all('*', (req, res) => {
    return handle(req, res);
  });

  // Start the server
  httpServer.listen(3000, (err) => {
    if (err) throw err;
    console.log('> Ready on http://localhost:3000');
  });
});
