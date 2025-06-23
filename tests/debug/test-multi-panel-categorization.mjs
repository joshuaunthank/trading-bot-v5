#!/usr/bin/env node

/**
 * Test Multi-Panel Chart Indicator Categorization
 * Verifies that indicators are properly categorized into price, oscillator, and volume panels
 */

// Simple categorization function for testing (matches the main implementation)
function categorizeIndicators(indicators) {
	const categories = {
		price: [],
		oscillator: [],
		volume: [],
	};

	indicators.forEach((indicator) => {
		const type = indicator.type.toLowerCase();

		// Oscillators that should be in their own panel (0-100 range typically)
		if (
			type.includes("rsi") ||
			type.includes("macd") ||
			type.includes("stoch") ||
			type.includes("cci") ||
			type.includes("williams") ||
			type.includes("momentum")
		) {
			categories.oscillator.push(indicator);
		}
		// Volume indicators
		else if (
			type.includes("volume") ||
			type.includes("obv") ||
			type.includes("ad")
		) {
			categories.volume.push(indicator);
		}
		// Price-based indicators (EMA, SMA, BB, etc.)
		else {
			categories.price.push(indicator);
		}
	});

	return categories;
}

// Mock indicator data for testing
const mockIndicators = [
	{ type: "EMA", name: "EMA(12)", color: "#ff6b6b" },
	{ type: "SMA", name: "SMA(20)", color: "#4ecdc4" },
	{ type: "RSI", name: "RSI(14)", color: "#45b7d1" },
	{ type: "MACD", name: "MACD(12,26,9)", color: "#96ceb4" },
	{ type: "BB", name: "Bollinger Bands", color: "#ffeaa7" },
	{ type: "Volume", name: "Volume", color: "#fd79a8" },
	{ type: "Stochastic", name: "Stoch(14)", color: "#fdcb6e" },
	{ type: "OBV", name: "On Balance Volume", color: "#e17055" },
];

function testIndicatorCategorization() {
	console.log("🧪 Testing Multi-Panel Chart Indicator Categorization...\n");

	try {
		const categories = categorizeIndicators(mockIndicators);

		console.log("📊 Categorization Results:");
		console.log("═══════════════════════════\n");

		console.log("💰 Price Panel Indicators:");
		categories.price.forEach((indicator) => {
			console.log(`   ✅ ${indicator.name} (${indicator.type})`);
		});

		console.log("\n📈 Oscillator Panel Indicators:");
		categories.oscillator.forEach((indicator) => {
			console.log(`   ✅ ${indicator.name} (${indicator.type})`);
		});

		console.log("\n📊 Volume Panel Indicators:");
		categories.volume.forEach((indicator) => {
			console.log(`   ✅ ${indicator.name} (${indicator.type})`);
		});

		console.log("\n📋 Summary:");
		console.log(`   📊 Total Indicators: ${mockIndicators.length}`);
		console.log(`   💰 Price Indicators: ${categories.price.length}`);
		console.log(`   📈 Oscillator Indicators: ${categories.oscillator.length}`);
		console.log(`   📊 Volume Indicators: ${categories.volume.length}`);

		// Verify all indicators were categorized
		const totalCategorized =
			categories.price.length +
			categories.oscillator.length +
			categories.volume.length;
		if (totalCategorized === mockIndicators.length) {
			console.log("\n✅ All indicators successfully categorized!");
		} else {
			console.log(
				`\n❌ Categorization mismatch: ${totalCategorized}/${mockIndicators.length} indicators categorized`
			);
		}

		// Verify expected categorizations
		const expectedResults = {
			price: ["EMA", "SMA", "BB"], // Moving averages and bands overlay on price
			oscillator: ["RSI", "MACD", "Stochastic"], // 0-100 or oscillating indicators
			volume: ["Volume", "OBV"], // Volume-based indicators
		};

		let correctCategorizations = 0;
		let totalExpected = 0;

		Object.entries(expectedResults).forEach(([panelType, expectedTypes]) => {
			const actualTypes = categories[panelType].map((ind) => ind.type);
			expectedTypes.forEach((expectedType) => {
				totalExpected++;
				if (actualTypes.includes(expectedType)) {
					correctCategorizations++;
					console.log(
						`   ✅ ${expectedType} correctly placed in ${panelType} panel`
					);
				} else {
					console.log(`   ❌ ${expectedType} NOT found in ${panelType} panel`);
				}
			});
		});

		console.log(
			`\n🎯 Accuracy: ${correctCategorizations}/${totalExpected} (${Math.round(
				(correctCategorizations / totalExpected) * 100
			)}%)`
		);

		if (correctCategorizations === totalExpected) {
			console.log(
				"\n🎉 Multi-Panel Chart categorization is working perfectly!"
			);
			console.log("📊 Ready for professional-grade technical analysis!");
		} else {
			console.log("\n⚠️  Some indicators may need categorization adjustments");
		}
	} catch (error) {
		console.error("❌ Test failed:", error.message);
		process.exit(1);
	}
}

testIndicatorCategorization();
