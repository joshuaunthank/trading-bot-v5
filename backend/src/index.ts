import ccxt from "ccxt";
import express from "express";
import cors from "cors";
import { Strategy } from "./strategy";
import { Model } from "./model";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

// Example: Binance margin trading setup
async function createBinanceMarginClient(apiKey: string, secret: string) {
	const exchange = new ccxt.binance({
		apiKey,
		secret,
		options: { defaultType: "margin" },
		enableRateLimit: true,
	});
	await exchange.loadMarkets();
	return exchange;
}

// Dynamic strategy loader
function loadStrategies(): Strategy[] {
	const strategies: Strategy[] = [];
	const strategiesDir = path.join(__dirname, "strategies");
	for (const file of fs.readdirSync(strategiesDir)) {
		if (file.endsWith("_strategy.ts") || file.endsWith("_strategy.js")) {
			const mod = require(path.join(strategiesDir, file));
			for (const key in mod) {
				if (typeof mod[key] === "function" && mod[key].prototype?.run) {
					try {
						const instance = new mod[key]();
						if (instance.name && instance.run) strategies.push(instance);
					} catch {}
				}
			}
		}
	}
	return strategies;
}

// Placeholder for dynamic strategy/model loading
const strategies: Strategy[] = loadStrategies();
const models: Model[] = [];

// Express API setup
const app = express();
app.use(cors());
app.use(express.json());

// List available strategies
(app as any).get("/api/strategies", (req: any, res: any) => {
	res.json(
		strategies.map((s) => ({ name: s.name, description: s.description }))
	);
});

// Run a strategy by name
(app as any).post("/api/strategies/:name/run", async (req: any, res: any) => {
	const { name } = req.params;
	const params = req.body;
	const strategy = strategies.find((s) => s.name === name);
	if (!strategy) return res.status(404).json({ error: "Strategy not found" });
	try {
		const result = await strategy.run(params);
		res.json(result);
	} catch (e: any) {
		res.status(500).json({ error: e.message });
	}
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
	console.log(`Backend API listening on port ${PORT}`);
});

// Example usage (replace with your API keys)
(async () => {
	// const binance = await createBinanceMarginClient('YOUR_API_KEY', 'YOUR_SECRET');
	// console.log(await binance.fetchBalance());
})();
