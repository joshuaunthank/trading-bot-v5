import express from "express";
import fs from "fs";
import path from "path";

const strategyRoutes = (api: any) => {
	const strategies = express.Router();
	const strategiesDir = path.join(__dirname, "../../strategies");

	// List all JSON strategies
	strategies.get("/strategies", (req, res) => {
		const files = fs.readdirSync(strategiesDir);
		const jsonStrategies = files.filter((f) => f.endsWith(".json"));
		const strategiesList = jsonStrategies.map((f) => {
			const json = JSON.parse(
				fs.readFileSync(path.join(strategiesDir, f), "utf8")
			);
			return {
				name: json.name || f.replace(/\.json$/, ""),
				description: json.description || "",
			};
		});
		res.json(strategiesList);
	});

	// Run a JSON strategy (simulate DB-driven execution)
	strategies.post("/strategies/:name/run", async (req, res) => {
		const { name } = req.params;
		const jsonPath = path.join(strategiesDir, `${name.toLowerCase()}.json`);
		if (!fs.existsSync(jsonPath)) {
			res.status(404).json({ error: "Strategy not found" });
			return;
		}
		const json = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
		// Simulate execution: just echo config and params for now
		// In a real DB-driven system, this would dispatch to a generic engine
		res.json({
			result: {
				strategy: name,
				config: json.configSchema,
				params: req.body,
				message: "Strategy execution is not implemented in JSON-only mode.",
			},
		});
	});

	// Get config schema for a JSON strategy
	strategies.get("/strategies/:name/config", (req, res) => {
		const { name } = req.params;
		const jsonPath = path.join(strategiesDir, `${name.toLowerCase()}.json`);
		if (fs.existsSync(jsonPath)) {
			try {
				const json = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
				console.log(json);

				if (json.configSchema) {
					res.json({
						schema: json.configSchema,
						name: json.name,
						description: json.description,
					});
					return;
				}
				res.status(404).json({ error: "No configSchema in JSON file." });
				return;
			} catch (e) {
				res.status(500).json({ error: "Failed to load config JSON." });
				return;
			}
		}
		res.status(404).json({ error: "Strategy not found" });
	});

	api.use("/", strategies);
};

export default strategyRoutes;
