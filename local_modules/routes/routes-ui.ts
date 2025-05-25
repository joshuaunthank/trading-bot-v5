import express from "express";
import path from "path";

const uiRoutes = (app: any) => {
	const ui = express.Router();

	// Serve static frontend assets (Vite build output)
	ui.use(express.static(path.join(__dirname, "../../dist")));

	// Serve index.html for root and SPA fallback (production)
	ui.get(["/", "/index.html"], (_req, res) => {
		res.sendFile(path.join(__dirname, "../../dist/index.html"));
	});

	app.use("/", ui);
};

export default uiRoutes;
