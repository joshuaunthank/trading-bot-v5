// Utility for aligning multiple arrays to the same minimum length

/**
 * Given an object of arrays, returns a new object with all arrays sliced to the same minimum length.
 * Example: alignArrays({ a: [1,2,3], b: [4,5] }) => { a: [2,3], b: [4,5] }
 */
export function alignArrays<T extends Record<string, any[]>>(arrays: T): T {
	const minLen = Math.min(...Object.values(arrays).map((arr) => arr.length));
	const result: any = {};
	for (const key in arrays) {
		result[key] = arrays[key].slice(arrays[key].length - minLen);
	}
	return result;
}
