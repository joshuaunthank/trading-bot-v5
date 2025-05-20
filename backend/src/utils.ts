import ccxt from "ccxt";

/**
 * Fetch margin account balance for a given asset (e.g., USDT) using ccxt.
 * @param exchange An authenticated ccxt.Exchange instance (with margin enabled)
 * @param asset The asset symbol, e.g., 'USDT'
 * @returns The free balance for the asset as a number
 */
export async function fetchMarginBalance(
	exchange: any, // was ccxt.Exchange
	asset: string
): Promise<number> {
	try {
		// Fetch margin account balances
		const marginInfo = await exchange.sapi_get_margin_account();
		if (!marginInfo || !marginInfo.userAssets)
			throw new Error("No margin account info returned");
		const assetInfo = marginInfo.userAssets.find((a: any) => a.asset === asset);
		if (!assetInfo)
			throw new Error(`Asset ${asset} not found in margin account`);
		// Return free balance as a number
		return parseFloat(assetInfo.free);
	} catch (err: any) {
		throw new Error(
			`Failed to fetch margin balance for ${asset}: ${err.message || err}`
		);
	}
}

/**
 * Calculate cumulative PnL given starting and ending balances.
 * @param startingBalance Starting balance (number)
 * @param endingBalance Ending balance (number)
 * @returns Object with absolute and percent PnL
 */
export function calculateCumulativePnL(
	startingBalance: number,
	endingBalance: number
): { absolute: number; percent: number } {
	const absolute = endingBalance - startingBalance;
	const percent =
		startingBalance !== 0 ? (absolute / startingBalance) * 100 : 0;
	return { absolute, percent };
}
