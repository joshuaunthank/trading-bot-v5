import React from "react";

export interface SummaryViewProps {
	data: any;
	className?: string;
	style?: React.CSSProperties;
}

export default function SummaryView({
	data,
	className,
	style,
}: SummaryViewProps) {
	if (!data || !data.result) {
		return (
			<div className={className} style={style}>
				<em>No summary available.</em>
			</div>
		);
	}
	const r = data.result;
	return (
		<div className={className} style={style}>
			<h3>Strategy Summary</h3>
			{r.strategy && (
				<div>
					<b>Strategy:</b> {r.strategy}
				</div>
			)}
			{r.config && (
				<div>
					<b>Config:</b>
					<pre>{JSON.stringify(r.config, null, 2)}</pre>
				</div>
			)}
			{r.message && (
				<div>
					<b>Message:</b> {r.message}
				</div>
			)}
			{r.endingBalance !== undefined && r.startingBalance !== undefined && (
				<>
					<div>
						<b>Starting Balance:</b> {r.startingBalance}
					</div>
					<div>
						<b>Ending Balance:</b> {r.endingBalance}
					</div>
				</>
			)}
			{r.cumulativePnL && r.cumulativePnL.percent !== undefined && (
				<div>
					<b>Cumulative PnL:</b> {r.cumulativePnL.percent.toFixed(2)}%
				</div>
			)}
		</div>
	);
}
