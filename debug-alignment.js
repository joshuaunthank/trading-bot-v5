// Debug script to test indicator alignment with live data
import { readFileSync } from "fs";

// Mock the technicalindicators library functions for testing
const mockIndicators = {
	EMA: {
		calculate: ({ period, values }) => {
			console.log(
				`Mock EMA calculation: period=${period}, values.length=${values.length}`
			);
			// Return values starting from index (period-1)
			const result = [];
			for (let i = period - 1; i < values.length; i++) {
				// Simple mock EMA calculation
				const slice = values.slice(Math.max(0, i - period + 1), i + 1);
				const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
				result.push(avg);
			}
			console.log(`Mock EMA result: ${result.length} values`);
			return result;
		},
	},
};

// Mock the alignment function from useLocalIndicators
const alignIndicatorData = (values, timestamps, startIndex = 0) => {
	console.log(
		`Aligning ${values.length} values with ${timestamps.length} timestamps, startIndex=${startIndex}`
	);

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

	console.log(`Alignment result: ${result.length} data points`);
	console.log(
		`Last timestamp in result: ${new Date(
			result[result.length - 1].x
		).toISOString()}`
	);
	console.log(`Last value in result: ${result[result.length - 1].y}`);

	return result;
};

// Test with sample data that simulates the real scenario
const createTestData = (count) => {
	const now = Date.now();
	const hourInMs = 60 * 60 * 1000;

	const data = [];
	for (let i = 0; i < count; i++) {
		data.push({
			timestamp: now - (count - 1 - i) * hourInMs,
			open: 100 + Math.random() * 10,
			high: 105 + Math.random() * 10,
			low: 95 + Math.random() * 10,
			close: 100 + Math.random() * 10,
			volume: 1000 + Math.random() * 500,
		});
	}

	return data;
};

console.log("=== INDICATOR ALIGNMENT DEBUG ===");

// Test with different data sizes
const testCases = [
	{ size: 50, period: 20 },
	{ size: 100, period: 20 },
	{ size: 1000, period: 20 },
];

testCases.forEach(({ size, period }) => {
	console.log(`\n--- Testing with ${size} candles, EMA period ${period} ---`);

	const testData = createTestData(size);
	const timestamps = testData.map((d) => d.timestamp);
	const closes = testData.map((d) => d.close);

	console.log(`Test data: ${testData.length} candles`);
	console.log(`First timestamp: ${new Date(timestamps[0]).toISOString()}`);
	console.log(
		`Last timestamp: ${new Date(
			timestamps[timestamps.length - 1]
		).toISOString()}`
	);

	// Calculate EMA
	const emaValues = mockIndicators.EMA.calculate({ period, values: closes });
	const startIndex = period - 1;

	// Align the data
	const alignedData = alignIndicatorData(emaValues, timestamps, startIndex);

	// Check if the last value is at the latest timestamp
	const lastCandle = testData[testData.length - 1];
	const lastIndicatorPoint = alignedData[alignedData.length - 1];

	console.log(
		`Last candle timestamp: ${new Date(lastCandle.timestamp).toISOString()}`
	);
	console.log(
		`Last indicator timestamp: ${new Date(lastIndicatorPoint.x).toISOString()}`
	);
	console.log(
		`Timestamps match: ${lastCandle.timestamp === lastIndicatorPoint.x}`
	);
	console.log(`Last indicator value: ${lastIndicatorPoint.y}`);

	// Count non-null values
	const nonNullValues = alignedData.filter((d) => d.y !== null);
	console.log(`Non-null indicator values: ${nonNullValues.length}`);
	console.log(`Expected non-null values: ${emaValues.length}`);

	if (nonNullValues.length > 0) {
		const lastNonNullIndex = alignedData
			.map((d, i) => (d.y !== null ? i : -1))
			.filter((i) => i >= 0)
			.pop();
		console.log(
			`Last non-null value at index: ${lastNonNullIndex} (should be ${
				alignedData.length - 1
			})`
		);
	}
});

console.log("\n=== DEBUG COMPLETE ===");
