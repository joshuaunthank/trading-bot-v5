import * as fs from "fs";
import * as path from "path";

interface StrategyFile {
	id: string;
	name: string;
	description?: string;
	indicators?: any[];
	signals?: any[];
	risk_management?: any;
	ml_models?: any[];
	postprocessing?: any[];
	metadata?: any;
	last_updated?: string;
}

const STRATEGIES_DIR = path.join(__dirname, "../db/strategies");
const BACKUP_DIR = path.join(__dirname, "../db/strategies/backups");

async function migrateStrategies() {
	console.log("🔄 Starting strategy schema migration...");

	// Create backup directory
	if (!fs.existsSync(BACKUP_DIR)) {
		fs.mkdirSync(BACKUP_DIR, { recursive: true });
	}

	// Get all strategy files
	const files = fs
		.readdirSync(STRATEGIES_DIR)
		.filter((file) => file.endsWith(".json") && !file.startsWith("."));

	console.log(`📁 Found ${files.length} strategy files to migrate`);

	for (const file of files) {
		const filePath = path.join(STRATEGIES_DIR, file);
		const backupPath = path.join(BACKUP_DIR, `${Date.now()}-${file}`);

		try {
			// Read current strategy
			const currentData = JSON.parse(fs.readFileSync(filePath, "utf8"));

			// Create backup
			fs.writeFileSync(backupPath, JSON.stringify(currentData, null, 2));
			console.log(`💾 Backed up ${file} to ${path.basename(backupPath)}`);

			// Migrate to schema-compliant format
			const migratedStrategy: StrategyFile = {
				id: currentData.id || path.basename(file, ".json"),
				name: currentData.name || currentData.id || "Unnamed Strategy",
				description: currentData.description || "",
				indicators: currentData.indicators || [],
				signals: currentData.signals || [],
				risk_management: currentData.risk_management || {
					max_position_size: 0.1,
					stop_loss_percentage: 0.02,
					take_profit_percentage: 0.05,
				},
				ml_models: currentData.ml_models || [],
				postprocessing: currentData.postprocessing || [],
				metadata: {
					...currentData.metadata,
					version: "1.0",
					created: currentData.metadata?.created || new Date().toISOString(),
					author: currentData.metadata?.author || "system",
				},
				last_updated: new Date().toISOString(),
			};

			// Write migrated strategy
			fs.writeFileSync(filePath, JSON.stringify(migratedStrategy, null, 2));
			console.log(`✅ Migrated ${file}`);
		} catch (error) {
			console.error(`❌ Failed to migrate ${file}:`, error);
		}
	}

	console.log("✅ Strategy migration completed");
}

// Run migration if called directly
if (require.main === module) {
	migrateStrategies().catch(console.error);
}

export { migrateStrategies };
