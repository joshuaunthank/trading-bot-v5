import Chart from "chart.js/auto";
import "chartjs-adapter-date-fns";
import {
	CandlestickController,
	OhlcController,
	CandlestickElement,
	OhlcElement,
} from "chartjs-chart-financial";
import zoomPlugin from "chartjs-plugin-zoom";

// CRITICAL: Register financial chart types AND elements immediately and globally
console.log("[Chart Setup] Registering financial chart types and elements...");

// Register both controllers AND elements
Chart.register(
	CandlestickController,
	OhlcController,
	CandlestickElement,
	OhlcElement,
	zoomPlugin
);

console.log(
	"[Chart Setup] Financial chart types registered globally (candlestick, ohlc)"
);

// Verify registration
try {
	const candlestickController = Chart.registry.getController("candlestick");
	const ohlcController = Chart.registry.getController("ohlc");
	const candlestickElement = Chart.registry.getElement("candlestick");
	const ohlcElement = Chart.registry.getElement("ohlc");

	console.log(
		"[Chart Setup] ✅ Verification successful - Controllers & Elements registered:",
		{
			candlestickController: !!candlestickController,
			ohlcController: !!ohlcController,
			candlestickElement: !!candlestickElement,
			ohlcElement: !!ohlcElement,
		}
	);
} catch (error) {
	console.error("[Chart Setup] ❌ Registration verification failed:", error);
}

// Export the configured Chart instance
export default Chart;
