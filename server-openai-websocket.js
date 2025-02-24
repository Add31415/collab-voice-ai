const WebSocket = require('ws');

async function createOpenAIWebSocket(clientSocket) {
    const url = `wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17`; // Add voice later, from client options
    const wsOptions = {
        headers: {
            "Authorization": "Bearer " + process.env.OPENAI_API_KEY, // Use standard API key from .env
            "OpenAI-Beta": "realtime=v1",
        },
    };
    const openaiWs = new WebSocket(url, wsOptions);

    openaiWs.onopen = () => {
        console.log("OpenAI WebSocket connected");
        console.log("OpenAI WebSocket open - ready to send/receive"); // More descriptive log
        clientSocket.emit('openai_ready'); // Signal to the client that the connection is ready
    };

    openaiWs.onmessage = (event) => {
        console.log("Received message from OpenAI:", event.data);
        // For now, just log the message.  Later, we'll process audio/transcript.
    };

    openaiWs.onclose = (event) => {
        console.log("OpenAI WebSocket closed:", event.code, event.reason);
        clientSocket.emit('openai_closed', { code: event.code, reason: event.reason });
    };

    openaiWs.onerror = (error) => {
        console.error("OpenAI WebSocket error:", error);
        clientSocket.emit('openai_error', { error: error.message });
    };

    return {
        send: (data) => {
            if (openaiWs.readyState === openaiWs.OPEN) {
                openaiWs.send(data);
            } else {
                console.warn("OpenAI WebSocket not open. Cannot send data.");
            }
        },
        close: () => {
            if (openaiWs.readyState === openaiWs.OPEN || openaiWs.readyState === openaiWs.CONNECTING) {
                openaiWs.close();
            }
        }
    };
}

module.exports = { createOpenAIWebSocket }; 