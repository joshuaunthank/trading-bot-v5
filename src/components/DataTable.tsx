import React from "react";
import { OHLCVData } from "../types/indicators";

interface DataTableProps {
	data: OHLCVData[];
	title?: string;
	maxRows?: number;
}

const DataTable: React.FC<DataTableProps> = ({
	data,
	title = "Recent Data",
	maxRows = 10,
}) => {
	const sortedData = data
		.slice()
		.sort((a, b) => b.timestamp - a.timestamp)
		.slice(0, maxRows);

	return (
		<div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
			<h3 className="text-lg font-semibold mb-4">{title}</h3>
			<div className="overflow-x-auto">
				<table className="w-full text-sm">
					<thead>
						<tr className="border-b border-gray-700">
							<th className="text-left p-2 cursor-pointer hover:bg-gray-700">
								Time ↓
							</th>
							<th className="text-left p-2">Open</th>
							<th className="text-left p-2">High</th>
							<th className="text-left p-2">Low</th>
							<th className="text-left p-2">Close</th>
							<th className="text-left p-2">Volume</th>
						</tr>
					</thead>
					<tbody>
						{sortedData.map((candle, index) => (
							<tr key={index} className="border-b border-gray-700">
								<td className="p-2">
									{new Date(candle.timestamp).toLocaleString()}
								</td>
								<td className="p-2">{candle.open.toFixed(2)}</td>
								<td className="p-2">{candle.high.toFixed(2)}</td>
								<td className="p-2">{candle.low.toFixed(2)}</td>
								<td className="p-2">{candle.close.toFixed(2)}</td>
								<td className="p-2">{candle.volume.toFixed(0)}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
};

export default DataTable;
