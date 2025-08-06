/**
 * Test the hybrid indicator styling system
 * Verifies that backend sends complete metadata and frontend uses it properly
 */

const {
	calculateStrategyIndicators,
} = require("./local_modules/utils/strategyIndicators.js");

// Mock OHLCV data for testing
const mockOHLCVData = [
	{
		timestamp: 1609459200000,
		open: 100,
		high: 110,
		low: 95,
		close: 105,
		volume: 1000,
	},
	{
		timestamp: 1609462800000,
		open: 105,
		high: 115,
		low: 100,
		close: 110,
		volume: 1200,
	},
	{
		timestamp: 1609466400000,
		open: 110,
		high: 120,
		low: 105,
		close: 115,
		volume: 1100,
	},
	{
		timestamp: 1609470000000,
		open: 115,
		high: 125,
		low: 110,
		close: 120,
		volume: 1300,
	},
	// Add more data points...
	...Array.from({ length: 50 }, (_, i) => ({
		timestamp: 1609459200000 + (i + 5) * 3600000,
		open: 120 + Math.sin(i * 0.1) * 10,
		high: 130 + Math.sin(i * 0.1) * 10,
		low: 110 + Math.sin(i * 0.1) * 10,
		close: 125 + Math.sin(i * 0.1) * 10,
		volume: 1000 + Math.random() * 500,
	})),
];

async function testHybridSystem() {
	console.log("🧪 Testing Hybrid Indicator Styling System\n");

	try {
		// Temporarily suppress console.log to avoid data pollution
		const originalLog = console.log;
		console.log = () => {}; // Suppress all console.log during calculation

		// Test with a strategy that has MACD (which creates multiple components)
		const results = calculateStrategyIndicators("test_create", mockOHLCVData);

		// Restore console.log
		console.log = originalLog;

		console.log(`📊 Calculated ${results.length} indicators:`);

		results.forEach((indicator, index) => {
			console.log(`\n${index + 1}. ${indicator.name} (${indicator.id})`);
			console.log(`   Type: ${indicator.type}`);
			console.log(`   Color: ${indicator.color || "N/A"}`);
			console.log(`   Y-Axis: ${indicator.yAxisID || "N/A"}`);
			console.log(`   Render Type: ${indicator.renderType || "N/A"}`);
			console.log(`   Stroke Width: ${indicator.strokeWidth || "N/A"}`);
			console.log(`   Opacity: ${indicator.opacity || "N/A"}`);
			console.log(`   Data Points: ${indicator.data.length}`);

			// Check if this indicator has complete metadata (but don't log the data array)
			const hasCompleteMetadata = !!(
				indicator.color &&
				indicator.yAxisID &&
				indicator.renderType
			);
			console.log(
				`   ✅ Complete Metadata: ${hasCompleteMetadata ? "YES" : "NO"}`
			);

			if (!hasCompleteMetadata) {
				console.log(
					`   ⚠️  Missing: ${!indicator.color ? "color " : ""}${
						!indicator.yAxisID ? "yAxisID " : ""
					}${!indicator.renderType ? "renderType" : ""}`
				);
			}
		});

		// Summary
		const completeCount = results.filter(
			(r) => r.color && r.yAxisID && r.renderType
		).length;
		const incompleteCount = results.length - completeCount;

		console.log(`\n📈 Summary:`);
		console.log(`   ✅ Indicators with complete metadata: ${completeCount}`);
		console.log(`   ⚠️  Indicators requiring fallbacks: ${incompleteCount}`);

		if (completeCount === results.length) {
			console.log(
				`\n🎉 SUCCESS: All indicators have complete styling metadata!`
			);
			console.log(`   Backend is providing user colors + intelligent defaults`);
			console.log(`   Frontend will use backend metadata directly`);
		} else {
			console.log(
				`\n⚡ HYBRID: Some indicators will use pattern-based fallbacks`
			);
		}
	} catch (error) {
		console.error("❌ Test failed:", error);
	}
}

testHybridSystem();
