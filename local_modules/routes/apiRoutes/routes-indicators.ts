import * as express from "express";
import * as fs from "fs";
import * as path from "path";

const indicatorRoutes = (router: express.Router) => {
	const indicators = express.Router();
	const indicatorsPath = path.join(__dirname, "../../db/indicators");

	indicators.get("/indicators", (req, res) => {
		try {
			// Return the indicators registry
			const registryPath = path.join(indicatorsPath, "indicators.json");
			const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
			res.json(registry);
		} catch (error) {
			console.error("Error reading indicators registry:", error);
			res.status(500).json({ error: "Failed to load indicators registry" });
		}
	});

	indicators.get("/indicators/types", (req, res) => {
		try {
			// Return just the indicator types/names for dropdowns
			const registryPath = path.join(indicatorsPath, "indicators.json");
			const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
			const types = registry.map((indicator: any) => indicator.id);
			res.json(types);
		} catch (error) {
			console.error("Error reading indicator types:", error);
			res.status(500).json({ error: "Failed to load indicator types" });
		}
	});

	indicators.get("/indicators/:id", (req, res) => {
		try {
			// Return specific indicator details
			const indicatorPath = path.join(indicatorsPath, `${req.params.id}.json`);

			if (!fs.existsSync(indicatorPath)) {
				res.status(404).json({ error: "Indicator not found" });
				return;
			}

			const indicator = JSON.parse(fs.readFileSync(indicatorPath, "utf8"));
			res.json(indicator);
		} catch (error) {
			console.error(`Error reading indicator ${req.params.id}:`, error);
			res.status(500).json({ error: "Failed to load indicator details" });
		}
	});

	indicators.post("/indicators", (req, res) => {
		// create new indicator
		res.json({ message: "New indicator creation will be implemented here." });
	});

	indicators.put("/indicators/:id", (req, res) => {
		// update indicator by ID
		res.json({
			message: `Updating indicator with ID ${req.params.id} will be implemented here.`,
		});
	});

	indicators.delete("/indicators/:id", (req, res) => {
		// delete indicator by ID
		res.json({
			message: `Deleting indicator with ID ${req.params.id} will be implemented here.`,
		});
	});

	router.use("/", indicators);
};

export default indicatorRoutes;
