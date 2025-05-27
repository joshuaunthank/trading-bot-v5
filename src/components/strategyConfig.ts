// src/components/strategyConfig.ts
// Centralized strategy config/data fetcher for JSON/db-driven strategies

export type StrategyMeta = {
	name: string;
	description: string;
};

export type StrategyConfigSchema = {
	[key: string]: {
		type: string;
		default: any;
		description?: string;
		min?: number;
		max?: number;
		options?: any[];
	};
};

export async function fetchStrategyList(): Promise<StrategyMeta[]> {
	const res = await fetch("/api/v1/strategies");
	if (!res.ok) throw new Error("Failed to fetch strategies");
	return await res.json();
}

export async function fetchStrategyConfigSchema(name: string): Promise<{
	schema: StrategyConfigSchema;
	name: string;
	description: string;
}> {
	const res = await fetch(
		`/api/v1/strategies/${encodeURIComponent(name)}/config`
	);
	if (!res.ok) throw new Error("Failed to fetch strategy config schema");
	return await res.json();
}

// Optionally, add helpers for validation, default value extraction, etc.
