import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface ConfigModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSave: (config: any) => void;
	strategyId: string;
	title: string;
	children?: React.ReactNode;
}

const ConfigModal: React.FC<ConfigModalProps> = ({
	isOpen,
	onClose,
	onSave,
	strategyId,
	title,
	children,
}) => {
	const [config, setConfig] = useState({
		runMode: "live",
		backtest: {
			startDate: "",
			endDate: "",
			initialCapital: 10000,
		},
		live: {
			useRealOrders: false,
			maxOpenPositions: 1,
		},
	});

	// Reset form when strategy changes
	useEffect(() => {
		if (strategyId) {
			// You could load saved config for this strategy
			setConfig({
				runMode: "live",
				backtest: {
					startDate: "",
					endDate: "",
					initialCapital: 10000,
				},
				live: {
					useRealOrders: false,
					maxOpenPositions: 1,
				},
			});
		}
	}, [strategyId]);

	const handleChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
	) => {
		const { name, value, type } = e.target;

		if (name.includes(".")) {
			// Handle nested properties (e.g., "backtest.startDate")
			const [category, prop] = name.split(".");
			setConfig((prev) => ({
				...prev,
				[category]: {
					...(prev[category as keyof typeof prev] as Record<string, any>),
					[prop]:
						type === "checkbox"
							? (e.target as HTMLInputElement).checked
							: type === "number"
							? Number(value)
							: value,
				},
			}));
		} else {
			// Handle top-level properties
			setConfig((prev) => ({
				...prev,
				[name]:
					type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
			}));
		}
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		onSave({
			...config,
			strategyId,
		});
	};

	if (!isOpen) return null;

	// Use portal to render modal outside of normal DOM hierarchy
	return createPortal(
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
			<div className="relative w-full max-w-md bg-gray-800 rounded-lg shadow-lg p-6">
				<button
					className="absolute top-4 right-4 text-gray-400 hover:text-white"
					onClick={onClose}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="h-6 w-6"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>

				<h2 className="text-xl font-bold mb-4">{title}</h2>

				<form onSubmit={handleSubmit}>
					<div className="mb-4">
						<label className="block text-sm font-medium mb-1">Run Mode</label>
						<select
							name="runMode"
							value={config.runMode}
							onChange={handleChange}
							className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white"
						>
							<option value="live">Live Trading</option>
							<option value="backtest">Backtest</option>
							<option value="paper">Paper Trading</option>
						</select>
					</div>

					{config.runMode === "backtest" && (
						<div className="p-3 bg-gray-700 rounded-md mb-4">
							<h3 className="text-sm font-medium mb-2">Backtest Settings</h3>

							<div className="grid grid-cols-2 gap-3">
								<div>
									<label className="block text-xs mb-1">Start Date</label>
									<input
										type="date"
										name="backtest.startDate"
										value={config.backtest.startDate}
										onChange={handleChange}
										className="w-full p-1.5 bg-gray-600 border border-gray-500 rounded text-sm"
									/>
								</div>

								<div>
									<label className="block text-xs mb-1">End Date</label>
									<input
										type="date"
										name="backtest.endDate"
										value={config.backtest.endDate}
										onChange={handleChange}
										className="w-full p-1.5 bg-gray-600 border border-gray-500 rounded text-sm"
									/>
								</div>

								<div className="col-span-2">
									<label className="block text-xs mb-1">
										Initial Capital (USDT)
									</label>
									<input
										type="number"
										name="backtest.initialCapital"
										value={config.backtest.initialCapital}
										onChange={handleChange}
										min="100"
										className="w-full p-1.5 bg-gray-600 border border-gray-500 rounded text-sm"
									/>
								</div>
							</div>
						</div>
					)}

					{(config.runMode === "live" || config.runMode === "paper") && (
						<div className="p-3 bg-gray-700 rounded-md mb-4">
							<h3 className="text-sm font-medium mb-2">Live Settings</h3>

							<div className="space-y-2">
								<div className="flex items-center">
									<input
										type="checkbox"
										id="useRealOrders"
										name="live.useRealOrders"
										checked={config.live.useRealOrders}
										onChange={handleChange}
										className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded"
									/>
									<label htmlFor="useRealOrders" className="ml-2 block text-sm">
										Execute Real Orders{" "}
										{config.runMode === "paper" &&
											"(Disabled in Paper Trading)"}
									</label>
								</div>

								<div>
									<label className="block text-xs mb-1">
										Max Open Positions
									</label>
									<input
										type="number"
										name="live.maxOpenPositions"
										value={config.live.maxOpenPositions}
										onChange={handleChange}
										min="1"
										max="10"
										className="w-full p-1.5 bg-gray-600 border border-gray-500 rounded text-sm"
									/>
								</div>
							</div>
						</div>
					)}

					{/* Custom content passed as children */}
					{children}

					<div className="flex justify-end space-x-3 mt-6">
						<button
							type="button"
							onClick={onClose}
							className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
						>
							Cancel
						</button>
						<button
							type="submit"
							className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
						>
							Run Strategy
						</button>
					</div>
				</form>
			</div>
		</div>,
		document.getElementById("modal-root")!
	);
};

export default ConfigModal;
