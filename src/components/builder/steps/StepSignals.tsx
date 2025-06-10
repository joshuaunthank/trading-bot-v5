import React, { useState, useEffect } from "react";
import { useStrategy } from "../../../context/StrategyContext";
import { Signal } from "../../../context/Types";

const StepSignals: React.FC = () => {
	const { strategy, setStrategy } = useStrategy();
	const [signals, setSignals] = useState<Signal[]>(strategy.signals || []);
	const [currentSignal, setCurrentSignal] = useState<Signal | null>(null);
	const [isEditing, setIsEditing] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// When signals state changes, update the parent strategy
	useEffect(() => {
		setStrategy((prev) => ({
			...prev,
			signals,
		}));
	}, [signals, setStrategy]);

	// Create a default empty signal
	const createEmptySignal = (): Signal => ({
		id: `signal_${Date.now()}`,
		type: "entry",
		side: "long",
		expression: "",
		description: "",
	});

	// Add a new signal to the list
	const handleAddSignal = () => {
		setCurrentSignal(createEmptySignal());
		setIsEditing(true);
	};

	// Edit an existing signal
	const handleEditSignal = (signal: Signal) => {
		setCurrentSignal({ ...signal });
		setIsEditing(true);
	};

	// Delete a signal
	const handleDeleteSignal = (id: string) => {
		setSignals(signals.filter((signal) => signal.id !== id));
	};

	// Save the current signal
	const handleSaveSignal = () => {
		if (!currentSignal) return;

		if (!currentSignal.expression) {
			setError("Expression is required");
			return;
		}

		// If editing existing signal, replace it; otherwise add new
		const exists = signals.some((signal) => signal.id === currentSignal.id);

		if (exists) {
			setSignals(
				signals.map((signal) =>
					signal.id === currentSignal.id ? currentSignal : signal
				)
			);
		} else {
			setSignals([...signals, currentSignal]);
		}

		setIsEditing(false);
		setCurrentSignal(null);
		setError(null);
	};

	// Cancel the current edit
	const handleCancelEdit = () => {
		setIsEditing(false);
		setCurrentSignal(null);
		setError(null);
	};

	// Handle changes to the current signal
	const handleSignalChange = (
		e: React.ChangeEvent<
			HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
		>
	) => {
		if (!currentSignal) return;

		const { name, value } = e.target;
		setCurrentSignal({
			...currentSignal,
			[name]: value,
		});
	};

	// Get available fields for signals from indicators, models, and postprocessing
	const availableFields = [
		...strategy.indicators
			.filter((i) => i.enabled)
			.flatMap((i) => i.output_fields),
		...strategy.models.filter((m) => m.enabled).map((m) => m.output_field),
		...(strategy.postprocessing || []).map((p) => p.output_field),
	];

	return (
		<div className="space-y-6">
			<h2 className="text-xl font-semibold mb-4">Trading Signals</h2>

			{error && (
				<div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-2 rounded">
					{error}
				</div>
			)}

			{isEditing ? (
				// Signal editor form
				<div className="bg-gray-700 p-4 rounded-lg space-y-4">
					<h3 className="text-lg font-medium">
						{currentSignal?.id ? "Edit Signal" : "Add New Signal"}
					</h3>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-300 mb-1">
								Type
							</label>
							<select
								name="type"
								value={currentSignal?.type || "entry"}
								onChange={handleSignalChange}
								className="w-full p-2 bg-gray-600 border border-gray-500 rounded text-white"
							>
								<option value="entry">Entry</option>
								<option value="exit">Exit</option>
							</select>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-300 mb-1">
								Side
							</label>
							<select
								name="side"
								value={currentSignal?.side || "long"}
								onChange={handleSignalChange}
								className="w-full p-2 bg-gray-600 border border-gray-500 rounded text-white"
							>
								<option value="long">Long</option>
								<option value="short">Short</option>
							</select>
						</div>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-300 mb-1">
							Expression *
						</label>
						<textarea
							name="expression"
							value={currentSignal?.expression || ""}
							onChange={handleSignalChange}
							rows={3}
							className="w-full p-2 bg-gray-600 border border-gray-500 rounded text-white"
							placeholder="e.g., forecast_return > 0.01 && rsi < 30"
							required
						/>

						{availableFields.length > 0 && (
							<div className="mt-1 text-xs text-gray-400">
								Available fields: {availableFields.join(", ")}
							</div>
						)}
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-300 mb-1">
							Description
						</label>
						<input
							type="text"
							name="description"
							value={currentSignal?.description || ""}
							onChange={handleSignalChange}
							className="w-full p-2 bg-gray-600 border border-gray-500 rounded text-white"
							placeholder="e.g., Long entry when forecasted return is positive and RSI is oversold"
						/>
					</div>

					<div className="flex justify-end space-x-3 mt-6">
						<button
							onClick={handleCancelEdit}
							className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
						>
							Cancel
						</button>
						<button
							onClick={handleSaveSignal}
							className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
						>
							Save Signal
						</button>
					</div>
				</div>
			) : (
				// Signals list
				<div>
					{signals.length === 0 ? (
						<div className="text-center py-8 bg-gray-700 rounded-lg">
							<p className="text-gray-400 mb-4">No signals added yet</p>
							<button
								onClick={handleAddSignal}
								className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
							>
								Add Your First Signal
							</button>
						</div>
					) : (
						<>
							<div className="space-y-3">
								{signals.map((signal) => (
									<div
										key={signal.id}
										className={`p-4 rounded-lg border ${
											signal.type === "entry"
												? signal.side === "long"
													? "bg-green-900/30 border-green-700"
													: "bg-red-900/30 border-red-700"
												: "bg-gray-700 border-gray-600"
										}`}
									>
										<div className="flex justify-between items-start">
											<div>
												<h4 className="text-lg font-medium">
													{signal.side === "long" ? "↑" : "↓"}{" "}
													{signal.type === "entry" ? "Enter" : "Exit"}{" "}
													{signal.side}
												</h4>
												<p className="text-sm mt-1">
													<code className="bg-gray-800 px-2 py-1 rounded">
														{signal.expression}
													</code>
												</p>
												{signal.description && (
													<p className="text-sm text-gray-400 mt-2">
														{signal.description}
													</p>
												)}
											</div>

											<div className="flex space-x-2">
												<button
													onClick={() => handleEditSignal(signal)}
													className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700"
													title="Edit"
												>
													Edit
												</button>
												<button
													onClick={() => handleDeleteSignal(signal.id)}
													className="p-1 bg-red-600 text-white rounded hover:bg-red-700"
													title="Delete"
												>
													Delete
												</button>
											</div>
										</div>
									</div>
								))}
							</div>

							<div className="mt-6">
								<button
									onClick={handleAddSignal}
									className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
								>
									Add Another Signal
								</button>
							</div>
						</>
					)}
				</div>
			)}
		</div>
	);
};

export default StepSignals;
