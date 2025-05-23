// Modular strategy interface
export interface Strategy {
	name: string;
	description: string;
	run(params: any): Promise<void>;
}

export {};
