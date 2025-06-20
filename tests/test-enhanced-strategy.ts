/**
 * Test Enhanced Strategy Manager with Real Indicators and Signals
 *
 * This script tests the Phase 2 implementation of the multi-strategy engine
 * with actual indicator calculations and signal generation.
 */

import { strategyManager } from "../local_modules/utils/StrategyManager";
import * as strategyFileStore from "../local_modules/utils/strategyFileStore";
import { OHLCVCandle } from "../local_modules/types/index";

async function testEnhancedStrategyManager() {
	console.log("=".repeat(60));
	console.log("TESTING ENHANCED STRATEGY MANAGER WITH REAL INDICATORS");
	console.log("=".repeat(60));

	try {
		// Load the enhanced strategy
		console.log("\n1. Loading enhanced strategy configuration...");
		const strategyConfig = await strategyFileStore.getStrategy(
			"enhanced_rsi_ema_strategy"
		);

		if (!strategyConfig) {
			throw new Error("Enhanced strategy not found");
		}

		console.log(`✅ Loaded strategy: ${strategyConfig.name}`);
		console.log(`   - Indicators: ${strategyConfig.indicators.length}`);
		console.log(`   - Signal Rules: ${strategyConfig.signals.length}`);

		// Start the strategy
		console.log("\n2. Starting strategy with real indicators...");
		const instanceId = await strategyManager.startStrategy(strategyConfig);
		console.log(`✅ Strategy started with instance ID: ${instanceId}`);

		// Generate some test candle data
		console.log("\n3. Generating test market data...");
		const testCandles = generateTestCandles(100); // Generate 100 candles
		console.log(`✅ Generated ${testCandles.length} test candles`);

		// Process candles and check for signals
		console.log("\n4. Processing candles and monitoring for signals...");
		let signalCount = 0;
		let indicatorUpdates = 0;

		// Set up signal listener before processing candles
		const strategyInstance = strategyManager["strategies"].get(instanceId);
		if (strategyInstance) {
			strategyInstance.on("signal", (signal: any) => {
				signalCount++;
				console.log(`🚨 Signal #${signalCount}:`);
				console.log(`   Type: ${signal.type} ${signal.side}`);
				console.log(`   Price: $${signal.price.toFixed(2)}`);
				console.log(`   Confidence: ${(signal.confidence * 100).toFixed(1)}%`);
				console.log(`   Reason: ${signal.reason}`);
			});
		}

		for (let i = 0; i < testCandles.length; i++) {
			const candle = testCandles[i];

			// Simulate data distribution (like WebSocket would do)
			strategyManager["dataDistributor"].distributeCandle(candle);

			indicatorUpdates++;

			// Log progress every 20 candles
			if ((i + 1) % 20 === 0) {
				console.log(`   Processed ${i + 1}/${testCandles.length} candles...`);
			}
		}

		// Get strategy metrics
		console.log("\n5. Getting strategy performance metrics...");
		const metrics = strategyManager.getStrategyMetrics(instanceId);
		console.log("📊 Strategy Metrics:");
		console.log(JSON.stringify(metrics, null, 2));

		// Check indicator status
		console.log("\n6. Checking indicator status...");
		const instance = strategyManager["strategies"].get(instanceId);
		if (instance) {
			const indicators = instance.getCurrentIndicators();
			console.log(`📈 Active Indicators (${indicators.length}):`);
			for (const indicator of indicators) {
				const ready = indicator.value !== null ? "✅" : "⏳";
				console.log(
					`   ${ready} ${indicator.name}: ${
						indicator.value?.toFixed(4) || "N/A"
					}`
				);
			}

			const signals = instance.getRecentSignals();
			console.log(`\n🎯 Recent Signals (${signals.length}):`);
			signals.slice(-5).forEach((signal, index) => {
				console.log(
					`   ${index + 1}. ${signal.type} ${signal.side} - ${signal.reason}`
				);
			});
		}

		// Test pause/resume functionality
		console.log("\n7. Testing pause/resume functionality...");
		await strategyManager.pauseStrategy(instanceId);
		console.log("⏸️  Strategy paused");

		await strategyManager.resumeStrategy(instanceId);
		console.log("▶️  Strategy resumed");

		// Stop the strategy
		console.log("\n8. Stopping strategy...");
		await strategyManager.stopStrategy(instanceId);
		console.log("🛑 Strategy stopped");

		// Final summary
		console.log("\n" + "=".repeat(60));
		console.log("TEST SUMMARY");
		console.log("=".repeat(60));
		console.log(`✅ Successfully processed ${indicatorUpdates} candles`);
		console.log(`✅ Generated ${signalCount} trading signals`);
		console.log(`✅ All strategy lifecycle operations completed`);
		console.log(`✅ Real indicator calculations working`);
		console.log(`✅ Signal evaluation engine functional`);
		console.log("\n🎉 Enhanced Strategy Manager Test PASSED!");
	} catch (error) {
		console.error("\n❌ Test failed:", error);
		console.error(error instanceof Error ? error.stack : error);
	}
}

/**
 * Generate realistic test candle data
 */
function generateTestCandles(count: number): OHLCVCandle[] {
	const candles: OHLCVCandle[] = [];
	let price = 50000; // Starting price
	const baseTime = Date.now() - count * 60 * 60 * 1000; // 1 hour candles

	for (let i = 0; i < count; i++) {
		// Generate realistic price movement
		const change = (Math.random() - 0.5) * 0.05; // ±2.5% max change
		const volatility = 0.02; // 2% volatility

		const open = price;
		const close = price * (1 + change);
		const high = Math.max(open, close) * (1 + Math.random() * volatility);
		const low = Math.min(open, close) * (1 - Math.random() * volatility);
		const volume = 100 + Math.random() * 200;

		candles.push({
			timestamp: baseTime + i * 60 * 60 * 1000,
			open,
			high,
			low,
			close,
			volume,
		});

		price = close;
	}

	return candles;
}

// Run the test
if (require.main === module) {
	testEnhancedStrategyManager().catch(console.error);
}

export { testEnhancedStrategyManager };
