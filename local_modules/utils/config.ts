import * as dotenv from "dotenv";
dotenv.config();

export const config = {
	// API credentials
	BINANCE_API_KEY: process.env.BINANCE_API_KEY || "",
	BINANCE_API_SECRET: process.env.BINANCE_API_SECRET || "",

	// Trading settings
	DEFAULT_LEVERAGE: Number(process.env.DEFAULT_LEVERAGE) || 3,
	RISK_PER_TRADE_PERCENT: Number(process.env.RISK_PER_TRADE_PERCENT) || 1,

	// Data settings
	defaultSymbol: process.env.DEFAULT_SYMBOL || "BTC/USDT",
	defaultTimeframe: process.env.DEFAULT_TIMEFRAME || "4h",
	defaultLimit: Number(process.env.DEFAULT_LIMIT) || 1000,

	// Strategy parameter defaults
	arimaOrder: Number(process.env.ARIMA_ORDER) || 4,
	macdFast: Number(process.env.MACD_FAST) || 10,
	macdSlow: Number(process.env.MACD_SLOW) || 30,
	macdSignal: Number(process.env.MACD_SIGNAL) || 5,
	ema5Window: Number(process.env.EMA5_WINDOW) || 5,
	ema10Window: Number(process.env.EMA10_WINDOW) || 10,
	ema30Window: Number(process.env.EMA30_WINDOW) || 30,

	// Validation settings
	validationEnabled: process.env.VALIDATION_ENABLED !== "false",
	strategyAutoFix: process.env.STRATEGY_AUTO_FIX === "true",

	// File-based strategy store settings
	strategyStoreEnabled: process.env.STRATEGY_STORE_ENABLED !== "false",
	strategyStoreBackupEnabled:
		process.env.STRATEGY_STORE_BACKUP_ENABLED !== "false",
	strategyStoreBackupDir: process.env.STRATEGY_STORE_BACKUP_DIR || "backup",

	// Security settings
	JWT_SECRET: process.env.JWT_SECRET || "trading-bot-secret-key",
	SESSION_TIMEOUT_MINUTES: Number(process.env.SESSION_TIMEOUT_MINUTES) || 60,
};
