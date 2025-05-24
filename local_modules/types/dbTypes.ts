// DB-related interfaces/types for trading bot system

export interface StrategyRun {
	runId: string;
	userId: string;
	strategy: string;
	config: object;
	status: string;
	meta?: object;
	startedAt: string;
	finishedAt?: string;
	deletedAt?: string | null;
	version?: string;
	summary?: object;
}

export interface User {
	userId: string;
	email: string;
	passwordHash: string;
	createdAt: string;
	deletedAt?: string | null;
}

export interface ApiKey {
	id: string;
	userId: string;
	exchange: string;
	apiKey: string;
	apiSecret: string;
	createdAt: string;
	deletedAt?: string | null;
}

export interface AuditLog {
	id: string;
	userId: string;
	action: string;
	details: object;
	timestamp: string;
}
