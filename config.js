module.exports = {
	NODE_ENV: process.env.NODE_ENV,
	PORT: process.env.PORT || 9000,
	CORS_ORIGIN: process.env.NODE_ENV === "development" 
		? "https://localhost:9000*,http://localhost:9000*"
		: "https://hello.vasanthv.me:*",
	SECURE: process.env.NODE_ENV !== "development",
	OPENAI_API_KEY: process.env.OPENAI_API_KEY
};
