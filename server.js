const fs = require("fs");
const express = require("express");
const https = require("https");
const { Server } = require("socket.io");
const path = require("path");
const http = require("http");
const app = express();

// Load environment variables from AI/.env
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Check if OpenAI API key was loaded successfully
if (process.env.OPENAI_API_KEY) {
	console.log('OpenAI API key loaded successfully');
} else {
	console.warn('Warning: OpenAI API key not found in environment variables');
}

const config = require("./config.js");
const signallingServer = require("./signalling-server");
const { aiServer, aiEndpoints } = require("./ai-server");

// SSL certificate configuration
let privateKey, certificate;
try {
	privateKey = fs.readFileSync("ssl/server-key.pem", "utf8");
	certificate = fs.readFileSync("ssl/server-cert.pem", "utf8");
} catch (error) {
	console.error("Failed to load SSL certificates:", error.message);
	console.error("Please ensure you have copied the SSL certificates to the ssl/ directory");
	process.exit(1);
}

const credentials = { key: privateKey, cert: certificate };

// Create HTTPS server
const server = https.createServer(credentials, app);

// Initialize Socket.IO with HTTPS server
const io = new Server(server);

app.set("view engine", "ejs");

app.use(express.static(path.join(__dirname, "node_modules/vue/dist/")));
app.use(express.static(path.join(__dirname, "assets"), {
	setHeaders: (res, path) => {
		if (path.endsWith('.css')) {
			res.setHeader('Content-Type', 'text/css');
		}
	}
}));
app.use(express.static(path.join(__dirname, "www"), { 
	maxAge: 0,
	setHeaders: (res, path) => {
		if (path.endsWith('.css')) {
			res.setHeader('Content-Type', 'text/css');
		}
	}
}));

// Add after other middleware but before routes
app.use(express.json());
aiEndpoints(app);

// Modify the Socket.IO connection handler
io.sockets.on("connection", (socket) => {
	// Handle regular signaling
	signallingServer(socket);
	// Handle AI events
	aiServer(socket);
});

app.get("/", (req, res) => res.render("index", { page: "index", title: "A free video chat for the web." }));

app.get("/faq", (req, res) => res.render("faq", { page: "faq", title: "Frequently asked questions" }));
app.get(["/privacy", "/legal", "/terms"], (req, res) =>
	res.render("privacy", { page: "privacy", title: "Privacy policy" })
);
app.get("/404", (req, res) => res.render("404", { page: "404", title: "Page not found" }));

app.get("/:channel", (req, res) => {
	const channel = req.params.channel;
	const channelRegex = /^([a-zA-Z0-9-]){1,100}$/;
	if (!channelRegex.test(channel)) {
		return res.render("invalid", { page: "invalid-channel", title: "Invalid channel" });
	}
	// Force HTTPS
	if (!req.secure && process.env.NODE_ENV !== "development") {
		return res.redirect(`https://${req.headers.host}${req.url}`);
	}
	res.render("channel", { page: "channel", title: channel });
});

app.use("/*", (req, res) => res.render("404", { page: "404", title: "Page not found" }));

// Listen on HTTPS
server.listen(config.PORT, () => {
	console.log(`Server is running on port ${config.PORT}`);
	console.log({ port: config.PORT, node_version: process.versions.node });
});
