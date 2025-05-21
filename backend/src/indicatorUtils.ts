// Indicator and array conversion helpers for trading strategies

/**
 * Convert an array of mixed values to a number[] (NaN filtered out).
 */
export function toNumberArray(arr: any[]): number[] {
	return arr
		.map((v) => (typeof v === "number" ? v : v === undefined ? NaN : Number(v)))
		.filter((v) => !isNaN(v));
}

/**
 * Convert an array of objects to an array of Bollinger Band objects (with upper, lower, middle).
 */
export function toBBArray(
	arr: any[]
): { upper: number; lower: number; middle: number }[] {
	return arr.filter(
		(v) =>
			v &&
			typeof v.upper === "number" &&
			typeof v.lower === "number" &&
			typeof v.middle === "number"
	);
}
