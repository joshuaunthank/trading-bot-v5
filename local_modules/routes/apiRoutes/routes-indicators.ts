import * as express from "express";

const indicatorRoutes = (router: express.Router) => {
	const indicators = express.Router();

	indicators.get("/indicators", (req, res) => {
		// get all indicators from /local_modules/db/indicators
		res.json({
			message: "List of all indicators will be implemented here.",
		});
	});

	indicators.get("/indicators/:id", (req, res) => {
		// get indicator by ID
		res.json({
			message: `Details of indicator with ID ${req.params.id} will be implemented here.`,
		});
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
