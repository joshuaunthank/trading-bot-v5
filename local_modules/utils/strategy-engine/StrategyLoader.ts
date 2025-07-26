/**
 * Strategy Loader - File-based Strategy Configuration Management
 *
 * This class handles loading and parsing strategy configurations from JSON files.
 */

import * as fs from "fs";
import * as path from "path";
import { StrategyConfig } from "./types";

export class StrategyLoader {
	private strategiesPath: string;

	constructor() {
		// Strategy files are stored in local_modules/db/strategies/
		this.strategiesPath = path.join(__dirname, "../../db/strategies");
		this.ensureDirectoryExists();
	}

	/**
	 * Ensure strategies directory exists
	 */
	private ensureDirectoryExists(): void {
		if (!fs.existsSync(this.strategiesPath)) {
			fs.mkdirSync(this.strategiesPath, { recursive: true });
			console.log(
				`[StrategyLoader] Created strategies directory: ${this.strategiesPath}`
			);
		}
	}

	/**
	 * Load strategy configuration from file
	 */
	public async loadStrategy(
		strategyId: string
	): Promise<StrategyConfig | null> {
		try {
			const filePath = path.join(this.strategiesPath, `${strategyId}.json`);

			if (!fs.existsSync(filePath)) {
				console.warn(`[StrategyLoader] Strategy file not found: ${filePath}`);
				return null;
			}

			const fileContent = fs.readFileSync(filePath, "utf-8");
			const config = JSON.parse(fileContent) as StrategyConfig;

			// Validate basic structure
			if (!this.validateStrategyConfig(config)) {
				console.error(
					`[StrategyLoader] Invalid strategy configuration: ${strategyId}`
				);
				return null;
			}

			// Ensure the ID matches the filename
			if (config.id !== strategyId) {
				console.warn(
					`[StrategyLoader] Strategy ID mismatch: ${config.id} vs ${strategyId}`
				);
				config.id = strategyId;
			}

			console.log(`[StrategyLoader] Loaded strategy: ${strategyId}`);
			return config;
		} catch (error) {
			console.error(
				`[StrategyLoader] Failed to load strategy ${strategyId}:`,
				error
			);
			return null;
		}
	}

	/**
	 * List all available strategies
	 */
	public async listStrategies(): Promise<string[]> {
		try {
			const files = fs.readdirSync(this.strategiesPath);
			const strategies: string[] = [];

			for (const file of files) {
				if (file.endsWith(".json")) {
					const strategyId = file.replace(".json", "");
					strategies.push(strategyId);
				}
			}

			console.log(`[StrategyLoader] Found ${strategies.length} strategies`);
			return strategies;
		} catch (error) {
			console.error("[StrategyLoader] Failed to list strategies:", error);
			return [];
		}
	}

	/**
	 * Save strategy configuration to file
	 */
	public async saveStrategy(config: StrategyConfig): Promise<boolean> {
		try {
			if (!this.validateStrategyConfig(config)) {
				console.error(
					`[StrategyLoader] Invalid strategy configuration: ${
						(config as any)?.id || "unknown"
					}`
				);
				return false;
			}

			const filePath = path.join(this.strategiesPath, `${config.id}.json`);
			const fileContent = JSON.stringify(config, null, 2);

			fs.writeFileSync(filePath, fileContent, "utf-8");

			console.log(`[StrategyLoader] Saved strategy: ${config.id}`);
			return true;
		} catch (error) {
			console.error(
				`[StrategyLoader] Failed to save strategy ${
					(config as any)?.id || "unknown"
				}:`,
				error
			);
			return false;
		}
	}

	/**
	 * Delete strategy file
	 */
	public async deleteStrategy(strategyId: string): Promise<boolean> {
		try {
			const filePath = path.join(this.strategiesPath, `${strategyId}.json`);

			if (!fs.existsSync(filePath)) {
				console.warn(`[StrategyLoader] Strategy file not found: ${filePath}`);
				return false;
			}

			fs.unlinkSync(filePath);

			console.log(`[StrategyLoader] Deleted strategy: ${strategyId}`);
			return true;
		} catch (error) {
			console.error(
				`[StrategyLoader] Failed to delete strategy ${strategyId}:`,
				error
			);
			return false;
		}
	}

	/**
	 * Validate strategy configuration structure
	 */
	private validateStrategyConfig(config: any): config is StrategyConfig {
		if (!config || typeof config !== "object") {
			return false;
		}

		// Check required fields
		if (!config.id || typeof config.id !== "string") {
			console.error("[StrategyLoader] Missing or invalid strategy ID");
			return false;
		}

		if (!config.name || typeof config.name !== "string") {
			console.error("[StrategyLoader] Missing or invalid strategy name");
			return false;
		}

		if (!config.description || typeof config.description !== "string") {
			console.error("[StrategyLoader] Missing or invalid strategy description");
			return false;
		}

		if (!config.symbol || typeof config.symbol !== "string") {
			console.error("[StrategyLoader] Missing or invalid strategy symbol");
			return false;
		}

		if (!config.timeframe || typeof config.timeframe !== "string") {
			console.error("[StrategyLoader] Missing or invalid strategy timeframe");
			return false;
		}

		if (typeof config.enabled !== "boolean") {
			console.error(
				"[StrategyLoader] Missing or invalid strategy enabled flag"
			);
			return false;
		}

		if (!Array.isArray(config.tags)) {
			console.error("[StrategyLoader] Missing or invalid strategy tags");
			return false;
		}

		if (!Array.isArray(config.indicators)) {
			console.error("[StrategyLoader] Missing or invalid strategy indicators");
			return false;
		}

		if (!Array.isArray(config.signals)) {
			console.error("[StrategyLoader] Missing or invalid strategy signals");
			return false;
		}

		if (!config.risk || typeof config.risk !== "object") {
			console.error(
				"[StrategyLoader] Missing or invalid strategy risk configuration"
			);
			return false;
		}

		if (!Array.isArray(config.ml_models)) {
			console.error("[StrategyLoader] Missing or invalid strategy ML models");
			return false;
		}

		if (!Array.isArray(config.postprocessing)) {
			console.error(
				"[StrategyLoader] Missing or invalid strategy postprocessing"
			);
			return false;
		}

		// Validate metadata structure
		if (!config.metadata || typeof config.metadata !== "object") {
			console.error("[StrategyLoader] Missing or invalid strategy metadata");
			return false;
		}

		if (
			!config.metadata.version ||
			typeof config.metadata.version !== "string"
		) {
			console.error(
				"[StrategyLoader] Missing or invalid strategy metadata version"
			);
			return false;
		}

		if (
			!config.metadata.created ||
			typeof config.metadata.created !== "string"
		) {
			console.error(
				"[StrategyLoader] Missing or invalid strategy metadata created"
			);
			return false;
		}

		if (!config.metadata.author || typeof config.metadata.author !== "string") {
			console.error(
				"[StrategyLoader] Missing or invalid strategy metadata author"
			);
			return false;
		}

		if (!config.created_at || typeof config.created_at !== "string") {
			console.error("[StrategyLoader] Missing or invalid strategy created_at");
			return false;
		}

		if (!config.updated_at || typeof config.updated_at !== "string") {
			console.error("[StrategyLoader] Missing or invalid strategy updated_at");
			return false;
		}

		// Validate indicators structure
		for (const indicator of config.indicators) {
			if (!indicator || typeof indicator !== "object") {
				console.error("[StrategyLoader] Invalid indicator structure");
				return false;
			}
		}

		// Validate signals structure
		for (const signal of config.signals) {
			if (!signal || typeof signal !== "object") {
				console.error("[StrategyLoader] Invalid signal structure");
				return false;
			}

			if (!signal.id || typeof signal.id !== "string") {
				console.error("[StrategyLoader] Missing or invalid signal ID");
				return false;
			}

			if (!signal.name || typeof signal.name !== "string") {
				console.error("[StrategyLoader] Missing or invalid signal name");
				return false;
			}

			if (!signal.type || !["entry", "exit"].includes(signal.type)) {
				console.error("[StrategyLoader] Invalid signal type");
				return false;
			}

			if (!signal.side || !["long", "short"].includes(signal.side)) {
				console.error("[StrategyLoader] Invalid signal side");
				return false;
			}

			if (!signal.description || typeof signal.description !== "string") {
				console.error("[StrategyLoader] Missing or invalid signal description");
				return false;
			}

			if (!Array.isArray(signal.conditions)) {
				console.error("[StrategyLoader] Missing or invalid signal conditions");
				return false;
			}

			if (!signal.logic || !["and", "or"].includes(signal.logic)) {
				console.error("[StrategyLoader] Invalid signal logic");
				return false;
			}

			if (
				typeof signal.confidence !== "number" ||
				signal.confidence < 0 ||
				signal.confidence > 1
			) {
				console.error("[StrategyLoader] Invalid signal confidence");
				return false;
			}

			// Validate signal conditions
			for (const condition of signal.conditions) {
				if (!condition || typeof condition !== "object") {
					console.error("[StrategyLoader] Invalid signal condition structure");
					return false;
				}

				if (!condition.indicator || typeof condition.indicator !== "string") {
					console.error(
						"[StrategyLoader] Missing or invalid condition indicator"
					);
					return false;
				}

				if (!condition.operator || typeof condition.operator !== "string") {
					console.error(
						"[StrategyLoader] Missing or invalid condition operator"
					);
					return false;
				}

				if (
					!condition.description ||
					typeof condition.description !== "string"
				) {
					console.error(
						"[StrategyLoader] Missing or invalid condition description"
					);
					return false;
				}
			}
		}

		// Validate risk configuration
		const risk = config.risk;
		if (
			!risk.position_size_type ||
			typeof risk.position_size_type !== "string"
		) {
			console.error(
				"[StrategyLoader] Missing or invalid risk position_size_type"
			);
			return false;
		}

		if (typeof risk.risk_per_trade !== "number") {
			console.error("[StrategyLoader] Missing or invalid risk risk_per_trade");
			return false;
		}

		if (typeof risk.stop_loss_percent !== "number") {
			console.error(
				"[StrategyLoader] Missing or invalid risk stop_loss_percent"
			);
			return false;
		}

		if (typeof risk.take_profit_percent !== "number") {
			console.error(
				"[StrategyLoader] Missing or invalid risk take_profit_percent"
			);
			return false;
		}

		if (typeof risk.trailing_stop !== "boolean") {
			console.error("[StrategyLoader] Missing or invalid risk trailing_stop");
			return false;
		}

		if (typeof risk.max_drawdown_percent !== "number") {
			console.error(
				"[StrategyLoader] Missing or invalid risk max_drawdown_percent"
			);
			return false;
		}

		return true;
	}

	/**
	 * Get strategy file path
	 */
	public getStrategyFilePath(strategyId: string): string {
		return path.join(this.strategiesPath, `${strategyId}.json`);
	}

	/**
	 * Get strategies directory path
	 */
	public getStrategiesPath(): string {
		return this.strategiesPath;
	}

	/**
	 * Check if strategy exists
	 */
	public strategyExists(strategyId: string): boolean {
		const filePath = this.getStrategyFilePath(strategyId);
		return fs.existsSync(filePath);
	}

	/**
	 * Get strategy file info
	 */
	public getStrategyFileInfo(strategyId: string): {
		exists: boolean;
		path: string;
		size?: number;
		modified?: Date;
	} {
		const filePath = this.getStrategyFilePath(strategyId);
		const exists = fs.existsSync(filePath);

		const info = {
			exists: exists,
			path: filePath,
			size: undefined as number | undefined,
			modified: undefined as Date | undefined,
		};

		if (exists) {
			try {
				const stats = fs.statSync(filePath);
				info.size = stats.size;
				info.modified = stats.mtime;
			} catch (error) {
				console.error(
					`[StrategyLoader] Failed to get file stats for ${strategyId}:`,
					error
				);
			}
		}

		return info;
	}
}
