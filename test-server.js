require('dotenv').config();

const { createOpenAIWebSocket } = require('./server-openai-websocket');
const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Create an HTTP server to serve the HTML file
const server = http.createServer((req, res) => {
    if (req.url === '/' || req.url === '/test-client.html') {
        const filePath = path.join(__dirname, 'test-client.html');
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(500);
                res.end('Error loading test-client.html');
            } else {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(data);
            }
        });
    } else {
        res.writeHead(404);
        res.end('Not Found');
    }
});

// Create a WebSocket server *using the HTTP server*
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    console.log('Client connected to test server');

    // Simulate the 'start-ai-assistant' event
    createOpenAIWebSocket(ws) // Pass the client WebSocket (which is now a standard ws, not Socket.IO)
        .then(openaiConnection => {
            // Optional: Send test messages
            // openaiConnection.send(JSON.stringify({ type: "test", data: "Hello from test server" }));
        })
        .catch(err => {
            console.error("Error in test server:", err);
        });

    ws.on('close', () => {
        console.log('Client disconnected from test server');
    });
});

// Start the HTTP server (which also starts the WebSocket server)
server.listen(8080, () => {
    console.log('Test server listening on port 8080');
}); 