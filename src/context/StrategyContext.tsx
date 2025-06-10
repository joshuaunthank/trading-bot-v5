import React, { createContext, useContext, useState, ReactNode } from "react";
import { Strategy } from "./Types";

// Create a default empty strategy
export const createEmptyStrategy = (): Strategy => ({
	id: "",
	name: "",
	description: "",
	symbol: "BTC/USDT",
	timeframe: "1h",
	tags: [],
	enabled: true,
	indicators: [],
	models: [],
	postprocessing: [],
	signals: [],
	risk: {
		position_size_type: "percent_equity",
		risk_per_trade: 2,
		stop_loss_percent: 1.5,
		take_profit_percent: 3.0,
		trailing_stop: true,
		max_drawdown_percent: 10,
	},
});

// Define the context type
interface StrategyContextType {
	strategy: Strategy;
	setStrategy: React.Dispatch<React.SetStateAction<Strategy>>;
	currentStep: number;
	setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
	isValid: (step: number) => boolean;
	saveStrategy: () => Promise<boolean>;
	loadStrategy: (id: string) => Promise<boolean>;
	resetStrategy: () => void;
}

// Create the context with default values
const StrategyContext = createContext<StrategyContextType | undefined>(
	undefined
);

// Provider component
export const StrategyProvider: React.FC<{ children: ReactNode }> = ({
	children,
}) => {
	const [strategy, setStrategy] = useState<Strategy>(createEmptyStrategy());
	const [currentStep, setCurrentStep] = useState(0);

	// Validate a specific step
	const isValid = (step: number): boolean => {
		switch (step) {
			case 0: // Meta
				return !!strategy.name && !!strategy.symbol && !!strategy.timeframe;
			case 1: // Indicators
				return strategy.indicators.length > 0;
			case 2: // Models
				return strategy.models.length > 0;
			case 3: // Postprocessing
				return true; // Optional
			case 4: // Signals
				return strategy.signals.length > 0;
			case 5: // Risk
				return !!strategy.risk;
			case 6: // Review
				return true;
			default:
				return false;
		}
	};

	// Save strategy to backend
	const saveStrategy = async (): Promise<boolean> => {
		try {
			const isNew = !strategy.id;
			const method = isNew ? "POST" : "PUT";
			const url = isNew
				? "/api/v1/strategies"
				: `/api/v1/strategies/${strategy.id}`;

			const response = await fetch(url, {
				method,
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(strategy),
			});

			if (!response.ok) {
				throw new Error(`Failed to save strategy: ${response.statusText}`);
			}

			const result = await response.json();

			// Update strategy with any server-generated fields
			if (result.strategy) {
				setStrategy(result.strategy);
			}

			return true;
		} catch (error) {
			console.error("Error saving strategy:", error);
			return false;
		}
	};

	// Load a strategy by ID
	const loadStrategy = async (id: string): Promise<boolean> => {
		try {
			const response = await fetch(`/api/v1/strategies/${id}`);

			if (!response.ok) {
				throw new Error(`Failed to load strategy: ${response.statusText}`);
			}

			const result = await response.json();

			if (result.strategy) {
				setStrategy(result.strategy);
				return true;
			}

			return false;
		} catch (error) {
			console.error("Error loading strategy:", error);
			return false;
		}
	};

	// Reset to empty strategy
	const resetStrategy = () => {
		setStrategy(createEmptyStrategy());
		setCurrentStep(0);
	};

	return (
		<StrategyContext.Provider
			value={{
				strategy,
				setStrategy,
				currentStep,
				setCurrentStep,
				isValid,
				saveStrategy,
				loadStrategy,
				resetStrategy,
			}}
		>
			{children}
		</StrategyContext.Provider>
	);
};

// Custom hook to use the context
export const useStrategy = () => {
	const context = useContext(StrategyContext);
	if (context === undefined) {
		throw new Error("useStrategy must be used within a StrategyProvider");
	}
	return context;
};
