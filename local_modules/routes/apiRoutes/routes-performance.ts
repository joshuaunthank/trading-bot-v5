import * as express from "express";

const performanceRoutes = (router: express.Router) => {
	const performance = express.Router();

	performance.get("/performance", async (req, res) => {
		// List all performance metrics
		res.json({
			message: "List of all performance metrics will be implemented here.",
		});
	});

	performance.get("/performance/:id", async (req, res) => {
		// Get performance metrics by ID
		res.json({
			message: `Details of performance metrics with ID ${req.params.id} will be implemented here.`,
		});
	});

	router.use("/", performance);
};

export default performanceRoutes;
