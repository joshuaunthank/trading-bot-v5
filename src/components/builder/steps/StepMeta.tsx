import React from "react";
import { useStrategy } from "../../../context/StrategyContext";

const StepMeta: React.FC = () => {
	const { strategy, setStrategy } = useStrategy();

	const handleChange = (
		e: React.ChangeEvent<
			HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
		>
	) => {
		const { name, value } = e.target;
		setStrategy((prev) => ({
			...prev,
			[name]: value,
		}));
	};

	const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const tags = e.target.value
			.split(",")
			.map((tag) => tag.trim())
			.filter(Boolean);
		setStrategy((prev) => ({
			...prev,
			tags,
		}));
	};

	const handleToggleEnabled = () => {
		setStrategy((prev) => ({
			...prev,
			enabled: !prev.enabled,
		}));
	};

	const timeframes = ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w"];
	const symbols = [
		"BTC/USDT",
		"ETH/USDT",
		"SOL/USDT",
		"BNB/USDT",
		"XRP/USDT",
		"ADA/USDT",
	];

	return (
		<div className="space-y-6">
			<h2 className="text-xl font-semibold mb-4">Strategy Metadata</h2>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				<div className="space-y-4">
					<div>
						<label
							htmlFor="name"
							className="block text-sm font-medium text-gray-400 mb-1"
						>
							Strategy Name *
						</label>
						<input
							type="text"
							id="name"
							name="name"
							value={strategy.name}
							onChange={handleChange}
							className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
							placeholder="Enter strategy name"
							required
						/>
					</div>

					<div>
						<label
							htmlFor="description"
							className="block text-sm font-medium text-gray-400 mb-1"
						>
							Description
						</label>
						<textarea
							id="description"
							name="description"
							value={strategy.description}
							onChange={handleChange}
							rows={3}
							className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
							placeholder="Describe your strategy..."
						/>
					</div>

					<div className="flex items-center">
						<input
							type="checkbox"
							id="enabled"
							checked={strategy.enabled}
							onChange={handleToggleEnabled}
							className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded"
						/>
						<label htmlFor="enabled" className="ml-2 block text-sm text-white">
							Enabled
						</label>
					</div>
				</div>

				<div className="space-y-4">
					<div>
						<label
							htmlFor="symbol"
							className="block text-sm font-medium text-gray-400 mb-1"
						>
							Symbol *
						</label>
						<select
							id="symbol"
							name="symbol"
							value={strategy.symbol}
							onChange={handleChange}
							className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
							required
						>
							<option value="">Select a symbol</option>
							{symbols.map((symbol) => (
								<option key={symbol} value={symbol}>
									{symbol}
								</option>
							))}
						</select>
					</div>

					<div>
						<label
							htmlFor="timeframe"
							className="block text-sm font-medium text-gray-400 mb-1"
						>
							Timeframe *
						</label>
						<select
							id="timeframe"
							name="timeframe"
							value={strategy.timeframe}
							onChange={handleChange}
							className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
							required
						>
							<option value="">Select a timeframe</option>
							{timeframes.map((tf) => (
								<option key={tf} value={tf}>
									{tf}
								</option>
							))}
						</select>
					</div>

					<div>
						<label
							htmlFor="tags"
							className="block text-sm font-medium text-gray-400 mb-1"
						>
							Tags (comma separated)
						</label>
						<input
							type="text"
							id="tags"
							name="tags"
							value={strategy.tags.join(", ")}
							onChange={handleTagsChange}
							className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
							placeholder="trend, momentum, mean-reversion"
						/>
					</div>
				</div>
			</div>

			{/* Field validation messages */}
			<div className="text-sm text-red-400 mt-4">
				{!strategy.name && <p>* Strategy name is required</p>}
				{!strategy.symbol && <p>* Symbol is required</p>}
				{!strategy.timeframe && <p>* Timeframe is required</p>}
			</div>
		</div>
	);
};

export default StepMeta;
