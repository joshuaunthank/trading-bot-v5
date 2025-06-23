import { useState, useEffect, useCallback } from "react";

interface Strategy {
	id: string;
	name: string;
	description: string;
	symbol: string;
	timeframe: string;
	indicators: Array<{
		id: string;
		type: string;
		parameters: Record<string, any>;
	}>;
	tags?: string[];
	enabled: boolean;
}

interface UseStrategiesResult {
	strategies: Strategy[];
	loading: boolean;
	error: string | null;
	loadStrategies: () => Promise<void>;
}

export function useStrategies(): UseStrategiesResult {
	const [strategies, setStrategies] = useState<Strategy[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const loadStrategies = useCallback(async () => {
		try {
			setLoading(true);
			setError(null);

			const response = await fetch("/api/v1/strategies");
			if (!response.ok) {
				throw new Error(`Failed to load strategies: ${response.statusText}`);
			}

			const data = await response.json();
			setStrategies(data);
		} catch (err) {
			console.error("Error loading strategies:", err);
			setError(err instanceof Error ? err.message : "Unknown error");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		loadStrategies();
	}, [loadStrategies]);

	return {
		strategies,
		loading,
		error,
		loadStrategies,
	};
}
