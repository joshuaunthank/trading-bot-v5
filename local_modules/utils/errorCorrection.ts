// Utility for error correction regression (linear regression with stats)
import { transpose, dot, invert2D } from "./mathUtils";
// @ts-ignore
import { jStat } from "jstat";

export interface ErrorCorrectionResult {
	errorForecast: (number | null)[];
	nextErrorCorrectedForecast: number | null;
	errorCorrectionRSquared: number | null;
	errorCorrectionCoefficients: number[] | null;
	errorCorrectionStdErr: number[] | null;
	errorCorrectionPValues: number[] | null;
	errorCorrectionModelPValue: number | null;
}

/**
 * Computes error correction regression and forecasts.
 * @param features - 2D array of predictors (with intercept as first column)
 * @param target - 1D array of target values
 * @param nextFeatures - feature vector for the next forecast (with intercept as first element)
 * @returns ErrorCorrectionResult
 */
export function computeErrorCorrectionRegression({
	features,
	target,
	nextFeatures,
}: {
	features: number[][];
	target: number[];
	nextFeatures?: number[];
}): ErrorCorrectionResult {
	const n = target.length;
	let errorForecast: (number | null)[] = Array(n).fill(null);
	let nextErrorCorrectedForecast: number | null = null;
	let errorCorrectionRSquared: number | null = null;
	let errorCorrectionCoefficients: number[] | null = null;
	let errorCorrectionStdErr: number[] | null = null;
	let errorCorrectionPValues: number[] | null = null;
	let errorCorrectionModelPValue: number | null = null;
	if (features.length > 2) {
		const XtE = transpose(features);
		const XtXE = dot(XtE, features);
		const XtXinvE = invert2D(XtXE);
		const XtyE = dot(
			XtE,
			target.map((v) => [v])
		);
		const betaE = dot(XtXinvE, XtyE).map((b) => b[0]);
		const yPred = features.map((row) =>
			row.reduce((sum, v, j) => sum + v * betaE[j], 0)
		);
		const yTrue = target;
		const nObs = yTrue.length;
		const p = betaE.length;
		const meanY = yTrue.reduce((a, b) => a + b, 0) / nObs;
		const ssTot = yTrue.reduce((sum, v) => sum + (v - meanY) ** 2, 0);
		const ssRes = yTrue.reduce((sum, v, i) => sum + (v - yPred[i]) ** 2, 0);
		errorCorrectionRSquared = ssTot === 0 ? null : 1 - ssRes / ssTot;
		const sigma2 = ssRes / (nObs - p);
		errorCorrectionStdErr = XtXinvE.map((row, j) =>
			Math.sqrt(Math.abs(row[j]) * sigma2)
		);
		errorCorrectionCoefficients = betaE;
		const df = nObs - p;
		errorCorrectionPValues = betaE.map((coef, j) => {
			const stderr = errorCorrectionStdErr ? errorCorrectionStdErr[j] : 0;
			if (!stderr || stderr === 0) return 1;
			const t = coef / stderr;
			const pval = 2 * (1 - jStat.studentt.cdf(Math.abs(t), df));
			return pval;
		});
		if (ssRes > 0 && ssTot > 0 && nObs > p && p > 1) {
			const msr = (ssTot - ssRes) / (p - 1);
			const mse = ssRes / (nObs - p);
			const f = msr / mse;
			const modelPval = 1 - jStat.centralF.cdf(f, p - 1, nObs - p);
			errorCorrectionModelPValue = modelPval;
		}
		for (let i = 0; i < n; i++) {
			errorForecast[i] = features[i].reduce(
				(sum, v, j) => sum + v * betaE[j],
				0
			);
		}
		if (nextFeatures && nextFeatures.length === betaE.length) {
			nextErrorCorrectedForecast = nextFeatures.reduce(
				(sum, v, j) => sum + v * betaE[j],
				0
			);
		}
	}
	return {
		errorForecast,
		nextErrorCorrectedForecast,
		errorCorrectionRSquared,
		errorCorrectionCoefficients,
		errorCorrectionStdErr,
		errorCorrectionPValues,
		errorCorrectionModelPValue,
	};
}
