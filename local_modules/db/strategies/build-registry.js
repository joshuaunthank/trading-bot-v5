const fs = require("fs");
const path = require("path");

const strategiesDir =
	"/Users/maxr/Projects/trading-bot-v5/local_modules/db/strategies";
const registryFile = path.join(strategiesDir, "strategies.json");

// Read all JSON files that are not registry or schema files
const files = fs
	.readdirSync(strategiesDir)
	.filter(
		(file) =>
			file.endsWith(".json") &&
			file !== "strategies.json" &&
			file !== "strategy.schema.json"
	);

const strategySummaries = [];

files.forEach((file) => {
	try {
		const filePath = path.join(strategiesDir, file);
		const strategy = JSON.parse(fs.readFileSync(filePath, "utf8"));

		// Create summary object for the registry
		const summary = {
			id: strategy.id,
			name: strategy.name,
			description: strategy.description || "",
			status: "inactive", // Default status
			last_updated: strategy.last_updated || new Date().toISOString(),
		};

		strategySummaries.push(summary);
	} catch (error) {
		console.error(`Error reading strategy file ${file}:`, error.message);
	}
});

// Write the registry as an array
fs.writeFileSync(registryFile, JSON.stringify(strategySummaries, null, 2));
console.log(
	`Created strategies registry with ${strategySummaries.length} strategies`
);
console.log("Strategies:", strategySummaries.map((s) => s.name).join(", "));
