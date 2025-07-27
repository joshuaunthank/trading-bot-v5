import React from "react";
import StrategySelect from "../StrategySelect";
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
	// Strategy data
	availableStrategies: any[];
	selectedStrategyId: string | null;
	onStrategySelect: (strategyId: string | null) => void;
	onCreateStrategy: () => void;
	onEditStrategy: (strategyId: string) => void;
	onDeleteStrategy: (strategyId: string) => void;

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
	availableStrategies,
	selectedStrategyId,
	onStrategySelect,
	onCreateStrategy,
	onEditStrategy,
	onDeleteStrategy,
	ohlcvData,
	indicators,
	symbol,
	timeframe,
	loading,
	error,
}) => {
	return (
		<div className="space-y-6">
			{/* Strategy Selection */}
			<StrategySelect
				strategies={availableStrategies || []}
				selectedStrategyId={selectedStrategyId}
				onStrategySelect={onStrategySelect}
				onCreateStrategy={onCreateStrategy}
				onEditStrategy={onEditStrategy}
				onDeleteStrategy={onDeleteStrategy}
				loading={loading}
				error={error}
			/>

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
