#!/usr/bin/env ts-node

// Debug script to verify indicator alignment with OHLCV data
// This will help us understand if the indicators are ending at the correct timestamp

import {
	OHLCVData,
	IndicatorConfig,
	useLocalIndicators,
} from "./src/hooks/useLocalIndicators";

// Mock OHLCV data (100 candles for testing)
const generateMockOHLCVData = (count: number): OHLCVData[] => {
	const data: OHLCVData[] = [];
	const baseTime = Date.now() - count * 60 * 60 * 1000; // Start from 'count' hours ago
	let price = 50000; // Starting price

	for (let i = 0; i < count; i++) {
		// Simple random walk
		const change = (Math.random() - 0.5) * 100;
		price += change;

		data.push({
			timestamp: baseTime + i * 60 * 60 * 1000, // 1 hour intervals
			open: price - change / 2,
			high: Math.max(price, price - change / 2) + Math.random() * 50,
			low: Math.min(price, price - change / 2) - Math.random() * 50,
			close: price,
			volume: Math.random() * 1000000,
		});
	}

	return data;
};

// Test indicator configurations
const testConfigs: IndicatorConfig[] = [
	{ id: "ema20", type: "EMA", period: 20, enabled: true },
	{ id: "sma20", type: "SMA", period: 20, enabled: true },
	{ id: "rsi14", type: "RSI", period: 14, enabled: true },
	{ id: "macd", type: "MACD", enabled: true },
	{ id: "bb20", type: "BB", period: 20, enabled: true },
];

const main = () => {
	console.log("🔍 Testing Indicator Alignment\n");

	// Generate test data
	const ohlcvData = generateMockOHLCVData(100);
	console.log(`📊 Generated ${ohlcvData.length} OHLCV candles`);
	console.log(
		`   First timestamp: ${new Date(ohlcvData[0].timestamp).toISOString()}`
	);
	console.log(
		`   Last timestamp:  ${new Date(
			ohlcvData[ohlcvData.length - 1].timestamp
		).toISOString()}\n`
	);

	// Use the actual hook function directly (simulate React's useMemo)
	const { useLocalIndicators } = require("./src/hooks/useLocalIndicators");

	// Call the function directly since we can't use React hooks in Node.js
	// This simulates what the useMemo would do
	const results = (() => {
		if (!ohlcvData || ohlcvData.length === 0 || testConfigs.length === 0) {
			return [];
		}

		const results = [];
		const indicatorCounts = {};

		testConfigs.forEach((config) => {
			if (!config.enabled) return;

			// Track instances for dynamic axis assignment
			const instanceIndex = indicatorCounts[config.type] || 0;
			indicatorCounts[config.type] = instanceIndex + 1;

			// Import the internal function
			const {
				calculateIndicatorWithLibrary,
			} = require("./src/hooks/useLocalIndicators");

			try {
				const indicatorResults = calculateIndicatorWithLibrary(
					config.type,
					ohlcvData,
					config
				);

				console.log(`📈 Testing ${config.type}:`);
				console.log(`   Results generated: ${indicatorResults.length} series`);

				indicatorResults.forEach((result) => {
					console.log(`   - ${result.name}: ${result.data.length} data points`);
					const validPoints = result.data.filter((p) => p.y !== null).length;
					const nullPoints = result.data.filter((p) => p.y === null).length;
					console.log(`     Valid: ${validPoints}, Null: ${nullPoints}`);

					if (result.data.length !== ohlcvData.length) {
						console.log(
							`     ❌ Length mismatch! Expected ${ohlcvData.length}, got ${result.data.length}`
						);
					} else {
						console.log(`     ✅ Length matches OHLCV data`);
					}
				});

				results.push(...indicatorResults);
			} catch (error) {
				console.error(`❌ Error testing ${config.type}:`, error.message);
			}

			console.log("");
		});

		return results;
	})();

	console.log("🎯 Summary:");
	console.log(`   Total indicator series generated: ${results.length}`);
	console.log(`   OHLCV data length: ${ohlcvData.length}`);

	const allMatch = results.every(
		(result) => result.data.length === ohlcvData.length
	);
	console.log(
		`   All indicators match OHLCV length: ${allMatch ? "✅" : "❌"}`
	);
};

if (require.main === module) {
	main();
}
