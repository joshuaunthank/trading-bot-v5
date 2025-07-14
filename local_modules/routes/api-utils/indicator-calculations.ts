import * as technicalindicators from "technicalindicators";

// --- Moving Averages ---
const calculatedSMA = (data: number[], period: number): number[] =>
	technicalindicators.SMA.calculate({ period, values: data });
const calculatedEMA = (data: number[], period: number): number[] =>
	technicalindicators.EMA.calculate({ period, values: data });
const calculatedWMA = (data: number[], period: number): number[] =>
	technicalindicators.WMA.calculate({ period, values: data });
const calculatedWEMA = (data: number[], period: number): number[] =>
	technicalindicators.WEMA.calculate({ period, values: data });

// --- Oscillators & Momentum ---
const calculatedMACD = (
	data: number[],
	fastPeriod: number,
	slowPeriod: number,
	signalPeriod: number
) => {
	const macdResult = technicalindicators.MACD.calculate({
		values: data,
		fastPeriod,
		slowPeriod,
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
const calculatedRSI = (data: number[], period: number): number[] =>
	technicalindicators.RSI.calculate({ period, values: data });
const calculatedStochastic = (
	data: { high: number; low: number; close: number }[],
	period: number,
	signalPeriod: number
) =>
	technicalindicators.Stochastic.calculate({
		high: data.map((d) => d.high),
		low: data.map((d) => d.low),
		close: data.map((d) => d.close),
		period,
		signalPeriod,
	});
const calculatedStochRSI = (
	data: number[],
	rsiPeriod: number,
	stochasticPeriod: number,
	kPeriod: number,
	dPeriod: number
): number[] => {
	// Returns array of objects { stochRSI: number, k: number, d: number }
	const result = technicalindicators.StochasticRSI.calculate({
		values: data,
		rsiPeriod,
		stochasticPeriod,
		kPeriod,
		dPeriod,
	});
	return result.map((r) => r.stochRSI ?? NaN);
};
const calculatedTRIX = (data: number[], period: number): number[] =>
	technicalindicators.TRIX.calculate({ period, values: data });
const calculatedROC = (data: number[], period: number): number[] =>
	technicalindicators.ROC.calculate({ period, values: data });
const calculatedKST = (
	data: number[],
	ROCPer1: number,
	ROCPer2: number,
	ROCPer3: number,
	ROCPer4: number,
	SMAROCPer1: number,
	SMAROCPer2: number,
	SMAROCPer3: number,
	SMAROCPer4: number,
	signalPeriod: number
): number[] => {
	// Returns array of objects { kst: number, signal: number }
	const result = technicalindicators.KST.calculate({
		values: data,
		ROCPer1,
		ROCPer2,
		ROCPer3,
		ROCPer4,
		SMAROCPer1,
		SMAROCPer2,
		SMAROCPer3,
		SMAROCPer4,
		signalPeriod,
	});
	return result.map((r) => r.kst ?? NaN);
};
const calculatedWilliamsR = (
	data: { high: number; low: number; close: number }[],
	period: number
): number[] =>
	technicalindicators.WilliamsR.calculate({
		high: data.map((d) => d.high),
		low: data.map((d) => d.low),
		close: data.map((d) => d.close),
		period,
	});
const calculatedAwesomeOscillator = (
	data: { high: number; low: number }[],
	fastPeriod: number,
	slowPeriod: number
): number[] => {
	return technicalindicators.AwesomeOscillator.calculate({
		high: data.map((d) => d.high),
		low: data.map((d) => d.low),
		fastPeriod,
		slowPeriod,
	});
};

// --- Volatility ---
const calculatedBollingerBands = (
	data: number[],
	period: number,
	stdDev: number
) => {
	const bbResult = technicalindicators.BollingerBands.calculate({
		period,
		values: data,
		stdDev,
	});
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
const calculatedATR = (
	data: { high: number; low: number; close: number }[],
	period: number
): number[] =>
	technicalindicators.ATR.calculate({
		high: data.map((d) => d.high),
		low: data.map((d) => d.low),
		close: data.map((d) => d.close),
		period,
	});
const calculatedChandelierExit = (
	data: { high: number; low: number; close: number }[],
	period: number,
	multiplier: number
) =>
	technicalindicators.ChandelierExit.calculate({
		high: data.map((d) => d.high),
		low: data.map((d) => d.low),
		close: data.map((d) => d.close),
		period,
		multiplier,
	});
const calculatedKeltnerChannels = (
	data: { high: number; low: number; close: number }[],
	maPeriod: number,
	atrPeriod: number,
	multiplier: number,
	useSMA: boolean
) => {
	return technicalindicators.KeltnerChannels.calculate({
		high: data.map((d) => d.high),
		low: data.map((d) => d.low),
		close: data.map((d) => d.close),
		maPeriod,
		atrPeriod,
		multiplier,
		useSMA,
	});
};

// --- Volume ---
const calculatedOBV = (data: { close: number; volume: number }[]): number[] =>
	technicalindicators.OBV.calculate({
		close: data.map((d) => d.close),
		volume: data.map((d) => d.volume),
	});
const calculatedADL = (
	data: { high: number; low: number; close: number; volume: number }[]
): number[] =>
	technicalindicators.ADL.calculate({
		high: data.map((d) => d.high),
		low: data.map((d) => d.low),
		close: data.map((d) => d.close),
		volume: data.map((d) => d.volume),
	});
const calculatedMFI = (
	data: { high: number; low: number; close: number; volume: number }[],
	period: number
): number[] =>
	technicalindicators.MFI.calculate({
		high: data.map((d) => d.high),
		low: data.map((d) => d.low),
		close: data.map((d) => d.close),
		volume: data.map((d) => d.volume),
		period,
	});
const calculatedVWAP = (
	data: { high: number; low: number; close: number; volume: number }[]
): number[] =>
	technicalindicators.VWAP.calculate({
		high: data.map((d) => d.high),
		low: data.map((d) => d.low),
		close: data.map((d) => d.close),
		volume: data.map((d) => d.volume),
	});
const calculatedForceIndex = (
	data: { close: number; volume: number }[],
	period: number
): number[] => {
	return technicalindicators.ForceIndex.calculate({
		close: data.map((d) => d.close),
		volume: data.map((d) => d.volume),
		period,
	});
};
const calculatedVolumeProfile = (
	data: {
		high: number;
		open: number;
		low: number;
		close: number;
		volume: number;
	}[],
	noOfBars: number
): number[] => {
	return technicalindicators.VolumeProfile.calculate({
		high: data.map((d) => d.high),
		open: data.map((d) => d.open),
		low: data.map((d) => d.low),
		close: data.map((d) => d.close),
		volume: data.map((d) => d.volume),
		noOfBars,
	});
};

// --- Directional Movement ---
const calculatedADX = (
	data: { high: number; low: number; close: number }[],
	period: number
): number[] => {
	const adxResult = technicalindicators.ADX.calculate({
		high: data.map((d) => d.high),
		low: data.map((d) => d.low),
		close: data.map((d) => d.close),
		period,
	});
	return adxResult
		.map((r) => r.adx)
		.filter((v): v is number => v !== undefined);
};
// PlusDM and MinusDM are not exported by technicalindicators v3.x, comment out for now
// const calculatedPlusDM = (data: { high: number; low: number }[]): number[] =>
//     technicalindicators.PlusDM.calculate({
//         high: data.map((d) => d.high),
//         low: data.map((d) => d.low),
//     });
// const calculatedMinusDM = (data: { high: number; low: number }[]): number[] =>
//     technicalindicators.MinusDM.calculate({
//         high: data.map((d) => d.high),
//         low: data.map((d) => d.low),
//     });
const calculatedTrueRange = (
	data: { high: number; low: number; close: number }[]
): number[] =>
	technicalindicators.TrueRange.calculate({
		high: data.map((d) => d.high),
		low: data.map((d) => d.low),
		close: data.map((d) => d.close),
	});

// --- Ichimoku ---
const calculatedIchimokuCloud = (
	data: { high: number; low: number }[],
	conversionPeriod: number,
	basePeriod: number,
	spanPeriod: number,
	displacement: number
): any => {
	// IchimokuCloud expects high, low arrays and periods
	return technicalindicators.IchimokuCloud.calculate({
		high: data.map((d) => d.high),
		low: data.map((d) => d.low),
		conversionPeriod,
		basePeriod,
		spanPeriod,
		displacement,
	});
};

// --- Other ---
// PSAR and TypicalPrice are not exported by technicalindicators v3.x, comment out for now
// const calculatedPSAR = (
//     data: { high: number; low: number },
//     step: number,
//     max: number
// ): number[] =>
//     technicalindicators.PSAR.calculate({
//         high: data.map((d) => d.high),
//         low: data.map((d) => d.low),
//         step,
//         max,
//     });
// const calculatedTypicalPrice = (
//     data: { high: number; low: number; close: number }[]
// ): number[] =>
//     technicalindicators.TypicalPrice.calculate({
//         high: data.map((d) => d.high),
//         low: data.map((d) => d.low),
//         close: data.map((d) => d.close),
//     });

// --- Dispatcher Map ---
export const indicatorCalculatorsByCategory = {
	moving_averages: {
		sma: calculatedSMA,
		ema: calculatedEMA,
		wma: calculatedWMA,
		wema: calculatedWEMA,
	},
	oscillators: {
		macd: calculatedMACD,
		rsi: calculatedRSI,
		stochastic: calculatedStochastic,
		stochrsi: calculatedStochRSI,
		trix: calculatedTRIX,
		roc: calculatedROC,
		kst: calculatedKST,
		williamsr: calculatedWilliamsR,
		awesomeoscillator: calculatedAwesomeOscillator,
	},
	volatility: {
		bollingerbands: calculatedBollingerBands,
		atr: calculatedATR,
		chandelierexit: calculatedChandelierExit,
		keltnerchannels: calculatedKeltnerChannels,
	},
	volume: {
		obv: calculatedOBV,
		adl: calculatedADL,
		mfi: calculatedMFI,
		vwap: calculatedVWAP,
		forceindex: calculatedForceIndex,
		volumeprofile: calculatedVolumeProfile,
	},
	directionalmovement: {
		adx: calculatedADX,
		truerange: calculatedTrueRange,
	},
	ichimoku: {
		ichimokucloud: calculatedIchimokuCloud,
	},
	other: {
		// psar: calculatedPSAR,
		// typicalprice: calculatedTypicalPrice,
	},
};

// For legacy compatibility, export individual functions as well
export {
	calculatedSMA,
	calculatedEMA,
	calculatedWMA,
	calculatedWEMA,
	calculatedMACD,
	calculatedRSI,
	calculatedStochastic,
	calculatedStochRSI,
	calculatedTRIX,
	calculatedROC,
	calculatedKST,
	calculatedWilliamsR,
	calculatedAwesomeOscillator,
	calculatedBollingerBands,
	calculatedATR,
	calculatedChandelierExit,
	calculatedKeltnerChannels,
	calculatedOBV,
	calculatedADL,
	calculatedMFI,
	calculatedVWAP,
	calculatedForceIndex,
	calculatedVolumeProfile,
	calculatedADX,
	calculatedTrueRange,
	calculatedIchimokuCloud,
};
