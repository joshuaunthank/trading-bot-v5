import { log } from "console";
import express from "express";
import fs from "fs";
import path from "path";

const indicatorRoutes = (api: any) => {
	const indicators = express.Router();
	const indicatorsDir = path.join(__dirname, "../../indicators");

	// List all JSON indicators
	indicators.get("/indicators", (req, res) => {
		const jsonFile = path.join(indicatorsDir, "indicators.json");

		if (fs.existsSync(jsonFile)) {
			try {
				const indicators = JSON.parse(fs.readFileSync(jsonFile, "utf8"));

				res.json(indicators);
				return;
			} catch (e) {
				res.status(500).json({ error: "Failed to load indicators JSON." });
				return;
			}
		}
		res.status(404).json({ error: "Indicators JSON file not found." });
		return;
	});

	// Get config schema for a JSON indicator
	indicators.get("/indicators/:name/config", (req, res) => {
		const { name } = req.params;
		const jsonFile = path.join(indicatorsDir, "indicators.json");

		if (fs.existsSync(jsonFile)) {
			try {
				const indicators = JSON.parse(fs.readFileSync(jsonFile, "utf8"));

				const indicator = indicators.find(
					(ind: any) => ind.name.toLowerCase() === name.toLowerCase()
				);

				if (indicator) {
					res.json({ indicator });
					return;
				} else {
					res.status(404).json({ error: "Indicator not found." });
					return;
				}
			} catch (e) {
				res.status(500).json({ error: "Failed to load indicators JSON." });
				return;
			}
		}
		res.status(404).json({ error: "Indicators JSON file not found." });
		return;
	});

	api.use("/", indicators);
};

export default indicatorRoutes;
