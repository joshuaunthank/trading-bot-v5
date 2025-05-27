import React from "react";
import { OhlcvCandle } from "./useOhlcvWebSocket";

export interface TableViewProps {
	candles: OhlcvCandle[];
	className?: string;
	style?: React.CSSProperties;
}

export default function TableView({
	candles,
	className,
	style,
}: TableViewProps) {
	return (
		<table className={className} style={style}>
			<thead>
				<tr>
					<th>Time</th>
					<th>Current Price</th>
					<th>Open</th>
					<th>High</th>
					<th>Low</th>
					<th>Close</th>
					<th>Volume</th>
				</tr>
			</thead>
			<tbody>
				{candles.map((c) => (
					<tr key={c.timestamp}>
						<td>{new Date(c.timestamp).toLocaleTimeString()}</td>
						<td>{c.currentPrice}</td>
						<td>{c.open}</td>
						<td>{c.high}</td>
						<td>{c.low}</td>
						<td>{c.close}</td>
						<td>{c.volume}</td>
					</tr>
				))}
			</tbody>
		</table>
	);
}
