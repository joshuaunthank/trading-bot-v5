// Main Entyry point
import dotenv from "dotenv";
import express from "express";
import path from "path";
import cors from "cors";

const PORT = process.env.PORT || 3001;
// const uiRoutes = require("./local_modules/routes/routes-ui");
import apiRoutes from "./local_modules/routes/routes-api";
import uiRoutes from "./local_modules/routes/routes-ui";
import { setupMainWebSocket } from "./local_modules/utils/websocket-main";
import { strategyEngineIntegration } from "./local_modules/utils/strategy-engine";

dotenv.config();

(async () => {
	// auto start server

	const app = express();

	app.use(cors()); // Enable CORS for all routes
	app.use(express.json());
	app.use(express.urlencoded({ extended: true }));

	uiRoutes(app);
	apiRoutes(app);

	app.use(express.static(path.join(__dirname, "src")));
	app.use(
		"/node_modules",
		express.static(path.join(__dirname, "node_modules"))
	);

	const server = app.listen(PORT, () => {
		console.log(`Server is running on http://localhost:${PORT}`);
	});

	// --- Initialize Strategy Engine ---
	try {
		await strategyEngineIntegration.initialize();
		console.log("✅ Strategy Engine initialized successfully");
	} catch (error) {
		console.error("❌ Failed to initialize Strategy Engine:", error);
	}

	// --- Attach WebSocket servers ---
	setupMainWebSocket(server); // CCXT Pro WebSocket - no RSV1 errors
})();
