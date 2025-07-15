import * as express from "express";

// Legacy indicator management routes removed for WebSocket-only architecture

// All indicator management endpoints are now deprecated in favor of WebSocket-only architecture.
// This file is retained for reference or future admin/config UI only.

import * as fs from "fs";
import * as path from "path";
import { calculateIndicatorsForStrategy } from "../../utils/strategyIndicators";

const INDICATORS_DIR = path.join(__dirname, "../../db/indicators");

const indicatorRoutes = (router: express.Router) => {
	// GET /api/v1/indicators - List all indicator metadata
	router.get("/indicators", (req, res) => {
		try {
			const files = fs
				.readdirSync(INDICATORS_DIR)
				.filter((f) => f.endsWith(".json"));
			const indicators = files.map((file) => {
				const data = JSON.parse(
					fs.readFileSync(path.join(INDICATORS_DIR, file), "utf8")
				);
				// Only return metadata needed for listing
				return {
					id: data.id,
					name: data.name,
					description: data.description,
					category: data.category,
					type: data.type,
					parameters: data.parameters,
					chart: data.chart,
				};
			});
			res.json(indicators);
		} catch (err) {
			console.error("[API] Failed to list indicators:", err);
			res.status(500).json({ error: "Failed to list indicators" });
		}
	});

	// POST /api/v1/indicators/calculate - Calculate indicator values
	router.post("/indicators/calculate", (req, res) => {
		try {
			const { type, parameters, data } = req.body;
			if (!type || !data) {
				res.status(400).json({ error: "Missing type or data" });
				return;
			}
			// Build a minimal ProcessedIndicator for calculation
			const indicator = {
				id: `${type}_${parameters?.period || "default"}`,
				name: type,
				type,
				parameters: parameters || {},
				color: parameters?.color || "#8884d8",
			};
			// Calculate
			const results = calculateIndicatorsForStrategy(indicator, data);
			// Flatten results for frontend
			if (results.length > 0) {
				// For single-line indicators, return values/timestamps
				const main = results[0];
				res.json({
					values: main.data.map((d) => d.y),
					timestamps: main.data.map((d) => d.x),
					type: main.type,
				});
			} else {
				res.json({ values: [], timestamps: [], type });
			}
		} catch (err) {
			console.error("[API] Indicator calculation error:", err);
			res.status(500).json({ error: "Calculation failed" });
		}
	});
};

export default indicatorRoutes;
