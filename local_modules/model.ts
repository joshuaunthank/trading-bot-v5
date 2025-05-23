// Model interface for extensibility
export interface Model {
	name: string;
	predict(input: any): Promise<any>;
}

export {};
