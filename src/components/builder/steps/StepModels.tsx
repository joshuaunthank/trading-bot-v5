import React, { useState, useEffect } from "react";
import { useStrategy } from "../../../context/StrategyContext";
import { Model } from "../../../context/Types";

const StepModels: React.FC = () => {
	const { strategy, setStrategy } = useStrategy();
	const [models, setModels] = useState<Model[]>(strategy.models || []);
	const [currentModel, setCurrentModel] = useState<Model | null>(null);
	const [isEditing, setIsEditing] = useState(false);
	const [modelTypes, setModelTypes] = useState<string[]>([]);
	const [modelSubtypes, setModelSubtypes] = useState<Record<string, string[]>>(
		{}
	);
	const [error, setError] = useState<string | null>(null);

	// Fetch available model types
	useEffect(() => {
		const fetchModelTypes = async () => {
			try {
				const response = await fetch("/api/v1/models/types");
				if (!response.ok) {
					throw new Error("Failed to fetch model types");
				}
				const data = await response.json();
				setModelTypes(data.types || []);
				setModelSubtypes(data.subtypes || {});
			} catch (err) {
				setError(
					err instanceof Error ? err.message : "Failed to load model types"
				);
			}
		};

		fetchModelTypes();
	}, []);

	// When models state changes, update the parent strategy
	useEffect(() => {
		setStrategy((prev) => ({
			...prev,
			models,
		}));
	}, [models, setStrategy]);

	// Create a default empty model
	const createEmptyModel = (): Model => ({
		id: `model_${Date.now()}`,
		type: "",
		subtype: "",
		input_fields: [],
		output_field: "",
		parameters: {},
		enabled: true,
	});

	// Add a new model to the list
	const handleAddModel = () => {
		setCurrentModel(createEmptyModel());
		setIsEditing(true);
	};

	// Edit an existing model
	const handleEditModel = (model: Model) => {
		setCurrentModel({ ...model });
		setIsEditing(true);
	};

	// Delete a model
	const handleDeleteModel = (id: string) => {
		setModels(models.filter((model) => model.id !== id));
	};

	// Save the current model
	const handleSaveModel = () => {
		if (!currentModel) return;

		if (
			!currentModel.type ||
			!currentModel.subtype ||
			!currentModel.output_field
		) {
			setError("Type, subtype, and output field are required");
			return;
		}

		if (currentModel.input_fields.length === 0) {
			setError("At least one input field is required");
			return;
		}

		// If editing existing model, replace it; otherwise add new
		const exists = models.some((model) => model.id === currentModel.id);

		if (exists) {
			setModels(
				models.map((model) =>
					model.id === currentModel.id ? currentModel : model
				)
			);
		} else {
			setModels([...models, currentModel]);
		}

		setIsEditing(false);
		setCurrentModel(null);
		setError(null);
	};

	// Cancel the current edit
	const handleCancelEdit = () => {
		setIsEditing(false);
		setCurrentModel(null);
		setError(null);
	};

	// Handle changes to the current model
	const handleModelChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
	) => {
		if (!currentModel) return;

		const { name, value } = e.target;
		setCurrentModel({
			...currentModel,
			[name]: value,
		});
	};

	// Handle changes to input fields (comma separated)
	const handleInputFieldsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (!currentModel) return;

		const fields = e.target.value
			.split(",")
			.map((field) => field.trim())
			.filter(Boolean);
		setCurrentModel({
			...currentModel,
			input_fields: fields,
		});
	};

	// Handle toggle for model enabled state
	const handleToggleEnabled = (id: string) => {
		setModels(
			models.map((model) =>
				model.id === id ? { ...model, enabled: !model.enabled } : model
			)
		);
	};

	// Get available indicator output fields for input selection
	const availableInputFields = strategy.indicators
		.filter((i) => i.enabled)
		.flatMap((i) => i.output_fields);

	return (
		<div className="space-y-6">
			<h2 className="text-xl font-semibold mb-4">Models</h2>

			{error && (
				<div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-2 rounded">
					{error}
				</div>
			)}

			{isEditing ? (
				// Model editor form
				<div className="bg-gray-700 p-4 rounded-lg space-y-4">
					<h3 className="text-lg font-medium">
						{currentModel?.id ? "Edit Model" : "Add New Model"}
					</h3>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-300 mb-1">
								Type *
							</label>
							<select
								name="type"
								value={currentModel?.type || ""}
								onChange={handleModelChange}
								className="w-full p-2 bg-gray-600 border border-gray-500 rounded text-white"
								required
							>
								<option value="">Select Type</option>
								{modelTypes.map((type) => (
									<option key={type} value={type}>
										{type}
									</option>
								))}
							</select>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-300 mb-1">
								Subtype *
							</label>
							<select
								name="subtype"
								value={currentModel?.subtype || ""}
								onChange={handleModelChange}
								className="w-full p-2 bg-gray-600 border border-gray-500 rounded text-white"
								required
								disabled={!currentModel?.type}
							>
								<option value="">Select Subtype</option>
								{currentModel?.type &&
									modelSubtypes[currentModel.type]?.map((subtype) => (
										<option key={subtype} value={subtype}>
											{subtype}
										</option>
									))}
							</select>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-300 mb-1">
								Input Fields (comma separated) *
							</label>
							<input
								type="text"
								value={currentModel?.input_fields.join(", ") || ""}
								onChange={handleInputFieldsChange}
								className="w-full p-2 bg-gray-600 border border-gray-500 rounded text-white"
								placeholder="e.g., rsi, macd_histogram"
								required
							/>

							{availableInputFields.length > 0 && (
								<div className="mt-1 text-xs text-gray-400">
									Available fields: {availableInputFields.join(", ")}
								</div>
							)}
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-300 mb-1">
								Output Field *
							</label>
							<input
								type="text"
								name="output_field"
								value={currentModel?.output_field || ""}
								onChange={handleModelChange}
								className="w-full p-2 bg-gray-600 border border-gray-500 rounded text-white"
								placeholder="e.g., forecast_return"
								required
							/>
						</div>
					</div>

					{/* Model parameters section - simplified for now */}
					<div className="mt-6">
						<h4 className="text-md font-medium mb-2">Advanced Settings</h4>

						<div className="space-y-4">
							{/* Normalization */}
							<div className="flex items-center">
								<input
									type="checkbox"
									id="normalize-enabled"
									checked={currentModel?.modifiers?.normalize?.enabled || false}
									onChange={(e) => {
										if (!currentModel) return;
										setCurrentModel({
											...currentModel,
											modifiers: {
												...currentModel.modifiers,
												normalize: { enabled: e.target.checked },
											},
										});
									}}
									className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded"
								/>
								<label
									htmlFor="normalize-enabled"
									className="ml-2 text-sm text-gray-300"
								>
									Normalize Input Values
								</label>
							</div>

							{/* Dependencies (other models) */}
							<div>
								<label className="block text-sm font-medium text-gray-300 mb-1">
									Dependencies (comma separated)
								</label>
								<input
									type="text"
									value={currentModel?.dependencies?.join(", ") || ""}
									onChange={(e) => {
										if (!currentModel) return;
										const deps = e.target.value
											.split(",")
											.map((dep) => dep.trim())
											.filter(Boolean);
										setCurrentModel({
											...currentModel,
											dependencies: deps,
										});
									}}
									className="w-full p-2 bg-gray-600 border border-gray-500 rounded text-white"
									placeholder="e.g., rsi_14, macd_12_26_9"
								/>
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
							onClick={handleSaveModel}
							className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
						>
							Save Model
						</button>
					</div>
				</div>
			) : (
				// Models list
				<div>
					{models.length === 0 ? (
						<div className="text-center py-8 bg-gray-700 rounded-lg">
							<p className="text-gray-400 mb-4">No models added yet</p>
							<button
								onClick={handleAddModel}
								className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
							>
								Add Your First Model
							</button>
						</div>
					) : (
						<>
							<div className="space-y-3">
								{models.map((model) => (
									<div
										key={model.id}
										className={`p-4 rounded-lg border ${
											model.enabled
												? "bg-gray-700 border-gray-600"
												: "bg-gray-800 border-gray-700 opacity-70"
										}`}
									>
										<div className="flex justify-between items-start">
											<div>
												<h4 className="text-lg font-medium">
													{model.type}/{model.subtype}
												</h4>
												<p className="text-sm text-gray-400 mt-1">
													Inputs: {model.input_fields.join(", ")}
												</p>
												<p className="text-sm text-gray-400 mt-1">
													Output: {model.output_field}
												</p>

												{/* Show dependencies if any */}
												{model.dependencies &&
													model.dependencies.length > 0 && (
														<p className="text-xs text-gray-500 mt-2">
															Dependencies: {model.dependencies.join(", ")}
														</p>
													)}
											</div>

											<div className="flex space-x-2">
												<button
													onClick={() => handleToggleEnabled(model.id)}
													className={`p-1 rounded ${
														model.enabled
															? "bg-green-700 text-green-200 hover:bg-green-800"
															: "bg-gray-600 text-gray-300 hover:bg-gray-700"
													}`}
													title={model.enabled ? "Disable" : "Enable"}
												>
													{model.enabled ? "Enabled" : "Disabled"}
												</button>
												<button
													onClick={() => handleEditModel(model)}
													className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700"
													title="Edit"
												>
													Edit
												</button>
												<button
													onClick={() => handleDeleteModel(model.id)}
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
									onClick={handleAddModel}
									className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
								>
									Add Another Model
								</button>
							</div>
						</>
					)}
				</div>
			)}
		</div>
	);
};

export default StepModels;
