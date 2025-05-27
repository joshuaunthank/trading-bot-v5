import React, { useState } from "react";
import ChartView from "./components/ChartView";
import TableView from "./components/TableView";
import SummaryView from "./components/SummaryView";
import ConfigModal from "./components/ConfigModal";
import ChartSpinner from "./components/ChartSpinner";
import IndicatorConfigForm from "./components/IndicatorConfigForm";
import { useOhlcvWebSocket } from "./components/useOhlcvWebSocket";

const DEFAULT_SYMBOL = "BTC/USDT";
const DEFAULT_TIMEFRAME = "4h";

export default function App() {
	const [symbol, setSymbol] = useState(DEFAULT_SYMBOL);
	const [timeframe, setTimeframe] = useState(DEFAULT_TIMEFRAME);
	const [configModalOpen, setConfigModalOpen] = useState(false);
	const [strategyName, setStrategyName] = useState("");
	const [ohlcvData, setOhlcvData] = useState<any[]>([]);
	const { status, candle } = useOhlcvWebSocket(symbol, timeframe);
	const [isLoading, setIsLoading] = useState(false);

	// Update ohlcvData with new live candle
	React.useEffect(() => {
		if (candle) {
			setOhlcvData((prev) => {
				if (
					!prev.length ||
					candle.timestamp > prev[prev.length - 1].timestamp
				) {
					return [...prev, candle];
				} else if (candle.timestamp === prev[prev.length - 1].timestamp) {
					return [...prev.slice(0, -1), candle];
				}
				return prev;
			});
		}
	}, [candle]);

	// Example: open config modal for a strategy
	const openConfig = (name: string) => {
		setStrategyName(name);
		setConfigModalOpen(true);
	};

	return (
		<div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
			<h1>Trading Bot Dashboard</h1>
			{/* Example: Strategy config button */}
			<button onClick={() => openConfig("arima_macd_lag_strategy")}>
				Configure Strategy
			</button>
			<ConfigModal
				strategyName={strategyName}
				open={configModalOpen}
				onClose={() => setConfigModalOpen(false)}
				onSave={(config) => {
					// Save config logic here
					setConfigModalOpen(false);
				}}
			/>
			<div style={{ display: "flex", gap: 32, marginTop: 32 }}>
				<div style={{ flex: 2, position: "relative" }}>
					<ChartSpinner visible={isLoading} />
					<ChartView candles={ohlcvData} />
				</div>
				<div style={{ flex: 1 }}>
					<SummaryView data={ohlcvData} />
				</div>
			</div>
			<div style={{ marginTop: 32 }}>
				<TableView candles={ohlcvData} />
			</div>
			<div style={{ marginTop: 32 }}>
				<IndicatorConfigForm onSave={(indicators) => console.log(indicators)} />
			</div>
		</div>
	);
}
