require("dotenv").config();
const app = require("./src/app.js");
const connectDB = require("./src/config/database.js");
const PORT = process.env.PORT || 5000;

async function startServer() {
	await connectDB();
	app.listen(PORT, () => {
		console.log(`Server is running on port ${PORT}`);
	});
}

startServer().catch((error) => {
	console.error("Unable to start server:", error.message);
	process.exit(1);
});
