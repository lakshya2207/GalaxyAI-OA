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

    // Socket.io connection handler
    io.on('connection', (socket) => {
        console.log('A user connected');
        console.log(socket.id);
        socket.on('disconnect', () => {
            console.log('User disconnected');
        });
    });

    // Your API routes will be handled here
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

        if (req.url === '/webhook2' && req.method === 'POST') {
            let body = '';

            req.on('data', (chunk) => body += chunk.toString());

            req.on('end', () => {
                try {
                    const { payload } = JSON.parse(body);
                    const { video_url, message } = payload;

                    if (video_url) {
                        // Handle the video URL if available (processing completed)
                        io.emit('webhookEvent2', { message: 'done', downloadLink: video_url });
                        res.status(200).send('Webhook2 received');
                    } else if (message) {
                        // Handle the quota exceeded message
                        console.log('Quota exceeded:', message); // Log the message for quota exceeded
                        io.emit('webhookEvent2', { message: 'Quota exceeded', details: message });
                        res.status(200).send('Quota exceeded notification received');
                    } else {
                        res.status(400).send('video_url or message missing');
                    }
                } catch (error) {
                    res.status(400).send('Invalid JSON');
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