import * as express from "express";
import * as fs from "fs";
import * as path from "path";

const strategyRoutes = (router: express.Router) => {
	const strategies = express.Router();
	const strategiesPath = path.join(__dirname, "../../db/strategies");

	// GET /api/v1/strategies
	strategies.get("/strategies", (req, res) => {
		try {
			// Return the strategies registry
			const registryPath = path.join(strategiesPath, "strategies.json");
			const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
			res.json(registry);
		} catch (error) {
			console.error("Error reading strategies registry:", error);
			res.status(500).json({ error: "Failed to load strategies registry" });
		}
	});

	// GET /api/v1/strategies/:id
	strategies.get("/strategies/:id", (req, res) => {
		try {
			// Return specific strategy details
			const strategyPath = path.join(strategiesPath, `${req.params.id}.json`);

			if (!fs.existsSync(strategyPath)) {
				res.status(404).json({ error: "Strategy not found" });
				return;
			}

			const strategy = JSON.parse(fs.readFileSync(strategyPath, "utf8"));
			res.json(strategy);
		} catch (error) {
			console.error(`Error reading strategy ${req.params.id}:`, error);
			res.status(500).json({ error: "Failed to load strategy details" });
		}
	});

	// POST /api/v1/strategies/:id/run
	strategies.post("/strategies", (req, res) => {
		// Create a new strategy
		res.json({ message: "New strategy creation will be implemented here." });
	});

	// POST /api/v1/strategies/:id/clone
	strategies.post("/strategies/:id/clone", (req, res) => {
		// Clone a strategy by ID
		res.json({
			message: `Cloning of strategy with ID ${req.params.id} will be implemented here.`,
		});
	});

	// PUT /api/v1/strategies/:id
	strategies.put("/strategies/:id", (req, res) => {
		// Update an existing strategy
		res.json({
			message: `Updating strategy with ID ${req.params.id} will be implemented here.`,
		});
	});

	// DELETE /api/v1/strategies/:id
	strategies.delete("/strategies/:id", (req, res) => {
		// Delete a strategy by ID
		res.json({
			message: `Deleting strategy with ID ${req.params.id} will be implemented here.`,
		});
	});

	// POST /api/v1/strategies/:id/start
	strategies.post("/strategies/:id/start", (req, res) => {
		// Run a strategy by ID
		res.json({
			message: `Starting strategy with ID ${req.params.id} will be implemented here.`,
		});
	});

	// POST /api/v1/strategies/:id/stop
	strategies.post("/strategies/:id/stop", (req, res) => {
		// Stop a running strategy by ID
		res.json({
			message: `Stopping strategy with ID ${req.params.id} will be implemented here.`,
		});
	});

	// POST /api/v1/strategies/:id/pause
	strategies.post("/strategies/:id/pause", (req, res) => {
		// Pause a running strategy by ID
		res.json({
			message: `Pausing strategy with ID ${req.params.id} will be implemented here.`,
		});
	});

	// POST /api/v1/strategies/:id/resume
	strategies.post("/strategies/:id/resume", (req, res) => {
		// Resume a paused strategy by ID
		res.json({
			message: `Resuming strategy with ID ${req.params.id} will be implemented here.`,
		});
	});

	// GET /api/v1/strategies/:id/status
	strategies.get("/strategies/status", (req, res) => {
		// Get the status of all strategies
		res.json({ message: "Status of all strategies will be implemented here." });
	});

	// GET /api/v1/strategies/:id/status
	strategies.get("/strategies/:id/status", (req, res) => {
		// Get the status of a specific strategy by ID
		res.json({
			message: `Status of strategy with ID ${req.params.id} will be implemented here.`,
		});
	});

	// GET /api/v1/strategies/:id/status
	strategies.get("/strategies/metrics", (req, res) => {
		// Get the metrics of all strategies
		res.json({
			message: "Metrics of all strategies will be implemented here.",
		});
	});

	// GET /api/v1/strategies/:id/status
	strategies.get("/strategies/:id/metrics", (req, res) => {
		// Get the metrics of a specific strategy by ID
		res.json({
			message: `Metrics of strategy with ID ${req.params.id} will be implemented here.`,
		});
	});

	router.use("/", strategies);
};

export default strategyRoutes;
