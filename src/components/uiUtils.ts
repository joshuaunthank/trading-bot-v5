// src/components/uiUtils.ts

/**
 * Show the chart spinner overlay.
 */
export function showChartSpinner() {
	const spinner = document.getElementById("chart-spinner");
	if (spinner) spinner.style.display = "flex";
}

/**
 * Hide the chart spinner overlay.
 */
export function hideChartSpinner() {
	const spinner = document.getElementById("chart-spinner");
	if (spinner) spinner.style.display = "none";
}

/**
 * Format an array of ISO date strings for chart labels, respecting UTC/local config.
 * @param dates Array of ISO date strings
 * @param useUTC Whether to use UTC formatting
 */
export function formatTimeLabels(
	dates: string[],
	useUTC: boolean = true
): string[] {
	return dates.map((d) => {
		const date = new Date(d);
		return useUTC
			? date.toISOString().replace("T", " ").replace(".000Z", " UTC")
			: date.toLocaleString();
	});
}
