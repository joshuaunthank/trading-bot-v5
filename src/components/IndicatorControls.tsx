import React, { useState } from "react";
import { IndicatorType, IndicatorConfig } from "../hooks/useLocalIndicators";

interface IndicatorControlsProps {
	indicators: IndicatorConfig[];
	onUpdateIndicators: (indicators: IndicatorConfig[]) => void;
}

const IndicatorControls: React.FC<IndicatorControlsProps> = ({
	indicators,
	onUpdateIndicators,
}) => {
	const [isExpanded, setIsExpanded] = useState(true); // Start expanded

	const availableIndicators: {
		type: IndicatorType;
		label: string;
		defaultPeriod: number;
	}[] = [
		{ type: "EMA", label: "EMA", defaultPeriod: 20 },
		{ type: "SMA", label: "SMA", defaultPeriod: 20 },
		{ type: "RSI", label: "RSI", defaultPeriod: 14 },
		{ type: "MACD", label: "MACD", defaultPeriod: 12 },
		{ type: "BB", label: "Bollinger Bands", defaultPeriod: 20 },
	];

	const addIndicator = (type: IndicatorType) => {
		const defaultPeriod =
			availableIndicators.find((ind) => ind.type === type)?.defaultPeriod || 20;
		const newIndicator: IndicatorConfig = {
			id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
			type,
			period: defaultPeriod,
			enabled: true,
		};
		onUpdateIndicators([...indicators, newIndicator]);
	};

	const removeIndicator = (index: number) => {
		const updated = indicators.filter((_, i) => i !== index);
		onUpdateIndicators(updated);
	};

	const toggleIndicator = (index: number) => {
		const updated = indicators.map((ind, i) =>
			i === index ? { ...ind, enabled: !ind.enabled } : ind
		);
		onUpdateIndicators(updated);
	};

	const updatePeriod = (index: number, period: number) => {
		if (period > 0 && period <= 200) {
			const updated = indicators.map((ind, i) =>
				i === index ? { ...ind, period } : ind
			);
			onUpdateIndicators(updated);
		}
	};

	return (
		<div className="bg-gray-800 rounded-lg p-4 mb-4">
			<div className="flex items-center justify-between mb-3">
				<h3 className="text-lg font-semibold text-white">
					📊 Technical Indicators (
					{indicators.filter((ind) => ind.enabled).length} active)
				</h3>
				<button
					onClick={() => setIsExpanded(!isExpanded)}
					className="text-blue-400 hover:text-blue-300 transition-colors"
				>
					{isExpanded ? "Collapse" : "Expand"}
				</button>
			</div>

			{isExpanded && (
				<div className="space-y-4">
					{/* Add New Indicator */}
					<div>
						<label className="block text-sm font-medium text-gray-300 mb-2">
							Add Indicator:
						</label>
						<div className="flex flex-wrap gap-2">
							{availableIndicators.map(({ type, label }) => (
								<button
									key={type}
									onClick={() => addIndicator(type)}
									className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors"
									disabled={indicators.some((ind) => ind.type === type)}
								>
									+ {label}
								</button>
							))}
						</div>
					</div>

					{/* Active Indicators */}
					{indicators.length > 0 && (
						<div>
							<label className="block text-sm font-medium text-gray-300 mb-2">
								Active Indicators:
							</label>
							<div className="space-y-2">
								{indicators.map((indicator, index) => {
									const indicatorInfo = availableIndicators.find(
										(ind) => ind.type === indicator.type
									);
									return (
										<div
											key={`${indicator.type}_${index}`}
											className="flex items-center justify-between bg-gray-700 rounded-md p-3"
										>
											<div className="flex items-center space-x-3">
												<input
													type="checkbox"
													checked={indicator.enabled}
													onChange={() => toggleIndicator(index)}
													className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
												/>
												<span className="text-white font-medium">
													{indicatorInfo?.label || indicator.type}
												</span>
												{indicator.type !== "MACD" && (
													<div className="flex items-center space-x-2">
														<label className="text-sm text-gray-400">
															Period:
														</label>
														<input
															type="number"
															value={
																indicator.period ||
																indicatorInfo?.defaultPeriod ||
																20
															}
															onChange={(e) =>
																updatePeriod(index, parseInt(e.target.value))
															}
															className="w-16 px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm"
															min="1"
															max="200"
														/>
													</div>
												)}
											</div>
											<button
												onClick={() => removeIndicator(index)}
												className="text-red-400 hover:text-red-300 text-sm px-2 py-1 rounded transition-colors"
												title="Remove indicator"
											>
												×
											</button>
										</div>
									);
								})}
							</div>
						</div>
					)}

					{indicators.length === 0 && (
						<div className="text-center py-4 text-gray-400">
							No indicators added. Click the buttons above to add indicators.
						</div>
					)}
				</div>
			)}

			{/* Compact View */}
			{!isExpanded && (
				<div className="mt-3">
					{indicators.filter((ind) => ind.enabled).length > 0 ? (
						<div className="flex flex-wrap gap-2">
							{indicators
								.filter((ind) => ind.enabled)
								.map((indicator, index) => {
									const indicatorInfo = availableIndicators.find(
										(ind) => ind.type === indicator.type
									);
									return (
										<span
											key={`${indicator.type}_${index}`}
											className="px-2 py-1 bg-blue-600 text-white text-xs rounded-md"
										>
											{indicatorInfo?.label || indicator.type}
											{indicator.type !== "MACD" && `(${indicator.period})`}
										</span>
									);
								})}
						</div>
					) : (
						<div className="text-center py-2 text-gray-400 text-sm">
							No indicators added. Click "Expand" to add indicators to the
							chart.
						</div>
					)}
				</div>
			)}
		</div>
	);
};

export default IndicatorControls;
