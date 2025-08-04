import React from "react";
import DataTable from "../DataTable";
import D3StreamingChart from "../D3StreamingChart";
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
	return (
		<div className="space-y-6">
			{/* Modern D3.js Streaming Chart */}
			<D3StreamingChart
				ohlcvData={ohlcvData}
				indicators={indicators}
				symbol={symbol}
				timeframe={timeframe}
				height={600}
			/>

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
