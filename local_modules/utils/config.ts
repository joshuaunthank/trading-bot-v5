import * as dotenv from "dotenv";
dotenv.config();

export const config = {
	binanceApiKey: process.env.BINANCE_API_KEY || "",
	binanceApiSecret: process.env.BINANCE_API_SECRET || "",
	defaultSymbol: process.env.DEFAULT_SYMBOL || "BTC/USDT",
	defaultTimeframe: process.env.DEFAULT_TIMEFRAME || "4h",
	defaultLimit: Number(process.env.DEFAULT_LIMIT) || 1000,
	arimaOrder: Number(process.env.ARIMA_ORDER) || 4,
	macdFast: Number(process.env.MACD_FAST) || 10,
	macdSlow: Number(process.env.MACD_SLOW) || 30,
	macdSignal: Number(process.env.MACD_SIGNAL) || 5,
	ema5Window: Number(process.env.EMA5_WINDOW) || 5,
	ema10Window: Number(process.env.EMA10_WINDOW) || 10,
	ema30Window: Number(process.env.EMA30_WINDOW) || 30,
};
