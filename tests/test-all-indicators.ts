import { calculateIndicatorsForStrategy } from "../local_modules/utils/strategyIndicators";
import { IndicatorValue } from "../local_modules/utils/indicatorUtils";

type IndicatorTestConfig = {
	id: string;
	name: string;
	type: string;
	parameters: Record<string, any>;
	color: string;
	warmup: number;
};

const mockOHLCV = Array.from({ length: 50 }, (_, i) => ({
	timestamp: 1720000000000 + i * 60_000,
	open: 100 + i * 0.5,
	high: 101 + i * 0.5,
	low: 99 + i * 0.5,
	close: 100 + i * 0.5,
	volume: 10 + i,
}));

const indicatorConfigs: IndicatorTestConfig[] = [
	{
		id: "SMA_20",
		name: "SMA Test",
		type: "sma",
		parameters: { period: 20 },
		color: "#000",
		warmup: 19,
	},
	{
		id: "EMA_20",
		name: "EMA Test",
		type: "ema",
		parameters: { period: 20 },
		color: "#000",
		warmup: 19,
	},
	{
		id: "RSI_14",
		name: "RSI Test",
		type: "rsi",
		parameters: { period: 14 },
		color: "#000",
		warmup: 13,
	},
	{
		id: "MACD_12_26_9",
		name: "MACD Test",
		type: "macd",
		parameters: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
		color: "#000",
		warmup: 25,
	},
	{
		id: "BB_20_2",
		name: "BB Test",
		type: "bb",
		parameters: { period: 20, stdDev: 2 },
		color: "#000",
		warmup: 19,
	},
	{
		id: "ATR_14",
		name: "ATR Test",
		type: "atr",
		parameters: { period: 14 },
		color: "#000",
		warmup: 13,
	},
	{
		id: "CCI_20",
		name: "CCI Test",
		type: "cci",
		parameters: { period: 20 },
		color: "#000",
		warmup: 19,
	},
	{
		id: "ADX_14",
		name: "ADX Test",
		type: "adx",
		parameters: { period: 14 },
		color: "#000",
		warmup: 13,
	},
	{
		id: "VWAP",
		name: "VWAP Test",
		type: "vwap",
		parameters: {},
		color: "#000",
		warmup: 0,
	},
];

describe("Indicator Alignment", () => {
	indicatorConfigs.forEach((cfg) => {
		it(`${cfg.type.toUpperCase()} should align to OHLCV timestamps with correct null padding`, () => {
			const results = calculateIndicatorsForStrategy(cfg, mockOHLCV);
			const ohlcvTimestamps = mockOHLCV.map((d) => d.timestamp);

			results.forEach((result) => {
				// All should have data arrays of same length as OHLCV
				expect(result.data.length).toBe(ohlcvTimestamps.length);
				// Nulls should be present at the start (for warmup period)
				expect(
					result.data.slice(0, cfg.warmup).every((v) => v.y === null)
				).toBe(true);
				// All timestamps should match
				expect(result.data.map((v) => v.x)).toEqual(ohlcvTimestamps);
			});
		});
	});
});
