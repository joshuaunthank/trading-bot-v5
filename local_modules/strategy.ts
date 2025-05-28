// Modular strategy interface
export interface Strategy {
	name: string;
	description: string;
	run(params: any): Promise<void>;
}

// --- Strategy Config Schema Type ---
export type StrategyConfigSchema = {
	[key: string]: {
		type: "string" | "number" | "boolean" | "select";
		label: string;
		default: any;
		options?: any[];
		min?: number;
		max?: number;
		step?: number;
		required?: boolean;
		description?: string;
	};
};

// --- Standardized Strategy Interface ---
export interface IStrategy {
	name: string;
	description: string;
	getConfigSchema(): StrategyConfigSchema;
	run(config: any, context: { userId: string; runId: string }): Promise<any>;
	pause?(): Promise<void>;
	stop?(): Promise<void>;
}

export {};
