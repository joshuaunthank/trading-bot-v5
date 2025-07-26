import * as express from "express";
import * as path from "path";

const uiRoutes = (app: any) => {
	const ui = express.Router();

	// Determine correct path to frontend files
	// In development: __dirname is local_modules/routes, so ../../dist works
	// In production: __dirname is dist/local_modules/routes, so ../../ works (root of dist)
	const frontendPath =
		process.env.NODE_ENV === "production"
			? path.join(__dirname, "../../") // From dist/local_modules/routes to dist/
			: path.join(__dirname, "../../dist");

	// Serve static frontend assets (Vite build output)
	ui.use(express.static(frontendPath));

	// Serve index.html for root and SPA fallback (production)
	ui.get(["/", "/index.html"], (_req, res) => {
		res.sendFile(path.join(frontendPath, "index.html"));
	});

	app.use("/", ui);
};

export default uiRoutes;
