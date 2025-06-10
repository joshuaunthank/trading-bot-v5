import React from "react";

interface SummaryData {
	symbol?: string;
	timeframe?: string;
	current_price?: number;
	price_change_24h?: number;
	price_change_percent_24h?: number;
	volume_24h?: number;
	high_24h?: number;
	low_24h?: number;
	market_cap?: number;
	strategy_signals?: {
		entry_long?: boolean;
		entry_short?: boolean;
		exit_long?: boolean;
		exit_short?: boolean;
	};
	strategy_indicators?: {
		[key: string]: number | number[] | undefined;
	};
	strategy_metrics?: {
		win_rate?: number;
		profit_factor?: number;
		max_drawdown?: number;
		avg_profit_loss?: number;
		sharpe?: number;
	};
	last_updated?: number;
}

interface SummaryViewProps {
	data: SummaryData;
	isLoading?: boolean;
}

const SummaryView: React.FC<SummaryViewProps> = ({
	data,
	isLoading = false,
}) => {
	// Format currency
	const formatCurrency = (value?: number) => {
		if (value === undefined) return "—";
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		}).format(value);
	};

	// Format percentage
	const formatPercent = (value?: number) => {
		if (value === undefined) return "—";
		return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
	};

	// Format large numbers with K, M, B suffixes
	const formatLargeNumber = (value?: number) => {
		if (value === undefined) return "—";
		if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
		if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
		if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
		return value.toFixed(2);
	};

	// Format date
	const formatDate = (timestamp?: number) => {
		if (!timestamp) return "—";
		return new Date(timestamp).toLocaleString();
	};

	return (
		<div className="bg-gray-800 rounded-lg shadow-lg p-4">
			<div className="flex justify-between items-center mb-4">
				<h3 className="text-lg font-semibold">
					{data.symbol
						? `${data.symbol} - ${data.timeframe || ""}`
						: "Market Summary"}
				</h3>
				{isLoading && (
					<div className="text-blue-400 text-sm animate-pulse">Updating...</div>
				)}
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{/* Price Section */}
				<div className="bg-gray-700 rounded-lg p-4">
					<h4 className="text-gray-400 text-sm font-medium mb-2">
						Price Summary
					</h4>
					<div className="space-y-2">
						<div className="flex justify-between">
							<span className="text-gray-300">Current Price</span>
							<span className="font-semibold">
								{formatCurrency(data.current_price)}
							</span>
						</div>
						<div className="flex justify-between">
							<span className="text-gray-300">24h Change</span>
							<span
								className={`font-semibold ${
									(data.price_change_24h || 0) > 0
										? "text-green-500"
										: (data.price_change_24h || 0) < 0
										? "text-red-500"
										: ""
								}`}
							>
								{formatCurrency(data.price_change_24h)} (
								{formatPercent(data.price_change_percent_24h)})
							</span>
						</div>
						<div className="flex justify-between">
							<span className="text-gray-300">24h High</span>
							<span className="font-semibold">
								{formatCurrency(data.high_24h)}
							</span>
						</div>
						<div className="flex justify-between">
							<span className="text-gray-300">24h Low</span>
							<span className="font-semibold">
								{formatCurrency(data.low_24h)}
							</span>
						</div>
						<div className="flex justify-between">
							<span className="text-gray-300">24h Volume</span>
							<span className="font-semibold">
								{formatLargeNumber(data.volume_24h)}
							</span>
						</div>
					</div>
				</div>

				{/* Signals Section */}
				<div className="bg-gray-700 rounded-lg p-4">
					<h4 className="text-gray-400 text-sm font-medium mb-2">
						Strategy Signals
					</h4>
					<div className="space-y-2">
						<div className="flex justify-between">
							<span className="text-gray-300">Entry Long</span>
							<span
								className={`font-semibold ${
									data.strategy_signals?.entry_long
										? "text-green-500"
										: "text-gray-400"
								}`}
							>
								{data.strategy_signals?.entry_long ? "YES" : "NO"}
							</span>
						</div>
						<div className="flex justify-between">
							<span className="text-gray-300">Exit Long</span>
							<span
								className={`font-semibold ${
									data.strategy_signals?.exit_long
										? "text-red-500"
										: "text-gray-400"
								}`}
							>
								{data.strategy_signals?.exit_long ? "YES" : "NO"}
							</span>
						</div>
						<div className="flex justify-between">
							<span className="text-gray-300">Entry Short</span>
							<span
								className={`font-semibold ${
									data.strategy_signals?.entry_short
										? "text-red-500"
										: "text-gray-400"
								}`}
							>
								{data.strategy_signals?.entry_short ? "YES" : "NO"}
							</span>
						</div>
						<div className="flex justify-between">
							<span className="text-gray-300">Exit Short</span>
							<span
								className={`font-semibold ${
									data.strategy_signals?.exit_short
										? "text-green-500"
										: "text-gray-400"
								}`}
							>
								{data.strategy_signals?.exit_short ? "YES" : "NO"}
							</span>
						</div>
						<div className="flex justify-between">
							<span className="text-gray-300">Last Updated</span>
							<span className="font-semibold">
								{formatDate(data.last_updated)}
							</span>
						</div>
					</div>
				</div>

				{/* Metrics Section */}
				<div className="bg-gray-700 rounded-lg p-4">
					<h4 className="text-gray-400 text-sm font-medium mb-2">
						Strategy Metrics
					</h4>
					<div className="space-y-2">
						<div className="flex justify-between">
							<span className="text-gray-300">Win Rate</span>
							<span className="font-semibold">
								{data.strategy_metrics?.win_rate !== undefined
									? `${(data.strategy_metrics.win_rate * 100).toFixed(1)}%`
									: "—"}
							</span>
						</div>
						<div className="flex justify-between">
							<span className="text-gray-300">Profit Factor</span>
							<span className="font-semibold">
								{data.strategy_metrics?.profit_factor?.toFixed(2) || "—"}
							</span>
						</div>
						<div className="flex justify-between">
							<span className="text-gray-300">Max Drawdown</span>
							<span className="font-semibold text-red-500">
								{data.strategy_metrics?.max_drawdown !== undefined
									? `${data.strategy_metrics.max_drawdown.toFixed(2)}%`
									: "—"}
							</span>
						</div>
						<div className="flex justify-between">
							<span className="text-gray-300">Avg P/L</span>
							<span
								className={`font-semibold ${
									(data.strategy_metrics?.avg_profit_loss || 0) > 0
										? "text-green-500"
										: (data.strategy_metrics?.avg_profit_loss || 0) < 0
										? "text-red-500"
										: ""
								}`}
							>
								{data.strategy_metrics?.avg_profit_loss?.toFixed(2) || "—"}%
							</span>
						</div>
						<div className="flex justify-between">
							<span className="text-gray-300">Sharpe Ratio</span>
							<span className="font-semibold">
								{data.strategy_metrics?.sharpe?.toFixed(2) || "—"}
							</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default SummaryView;
