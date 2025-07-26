/**
 * Strategy Context - Global Strategy Selection Management
 *
 * Provides a centralized way to manage strategy selection across all components
 * including Dashboard, StrategyControls, and StrategyEngineTestPanel.
 */

import React, {
	createContext,
	useContext,
	useState,
	useEffect,
	ReactNode,
} from "react";

interface StrategyContextType {
	selectedStrategyId: string | null;
	setSelectedStrategyId: (strategyId: string | null) => void;
	availableStrategies: string[];
	setAvailableStrategies: (strategies: string[]) => void;
}

const StrategyContext = createContext<StrategyContextType | undefined>(
	undefined
);

interface StrategyProviderProps {
	children: ReactNode;
}

export const StrategyProvider: React.FC<StrategyProviderProps> = ({
	children,
}) => {
	// Initialize with a working strategy from localStorage or default
	const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(
		() => {
			const saved = localStorage.getItem("globalSelectedStrategy");
			return saved || "simple_ema_rsi"; // Default to a strategy we know works
		}
	);

	const [availableStrategies, setAvailableStrategies] = useState<string[]>([
		"simple_ema_rsi",
		"test_create",
	]);

	// Persist strategy selection to localStorage
	useEffect(() => {
		if (selectedStrategyId) {
			localStorage.setItem("globalSelectedStrategy", selectedStrategyId);
		} else {
			localStorage.removeItem("globalSelectedStrategy");
		}
	}, [selectedStrategyId]);

	const contextValue: StrategyContextType = {
		selectedStrategyId,
		setSelectedStrategyId,
		availableStrategies,
		setAvailableStrategies,
	};

	return (
		<StrategyContext.Provider value={contextValue}>
			{children}
		</StrategyContext.Provider>
	);
};

export const useStrategy = (): StrategyContextType => {
	const context = useContext(StrategyContext);
	if (context === undefined) {
		throw new Error("useStrategy must be used within a StrategyProvider");
	}
	return context;
};
