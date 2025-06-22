const { SMA, EMA, RSI } = require("technicalindicators");

// Simple test data
const closes = [
	44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.85, 46.08, 45.89, 46.03, 46.83,
	47.69, 46.49, 46.26, 47.09, 46.66, 46.8, 47.56, 47.0, 46.94, 48.0, 47.21,
];

console.log("Input data:", closes.length, "values");
console.log("Sample values:", closes.slice(0, 5));

try {
	const sma = SMA.calculate({ period: 10, values: closes });
	console.log("SMA result:", sma.length, "values");
	console.log("SMA sample:", sma.slice(0, 3));
} catch (e) {
	console.error("SMA error:", e);
}

try {
	const ema = EMA.calculate({ period: 10, values: closes });
	console.log("EMA result:", ema.length, "values");
	console.log("EMA sample:", ema.slice(0, 3));
} catch (e) {
	console.error("EMA error:", e);
}

try {
	const rsi = RSI.calculate({ period: 14, values: closes });
	console.log("RSI result:", rsi.length, "values");
	console.log("RSI sample:", rsi.slice(0, 3));
} catch (e) {
	console.error("RSI error:", e);
}
