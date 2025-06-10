import React from "react";
import { useStrategy } from "../../../context/StrategyContext";
import { Risk } from "../../../context/Types";

const StepRisk: React.FC = () => {
	const { strategy, setStrategy } = useStrategy();

	// Create local state for risk configuration
	const [riskConfig, setRiskConfig] = React.useState<Risk>(
		strategy.risk || {
			position_size_type: "percent_equity",
			risk_per_trade: 2,
			stop_loss_percent: 1.5,
			take_profit_percent: 3.0,
			trailing_stop: true,
			max_drawdown_percent: 10,
		}
	);

	// When risk config changes, update the parent strategy
	React.useEffect(() => {
		setStrategy((prev) => ({
			...prev,
			risk: riskConfig,
		}));
	}, [riskConfig, setStrategy]);

	// Handle changes to risk settings
	const handleChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
	) => {
		const { name, value, type } = e.target;

		setRiskConfig((prev) => ({
			...prev,
			[name]: type === "number" ? parseFloat(value) : value,
		}));
	};

	// Handle changes to checkbox inputs
	const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, checked } = e.target;

		setRiskConfig((prev) => ({
			...prev,
			[name]: checked,
		}));
	};

	return (
		<div className="space-y-6">
			<h2 className="text-xl font-semibold mb-4">Risk Management</h2>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				<div className="space-y-4">
					<div>
						<label
							htmlFor="position_size_type"
							className="block text-sm font-medium text-gray-400 mb-1"
						>
							Position Sizing Method
						</label>
						<select
							id="position_size_type"
							name="position_size_type"
							value={riskConfig.position_size_type}
							onChange={handleChange}
							className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						>
							<option value="percent_equity">Percent of Equity</option>
							<option value="fixed_usd">Fixed USD Amount</option>
							<option value="risk_adjusted">Risk-Adjusted</option>
							<option value="position_full">Full Position</option>
						</select>
					</div>

					<div>
						<label
							htmlFor="risk_per_trade"
							className="block text-sm font-medium text-gray-400 mb-1"
						>
							Risk Per Trade (%)
						</label>
						<input
							type="number"
							id="risk_per_trade"
							name="risk_per_trade"
							value={riskConfig.risk_per_trade}
							onChange={handleChange}
							step="0.1"
							min="0.1"
							max="100"
							className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						/>
						<p className="text-xs text-gray-500 mt-1">
							Maximum percentage of account equity to risk on any single trade.
						</p>
					</div>

					<div>
						<label
							htmlFor="max_drawdown_percent"
							className="block text-sm font-medium text-gray-400 mb-1"
						>
							Maximum Drawdown (%)
						</label>
						<input
							type="number"
							id="max_drawdown_percent"
							name="max_drawdown_percent"
							value={riskConfig.max_drawdown_percent}
							onChange={handleChange}
							step="0.1"
							min="0.1"
							max="100"
							className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						/>
						<p className="text-xs text-gray-500 mt-1">
							Strategy will pause when drawdown exceeds this percentage.
						</p>
					</div>
				</div>

				<div className="space-y-4">
					<div>
						<label
							htmlFor="stop_loss_percent"
							className="block text-sm font-medium text-gray-400 mb-1"
						>
							Stop Loss (%)
						</label>
						<input
							type="number"
							id="stop_loss_percent"
							name="stop_loss_percent"
							value={riskConfig.stop_loss_percent}
							onChange={handleChange}
							step="0.1"
							min="0.1"
							className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						/>
					</div>

					<div>
						<label
							htmlFor="take_profit_percent"
							className="block text-sm font-medium text-gray-400 mb-1"
						>
							Take Profit (%)
						</label>
						<input
							type="number"
							id="take_profit_percent"
							name="take_profit_percent"
							value={riskConfig.take_profit_percent}
							onChange={handleChange}
							step="0.1"
							min="0.1"
							className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						/>
					</div>

					<div className="flex items-center mt-6">
						<input
							type="checkbox"
							id="trailing_stop"
							name="trailing_stop"
							checked={riskConfig.trailing_stop}
							onChange={handleCheckboxChange}
							className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded"
						/>
						<label
							htmlFor="trailing_stop"
							className="ml-2 block text-sm text-white"
						>
							Enable Trailing Stop
						</label>
					</div>
				</div>
			</div>

			<div className="mt-8 p-4 bg-blue-900/30 border border-blue-700 rounded-lg">
				<h3 className="text-lg font-medium text-blue-300 mb-2">Risk Summary</h3>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<p className="text-sm text-gray-300">
							<span className="font-medium">Risk/Reward Ratio:</span>{" "}
							{(
								riskConfig.take_profit_percent / riskConfig.stop_loss_percent
							).toFixed(2)}
						</p>
						<p className="text-sm text-gray-300">
							<span className="font-medium">Position Sizing:</span>{" "}
							{riskConfig.position_size_type === "percent_equity"
								? `${riskConfig.risk_per_trade}% of equity per trade`
								: riskConfig.position_size_type}
						</p>
					</div>

					<div>
						<p className="text-sm text-gray-300">
							<span className="font-medium">Stop Loss:</span>{" "}
							{riskConfig.stop_loss_percent}%
						</p>
						<p className="text-sm text-gray-300">
							<span className="font-medium">Take Profit:</span>{" "}
							{riskConfig.take_profit_percent}%
						</p>
						<p className="text-sm text-gray-300">
							<span className="font-medium">Trailing Stop:</span>{" "}
							{riskConfig.trailing_stop ? "Enabled" : "Disabled"}
						</p>
					</div>
				</div>
			</div>
		</div>
	);
};

export default StepRisk;
