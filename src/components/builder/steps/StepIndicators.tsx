import React, { useState, useEffect } from "react";
import { useStrategy } from "../../../context/StrategyContext";
import { Indicator } from "../../../context/Types";

const StepIndicators: React.FC = () => {
	const { strategy, setStrategy } = useStrategy();
	const [indicators, setIndicators] = useState<Indicator[]>(
		strategy.indicators || []
	);
	const [currentIndicator, setCurrentIndicator] = useState<Indicator | null>(
		null
	);
	const [isEditing, setIsEditing] = useState(false);
	const [indicatorTypes, setIndicatorTypes] = useState<string[]>([]);
	const [error, setError] = useState<string | null>(null);

	// Fetch available indicator types
	useEffect(() => {
		const fetchIndicatorTypes = async () => {
			try {
				const response = await fetch("/api/v1/indicators/types");
				if (!response.ok) {
					throw new Error("Failed to fetch indicator types");
				}
				const data = await response.json();
				setIndicatorTypes(data);
			} catch (err) {
				setError(
					err instanceof Error ? err.message : "Failed to load indicator types"
				);
			}
		};

		fetchIndicatorTypes();
	}, []);

	// When indicators state changes, update the parent strategy
	useEffect(() => {
		setStrategy((prev) => ({
			...prev,
			indicators,
		}));
	}, [indicators, setStrategy]);

	// Create a default empty indicator
	const createEmptyIndicator = (): Indicator => ({
		id: `indicator_${Date.now()}`,
		name: "",
		type: "",
		source: "close",
		parameters: {},
		output_fields: [],
		enabled: true,
	});

	// Add a new indicator to the list
	const handleAddIndicator = () => {
		setCurrentIndicator(createEmptyIndicator());
		setIsEditing(true);
	};

	// Edit an existing indicator
	const handleEditIndicator = (indicator: Indicator) => {
		setCurrentIndicator({ ...indicator });
		setIsEditing(true);
	};

	// Delete an indicator
	const handleDeleteIndicator = (id: string) => {
		setIndicators(indicators.filter((ind) => ind.id !== id));
	};

	// Save the current indicator
	const handleSaveIndicator = () => {
		if (!currentIndicator) return;

		if (!currentIndicator.name.trim() || !currentIndicator.type) {
			setError("Name and type are required");
			return;
		}

		// If editing existing indicator, replace it; otherwise add new
		const exists = indicators.some((ind) => ind.id === currentIndicator.id);

		if (exists) {
			setIndicators(
				indicators.map((ind) =>
					ind.id === currentIndicator.id ? currentIndicator : ind
				)
			);
		} else {
			setIndicators([...indicators, currentIndicator]);
		}

		setIsEditing(false);
		setCurrentIndicator(null);
		setError(null);
	};

	// Cancel the current edit
	const handleCancelEdit = () => {
		setIsEditing(false);
		setCurrentIndicator(null);
		setError(null);
	};

	// Handle changes to the current indicator
	const handleIndicatorChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
	) => {
		if (!currentIndicator) return;

		const { name, value } = e.target;
		setCurrentIndicator({
			...currentIndicator,
			[name]: value,
		});
	};

	// Handle changes to output fields (comma separated)
	const handleOutputFieldsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (!currentIndicator) return;

		const fields = e.target.value
			.split(",")
			.map((field) => field.trim())
			.filter(Boolean);
		setCurrentIndicator({
			...currentIndicator,
			output_fields: fields,
		});
	};

	// Handle changes to modifiers
	const handleModifierChange = (
		modifierType: string,
		key: string,
		value: any
	) => {
		if (!currentIndicator) return;

		setCurrentIndicator({
			...currentIndicator,
			modifiers: {
				...currentIndicator.modifiers,
				[modifierType]: {
					...currentIndicator.modifiers?.[
						modifierType as keyof typeof currentIndicator.modifiers
					],
					[key]: value,
				},
			},
		});
	};

	// Handle toggle for indicator enabled state
	const handleToggleEnabled = (id: string) => {
		setIndicators(
			indicators.map((ind) =>
				ind.id === id ? { ...ind, enabled: !ind.enabled } : ind
			)
		);
	};

	const dataSourceOptions = ["open", "high", "low", "close", "volume"];

	return (
		<div className="space-y-6">
			<h2 className="text-xl font-semibold mb-4">Indicators</h2>

			{error && (
				<div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-2 rounded">
					{error}
				</div>
			)}

			{isEditing ? (
				// Indicator editor form
				<div className="bg-gray-700 p-4 rounded-lg space-y-4">
					<h3 className="text-lg font-medium">
						{currentIndicator?.id ? "Edit Indicator" : "Add New Indicator"}
					</h3>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-300 mb-1">
								Name *
							</label>
							<input
								type="text"
								name="name"
								value={currentIndicator?.name || ""}
								onChange={handleIndicatorChange}
								className="w-full p-2 bg-gray-600 border border-gray-500 rounded text-white"
								placeholder="RSI, MACD, etc."
								required
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-300 mb-1">
								Type *
							</label>
							<select
								name="type"
								value={currentIndicator?.type || ""}
								onChange={handleIndicatorChange}
								className="w-full p-2 bg-gray-600 border border-gray-500 rounded text-white"
								required
							>
								<option value="">Select Type</option>
								{indicatorTypes.map((type) => (
									<option key={type} value={type}>
										{type}
									</option>
								))}
							</select>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-300 mb-1">
								Data Source
							</label>
							<select
								name="source"
								value={currentIndicator?.source || "close"}
								onChange={handleIndicatorChange}
								className="w-full p-2 bg-gray-600 border border-gray-500 rounded text-white"
							>
								{dataSourceOptions.map((source) => (
									<option key={source} value={source}>
										{source}
									</option>
								))}
							</select>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-300 mb-1">
								Output Fields (comma separated)
							</label>
							<input
								type="text"
								value={currentIndicator?.output_fields.join(", ") || ""}
								onChange={handleOutputFieldsChange}
								className="w-full p-2 bg-gray-600 border border-gray-500 rounded text-white"
								placeholder="rsi, macd, signal, histogram"
							/>
						</div>
					</div>

					{/* Modifiers section */}
					<div className="mt-6">
						<h4 className="text-md font-medium mb-2">Modifiers</h4>

						<div className="space-y-4">
							{/* Lag Modifier */}
							<div className="flex items-center space-x-4">
								<input
									type="checkbox"
									id="lag-enabled"
									checked={currentIndicator?.modifiers?.lag?.enabled || false}
									onChange={(e) =>
										handleModifierChange("lag", "enabled", e.target.checked)
									}
									className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded"
								/>
								<label htmlFor="lag-enabled" className="text-sm text-gray-300">
									Apply Lag
								</label>

								{currentIndicator?.modifiers?.lag?.enabled && (
									<div className="flex items-center space-x-2">
										<label
											htmlFor="lag-period"
											className="text-sm text-gray-300"
										>
											Period:
										</label>
										<input
											type="number"
											id="lag-period"
											min="1"
											value={currentIndicator?.modifiers?.lag?.period || 1}
											onChange={(e) =>
												handleModifierChange(
													"lag",
													"period",
													parseInt(e.target.value)
												)
											}
											className="w-16 p-1 bg-gray-600 border border-gray-500 rounded text-white"
										/>
									</div>
								)}
							</div>

							{/* Normalize Modifier */}
							<div className="flex items-center">
								<input
									type="checkbox"
									id="normalize-enabled"
									checked={
										currentIndicator?.modifiers?.normalize?.enabled || false
									}
									onChange={(e) =>
										handleModifierChange(
											"normalize",
											"enabled",
											e.target.checked
										)
									}
									className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded"
								/>
								<label
									htmlFor="normalize-enabled"
									className="ml-2 text-sm text-gray-300"
								>
									Normalize Values
								</label>
							</div>

							{/* Rolling Modifier */}
							<div className="flex items-center space-x-4">
								<input
									type="checkbox"
									id="rolling-enabled"
									checked={
										currentIndicator?.modifiers?.rolling?.enabled || false
									}
									onChange={(e) =>
										handleModifierChange("rolling", "enabled", e.target.checked)
									}
									className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded"
								/>
								<label
									htmlFor="rolling-enabled"
									className="text-sm text-gray-300"
								>
									Apply Rolling Window
								</label>

								{currentIndicator?.modifiers?.rolling?.enabled && (
									<div className="flex items-center space-x-2">
										<label
											htmlFor="rolling-window"
											className="text-sm text-gray-300"
										>
											Window:
										</label>
										<input
											type="number"
											id="rolling-window"
											min="1"
											value={currentIndicator?.modifiers?.rolling?.window || 14}
											onChange={(e) =>
												handleModifierChange(
													"rolling",
													"window",
													parseInt(e.target.value)
												)
											}
											className="w-16 p-1 bg-gray-600 border border-gray-500 rounded text-white"
										/>
									</div>
								)}
							</div>
						</div>
					</div>

					<div className="flex justify-end space-x-3 mt-6">
						<button
							onClick={handleCancelEdit}
							className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
						>
							Cancel
						</button>
						<button
							onClick={handleSaveIndicator}
							className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
						>
							Save Indicator
						</button>
					</div>
				</div>
			) : (
				// Indicators list
				<div>
					{indicators.length === 0 ? (
						<div className="text-center py-8 bg-gray-700 rounded-lg">
							<p className="text-gray-400 mb-4">No indicators added yet</p>
							<button
								onClick={handleAddIndicator}
								className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
							>
								Add Your First Indicator
							</button>
						</div>
					) : (
						<>
							<div className="space-y-3">
								{indicators.map((indicator) => (
									<div
										key={indicator.id}
										className={`p-4 rounded-lg border ${
											indicator.enabled
												? "bg-gray-700 border-gray-600"
												: "bg-gray-800 border-gray-700 opacity-70"
										}`}
									>
										<div className="flex justify-between items-start">
											<div>
												<h4 className="text-lg font-medium">
													{indicator.name}
												</h4>
												<p className="text-sm text-gray-400">
													Type: {indicator.type} | Source: {indicator.source}
												</p>
												<p className="text-sm text-gray-400 mt-1">
													Output: {indicator.output_fields.join(", ")}
												</p>

												{/* Show modifiers summary if any */}
												{indicator.modifiers && (
													<div className="text-xs text-gray-500 mt-2">
														{indicator.modifiers.lag?.enabled && (
															<span className="mr-2">
																Lag: {indicator.modifiers.lag.period}
															</span>
														)}
														{indicator.modifiers.normalize?.enabled && (
															<span className="mr-2">Normalized</span>
														)}
														{indicator.modifiers.rolling?.enabled && (
															<span>
																Rolling: {indicator.modifiers.rolling.window}
															</span>
														)}
													</div>
												)}
											</div>

											<div className="flex space-x-2">
												<button
													onClick={() => handleToggleEnabled(indicator.id)}
													className={`p-1 rounded ${
														indicator.enabled
															? "bg-green-700 text-green-200 hover:bg-green-800"
															: "bg-gray-600 text-gray-300 hover:bg-gray-700"
													}`}
													title={indicator.enabled ? "Disable" : "Enable"}
												>
													{indicator.enabled ? "Enabled" : "Disabled"}
												</button>
												<button
													onClick={() => handleEditIndicator(indicator)}
													className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700"
													title="Edit"
												>
													Edit
												</button>
												<button
													onClick={() => handleDeleteIndicator(indicator.id)}
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
									onClick={handleAddIndicator}
									className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
								>
									Add Another Indicator
								</button>
							</div>
						</>
					)}
				</div>
			)}
		</div>
	);
};

export default StepIndicators;
