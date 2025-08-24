import React, { useState } from "react";
import DataTable from "../DataTable";
import TradingChart from "../TradingChart";
import { OHLCVData, CalculatedIndicator } from "../../types/indicators";

interface ChartTabProps {
	// Chart data
	ohlcvData: OHLCVData[];
	indicators: CalculatedIndicator[];
	symbol: string;
	timeframe: string;

	// State
	loading: boolean;
	error: string | null;
}

const ChartTab: React.FC<ChartTabProps> = ({
	ohlcvData,
	indicators,
	symbol,
	timeframe,
	loading,
	error,
}) => {
	const [isFullscreen, setIsFullscreen] = useState(false);

	// Better height calculation for mobile and fullscreen
	const chartHeight = isFullscreen
		? window.innerHeight - 60 // Minimal padding in fullscreen
		: Math.min(window.innerHeight * 0.8, 600); // Responsive height, max 600px

	return (
		<div className="space-y-4 sm:space-y-6 w-full">
			{/* Chart Component */}
			<div
				className={`w-full ${
					isFullscreen ? "fixed inset-0 z-50 bg-gray-900 p-4" : ""
				}`}
			>
				<TradingChart
					ohlcvData={ohlcvData}
					indicators={indicators}
					symbol={symbol}
					timeframe={timeframe}
					height={chartHeight}
					loading={loading}
					error={error}
					isFullscreen={isFullscreen}
					onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
				/>
			</div>

			{/* Chart Stats */}
			{!loading && ohlcvData.length > 0 && (
				<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
					<div className="bg-gray-800 p-4 rounded-lg">
						<div className="text-sm text-gray-400">Data Points</div>
						<div className="text-lg font-semibold text-white">
							{ohlcvData.length}
						</div>
					</div>
					<div className="bg-gray-800 p-4 rounded-lg">
						<div className="text-sm text-gray-400">Active Indicators</div>
						<div className="text-lg font-semibold text-white">
							{indicators.length}
						</div>
					</div>
					<div className="bg-gray-800 p-4 rounded-lg">
						<div className="text-sm text-gray-400">Symbol</div>
						<div className="text-lg font-semibold text-white">{symbol}</div>
					</div>
					<div className="bg-gray-800 p-4 rounded-lg">
						<div className="text-sm text-gray-400">Last Price</div>
						<div className="text-lg font-semibold text-green-400">
							${ohlcvData[ohlcvData.length - 1]?.close.toFixed(4) || "N/A"}
						</div>
					</div>
				</div>
			)}

			{/* Error Display */}
			{error && (
				<div className="bg-red-900/50 border border-red-700 p-4 rounded-lg">
					<div className="text-red-200 font-medium">Chart Error</div>
					<div className="text-red-300 text-sm mt-1">{error}</div>
				</div>
			)}

			{/* Data Table */}
			<DataTable
				data={ohlcvData}
				title={`Recent ${symbol} Data`}
				maxRows={10}
			/>
		</div>
	);
};

export default ChartTab;
