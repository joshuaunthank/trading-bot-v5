import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStrategy } from "../../../context/StrategyContext";

const StepReview: React.FC = () => {
	const { strategy, saveStrategy, resetStrategy } = useStrategy();
	const [showJson, setShowJson] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);
	const navigate = useNavigate();

	// Format strategy as JSON for display
	const formattedJson = JSON.stringify(strategy, null, 2);

	// Handle save strategy
	const handleSaveStrategy = async () => {
		setIsSaving(true);
		setError(null);
		setSuccessMessage(null);

		try {
			const success = await saveStrategy();

			if (success) {
				setSuccessMessage("Strategy saved successfully!");
				// Navigate to library after a short delay
				setTimeout(() => {
					navigate("/library");
				}, 1500);
			} else {
				setError("Failed to save strategy. Please try again.");
			}
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "An error occurred while saving"
			);
		} finally {
			setIsSaving(false);
		}
	};

	// Handle reset form
	const handleReset = () => {
		if (
			window.confirm(
				"Are you sure you want to reset the form? All changes will be lost."
			)
		) {
			resetStrategy();
			navigate("/builder");
		}
	};

	return (
		<div className="space-y-6">
			<h2 className="text-xl font-semibold mb-4">Review Strategy</h2>

			{error && (
				<div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-2 rounded">
					{error}
				</div>
			)}

			{successMessage && (
				<div className="bg-green-900/50 border border-green-500 text-green-200 px-4 py-2 rounded">
					{successMessage}
				</div>
			)}

			<div className="bg-gray-800 rounded-lg overflow-hidden">
				<div className="p-4 bg-gray-700">
					<h3 className="text-lg font-medium">Strategy Summary</h3>
				</div>

				<div className="p-4 space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<h4 className="text-md font-medium text-gray-300">Metadata</h4>
							<div className="mt-2 space-y-1">
								<p>
									<span className="text-gray-400">Name:</span> {strategy.name}
								</p>
								<p>
									<span className="text-gray-400">Symbol:</span>{" "}
									{strategy.symbol}
								</p>
								<p>
									<span className="text-gray-400">Timeframe:</span>{" "}
									{strategy.timeframe}
								</p>
								<p>
									<span className="text-gray-400">Status:</span>{" "}
									{strategy.enabled ? "Enabled" : "Disabled"}
								</p>
								{strategy.tags.length > 0 && (
									<p>
										<span className="text-gray-400">Tags:</span>{" "}
										{strategy.tags.map((tag, i) => (
											<span
												key={i}
												className="inline-block px-2 py-1 text-xs bg-gray-700 rounded-full mr-1"
											>
												{tag}
											</span>
										))}
									</p>
								)}
							</div>
						</div>

						<div>
							<h4 className="text-md font-medium text-gray-300">Components</h4>
							<div className="mt-2 space-y-1">
								<p>
									<span className="text-gray-400">Indicators:</span>{" "}
									{strategy.indicators.length}
								</p>
								<p>
									<span className="text-gray-400">Models:</span>{" "}
									{strategy.models.length}
								</p>
								<p>
									<span className="text-gray-400">Post-processing:</span>{" "}
									{strategy.postprocessing?.length || 0}
								</p>
								<p>
									<span className="text-gray-400">Signals:</span>{" "}
									{strategy.signals.length}
								</p>
							</div>
						</div>
					</div>

					<div>
						<h4 className="text-md font-medium text-gray-300">Risk Profile</h4>
						<div className="mt-2 space-y-1">
							<p>
								<span className="text-gray-400">Position Sizing:</span>{" "}
								{strategy.risk.position_size_type}
							</p>
							<p>
								<span className="text-gray-400">Risk Per Trade:</span>{" "}
								{strategy.risk.risk_per_trade}%
							</p>
							<p>
								<span className="text-gray-400">Stop Loss:</span>{" "}
								{strategy.risk.stop_loss_percent}%
							</p>
							<p>
								<span className="text-gray-400">Take Profit:</span>{" "}
								{strategy.risk.take_profit_percent}%
							</p>
							<p>
								<span className="text-gray-400">Trailing Stop:</span>{" "}
								{strategy.risk.trailing_stop ? "Enabled" : "Disabled"}
							</p>
							<p>
								<span className="text-gray-400">Max Drawdown:</span>{" "}
								{strategy.risk.max_drawdown_percent}%
							</p>
						</div>
					</div>

					<div>
						<h4 className="text-md font-medium text-gray-300">
							Trading Signals
						</h4>
						<div className="mt-2 space-y-3">
							{strategy.signals.map((signal, index) => (
								<div key={index} className="text-sm">
									<p className="font-medium">
										{signal.side === "long" ? "↑" : "↓"}{" "}
										{signal.type === "entry" ? "Enter" : "Exit"} {signal.side}
									</p>
									<p className="text-gray-400">
										<code className="bg-gray-800 px-2 py-1 rounded">
											{signal.expression}
										</code>
									</p>
								</div>
							))}
						</div>
					</div>

					<div className="pt-4 border-t border-gray-700">
						<button
							onClick={() => setShowJson(!showJson)}
							className="text-blue-400 hover:text-blue-300"
						>
							{showJson ? "Hide JSON" : "Show JSON"}
						</button>

						{showJson && (
							<pre className="mt-2 p-3 bg-gray-900 rounded-lg overflow-auto text-xs text-gray-300 max-h-60">
								{formattedJson}
							</pre>
						)}
					</div>
				</div>
			</div>

			<div className="flex justify-between mt-6">
				<button
					onClick={handleReset}
					className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
				>
					Reset
				</button>

				<button
					onClick={handleSaveStrategy}
					disabled={isSaving}
					className={`px-6 py-2 rounded-lg ${
						isSaving
							? "bg-gray-700 text-gray-400 cursor-not-allowed"
							: "bg-blue-600 text-white hover:bg-blue-700"
					}`}
				>
					{isSaving ? "Saving..." : "Save Strategy"}
				</button>
			</div>
		</div>
	);
};

export default StepReview;
