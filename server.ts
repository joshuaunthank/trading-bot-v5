// Main Entyry point
const express = require("express");
const path = require("path");
const PORT = process.env.PORT || 3000;

const uiRoutes = require("./local_modules/routes/routes-ui");
const apiRoutes = require("./local_modules/routes/routes-api");

(async () => {
	// auto start server

	const app = express();

	app.use(express.json());
	app.use(express.urlencoded({ extended: true }));

	uiRoutes(app);
	apiRoutes(app);

	app.use(express.static(path.join(__dirname, "public")));
	app.use("node_modules", express.static(path.join(__dirname, "node_modules")));

	app.listen(PORT, () => {
		console.log(`Server is running on http://localhost:${PORT}`);
	});
})();
