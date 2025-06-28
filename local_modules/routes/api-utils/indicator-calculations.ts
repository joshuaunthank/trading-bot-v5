import * as technicalindicators from "technicalindicators";

const SMA = technicalindicators.SMA;
const EMA = technicalindicators.EMA;
const RSI = technicalindicators.RSI;
const MACD = technicalindicators.MACD;
const ATR = technicalindicators.ATR;
const BB = technicalindicators.BollingerBands;
const VWAP = technicalindicators.VWAP;
const CCI = technicalindicators.CCI;
const ADX = technicalindicators.ADX;

const calculatedSMA = (data: number[], period: number): number[] => {
	return SMA.calculate({ period, values: data });
};

const calculatedEMA = (data: number[], period: number): number[] => {
	return EMA.calculate({ period, values: data });
};

const calculatedRSI = (data: number[], period: number): number[] => {
	return RSI.calculate({ period, values: data });
};

const calculatedMACD = (
	data: number[],
	shortPeriod: number,
	longPeriod: number,
	signalPeriod: number
): { macd: number[]; signal: number[]; histogram: number[] } => {
	const macdResult = MACD.calculate({
		values: data,
		fastPeriod: shortPeriod,
		slowPeriod: longPeriod,
		signalPeriod,
		SimpleMAOscillator: false,
		SimpleMASignal: false,
	});
	return {
		macd: macdResult
			.map((r) => r.MACD)
			.filter((v): v is number => v !== undefined),
		signal: macdResult
			.map((r) => r.signal)
			.filter((v): v is number => v !== undefined),
		histogram: macdResult
			.map((r) => r.histogram)
			.filter((v): v is number => v !== undefined),
	};
};

const calculatedATR = (
	data: { high: number; low: number; close: number }[],
	period: number
): number[] => {
	return ATR.calculate({
		high: data.map((d) => d.high),
		low: data.map((d) => d.low),
		close: data.map((d) => d.close),
		period,
	});
};

const calculatedBollingerBands = (
	data: number[],
	period: number,
	stdDev: number
): { upper: number[]; middle: number[]; lower: number[] } => {
	const bbResult = BB.calculate({ period, values: data, stdDev });
	return {
		upper: bbResult
			.map((r) => r.upper)
			.filter((v): v is number => v !== undefined),
		middle: bbResult
			.map((r) => r.middle)
			.filter((v): v is number => v !== undefined),
		lower: bbResult
			.map((r) => r.lower)
			.filter((v): v is number => v !== undefined),
	};
};

const calculatedVWAP = (
	data: { high: number; low: number; close: number; volume: number }[]
): number[] => {
	return VWAP.calculate({
		high: data.map((d) => d.high),
		low: data.map((d) => d.low),
		close: data.map((d) => d.close),
		volume: data.map((d) => d.volume),
	});
};

const calculatedCCI = (
	data: { high: number; low: number; close: number }[],
	period: number
): number[] => {
	return CCI.calculate({
		high: data.map((d) => d.high),
		low: data.map((d) => d.low),
		close: data.map((d) => d.close),
		period,
	});
};

const calculatedADX = (
	data: { high: number; low: number; close: number }[],
	period: number
): number[] => {
	const adxResult = ADX.calculate({
		high: data.map((d) => d.high),
		low: data.map((d) => d.low),
		close: data.map((d) => d.close),
		period,
	});
	return adxResult
		.map((r) => r.adx)
		.filter((v): v is number => v !== undefined);
};

export {
	calculatedSMA,
	calculatedEMA,
	calculatedRSI,
	calculatedMACD,
	calculatedATR,
	calculatedBollingerBands,
	calculatedVWAP,
	calculatedCCI,
	calculatedADX,
};
