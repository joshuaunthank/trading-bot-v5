import React, { useState, useEffect } from "react";

interface IndicatorOption {
	id: string;
	name: string;
	description: string;
	category: string;
	type: string;
	parameters: any;
	chart: any;
}
import { X, Plus, Trash2, Save, Copy } from "lucide-react";

interface StrategyEditorProps {
	isOpen: boolean;
	onClose: () => void;
	onSave: (strategy: StrategyData) => void;
	strategyId?: string | null; // null for create, string for edit
	existingStrategy?: StrategyData | null;
}

interface IndicatorParam {
	name: string;
	default: any;
	type: "number" | "string";
	color: string;
}

interface IndicatorConfig {
	description: string;
	params: IndicatorParam[];
}

interface NewIndicatorData {
	[key: string]: IndicatorConfig;
}

interface SignalCondition {
	indicator: string;
	operator: string;
	value: any;
	description: string;
}

interface SignalData {
	id: string;
	name?: string;
	type: "entry" | "exit";
	side: "long" | "short";
	expression?: string; // Legacy format support
	conditions?: SignalCondition[]; // New format
	logic?: "and" | "or";
	confidence?: number;
	description: string;
}

interface RiskData {
	position_size_type: "fixed" | "percent_equity";
	risk_per_trade: number;
	stop_loss_percent: number;
	take_profit_percent: number;
	trailing_stop: boolean;
	max_drawdown_percent: number;
}

interface StrategyData {
	id: string;
	name: string;
	description: string;
	symbol: string;
	timeframe: string;
	enabled: boolean;
	tags: string[];
	indicators: NewIndicatorData[];
	signals: SignalData[];
	risk: RiskData;
	ml_models: any[]; // Add ML models support
	postprocessing: any[]; // Add postprocessing support
	metadata: {
		version: string;
		created: string;
		author: string;
	};
}

// Helper functions to convert between expression and conditions formats
const conditionsToExpression = (
	conditions: SignalCondition[],
	logic: "and" | "or" = "and"
): string => {
	if (!conditions || conditions.length === 0) return "";

	const expressionParts = conditions.map((condition) => {
		const { indicator, operator, value, description } = condition;

		// Convert operators to expression format
		switch (operator) {
			case "less_than":
				return `${indicator} < ${value}`;
			case "greater_than":
				return `${indicator} > ${value}`;
			case "equals":
				return `${indicator} == ${value}`;
			case "crossover_above":
				return `${value} > ${indicator}`;
			case "crossover_below":
				return `${value} < ${indicator}`;
			default:
				return `${indicator} ${operator} ${value}`;
		}
	});

	const connector = logic === "and" ? " && " : " || ";
	return expressionParts.join(connector);
};

const expressionToConditions = (expression: string): SignalCondition[] => {
	if (!expression || expression.trim() === "") return [];

	// Simple parser for basic expressions
	// This is a basic implementation - you might want to enhance it
	const conditions: SignalCondition[] = [];

	// Split by && or ||
	const parts = expression.split(/\s*(\|\||\&\&)\s*/);

	for (let i = 0; i < parts.length; i += 2) {
		const part = parts[i].trim();
		if (part) {
			// Parse simple expressions like "rsi < 30" or "close > ema_20"
			const match = part.match(/(\w+)\s*([<>=!]+)\s*(.+)/);
			if (match) {
				const [, indicator, operator, value] = match;
				conditions.push({
					indicator,
					operator:
						operator === "<"
							? "less_than"
							: operator === ">"
							? "greater_than"
							: operator === "=="
							? "equals"
							: operator,
					value: isNaN(Number(value)) ? value : Number(value),
					description: `${indicator} ${operator} ${value}`,
				});
			}
		}
	}

	return conditions;
};

const TIMEFRAMES = [
	"1m",
	"5m",
	"15m",
	"30m",
	"1h",
	"2h",
	"4h",
	"6h",
	"8h",
	"12h",
	"1d",
];

export const StrategyEditor: React.FC<StrategyEditorProps> = ({
	isOpen,
	onClose,
	onSave,
	strategyId,
	existingStrategy,
}) => {
	// Dynamic indicator options from backend
	const [indicatorOptions, setIndicatorOptions] = useState<IndicatorOption[]>(
		[]
	);

	useEffect(() => {
		fetch("/api/v1/indicators")
			.then((res) => res.json())
			.then((data) => {
				if (Array.isArray(data)) {
					setIndicatorOptions(data);
				} else {
					setIndicatorOptions([]);
				}
			})
			.catch((err) => {
				console.error("Failed to fetch indicator options:", err);
				setIndicatorOptions([]);
			});
	}, []);
	// console.log("🔥 StrategyEditor rendered with props:", {
	// 	isOpen,
	// 	strategyId,
	// 	existingStrategy,
	// });

	const [strategy, setStrategy] = useState<StrategyData>({
		id: "",
		name: "",
		description: "",
		symbol: "BTC/USDT",
		timeframe: "1h",
		enabled: true,
		tags: [],
		indicators: [],
		signals: [],
		risk: {
			position_size_type: "percent_equity",
			risk_per_trade: 2,
			stop_loss_percent: 1.5,
			take_profit_percent: 3,
			trailing_stop: false,
			max_drawdown_percent: 10,
		},
		ml_models: [],
		postprocessing: [],
		metadata: {
			version: "1.0",
			created: new Date().toISOString(),
			author: "user",
		},
	});

	const [activeTab, setActiveTab] = useState<
		"basic" | "indicators" | "signals" | "risk"
	>("basic");
	const [tagInput, setTagInput] = useState("");

	const isEditMode = !!strategyId;

	// Initialize strategy data
	useEffect(() => {
		if (isOpen) {
			if (isEditMode && existingStrategy) {
				// Ensure all required fields are present with defaults
				setStrategy({
					...existingStrategy,
					tags: existingStrategy.tags || [],
					indicators: existingStrategy.indicators || [],
					signals: existingStrategy.signals || [],
					enabled:
						existingStrategy.enabled !== undefined
							? existingStrategy.enabled
							: true,
				});
			} else {
				// Reset for create mode
				setStrategy({
					id: "",
					name: "",
					description: "",
					symbol: "BTC/USDT",
					timeframe: "1h",
					enabled: true,
					tags: [],
					indicators: [],
					signals: [],
					risk: {
						position_size_type: "percent_equity",
						risk_per_trade: 2,
						stop_loss_percent: 1.5,
						take_profit_percent: 3,
						trailing_stop: false,
						max_drawdown_percent: 10,
					},
					ml_models: [],
					postprocessing: [],
					metadata: {
						version: "1.0",
						created: new Date().toISOString(),
						author: "user",
					},
				});
			}
			setActiveTab("basic");
			setTagInput("");
		}
	}, [isOpen, isEditMode, existingStrategy]);

	// Generate ID from name for create mode
	useEffect(() => {
		if (!isEditMode && strategy.name) {
			const id = strategy.name
				.toLowerCase()
				.replace(/[^a-z0-9\s]/g, "")
				.replace(/\s+/g, "_");
			setStrategy((prev) => ({ ...prev, id }));
		}
	}, [strategy.name, isEditMode]);

	const handleSave = () => {
		if (!strategy.name || !strategy.id) {
			alert("Please provide a strategy name");
			return;
		}
		onSave(strategy);
	};

	const addIndicator = () => {
		if (indicatorOptions.length === 0) return;
		const firstIndicator = indicatorOptions[0];
		// Convert backend parameters to frontend params
		const params = Object.entries(firstIndicator.parameters || {}).map(
			([name, param]: [string, any]) => ({
				name,
				default: param.default,
				type: param.type === "integer" ? "number" : param.type,
				color: param.color || "#6366f1",
			})
		);
		const newIndicator: NewIndicatorData = {
			[firstIndicator.id]: {
				description: firstIndicator.description,
				params,
			},
		};
		setStrategy((prev) => ({
			...prev,
			indicators: [...prev.indicators, newIndicator],
		}));
	};

	const updateIndicatorType = (index: number, newType: string) => {
		const selected = indicatorOptions.find((opt) => opt.id === newType);
		if (!selected) return;
		const params = Object.entries(selected.parameters || {}).map(
			([name, param]: [string, any]) => ({
				name,
				default: param.default,
				type: param.type === "integer" ? "number" : param.type,
				color: param.color || "#6366f1",
			})
		);
		const newIndicator: NewIndicatorData = {
			[selected.id]: {
				description: selected.description,
				params,
			},
		};
		setStrategy((prev) => ({
			...prev,
			indicators: prev.indicators.map((ind, i) =>
				i === index ? newIndicator : ind
			),
		}));
	};

	const updateIndicatorParam = (
		index: number,
		paramIndex: number,
		value: any
	) => {
		setStrategy((prev) => ({
			...prev,
			indicators: prev.indicators.map((ind, i) => {
				if (i !== index) return ind;

				const indicatorKey = Object.keys(ind)[0];
				const updatedIndicator = { ...ind };
				const currentParams = updatedIndicator[indicatorKey].params || [];
				updatedIndicator[indicatorKey] = {
					...updatedIndicator[indicatorKey],
					params: currentParams.map((param, pIdx) =>
						pIdx === paramIndex ? { ...param, default: value } : param
					),
				};
				return updatedIndicator;
			}),
		}));
	};

	const removeIndicator = (index: number) => {
		setStrategy((prev) => ({
			...prev,
			indicators: prev.indicators.filter((_, i) => i !== index),
		}));
	};

	const addSignal = () => {
		const newSignal: SignalData = {
			id: `signal_${Date.now()}`,
			name: "New Signal",
			type: "entry",
			side: "long",
			conditions: [],
			logic: "and",
			confidence: 0.5,
			description: "",
		};
		setStrategy((prev) => ({
			...prev,
			signals: [...prev.signals, newSignal],
		}));
	};

	const updateSignal = (index: number, field: keyof SignalData, value: any) => {
		setStrategy((prev) => ({
			...prev,
			signals: prev.signals.map((sig, i) =>
				i === index ? { ...sig, [field]: value } : sig
			),
		}));
	};

	const removeSignal = (index: number) => {
		setStrategy((prev) => ({
			...prev,
			signals: prev.signals.filter((_, i) => i !== index),
		}));
	};

	const addTag = () => {
		const currentTags = strategy.tags || [];
		if (tagInput.trim() && !currentTags.includes(tagInput.trim())) {
			setStrategy((prev) => ({
				...prev,
				tags: [...(prev.tags || []), tagInput.trim()],
			}));
			setTagInput("");
		}
	};

	const removeTag = (tag: string) => {
		setStrategy((prev) => ({
			...prev,
			tags: (prev.tags || []).filter((t) => t !== tag),
		}));
	};

	if (!isOpen) {
		return null;
	}

	return (
		<div className="fixed inset-0 bg-black/80 bg-opacity-60 flex items-center justify-center z-50 p-4">
			<div className="bg-gray-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-gray-700 shadow-2xl text-gray-100">
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b border-gray-800">
					<div>
						<h2 className="text-xl font-semibold text-blue-300">
							{isEditMode ? "Edit Strategy" : "Create New Strategy"}
						</h2>
						{strategy.name && (
							<p className="text-sm text-gray-400 mt-1">{strategy.name}</p>
						)}
					</div>
					<button
						onClick={onClose}
						className="text-gray-400 hover:text-gray-200 transition-colors"
					>
						<X size={24} />
					</button>
				</div>

				{/* Tabs */}
				<div className="flex border-b border-gray-800 bg-gray-900">
					{[
						{ id: "basic", label: "Basic Info" },
						{ id: "indicators", label: "Indicators" },
						{ id: "signals", label: "Signals" },
						{ id: "risk", label: "Risk Management" },
					].map((tab) => (
						<button
							key={tab.id}
							onClick={() => setActiveTab(tab.id as any)}
							className={`px-4 py-3 font-medium text-sm transition-colors focus:outline-none ${
								activeTab === tab.id
									? "text-blue-400 border-b-2 border-blue-400 bg-gray-900"
									: "text-gray-400 hover:text-gray-200"
							}`}
						>
							{tab.label}
						</button>
					))}
				</div>

				{/* Content */}
				<div className="flex-1 overflow-y-auto p-6 bg-gray-900">
					{activeTab === "basic" && (
						<div className="space-y-4">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label className="block text-sm font-medium text-gray-100 mb-1">
										Strategy Name
									</label>
									<input
										type="text"
										value={strategy.name}
										onChange={(e) =>
											setStrategy((prev) => ({ ...prev, name: e.target.value }))
										}
										className="w-full px-3 py-2 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-300"
										placeholder="Enter strategy name"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-100 mb-1">
										Strategy ID
									</label>
									<input
										type="text"
										value={strategy.id}
										onChange={(e) =>
											setStrategy((prev) => ({ ...prev, id: e.target.value }))
										}
										className="w-full px-3 py-2 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-300"
										placeholder="strategy_id"
										disabled={isEditMode}
									/>
								</div>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-100 mb-1">
									Description
								</label>
								<textarea
									value={strategy.description}
									onChange={(e) =>
										setStrategy((prev) => ({
											...prev,
											description: e.target.value,
										}))
									}
									className="w-full px-3 py-2 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-300"
									rows={3}
									placeholder="Describe your strategy..."
								/>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label className="block text-sm font-medium text-gray-100 mb-1">
										Symbol
									</label>
									<input
										type="text"
										value={strategy.symbol}
										onChange={(e) =>
											setStrategy((prev) => ({
												...prev,
												symbol: e.target.value,
											}))
										}
										className="w-full px-3 py-2 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-300"
										placeholder="BTC/USDT"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-100 mb-1">
										Timeframe
									</label>
									<select
										value={strategy.timeframe}
										onChange={(e) =>
											setStrategy((prev) => ({
												...prev,
												timeframe: e.target.value,
											}))
										}
										className="w-full px-3 py-2 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-300"
									>
										{TIMEFRAMES.map((tf) => (
											<option key={tf} value={tf}>
												{tf}
											</option>
										))}
									</select>
								</div>
							</div>

							{/* Tags */}
							<div>
								<label className="block text-sm font-medium text-gray-100 mb-1">
									Tags
								</label>
								<div className="flex gap-2 mb-2">
									<input
										type="text"
										value={tagInput}
										onChange={(e) => setTagInput(e.target.value)}
										onKeyPress={(e) => e.key === "Enter" && addTag()}
										className="flex-1 px-3 py-2 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-300"
										placeholder="Add a tag..."
									/>
									<button
										onClick={addTag}
										className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
									>
										Add
									</button>
								</div>
								<div className="flex flex-wrap gap-2">
									{(strategy.tags || []).map((tag, index) => (
										<span
											key={index}
											className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-sm"
										>
											{tag}
											<button
												onClick={() => removeTag(tag)}
												className="text-blue-600 hover:text-blue-800"
											>
												<X size={14} />
											</button>
										</span>
									))}
								</div>
							</div>

							<div className="flex items-center">
								<input
									type="checkbox"
									id="enabled"
									checked={strategy.enabled}
									onChange={(e) =>
										setStrategy((prev) => ({
											...prev,
											enabled: e.target.checked,
										}))
									}
									className="mr-2"
								/>
								<label
									htmlFor="enabled"
									className="text-sm font-medium text-gray-100"
								>
									Strategy Enabled
								</label>
							</div>
						</div>
					)}

					{activeTab === "indicators" && (
						<div className="space-y-4">
							<div className="flex items-center justify-between">
								<h3 className="text-lg font-medium text-gray-100">
									Indicators
								</h3>
								<button
									onClick={addIndicator}
									className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
								>
									<Plus size={16} />
									Add Indicator
								</button>
							</div>

							{strategy.indicators.map((indicator, index) => {
								const indicatorKey = Object.keys(indicator)[0];
								const indicatorConfig = indicator[indicatorKey];
								// Find indicator metadata from indicatorOptions
								const indicatorMeta = indicatorOptions.find(
									(opt) => opt.id === indicatorKey
								);
								// Format params for display
								const paramString = (indicatorConfig.params || [])
									.map((param) => `${param.name}: ${param.default}`)
									.join(", ");
								return (
									<div
										key={`${indicatorKey}_${index}`}
										className="border border-gray-700 rounded-lg p-4 bg-gray-800"
									>
										<div className="flex items-center justify-between mb-3">
											<h4 className="font-medium text-gray-100">
												{indicatorMeta ? indicatorMeta.name : indicatorKey}
												{paramString ? ` (${paramString})` : ""}
												<span className="ml-2 text-xs text-gray-400">
													{indicatorConfig.description}
												</span>
											</h4>
											<button
												onClick={() => removeIndicator(index)}
												className="text-red-600 hover:text-red-800"
											>
												<Trash2 size={16} />
											</button>
										</div>
										<div className="mb-4">
											<label className="block text-sm font-medium text-gray-100 mb-1">
												Indicator Type
											</label>
											<select
												value={indicatorKey}
												onChange={(e) =>
													updateIndicatorType(index, e.target.value)
												}
												className="w-full px-3 py-2 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-300"
											>
												{indicatorOptions.map((indicator) => (
													<option key={indicator.id} value={indicator.id}>
														{indicator.id} - {indicator.name}
													</option>
												))}
											</select>
										</div>
										<div className="space-y-3">
											<h5 className="text-sm font-medium text-gray-100">
												Parameters
											</h5>
											{(indicatorConfig.params || []).map(
												(param, paramIndex) => (
													<div
														key={param.name}
														className="grid grid-cols-1 md:grid-cols-3 gap-4"
													>
														<div>
															<label className="block text-xs font-medium text-gray-300 mb-1">
																{param.name}
															</label>
														</div>
														<div>
															<input
																type={
																	param.type === "number" ? "number" : "text"
																}
																value={param.default}
																onChange={(e) => {
																	const value =
																		param.type === "number"
																			? parseFloat(e.target.value) ||
																			  param.default
																			: e.target.value;
																	updateIndicatorParam(
																		index,
																		paramIndex,
																		value
																	);
																}}
																className="w-full px-2 py-1 border border-gray-700 rounded text-xs text-gray-300"
															/>
														</div>
														<div className="flex items-center gap-2">
															<div
																className="w-4 h-4 rounded border border-gray-600"
																style={{ backgroundColor: param.color }}
															></div>
															<input
																type="color"
																value={param.color}
																onChange={(e) => {
																	const updatedIndicator = { ...indicator };
																	const key = Object.keys(updatedIndicator)[0];
																	if (
																		updatedIndicator[key].params &&
																		updatedIndicator[key].params[paramIndex]
																	) {
																		updatedIndicator[key].params[
																			paramIndex
																		].color = e.target.value;
																	}
																	setStrategy((prev) => ({
																		...prev,
																		indicators: prev.indicators.map((ind, i) =>
																			i === index ? updatedIndicator : ind
																		),
																	}));
																}}
																className="w-8 h-6 border border-gray-700 rounded cursor-pointer"
															/>
														</div>
													</div>
												)
											)}
										</div>
									</div>
								);
							})}

							{strategy.indicators.length === 0 && (
								<div className="text-center py-8 text-gray-500">
									No indicators added yet. Click "Add Indicator" to get started.
								</div>
							)}
						</div>
					)}

					{activeTab === "signals" && (
						<div className="space-y-4">
							<div className="flex items-center justify-between">
								<h3 className="text-lg font-medium text-gray-100">
									Trading Signals
								</h3>
								<button
									onClick={addSignal}
									className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
								>
									<Plus size={16} />
									Add Signal
								</button>
							</div>

							{strategy.signals.map((signal, index) => (
								<div
									key={signal.id}
									className="border border-gray-700 rounded-lg p-4 bg-gray-800"
								>
									<div className="flex items-center justify-between mb-3">
										<h4 className="font-medium text-gray-100">
											{signal.name || signal.id || `Signal ${index + 1}`}
										</h4>
										<button
											onClick={() => removeSignal(index)}
											className="text-red-600 hover:text-red-800"
										>
											<Trash2 size={16} />
										</button>
									</div>

									<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
										<div>
											<label className="block text-sm font-medium text-gray-100 mb-1">
												ID
											</label>
											<input
												type="text"
												value={signal.id}
												onChange={(e) =>
													updateSignal(index, "id", e.target.value)
												}
												className="w-full px-3 py-2 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-300"
											/>
										</div>
										<div>
											<label className="block text-sm font-medium text-gray-100 mb-1">
												Type
											</label>
											<select
												value={signal.type}
												onChange={(e) =>
													updateSignal(index, "type", e.target.value)
												}
												className="w-full px-3 py-2 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-300"
											>
												<option value="entry">Entry</option>
												<option value="exit">Exit</option>
											</select>
										</div>
										<div>
											<label className="block text-sm font-medium text-gray-100 mb-1">
												Side
											</label>
											<select
												value={signal.side}
												onChange={(e) =>
													updateSignal(index, "side", e.target.value)
												}
												className="w-full px-3 py-2 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-300"
											>
												<option value="long">Long</option>
												<option value="short">Short</option>
											</select>
										</div>
									</div>

									<div className="grid grid-cols-2 gap-4 mb-3">
										<div>
											<label className="block text-sm font-medium text-gray-100 mb-1">
												Logic
											</label>
											<select
												value={signal.logic || "and"}
												onChange={(e) =>
													updateSignal(index, "logic", e.target.value)
												}
												className="w-full px-3 py-2 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-300"
											>
												<option value="and">AND</option>
												<option value="or">OR</option>
											</select>
										</div>
										<div>
											<label className="block text-sm font-medium text-gray-100 mb-1">
												Confidence
											</label>
											<input
												type="number"
												min="0"
												max="1"
												step="0.1"
												value={signal.confidence || 0.5}
												onChange={(e) =>
													updateSignal(
														index,
														"confidence",
														parseFloat(e.target.value)
													)
												}
												className="w-full px-3 py-2 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-300"
											/>
										</div>
									</div>

									<div className="mb-3">
										<label className="block text-sm font-medium text-gray-100 mb-1">
											Name
										</label>
										<input
											type="text"
											value={signal.name || signal.id}
											onChange={(e) =>
												updateSignal(index, "name", e.target.value)
											}
											className="w-full px-3 py-2 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-300"
											placeholder="Signal name"
										/>
									</div>

									<div className="mb-3">
										<label className="block text-sm font-medium text-gray-100 mb-1">
											Expression
										</label>
										<input
											type="text"
											value={
												signal.conditions
													? conditionsToExpression(
															signal.conditions,
															signal.logic
													  )
													: signal.expression || ""
											}
											onChange={(e) => {
												const newConditions = expressionToConditions(
													e.target.value
												);
												updateSignal(index, "conditions", newConditions);
												updateSignal(index, "expression", e.target.value);
											}}
											className="w-full px-3 py-2 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-gray-300"
											placeholder="e.g., rsi < 30 && close > ema_20"
										/>
										<p className="text-xs text-gray-400 mt-1">
											Expression is auto-generated from conditions. Edit to
											update conditions.
										</p>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-100 mb-1">
											Description
										</label>
										<input
											type="text"
											value={signal.description}
											onChange={(e) =>
												updateSignal(index, "description", e.target.value)
											}
											className="w-full px-3 py-2 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-300"
											placeholder="Describe this signal..."
										/>
									</div>
								</div>
							))}

							{strategy.signals.length === 0 && (
								<div className="text-center py-8 text-gray-500">
									No signals added yet. Click "Add Signal" to get started.
								</div>
							)}
						</div>
					)}

					{activeTab === "risk" && (
						<div className="space-y-4">
							<h3 className="text-lg font-medium text-gray-100">
								Risk Management
							</h3>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label className="block text-sm font-medium text-gray-100 mb-1">
										Position Size Type
									</label>
									<select
										value={strategy.risk.position_size_type}
										onChange={(e) =>
											setStrategy((prev) => ({
												...prev,
												risk: {
													...prev.risk,
													position_size_type: e.target.value as any,
												},
											}))
										}
										className="w-full px-3 py-2 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-300"
									>
										<option value="fixed">Fixed Amount</option>
										<option value="percent_equity">Percent of Equity</option>
									</select>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-100 mb-1">
										Risk Per Trade (%)
									</label>
									<input
										type="number"
										value={strategy.risk.risk_per_trade}
										onChange={(e) =>
											setStrategy((prev) => ({
												...prev,
												risk: {
													...prev.risk,
													risk_per_trade: Number(e.target.value),
												},
											}))
										}
										className="w-full px-3 py-2 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-300"
										min="0.1"
										max="10"
										step="0.1"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-100 mb-1">
										Stop Loss (%)
									</label>
									<input
										type="number"
										value={strategy.risk.stop_loss_percent}
										onChange={(e) =>
											setStrategy((prev) => ({
												...prev,
												risk: {
													...prev.risk,
													stop_loss_percent: Number(e.target.value),
												},
											}))
										}
										className="w-full px-3 py-2 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-300"
										min="0.1"
										max="20"
										step="0.1"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-100 mb-1">
										Take Profit (%)
									</label>
									<input
										type="number"
										value={strategy.risk.take_profit_percent}
										onChange={(e) =>
											setStrategy((prev) => ({
												...prev,
												risk: {
													...prev.risk,
													take_profit_percent: Number(e.target.value),
												},
											}))
										}
										className="w-full px-3 py-2 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-300"
										min="0.1"
										max="50"
										step="0.1"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-100 mb-1">
										Max Drawdown (%)
									</label>
									<input
										type="number"
										value={strategy.risk.max_drawdown_percent}
										onChange={(e) =>
											setStrategy((prev) => ({
												...prev,
												risk: {
													...prev.risk,
													max_drawdown_percent: Number(e.target.value),
												},
											}))
										}
										className="w-full px-3 py-2 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-300"
										min="1"
										max="50"
										step="1"
									/>
								</div>
								<div className="flex items-center">
									<input
										type="checkbox"
										id="trailing_stop"
										checked={strategy.risk.trailing_stop}
										onChange={(e) =>
											setStrategy((prev) => ({
												...prev,
												risk: { ...prev.risk, trailing_stop: e.target.checked },
											}))
										}
										className="mr-2"
									/>
									<label
										htmlFor="trailing_stop"
										className="text-sm font-medium text-gray-100"
									>
										Use Trailing Stop
									</label>
								</div>
							</div>
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="flex items-center justify-end gap-3 p-6 border-t border-gray-800 bg-gray-900">
					<button
						onClick={onClose}
						className="px-4 py-2 text-gray-300 border border-gray-700 rounded-md hover:bg-gray-800"
					>
						Cancel
					</button>
					<button
						onClick={handleSave}
						className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-md"
					>
						<Save size={16} />
						{isEditMode ? "Save Changes" : "Create Strategy"}
					</button>
				</div>
			</div>
		</div>
	);
};

export default StrategyEditor;
