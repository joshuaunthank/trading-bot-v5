/**
 * Test Signal Generation with Targeted Market Conditions
 *
 * This script creates specific market scenarios designed to trigger
 * the configured trading signals in our enhanced strategy.
 */

import { strategyManager } from "../local_modules/utils/StrategyManager";
import * as strategyFileStore from "../local_modules/utils/strategyFileStore";
import { OHLCVCandle } from "../local_modules/types/index";

async function testSignalGeneration() {
	console.log("=".repeat(60));
	console.log("TESTING SIGNAL GENERATION WITH TARGETED CONDITIONS");
	console.log("=".repeat(60));

	try {
		// Load strategy
		const strategyConfig = await strategyFileStore.getStrategy(
			"enhanced_rsi_ema_strategy"
		);
		if (!strategyConfig) {
			throw new Error("Strategy not found");
		}

		console.log(`\n✅ Loaded strategy: ${strategyConfig.name}`);

		// Start strategy
		const instanceId = await strategyManager.startStrategy(strategyConfig);
		console.log(`✅ Strategy started: ${instanceId}`);

		// Set up signal monitoring
		let signalCount = 0;
		const signals: any[] = [];

		strategyManager.on("signal", ({ strategyId, signal }: any) => {
			signalCount++;
			signals.push(signal);
			console.log(`\n🚨 SIGNAL #${signalCount} GENERATED:`);
			console.log(`   Strategy: ${strategyId}`);
			console.log(`   Type: ${signal.type} ${signal.side}`);
			console.log(`   Price: $${signal.price.toFixed(2)}`);
			console.log(`   Confidence: ${(signal.confidence * 100).toFixed(1)}%`);
			console.log(`   Reason: ${signal.reason}`);
		});

		// Test 1: RSI Oversold Condition (should trigger long signal)
		console.log("\n📈 TEST 1: Creating RSI Oversold Condition...");
		const oversoldCandles = createOversoldScenario(50000, 30); // Start at 50k, create 30 candles
		await processCandles(oversoldCandles, "RSI Oversold");

		// Give some time for indicators to stabilize
		await sleep(100);

		// Test 2: EMA Golden Cross (should trigger long signal)
		console.log("\n📈 TEST 2: Creating EMA Golden Cross Scenario...");
		const goldenCrossCandles = createGoldenCrossScenario(
			oversoldCandles[oversoldCandles.length - 1].close,
			25
		);
		await processCandles(goldenCrossCandles, "Golden Cross");

		await sleep(100);

		// Test 3: RSI Overbought Condition (should trigger short signal)
		console.log("\n📉 TEST 3: Creating RSI Overbought Condition...");
		const overboughtCandles = createOverboughtScenario(
			goldenCrossCandles[goldenCrossCandles.length - 1].close,
			25
		);
		await processCandles(overboughtCandles, "RSI Overbought");

		await sleep(100);

		// Test 4: MACD Bullish Divergence
		console.log("\n📊 TEST 4: Creating MACD Bullish Scenario...");
		const macdBullishCandles = createMACDBullishScenario(
			overboughtCandles[overboughtCandles.length - 1].close,
			20
		);
		await processCandles(macdBullishCandles, "MACD Bullish");

		await sleep(100);

		// Get final metrics
		console.log("\n📊 FINAL STRATEGY METRICS:");
		const metrics = strategyManager.getStrategyMetrics(instanceId);
		console.log(`   Indicators Active: ${metrics.indicators.length}`);
		console.log(
			`   RSI: ${
				metrics.indicators
					.find((i: any) => i.id === "rsi_14")
					?.value?.toFixed(2) || "N/A"
			}`
		);
		console.log(
			`   EMA 20: ${
				metrics.indicators
					.find((i: any) => i.id === "ema_20")
					?.value?.toFixed(2) || "N/A"
			}`
		);
		console.log(
			`   EMA 50: ${
				metrics.indicators
					.find((i: any) => i.id === "ema_50")
					?.value?.toFixed(2) || "N/A"
			}`
		);
		console.log(
			`   MACD: ${
				metrics.indicators
					.find((i: any) => i.id === "macd_default")
					?.value?.toFixed(2) || "N/A"
			}`
		);

		// Stop strategy
		await strategyManager.stopStrategy(instanceId);

		// Summary
		console.log("\n" + "=".repeat(60));
		console.log("SIGNAL GENERATION TEST SUMMARY");
		console.log("=".repeat(60));
		console.log(`✅ Total signals generated: ${signalCount}`);
		console.log(`✅ Signal breakdown:`);

		const longSignals = signals.filter((s) => s.side === "long").length;
		const shortSignals = signals.filter((s) => s.side === "short").length;
		console.log(`   📈 Long signals: ${longSignals}`);
		console.log(`   📉 Short signals: ${shortSignals}`);

		if (signalCount > 0) {
			console.log(`\n🎯 Recent signals:`);
			signals.forEach((signal, i) => {
				console.log(
					`   ${i + 1}. ${signal.type} ${
						signal.side
					} - ${signal.reason.substring(0, 80)}...`
				);
			});
		}

		console.log(`\n🎉 Signal generation test completed!`);
	} catch (error) {
		console.error("\n❌ Test failed:", error);
	}
}

async function processCandles(
	candles: OHLCVCandle[],
	label: string
): Promise<void> {
	console.log(`   Processing ${candles.length} candles for ${label}...`);

	for (const candle of candles) {
		strategyManager["dataDistributor"].distributeCandle(candle);
		await sleep(5); // Small delay to allow processing
	}

	console.log(`   ✅ ${label} scenario completed`);
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create candles that should trigger RSI oversold condition
 */
function createOversoldScenario(
	startPrice: number,
	count: number
): OHLCVCandle[] {
	const candles: OHLCVCandle[] = [];
	let price = startPrice;
	const baseTime = Date.now();

	// Create a downtrend to push RSI below 30
	for (let i = 0; i < count; i++) {
		const downMove = -0.02 - Math.random() * 0.01; // 2-3% down each candle
		const open = price;
		const close = price * (1 + downMove);
		const high = Math.max(open, close) * (1 + Math.random() * 0.005);
		const low = Math.min(open, close) * (1 - Math.random() * 0.005);

		candles.push({
			timestamp: baseTime + i * 60 * 60 * 1000,
			open,
			high,
			low,
			close,
			volume: 100 + Math.random() * 50,
		});

		price = close;
	}

	return candles;
}

/**
 * Create candles that should trigger EMA golden cross
 */
function createGoldenCrossScenario(
	startPrice: number,
	count: number
): OHLCVCandle[] {
	const candles: OHLCVCandle[] = [];
	let price = startPrice;
	const baseTime = Date.now() + 1000 * 60 * 60 * 1000; // Continue timeline

	// Create gradual uptrend to trigger EMA 20 crossing above EMA 50
	for (let i = 0; i < count; i++) {
		const upMove = 0.01 + Math.random() * 0.015; // 1-2.5% up each candle
		const open = price;
		const close = price * (1 + upMove);
		const high = Math.max(open, close) * (1 + Math.random() * 0.005);
		const low = Math.min(open, close) * (1 - Math.random() * 0.005);

		candles.push({
			timestamp: baseTime + i * 60 * 60 * 1000,
			open,
			high,
			low,
			close,
			volume: 150 + Math.random() * 50,
		});

		price = close;
	}

	return candles;
}

/**
 * Create candles that should trigger RSI overbought condition
 */
function createOverboughtScenario(
	startPrice: number,
	count: number
): OHLCVCandle[] {
	const candles: OHLCVCandle[] = [];
	let price = startPrice;
	const baseTime = Date.now() + 2000 * 60 * 60 * 1000; // Continue timeline

	// Create strong uptrend to push RSI above 70
	for (let i = 0; i < count; i++) {
		const upMove = 0.025 + Math.random() * 0.015; // 2.5-4% up each candle
		const open = price;
		const close = price * (1 + upMove);
		const high = Math.max(open, close) * (1 + Math.random() * 0.01);
		const low = Math.min(open, close) * (1 - Math.random() * 0.005);

		candles.push({
			timestamp: baseTime + i * 60 * 60 * 1000,
			open,
			high,
			low,
			close,
			volume: 200 + Math.random() * 75,
		});

		price = close;
	}

	return candles;
}

/**
 * Create candles for MACD bullish scenario
 */
function createMACDBullishScenario(
	startPrice: number,
	count: number
): OHLCVCandle[] {
	const candles: OHLCVCandle[] = [];
	let price = startPrice;
	const baseTime = Date.now() + 3000 * 60 * 60 * 1000; // Continue timeline

	// Create recovery pattern that should push MACD positive
	for (let i = 0; i < count; i++) {
		const change =
			i < count / 2
				? -0.005 + Math.random() * 0.01 // Small down/sideways first half
				: 0.01 + Math.random() * 0.02; // Stronger up second half

		const open = price;
		const close = price * (1 + change);
		const high = Math.max(open, close) * (1 + Math.random() * 0.005);
		const low = Math.min(open, close) * (1 - Math.random() * 0.005);

		candles.push({
			timestamp: baseTime + i * 60 * 60 * 1000,
			open,
			high,
			low,
			close,
			volume: 120 + Math.random() * 60,
		});

		price = close;
	}

	return candles;
}

// Run the test
if (require.main === module) {
	testSignalGeneration().catch(console.error);
}

export { testSignalGeneration };
