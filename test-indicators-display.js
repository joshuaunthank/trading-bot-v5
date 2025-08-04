/**
 * Test script to verify indicator display in the browser
 */

// This should be run in browser console to check if indicators are displaying
function testIndicatorDisplay() {
	console.log("=== INDICATOR DISPLAY TEST ===");

	// Check if D3 indicators are rendered in the DOM
	const indicatorLines = document.querySelectorAll(".indicator-line");
	console.log(`Found ${indicatorLines.length} indicator lines in DOM`);

	// List each indicator found
	indicatorLines.forEach((line, index) => {
		const classes = line.getAttribute("class");
		const stroke = line.getAttribute("stroke");
		console.log(`Indicator ${index + 1}: ${classes}, color: ${stroke}`);
	});

	// Check SVG presence
	const chartSvg = document.querySelector("svg");
	if (chartSvg) {
		console.log("Chart SVG found");
		const svgWidth = chartSvg.getAttribute("width");
		const svgHeight = chartSvg.getAttribute("height");
		console.log(`SVG dimensions: ${svgWidth} x ${svgHeight}`);
	} else {
		console.log("No chart SVG found");
	}

	// Check for candlesticks
	const candlesticks = document.querySelectorAll(".candlestick");
	console.log(`Found ${candlesticks.length} candlesticks`);

	console.log("=== END TEST ===");
}

// Also check React DevTools data if available
function testReactIndicatorData() {
	console.log("=== REACT INDICATOR DATA TEST ===");

	// This would check React component state if DevTools is available
	// For now, just log what we expect to see
	console.log("Expected indicators from backend:");
	console.log("1. ema_20 (orange line)");
	console.log("2. rsi_14 (blue line)");
	console.log("3. bollingerBands_20_upper (purple line)");
	console.log("4. bollingerBands_20_middle (purple line)");
	console.log("5. bollingerBands_20_lower (purple line)");

	console.log("=== END REACT TEST ===");
}

// Run tests
testIndicatorDisplay();
testReactIndicatorData();
