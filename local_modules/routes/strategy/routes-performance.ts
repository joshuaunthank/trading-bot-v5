import { Router, Request, Response } from "express";
import * as fs from "fs/promises";
import * as path from "path";

const router = Router();

interface StrategyTrade {
	timestamp: number;
	type: "entry" | "exit";
	side: "long" | "short";
	price: number;
	amount: number;
}

interface StrategyPerformance {
	trades: StrategyTrade[];
	dates: string[];
	pnl: number[];
	cumulativePnl: number[];
	wins: number;
	losses: number;
	labels: string[];
}

/**
 * Get strategy performance data
 * GET /api/v1/strategy/:id/performance
 */
router.get("/:id/performance", async (req: Request, res: Response) => {
	try {
		const { id } = req.params;

		// Validate the strategy ID
		if (!id || id.includes("..") || id.includes("/")) {
			res.status(400).json({
				success: false,
				message: "Invalid strategy ID",
			});
			return;
		}

		// Check if strategy results file exists
		const resultsDir = path.join(
			process.cwd(),
			"local_modules",
			"strategies",
			"results"
		);
		const resultsFile = path.join(resultsDir, `${id}.results.json`);

		try {
			await fs.access(resultsFile);
		} catch (error) {
			// If no results file exists, generate some sample data
			// In a real implementation, this would be calculated from actual trades
			const samplePerformance = generateSamplePerformance();
			res.status(200).json({
				success: true,
				data: samplePerformance,
			});
			return;
		}

		// Read results file
		const resultsData = await fs.readFile(resultsFile, "utf8");
		const results = JSON.parse(resultsData);

		// Calculate performance metrics from results
		const performance = calculatePerformance(results);

		res.status(200).json({
			success: true,
			data: performance,
		});
	} catch (error) {
		console.error("Error fetching strategy performance:", error);
		res.status(500).json({
			success: false,
			message: "Error fetching strategy performance",
			error: String(error),
		});
	}
});

/**
 * Calculate performance metrics from strategy results
 */
function calculatePerformance(results: any): StrategyPerformance {
	// If we have a proper results file, parse it and calculate real metrics
	// This is a placeholder implementation
	return generateSamplePerformance();
}

/**
 * Generate sample performance data for demo purposes
 */
function generateSamplePerformance(): StrategyPerformance {
	const now = Date.now();
	const dayMs = 24 * 60 * 60 * 1000;
	const dates: string[] = [];
	const pnl: number[] = [];
	const trades: StrategyTrade[] = [];

	// Generate 30 days of data
	for (let i = 30; i >= 0; i--) {
		const timestamp = now - i * dayMs;
		const date = new Date(timestamp).toISOString().split("T")[0];
		dates.push(date);

		// Random PnL between -5% and +5%
		const tradePnl = Math.random() * 10 - 5;
		pnl.push(Number(tradePnl.toFixed(2)));

		// Create sample trade
		if (Math.random() > 0.3) {
			// 70% chance of having a trade on this day
			const isBuy = Math.random() > 0.5;
			const isEntry = Math.random() > 0.5;

			trades.push({
				timestamp,
				type: isEntry ? "entry" : "exit",
				side: isBuy ? "long" : "short",
				price: 20000 + Math.random() * 10000,
				amount: 0.1 + Math.random() * 0.9,
			});
		}
	}

	// Calculate cumulative PnL
	const cumulativePnl: number[] = [];
	let cumulative = 0;

	for (const p of pnl) {
		cumulative += p;
		cumulativePnl.push(Number(cumulative.toFixed(2)));
	}

	// Count wins and losses
	const wins = pnl.filter((p) => p > 0).length;
	const losses = pnl.filter((p) => p < 0).length;

	// Create labels (same as dates for now)
	const labels = [...dates];

	return {
		trades,
		dates,
		pnl,
		cumulativePnl,
		wins,
		losses,
		labels,
	};
}

export default router;
