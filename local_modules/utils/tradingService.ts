import * as ccxt from "ccxt";
import { config } from "./config";

interface OrderParams {
	symbol: string;
	type: "market" | "limit";
	side: "buy" | "sell";
	amount: number;
	price?: number;
	params?: Record<string, any>;
}

interface PositionInfo {
	symbol: string;
	side: "long" | "short" | "none";
	amount: number;
	entryPrice: number;
	markPrice: number;
	pnl: number;
	pnlPercentage: number;
	liquidationPrice?: number;
	leverage?: number;
}

class TradingService {
	private exchange: ccxt.Exchange;
	private initialized: boolean = false;

	constructor() {
		// Initialize with empty credentials - will be set properly during init()
		this.exchange = new ccxt.binance({});
	}

	/**
	 * Initialize the exchange connection with API credentials
	 */
	async init(apiKey?: string, apiSecret?: string) {
		try {
			// Use provided credentials or fall back to config
			const key = apiKey || config.BINANCE_API_KEY;
			const secret = apiSecret || config.BINANCE_API_SECRET;

			if (!key || !secret) {
				throw new Error("Missing API credentials");
			}

			this.exchange = new ccxt.binance({
				apiKey: key,
				secret: secret,
				enableRateLimit: true,
				options: {
					defaultType: "future", // Use futures by default
					adjustForTimeDifference: true,
				},
			});

			// Load markets for symbol normalization
			await this.exchange.loadMarkets();
			this.initialized = true;
			console.log("Trading service initialized successfully");
			return true;
		} catch (error) {
			console.error("Failed to initialize trading service:", error);
			return false;
		}
	}

	/**
	 * Check if the service is properly initialized
	 */
	isInitialized(): boolean {
		return this.initialized;
	}

	/**
	 * Set leverage for a symbol
	 */
	async setLeverage(symbol: string, leverage: number): Promise<boolean> {
		try {
			if (!this.initialized) await this.init();

			const normalizedSymbol = this.exchange.market(symbol).id;
			// Use type assertion for Binance-specific method
			await (this.exchange as any).fapiPrivatePostLeverage({
				symbol: normalizedSymbol,
				leverage: leverage,
			});

			console.log(`Leverage for ${symbol} set to ${leverage}x`);
			return true;
		} catch (error) {
			console.error(`Failed to set leverage for ${symbol}:`, error);
			return false;
		}
	}

	/**
	 * Place a new order
	 */
	async placeOrder(params: OrderParams): Promise<any> {
		try {
			if (!this.initialized) await this.init();

			// Set default params if not provided
			const orderParams = {
				...params,
				price: params.type === "limit" ? params.price : undefined,
			};

			const order = await this.exchange.createOrder(
				params.symbol,
				params.type,
				params.side,
				params.amount,
				orderParams.price,
				params.params
			);

			console.log(
				`Order placed: ${params.side} ${params.amount} ${params.symbol} at ${
					params.price || "market price"
				}`
			);
			return order;
		} catch (error) {
			console.error("Failed to place order:", error);
			throw error;
		}
	}

	/**
	 * Close a position for a symbol
	 */
	async closePosition(
		symbol: string,
		positionSide: "long" | "short"
	): Promise<any> {
		try {
			if (!this.initialized) await this.init();

			// Get current position
			const position = await this.getPosition(symbol);

			if (
				!position ||
				position.side === "none" ||
				position.side !== positionSide
			) {
				console.log(`No ${positionSide} position to close for ${symbol}`);
				return null;
			}

			// Determine order side (opposite of position side)
			const orderSide = positionSide === "long" ? "sell" : "buy";

			// Place market order to close position
			const order = await this.placeOrder({
				symbol,
				type: "market",
				side: orderSide,
				amount: position.amount,
			});

			console.log(
				`Closed ${positionSide} position for ${symbol}, amount: ${position.amount}`
			);
			return order;
		} catch (error) {
			console.error(`Failed to close ${symbol} position:`, error);
			throw error;
		}
	}

	/**
	 * Get current position information for a symbol
	 */
	async getPosition(symbol: string): Promise<PositionInfo | null> {
		try {
			if (!this.initialized) await this.init();

			const positions = await this.exchange.fetchPositions([symbol]);

			if (!positions || positions.length === 0) {
				return {
					symbol,
					side: "none",
					amount: 0,
					entryPrice: 0,
					markPrice: 0,
					pnl: 0,
					pnlPercentage: 0,
				};
			}

			const position = positions[0];
			const contracts = position.contracts || 0;
			const side = contracts > 0 ? "long" : contracts < 0 ? "short" : "none";

			return {
				symbol,
				side: side as "long" | "short" | "none",
				amount: Math.abs(contracts),
				entryPrice: position.entryPrice || 0,
				markPrice: position.markPrice || 0,
				pnl: position.unrealizedPnl || 0,
				pnlPercentage: position.percentage || 0,
				liquidationPrice: position.liquidationPrice,
				leverage: position.leverage,
			};
		} catch (error) {
			console.error(`Failed to fetch position for ${symbol}:`, error);
			return null;
		}
	}

	/**
	 * Get open orders for a symbol
	 */
	async getOpenOrders(symbol?: string): Promise<any[]> {
		try {
			if (!this.initialized) await this.init();

			const orders = await this.exchange.fetchOpenOrders(symbol);
			return orders;
		} catch (error) {
			console.error("Failed to fetch open orders:", error);
			return [];
		}
	}

	/**
	 * Cancel an order by ID
	 */
	async cancelOrder(id: string, symbol: string): Promise<boolean> {
		try {
			if (!this.initialized) await this.init();

			await this.exchange.cancelOrder(id, symbol);
			console.log(`Order ${id} for ${symbol} cancelled`);
			return true;
		} catch (error) {
			console.error(`Failed to cancel order ${id}:`, error);
			return false;
		}
	}

	/**
	 * Get account balance
	 */
	async getBalance(): Promise<any> {
		try {
			if (!this.initialized) await this.init();

			const balance = await this.exchange.fetchBalance();
			return balance;
		} catch (error) {
			console.error("Failed to fetch balance:", error);
			throw error;
		}
	}
}

// Export as singleton
export const tradingService = new TradingService();
