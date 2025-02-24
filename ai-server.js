/**
 * AI assistant server implementation handling OpenAI integration
 * and AI-specific socket events
 */

// Create a shared function for OpenAI session creation
const createAISession = async (options = {}) => {
    if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY is not set in environment variables.');
    }

    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: options.model || "gpt-4o-realtime-preview-2024-12-17",
            voice: options.voice || "alloy",
            modalities: ["audio", "text"],
            instructions: "Start conversation with the user by saying 'Hello, how can I help you today?' Use the available tools when relevant. After executing a tool, you will need to respond (create a subsequent conversation item) to the user sharing the function result or error. If you do not respond with additional message with function result, user will not know you successfully executed the tool. Speak and respond in the language of the user.",
            tool_choice: "auto",
        }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error('OpenAI API error:', errorData);
        throw new Error(`OpenAI API request failed: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    return {
        token: data.client_secret.value,
        ...data
    };
};

// AI socket event handlers
const aiServer = (socket) => {
    console.log("[" + socket.id + "] AI connection initialized");

    socket.on('start-ai-assistant', async (options = {}) => {
        console.log('Received start-ai-assistant request from client:', socket.id);
        try {
            const sessionData = await createAISession(options);
            socket.emit('ai-session-started', sessionData);
            console.log('AI session started for client:', socket.id);
        } catch (error) {
            console.error('Error creating AI session:', error);
            socket.emit('ai-session-error', { 
                error: 'Failed to create AI session', 
                details: error.message 
            });
        }
    });

    socket.on('stop-ai-assistant', () => {
        console.log('Received stop-ai-assistant request from client:', socket.id);
        socket.emit('ai-session-stopped', { 
            message: 'AI assistant stopped' 
        });
    });
};

// AI HTTP endpoints
const aiEndpoints = (app) => {
    app.post('/api/ai-session', async (req, res) => {
        try {
            const sessionData = await createAISession(req.body);
            res.json(sessionData);
        } catch (error) {
            console.error('Error creating AI session:', error);
            res.status(500).json({ 
                error: 'Failed to create AI session', 
                details: error.message 
            });
        }
    });
};

module.exports = {
    aiServer,
    aiEndpoints
}; 