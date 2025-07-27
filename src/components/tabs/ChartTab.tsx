import React from "react";
import MultiPanelChart from "../MultiPanelChart";
import DataTable from "../DataTable";
import { OHLCVData } from "../../types/indicators";

// Use a more flexible indicator type for compatibility
type ChartIndicator = {
	id: string;
	name: string;
	type: string;
	data: Array<{ x: number; y: number | null }>;
	color?: string;
	yAxisID?: string;
};

interface ChartTabProps {
	// Chart data
	ohlcvData: OHLCVData[];
	indicators: ChartIndicator[];
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
			{/* Chart */}
			<MultiPanelChart
				data={ohlcvData}
				indicators={indicators}
				loading={loading}
				symbol={symbol}
				timeframe={timeframe}
			/>

			{/* Data Table */}
			<DataTable data={ohlcvData} title="Recent Data" maxRows={10} />
		</div>
	);
};

export default ChartTab;
