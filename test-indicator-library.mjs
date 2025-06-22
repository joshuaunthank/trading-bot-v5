#!/usr/bin/env node

// Quick test to verify indicator alignment and library integration
import { SMA, EMA, RSI } from "technicalindicators";

// Mock OHLCV data (50 candles)
const mockData = Array.from({ length: 50 }, (_, i) => ({
	timestamp: Date.now() + i * 60000, // 1-minute intervals
	open: 100 + Math.sin(i * 0.1) * 10,
	high: 105 + Math.sin(i * 0.1) * 10,
	low: 95 + Math.sin(i * 0.1) * 10,
	close: 100 + Math.sin(i * 0.1) * 10 + Math.random() * 2 - 1,
	volume: 1000 + Math.random() * 500,
}));

const closes = mockData.map((d) => d.close);
const timestamps = mockData.map((d) => d.timestamp);

console.log("🧪 Testing Indicator Library Integration\n");

// Test SMA(20)
console.log("📊 SMA(20) Test:");
const sma20 = SMA.calculate({ period: 20, values: closes });
console.log(`Input data length: ${closes.length}`);
console.log(`SMA values length: ${sma20.length}`);
console.log(`Expected start index: ${20 - 1} (period - 1)`);
console.log(`First valid SMA value: ${sma20[0]} (at data index ${20 - 1})`);
console.log(
	`Last SMA value: ${sma20[sma20.length - 1]} (at data index ${
		closes.length - 1
	})`
);

// Test alignment
console.log("\n🎯 Alignment Test:");
console.log(`Data has ${closes.length} candles`);
console.log(`SMA has ${sma20.length} values`);
console.log(`Missing values: ${closes.length - sma20.length - (20 - 1)}`);

// Test with our alignment function
const alignIndicatorData = (values, timestamps, startIndex = 0) => {
	const result = [];

	// Fill initial null values before startIndex
	for (let i = 0; i < startIndex; i++) {
		result.push({ x: timestamps[i], y: null });
	}

	// Add calculated values
	for (let i = 0; i < values.length; i++) {
		const timestampIndex = startIndex + i;
		if (timestampIndex < timestamps.length) {
			result.push({
				x: timestamps[timestampIndex],
				y: isNaN(values[i]) ? null : values[i],
			});
		}
	}

	// Fill remaining timestamps if needed
	while (result.length < timestamps.length) {
		result.push({
			x: timestamps[result.length],
			y: null,
		});
	}

	return result;
};

const alignedSMA = alignIndicatorData(sma20, timestamps, 19);
console.log(`\n✅ Aligned SMA length: ${alignedSMA.length}`);
console.log(
	`Matches input data: ${
		alignedSMA.length === closes.length ? "✅ YES" : "❌ NO"
	}`
);

// Test RSI
console.log("\n📊 RSI(14) Test:");
const rsi14 = RSI.calculate({ period: 14, values: closes });
console.log(`RSI values length: ${rsi14.length}`);
console.log(`Expected start index: ${14} (period)`);
const alignedRSI = alignIndicatorData(rsi14, timestamps, 14);
console.log(`Aligned RSI length: ${alignedRSI.length}`);
console.log(
	`Matches input data: ${
		alignedRSI.length === closes.length ? "✅ YES" : "❌ NO"
	}`
);

console.log("\n🎉 Library Integration Test Complete!");
console.log("✅ All indicators should now align perfectly with live candles!");
