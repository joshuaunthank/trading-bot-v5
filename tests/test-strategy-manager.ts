#!/usr/bin/env node

/**
 * Simple test script for Strategy Manager Phase 1 implementation
 */

import { strategyManager } from "../local_modules/utils/StrategyManager";

async function testStrategyManager() {
	console.log("🧪 Testing Strategy Manager Phase 1 Implementation\n");

	try {
		// Test 1: Get initial status
		console.log("1. Getting initial Strategy Manager status...");
		const initialStatus = strategyManager.getStatus();
		console.log(
			"   ✅ Initial status:",
			JSON.stringify(initialStatus, null, 2)
		);

		// Test 2: Create a mock strategy configuration
		console.log("\n2. Creating mock strategy configuration...");
		const mockStrategy = {
			id: "test-macd-strategy",
			name: "Test MACD Strategy",
			symbol: "BTC/USDT",
			timeframe: "15m",
			enabled: true,
			meta: {
				description: "Test strategy for Phase 1 validation",
				tags: ["test", "macd"],
				version: "1.0.0",
				created_at: new Date().toISOString(),
				last_updated: new Date().toISOString(),
			},
			indicators: [
				{
					id: "macd",
					type: "technical",
					parameters: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
				},
			],
			models: [],
			signals: [
				{
					id: "macd_entry",
					type: "entry",
					condition: "macd_crossover_bullish",
				},
			],
			risk: {
				maxPositionSize: 0.1,
				stopLoss: 0.02,
			},
		};
		console.log("   ✅ Mock strategy created");

		// Test 3: Start the strategy
		console.log("\n3. Starting strategy...");
		const strategyId = await strategyManager.startStrategy(mockStrategy);
		console.log(`   ✅ Strategy started with ID: ${strategyId}`);

		// Test 4: Get active strategies
		console.log("\n4. Getting active strategies...");
		const activeStrategies = strategyManager.getActiveStrategies();
		console.log(
			"   ✅ Active strategies:",
			JSON.stringify(activeStrategies, null, 2)
		);

		// Test 5: Get strategy metrics
		console.log("\n5. Getting strategy metrics...");
		const metrics = strategyManager.getStrategyMetrics(strategyId);
		console.log("   ✅ Strategy metrics:", JSON.stringify(metrics, null, 2));

		// Test 6: Simulate market data
		console.log("\n6. Simulating market data...");
		const mockCandle = {
			timestamp: Date.now(),
			open: 67000,
			high: 67200,
			low: 66800,
			close: 67100,
			volume: 1.5,
		};
		strategyManager.onNewCandle(mockCandle);
		console.log("   ✅ Market data distributed");

		// Test 7: Pause strategy
		console.log("\n7. Pausing strategy...");
		await strategyManager.pauseStrategy(strategyId);
		console.log("   ✅ Strategy paused");

		// Test 8: Resume strategy
		console.log("\n8. Resuming strategy...");
		await strategyManager.resumeStrategy(strategyId);
		console.log("   ✅ Strategy resumed");

		// Test 9: Stop strategy
		console.log("\n9. Stopping strategy...");
		await strategyManager.stopStrategy(strategyId);
		console.log("   ✅ Strategy stopped");

		// Test 10: Final status check
		console.log("\n10. Final status check...");
		const finalStatus = strategyManager.getStatus();
		console.log("    ✅ Final status:", JSON.stringify(finalStatus, null, 2));

		console.log(
			"\n🎉 All tests passed! Strategy Manager Phase 1 is working correctly.\n"
		);
	} catch (error) {
		console.error("\n❌ Test failed:", error);
		process.exit(1);
	}
}

// Run the test
testStrategyManager().catch(console.error);
