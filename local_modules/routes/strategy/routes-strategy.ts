import express from "express";
import fs from "fs";
import path from "path";

const strategyRoutes = (api: any) => {
	const strategies = express.Router();
	const strategiesDir = path.join(__dirname, "../../strategies");

	// List all JSON strategies
	strategies.get("/strategies", (req, res) => {
		const files = fs.readdirSync(strategiesDir);
		const jsonFiles = files.filter((f) => f.endsWith(".json"));
		const strategiesList = jsonFiles.reduce((list, f) => {
			const filePath = path.join(strategiesDir, f);
			try {
				const content = fs.readFileSync(filePath, "utf8");
				if (!content.trim()) {
					console.warn(`Skipping empty JSON file: ${f}`);
					return list;
				}
				const json = JSON.parse(content);
				list.push({
					name: json.name || f.replace(/\.json$/, ""),
					description: json.description || "",
				});
			} catch (err) {
				console.error(`Skipping invalid JSON file ${f}:`, err);
			}
			return list;
		}, [] as Array<{ name: string; description: string }>);
		res.json(strategiesList);
		return;
	});

	// Create a new JSON strategy
	strategies.post("/strategies", (req, res) => {
		const { name, description, configSchema } = req.body;
		if (!name || !configSchema) {
			res.status(400).json({ error: "Missing required name or configSchema" });
			return;
		}
		const fileName = `${name.toLowerCase().replace(/\s+/g, "_")}.json`;
		const jsonPath = path.join(strategiesDir, fileName);
		if (fs.existsSync(jsonPath)) {
			res.status(409).json({ error: "Strategy already exists" });
			return;
		}
		const newStrategy = { name, description: description || "", configSchema };
		try {
			fs.writeFileSync(jsonPath, JSON.stringify(newStrategy, null, 2));
			res
				.status(201)
				.json({ message: "Strategy created", strategy: newStrategy });
			return;
		} catch (err) {
			console.error("Error creating strategy:", err);
			res.status(500).json({ error: "Failed to create strategy" });
			return;
		}
	});

	// Get full strategy JSON
	strategies.get("/strategies/:name", (req, res) => {
		const { name } = req.params;
		const jsonPath = path.join(strategiesDir, `${name.toLowerCase()}.json`);
		if (!fs.existsSync(jsonPath)) {
			res.status(404).json({ error: "Strategy not found" });
			return;
		}
		try {
			const s = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
			// Map stored JSON to full Strategy shape
			const config = s.configSchema || {};
			const fullStrategy = {
				id: s.name.toLowerCase(),
				name: s.name,
				symbol: config.symbol || "BTC/USDT",
				timeframe: config.timeframe || "1h",
				description: s.description || "",
				enabled: config.enabled ?? true,
				tags: config.tags || [],
				indicators: config.indicators || [],
				models: config.models || [],
				signals: config.signals || [],
				riskConfig: config.riskConfig || {},
			};
			res.json({ strategy: fullStrategy });
			return;
		} catch (err) {
			console.error(`Failed to load strategy ${name}:`, err);
			res.status(500).json({ error: "Failed to load strategy" });
			return;
		}
	});

	// Run a JSON strategy (simulate DB-driven execution)
	strategies.post("/strategies/:name/run", async (req, res) => {
		const { name } = req.params;
		const jsonPath = path.join(strategiesDir, `${name.toLowerCase()}.json`);
		if (!fs.existsSync(jsonPath)) {
			res.status(404).json({ error: "Strategy not found" });
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
		return;
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
		return;
	});

	// Save or update existing strategy
	strategies.post("/strategies/:name/save", async (req, res) => {
		const { name } = req.params;
		const jsonPath = path.join(strategiesDir, `${name.toLowerCase()}.json`);
		if (!fs.existsSync(jsonPath)) {
			res.status(404).json({ error: "Strategy not found" });
			return;
		}
		try {
			const json = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
			// Update the JSON with new data
			json.configSchema = req.body.configSchema || json.configSchema;
			json.description = req.body.description || json.description;
			// Save the updated JSON back to file
			fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2));
			res.json({ message: "Strategy updated successfully", strategy: json });
			return;
		} catch (e) {
			console.error("Error saving strategy:", e);
			res.status(500).json({ error: "Failed to save strategy" });
			return;
		}
	});

	// Delete a strategy
	strategies.delete("/strategies/:name/delete", async (req, res) => {
		const { name } = req.params;
		const jsonPath = path.join(strategiesDir, `${name.toLowerCase()}.json`);
		if (!fs.existsSync(jsonPath)) {
			res.status(404).json({ error: "Strategy not found" });
			return;
		}
		try {
			fs.unlinkSync(jsonPath);
			res.json({ message: "Strategy deleted successfully" });
			return;
		} catch (e) {
			console.error("Error deleting strategy:", e);
			res.status(500).json({ error: "Failed to delete strategy" });
			return;
		}
	});

	// Update strategy config schema (if needed)
	strategies.put("/strategies/:name/config", async (req, res) => {
		const { name } = req.params;
		const jsonPath = path.join(strategiesDir, `${name.toLowerCase()}.json`);
		if (!fs.existsSync(jsonPath)) {
			res.status(404).json({ error: "Strategy not found" });
			return;
		}
		try {
			const json = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
			// Update the config schema
			json.configSchema = req.body.configSchema || json.configSchema;
			json.description = req.body.description || json.description;
			// Save the updated JSON back to file
			fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2));
			res.json({
				message: "Config schema updated successfully",
				strategy: json,
			});
			return;
		} catch (e) {
			console.error("Error updating config schema:", e);
			res.status(500).json({ error: "Failed to update config schema" });
			return;
		}
	});

	api.use("/", strategies);
};

export default strategyRoutes;
