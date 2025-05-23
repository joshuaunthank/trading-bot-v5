import express from "express";
import path from "path";

const uiRoutes = express.Router();

// Serve static frontend assets (Vite build output)
uiRoutes.use(express.static(path.join(__dirname, "../../dist")));

// Serve index.html for root and SPA fallback (production)
uiRoutes.get(["/", "/index.html"], (_req, res) => {
	res.sendFile(path.join(__dirname, "../../dist/index.html"));
});

export default uiRoutes;
