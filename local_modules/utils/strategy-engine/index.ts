/**
 * Strategy Engine Integration - WebSocket Integration
 *
 * This module integrates the strategy execution engine with the existing
 * WebSocket system and API routes.
 */

import { StrategyManager } from "./StrategyManager";
import { StrategyInstance } from "./StrategyInstance";
import { OHLCVCandle, Signal, StrategyExecutionEvent } from "./types";
import { WebSocket } from "ws";

export class StrategyEngineIntegration {
	private strategyManager: StrategyManager;
	private webSocketClients: Set<WebSocket> = new Set();
	private isInitialized: boolean = false;

	constructor() {
		this.strategyManager = new StrategyManager();
		this.setupEventHandlers();
	}

	/**
	 * Initialize the strategy engine
	 */
	public async initialize(): Promise<void> {
		if (this.isInitialized) {
			console.warn("[StrategyEngineIntegration] Already initialized");
			return;
		}

		try {
			// Load all available strategies
			await this.strategyManager.loadAllStrategies();

			this.isInitialized = true;
			console.log("[StrategyEngineIntegration] Initialized successfully");
		} catch (error) {
			console.error("[StrategyEngineIntegration] Failed to initialize:", error);
			throw error;
		}
	}

	/**
	 * Set up event handlers for strategy manager
	 */
	private setupEventHandlers(): void {
		// Handle strategy events
		this.strategyManager.on(
			"strategy-event",
			(event: StrategyExecutionEvent) => {
				this.broadcastToClients("strategy-event", event);
			}
		);

		// Handle signal generation
		this.strategyManager.on("signal-generated", (signal: Signal) => {
			this.broadcastToClients("signal-generated", signal);
			console.log(
				`[StrategyEngineIntegration] Signal: ${signal.side} ${signal.type} from ${signal.strategyId}`
			);
		});

		// Handle strategy errors
		this.strategyManager.on("strategy-error", (error: any) => {
			this.broadcastToClients("strategy-error", error);
			console.error("[StrategyEngineIntegration] Strategy error:", error);
		});

		// Handle strategy loading
		this.strategyManager.on("strategy-loaded", (event: any) => {
			this.broadcastToClients("strategy-loaded", event);
		});
	}

	/**
	 * Process OHLCV candle (called from WebSocket handler)
	 */
	public processCandle(candle: OHLCVCandle): void {
		if (!this.isInitialized) {
			return;
		}

		this.strategyManager.processCandle(candle);
	}

	/**
	 * Add WebSocket client for strategy updates
	 */
	public addWebSocketClient(ws: WebSocket): void {
		this.webSocketClients.add(ws);

		// Send initial strategy states
		this.sendInitialData(ws);

		// Handle client disconnect
		ws.on("close", () => {
			this.webSocketClients.delete(ws);
		});

		console.log(
			`[StrategyEngineIntegration] Added WebSocket client (${this.webSocketClients.size} total)`
		);
	}

	/**
	 * Send initial data to new WebSocket client
	 */
	private sendInitialData(ws: WebSocket): void {
		try {
			// Send strategy list
			const strategyList = this.strategyManager.getStrategyList();
			ws.send(
				JSON.stringify({
					type: "strategy-list",
					data: strategyList,
				})
			);

			// Send strategy states
			const states = this.strategyManager.getAllStates();
			ws.send(
				JSON.stringify({
					type: "strategy-states",
					data: Object.fromEntries(states),
				})
			);

			// Send performance metrics
			const metrics = this.strategyManager.getAllPerformanceMetrics();
			ws.send(
				JSON.stringify({
					type: "performance-metrics",
					data: Object.fromEntries(metrics),
				})
			);

			// Send indicator results
			const indicators = this.strategyManager.getAllIndicatorResults();
			ws.send(
				JSON.stringify({
					type: "indicator-results",
					data: Object.fromEntries(indicators),
				})
			);
		} catch (error) {
			console.error(
				"[StrategyEngineIntegration] Failed to send initial data:",
				error
			);
		}
	}

	/**
	 * Broadcast message to all connected WebSocket clients
	 */
	private broadcastToClients(type: string, data: any): void {
		const message = JSON.stringify({ type, data });

		for (const ws of this.webSocketClients) {
			try {
				if (ws.readyState === WebSocket.OPEN) {
					ws.send(message);
				}
			} catch (error) {
				console.error(
					"[StrategyEngineIntegration] Failed to send message to client:",
					error
				);
				this.webSocketClients.delete(ws);
			}
		}
	}

	/**
	 * Get strategy manager instance
	 */
	public getStrategyManager(): StrategyManager {
		return this.strategyManager;
	}

	/**
	 * Get strategy instance
	 */
	public getStrategy(strategyId: string): StrategyInstance | null {
		return this.strategyManager.getStrategy(strategyId);
	}

	/**
	 * Start strategy
	 */
	public async startStrategy(strategyId: string): Promise<boolean> {
		if (!this.isInitialized) {
			console.error("[StrategyEngineIntegration] Not initialized");
			return false;
		}

		return this.strategyManager.startStrategy(strategyId);
	}

	/**
	 * Stop strategy
	 */
	public async stopStrategy(strategyId: string): Promise<boolean> {
		if (!this.isInitialized) {
			console.error("[StrategyEngineIntegration] Not initialized");
			return false;
		}

		return this.strategyManager.stopStrategy(strategyId);
	}

	/**
	 * Pause strategy
	 */
	public async pauseStrategy(strategyId: string): Promise<boolean> {
		if (!this.isInitialized) {
			console.error("[StrategyEngineIntegration] Not initialized");
			return false;
		}

		return this.strategyManager.pauseStrategy(strategyId);
	}

	/**
	 * Resume strategy
	 */
	public async resumeStrategy(strategyId: string): Promise<boolean> {
		if (!this.isInitialized) {
			console.error("[StrategyEngineIntegration] Not initialized");
			return false;
		}

		return this.strategyManager.resumeStrategy(strategyId);
	}

	/**
	 * Start all strategies
	 */
	public async startAllStrategies(): Promise<void> {
		if (!this.isInitialized) {
			console.error("[StrategyEngineIntegration] Not initialized");
			return;
		}

		this.strategyManager.startAll();
	}

	/**
	 * Stop all strategies
	 */
	public async stopAllStrategies(): Promise<void> {
		if (!this.isInitialized) {
			console.error("[StrategyEngineIntegration] Not initialized");
			return;
		}

		this.strategyManager.stopAll();
	}

	/**
	 * Get all strategy states
	 */
	public getStrategyStates(): Map<string, any> {
		if (!this.isInitialized) {
			return new Map();
		}

		return this.strategyManager.getAllStates();
	}

	/**
	 * Get all performance metrics
	 */
	public getPerformanceMetrics(): Map<string, any> {
		if (!this.isInitialized) {
			return new Map();
		}

		return this.strategyManager.getAllPerformanceMetrics();
	}

	/**
	 * Get all indicator results
	 */
	public getIndicatorResults(): Map<string, any> {
		if (!this.isInitialized) {
			return new Map();
		}

		return this.strategyManager.getAllIndicatorResults();
	}

	/**
	 * Get strategy list
	 */
	public getStrategyList(): { id: string; name: string; status: string }[] {
		if (!this.isInitialized) {
			return [];
		}

		return this.strategyManager.getStrategyList();
	}

	/**
	 * Get manager status
	 */
	public getManagerStatus(): any {
		if (!this.isInitialized) {
			return {
				isInitialized: false,
				isRunning: false,
				strategyCount: 0,
				runningStrategies: 0,
				candleCount: 0,
				lastUpdate: Date.now(),
			};
		}

		return {
			isInitialized: this.isInitialized,
			...this.strategyManager.getManagerStatus(),
		};
	}

	/**
	 * Get debug information
	 */
	public getDebugInfo(): any {
		if (!this.isInitialized) {
			return {
				isInitialized: false,
				webSocketClients: this.webSocketClients.size,
			};
		}

		return {
			isInitialized: this.isInitialized,
			webSocketClients: this.webSocketClients.size,
			...this.strategyManager.getDebugInfo(),
		};
	}

	/**
	 * Check if initialized
	 */
	public isReady(): boolean {
		return this.isInitialized;
	}

	/**
	 * Check if strategy engine is initialized
	 */
	public getInitializationStatus(): boolean {
		return this.isInitialized;
	}
}

// Export singleton instance
export const strategyEngineIntegration = new StrategyEngineIntegration();
