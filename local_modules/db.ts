// import bcrypt from "bcryptjs";
import formidable from "formidable";
import dbConfig from "./utils/dbConfig";

import { Pool } from "pg";
import { StrategyRun, User, ApiKey, AuditLog } from "./types/dbTypes";

const pool = new Pool(dbConfig);

/**
 * Save a user strategy preset.
 * @param userId - User identifier
 * @param strategy - Strategy name
 * @param config - Strategy config object
 */
export async function saveStrategyPreset(
	userId: string,
	strategy: string,
	config: object
): Promise<void> {
	// TODO: Implement DB insert
	return Promise.resolve();
}

/**
 * Load all strategy presets for a user.
 * @param userId - User identifier
 */
export async function getStrategyPresets(
	userId: string
): Promise<Array<{ strategy: string; config: object }>> {
	// TODO: Implement DB select
	return Promise.resolve([
		// Example stub
		{ strategy: "arima_macd_lag_strategy", config: { example: true } },
	]);
}

/**
 * Save a strategy run (for run history).
 * @param userId - User identifier
 * @param strategy - Strategy name
 * @param runResult - Arbitrary run result object (performance, params, etc)
 */
export async function saveStrategyRun(
	userId: string,
	strategy: string,
	runResult: object
): Promise<void> {
	// TODO: Implement DB insert
	return Promise.resolve();
}

/**
 * Get all strategy runs for a user/strategy.
 * @param userId - User identifier
 * @param strategy - Strategy name
 */
export async function getStrategyRuns(
	userId: string,
	strategy: string
): Promise<Array<object>> {
	// TODO: Implement DB select
	return Promise.resolve([{ timestamp: Date.now(), result: { stub: true } }]);
}

/**
 * Save a trade log entry.
 * @param userId - User identifier
 * @param strategy - Strategy name
 * @param trade - Trade details (symbol, side, qty, price, etc)
 */
export async function saveTradeLog(
	userId: string,
	strategy: string,
	trade: object
): Promise<void> {
	// TODO: Implement DB insert
	return Promise.resolve();
}

/**
 * Get all trade logs for a user/strategy.
 * @param userId - User identifier
 * @param strategy - Strategy name
 */
export async function getTradeLogs(
	userId: string,
	strategy: string
): Promise<Array<object>> {
	// TODO: Implement DB select
	return Promise.resolve([{ timestamp: Date.now(), trade: { stub: true } }]);
}

/**
 * Create a new strategy run record (returns runId).
 * @param userId - User identifier
 * @param strategy - Strategy name
 * @param config - Strategy config used for this run
 * @returns runId (string)
 */
export async function createStrategyRun(
	userId: string,
	strategy: string,
	config: object
): Promise<string> {
	// TODO: Insert into DB and return runId
	// Example: INSERT INTO strategy_runs (user_id, strategy, config, status, started_at) VALUES (...) RETURNING id
	return Promise.resolve("mock-run-id");
}

/**
 * Update the status of a strategy run (running, paused, stopped, finished, error, etc).
 * @param runId - The run identifier
 * @param status - New status string
 * @param meta - Optional: additional metadata (e.g. error message, progress)
 */
export async function updateStrategyRunStatus(
	runId: string,
	status: string,
	meta?: object
): Promise<void> {
	// TODO: Update status/meta in DB
	return Promise.resolve();
}

/**
 * Get the current status and metadata for a strategy run.
 * @param runId - The run identifier
 */
export async function getStrategyRunStatus(runId: string): Promise<{
	status: string;
	meta?: object;
	startedAt?: string;
	finishedAt?: string;
}> {
	// TODO: Query DB for status/meta
	return Promise.resolve({
		status: "running",
		meta: {},
		startedAt: new Date().toISOString(),
	});
}

/**
 * List all runs for a user/strategy, with status and timestamps.
 * @param userId - User identifier
 * @param strategy - Strategy name
 */
export async function listStrategyRuns(
	userId: string,
	strategy: string
): Promise<
	Array<{
		runId: string;
		status: string;
		startedAt: string;
		finishedAt?: string;
	}>
> {
	// TODO: Query DB for all runs
	return Promise.resolve([
		{
			runId: "mock-run-id",
			status: "running",
			startedAt: new Date().toISOString(),
		},
	]);
}

// =====================
// DB STUB FUNCTIONS
// =====================

// User management
/**
 * Create a new user and return the userId.
 * @param email - User email
 * @param passwordHash - Hashed password
 * @returns userId (string)
 */
export async function createUser(
	email: string,
	passwordHash: string
): Promise<string> {
	// TODO: Insert user, return userId
	return Promise.resolve("mock-user-id");
}

/**
 * Get a user by email.
 * @param email - User email
 * @returns User object or null if not found
 */
export async function getUserByEmail(email: string): Promise<User | null> {
	// TODO: Query user by email
	return Promise.resolve(null);
}

/**
 * Soft delete a user (set deletedAt).
 * @param userId - User identifier
 */
export async function softDeleteUser(userId: string): Promise<void> {
	// TODO: Set deletedAt
	return Promise.resolve();
}

/**
 * Save an API key for a user and return the key id.
 * @param userId - User identifier
 * @param exchange - Exchange name
 * @param apiKey - API key
 * @param apiSecret - API secret
 * @returns API key id (string)
 */
export async function saveApiKey(
	userId: string,
	exchange: string,
	apiKey: string,
	apiSecret: string
): Promise<string> {
	// TODO: Insert API key, return id
	return Promise.resolve("mock-apikey-id");
}

/**
 * Get all API keys for a user.
 * @param userId - User identifier
 * @returns Array of ApiKey objects
 */
export async function getApiKeys(userId: string): Promise<ApiKey[]> {
	// TODO: Query API keys for user
	return Promise.resolve([]);
}

/**
 * Soft delete an API key (set deletedAt).
 * @param id - API key id
 */
export async function softDeleteApiKey(id: string): Promise<void> {
	// TODO: Set deletedAt
	return Promise.resolve();
}

/**
 * Save or update strategy run metadata.
 * @param run - StrategyRun object
 */
export async function saveStrategyRunMetadata(run: StrategyRun): Promise<void> {
	// TODO: Insert or update strategy run metadata
	return Promise.resolve();
}

/**
 * Get a strategy run by runId.
 * @param runId - Run identifier
 * @returns StrategyRun object or null if not found
 */
export async function getStrategyRun(
	runId: string
): Promise<StrategyRun | null> {
	// TODO: Query by runId
	return Promise.resolve(null);
}

/**
 * Soft delete a strategy run (set deletedAt).
 * @param runId - Run identifier
 */
export async function softDeleteStrategyRun(runId: string): Promise<void> {
	// TODO: Set deletedAt
	return Promise.resolve();
}

/**
 * Log an audit action for a user.
 * @param userId - User identifier
 * @param action - Action string
 * @param details - Details object
 */
export async function logAudit(
	userId: string,
	action: string,
	details: object
): Promise<void> {
	// TODO: Insert audit log
	return Promise.resolve();
}

/**
 * Get all audit logs for a user.
 * @param userId - User identifier
 * @returns Array of AuditLog objects
 */
export async function getAuditLogs(userId: string): Promise<AuditLog[]> {
	// TODO: Query audit logs for user
	return Promise.resolve([]);
}

// 7. Indexes and Foreign Keys: To be implemented in your SQL schema (not in TypeScript)
// Example:
// -- CREATE INDEX ON strategy_runs(user_id);
// -- ALTER TABLE api_keys ADD FOREIGN KEY (user_id) REFERENCES users(user_id);
