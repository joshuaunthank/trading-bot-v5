// Matrix and linear algebra helpers for strategies

/**
 * Transpose a 2D matrix.
 */
export function transpose<T>(m: T[][]): T[][] {
	return m[0].map((_, i) => m.map((row) => row[i]));
}

/**
 * Matrix multiplication (dot product) for 2D arrays.
 */
export function dot(a: number[][], b: number[][]): number[][] {
	return a.map((row) =>
		b[0].map((_, j) => row.reduce((sum, v, k) => sum + v * b[k][j], 0))
	);
}

/**
 * Invert a 2D matrix (naive, for small matrices only).
 * Throws if not invertible.
 */
export function invert2D(m: number[][]): number[][] {
	const size = m.length;
	const I = Array.from({ length: size }, (_, i) =>
		Array(size)
			.fill(0)
			.map((_, j) => (i === j ? 1 : 0))
	);
	const M = m.map((row) => row.slice());
	for (let i = 0; i < size; i++) {
		let maxRow = i;
		for (let k = i + 1; k < size; k++) {
			if (Math.abs(M[k][i]) > Math.abs(M[maxRow][i])) maxRow = k;
		}
		if (M[maxRow][i] === 0) throw new Error("Matrix not invertible");
		[M[i], M[maxRow]] = [M[maxRow], M[i]];
		[I[i], I[maxRow]] = [I[maxRow], I[i]];
		const invPivot = 1 / M[i][i];
		for (let j = 0; j < size; j++) {
			M[i][j] *= invPivot;
			I[i][j] *= invPivot;
		}
		for (let k = 0; k < size; k++) {
			if (k === i) continue;
			const factor = M[k][i];
			for (let j = 0; j < size; j++) {
				M[k][j] -= factor * M[i][j];
				I[k][j] -= factor * I[i][j];
			}
		}
	}
	return I;
}
