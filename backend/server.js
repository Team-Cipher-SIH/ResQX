require("dotenv").config();

const http = require("http");
const app = require("./src/app.js");
const connectDB = require("./src/config/database.js");
const { setupSocketIO } = require("./src/config/socket.js");
const { seedAdmin } = require("./src/utils/seedAdmin.js");

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

async function startServer() {
	await connectDB();
	await seedAdmin();
	setupSocketIO(server);
	server.listen(PORT, () => {
		console.log(`Server is running on port ${PORT}`);
	});
}

startServer().catch((error) => {
	console.error("Unable to start server:", error.message);
	process.exit(1);
});
