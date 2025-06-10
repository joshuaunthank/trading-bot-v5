import React, { useState, useEffect } from "react";
import { useStrategy } from "../../../context/StrategyContext";
import { PostProcessing } from "../../../context/Types";

const StepPostprocessing: React.FC = () => {
	const { strategy, setStrategy } = useStrategy();
	const [postprocessing, setPostprocessing] = useState<PostProcessing[]>(
		strategy.postprocessing || []
	);
	const [currentProcessor, setCurrentProcessor] =
		useState<PostProcessing | null>(null);
	const [isEditing, setIsEditing] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [processorTypes, setProcessorTypes] = useState<string[]>([]);

	// Fetch available processor types
	useEffect(() => {
		const fetchProcessorTypes = async () => {
			try {
				const response = await fetch("/api/v1/processors/types");
				if (!response.ok) {
					throw new Error("Failed to fetch processor types");
				}
				const data = await response.json();
				setProcessorTypes(data);
			} catch (err) {
				// If endpoint doesn't exist, use defaults
				setProcessorTypes(["correction", "normalization", "transformation"]);
			}
		};

		fetchProcessorTypes();
	}, []);

	// When postprocessing state changes, update the parent strategy
	useEffect(() => {
		setStrategy((prev) => ({
			...prev,
			postprocessing,
		}));
	}, [postprocessing, setStrategy]);

	// Create a default empty processor
	const createEmptyProcessor = (): PostProcessing => ({
		id: `processor_${Date.now()}`,
		type: "correction",
		model_type: "",
		input_fields: [],
		output_field: "",
		parameters: {},
	});

	// Add a new processor to the list
	const handleAddProcessor = () => {
		setCurrentProcessor(createEmptyProcessor());
		setIsEditing(true);
	};

	// Edit an existing processor
	const handleEditProcessor = (processor: PostProcessing) => {
		setCurrentProcessor({ ...processor });
		setIsEditing(true);
	};

	// Delete a processor
	const handleDeleteProcessor = (id: string) => {
		setPostprocessing(postprocessing.filter((p) => p.id !== id));
	};

	// Save the current processor
	const handleSaveProcessor = () => {
		if (!currentProcessor) return;

		if (!currentProcessor.model_type || !currentProcessor.output_field) {
			setError("Model type and output field are required");
			return;
		}

		if (currentProcessor.input_fields.length === 0) {
			setError("At least one input field is required");
			return;
		}

		// If editing existing processor, replace it; otherwise add new
		const exists = postprocessing.some((p) => p.id === currentProcessor.id);

		if (exists) {
			setPostprocessing(
				postprocessing.map((p) =>
					p.id === currentProcessor.id ? currentProcessor : p
				)
			);
		} else {
			setPostprocessing([...postprocessing, currentProcessor]);
		}

		setIsEditing(false);
		setCurrentProcessor(null);
		setError(null);
	};

	// Cancel the current edit
	const handleCancelEdit = () => {
		setIsEditing(false);
		setCurrentProcessor(null);
		setError(null);
	};

	// Handle changes to the current processor
	const handleProcessorChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
	) => {
		if (!currentProcessor) return;

		const { name, value } = e.target;
		setCurrentProcessor({
			...currentProcessor,
			[name]: value,
		});
	};

	// Handle changes to input fields (comma separated)
	const handleInputFieldsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (!currentProcessor) return;

		const fields = e.target.value
			.split(",")
			.map((field) => field.trim())
			.filter(Boolean);
		setCurrentProcessor({
			...currentProcessor,
			input_fields: fields,
		});
	};

	// Get available model and indicator output fields for input selection
	const availableInputFields = [
		...strategy.indicators
			.filter((i) => i.enabled)
			.flatMap((i) => i.output_fields),
		...strategy.models.filter((m) => m.enabled).map((m) => m.output_field),
	];

	const modelTypes = [
		"arima",
		"linear_regression",
		"kalman_filter",
		"ewma",
		"custom",
	];

	return (
		<div className="space-y-6">
			<h2 className="text-xl font-semibold mb-4">Post-processing</h2>
			<p className="text-gray-400 mb-6">
				Post-processing steps help refine model outputs and prepare signals.
				This step is optional.
			</p>

			{error && (
				<div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-2 rounded">
					{error}
				</div>
			)}

			{isEditing ? (
				// Processor editor form
				<div className="bg-gray-700 p-4 rounded-lg space-y-4">
					<h3 className="text-lg font-medium">
						{currentProcessor?.id ? "Edit Processor" : "Add New Processor"}
					</h3>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-300 mb-1">
								Type
							</label>
							<select
								name="type"
								value={currentProcessor?.type || "correction"}
								onChange={handleProcessorChange}
								className="w-full p-2 bg-gray-600 border border-gray-500 rounded text-white"
							>
								{processorTypes.map((type) => (
									<option key={type} value={type}>
										{type}
									</option>
								))}
							</select>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-300 mb-1">
								Model Type *
							</label>
							<select
								name="model_type"
								value={currentProcessor?.model_type || ""}
								onChange={handleProcessorChange}
								className="w-full p-2 bg-gray-600 border border-gray-500 rounded text-white"
								required
							>
								<option value="">Select Model Type</option>
								{modelTypes.map((type) => (
									<option key={type} value={type}>
										{type}
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
								value={currentProcessor?.input_fields.join(", ") || ""}
								onChange={handleInputFieldsChange}
								className="w-full p-2 bg-gray-600 border border-gray-500 rounded text-white"
								placeholder="e.g., forecast_return"
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
								value={currentProcessor?.output_field || ""}
								onChange={handleProcessorChange}
								className="w-full p-2 bg-gray-600 border border-gray-500 rounded text-white"
								placeholder="e.g., adjusted_forecast"
								required
							/>
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
							onClick={handleSaveProcessor}
							className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
						>
							Save Processor
						</button>
					</div>
				</div>
			) : (
				// Processor list
				<div>
					{postprocessing.length === 0 ? (
						<div className="text-center py-8 bg-gray-700 rounded-lg">
							<p className="text-gray-400 mb-4">
								No post-processing steps added
							</p>
							<button
								onClick={handleAddProcessor}
								className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
							>
								Add Post-processing Step
							</button>
						</div>
					) : (
						<>
							<div className="space-y-3">
								{postprocessing.map((processor) => (
									<div
										key={processor.id}
										className="p-4 rounded-lg border bg-gray-700 border-gray-600"
									>
										<div className="flex justify-between items-start">
											<div>
												<h4 className="text-lg font-medium">
													{processor.type}: {processor.model_type}
												</h4>
												<p className="text-sm text-gray-400 mt-1">
													Inputs: {processor.input_fields.join(", ")}
												</p>
												<p className="text-sm text-gray-400 mt-1">
													Output: {processor.output_field}
												</p>
											</div>

											<div className="flex space-x-2">
												<button
													onClick={() => handleEditProcessor(processor)}
													className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700"
													title="Edit"
												>
													Edit
												</button>
												<button
													onClick={() => handleDeleteProcessor(processor.id)}
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
									onClick={handleAddProcessor}
									className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
								>
									Add Another Processor
								</button>
							</div>
						</>
					)}
				</div>
			)}
		</div>
	);
};

export default StepPostprocessing;
