import { useState, useEffect, useCallback } from "react";
import { StrategySummary } from "../services/strategyService";

interface UseStrategiesResult {
	strategies: StrategySummary[];
	loading: boolean;
	error: string | null;
	loadStrategies: () => Promise<void>;
}

export function useStrategies(): UseStrategiesResult {
	const [strategies, setStrategies] = useState<StrategySummary[]>([]);
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

			// Handle WebSocket-only API response format
			if (data.success && Array.isArray(data.strategies)) {
				setStrategies(data.strategies);
			} else if (Array.isArray(data)) {
				// Fallback for legacy API format
				setStrategies(data);
			} else {
				throw new Error("Invalid strategies response format");
			}
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
