import React, { useEffect, useState } from "react";
import ChartSpinner from "./ChartSpinner";

interface OHLCVData {
	timestamp: number;
	open: number;
	high: number;
	close: number;
	low: number;
	volume: number;
}

interface TableViewProps {
	data: OHLCVData[];
	loading?: boolean;
	additionalColumns?: {
		header: string;
		accessor: string;
		formatter?: (value: any) => string;
	}[];
	onRowClick?: (data: OHLCVData) => void;
	symbol?: string;
	timeframe?: string;
}

const TableView: React.FC<TableViewProps> = ({
	data,
	loading = false,
	additionalColumns = [],
	onRowClick,
	symbol,
	timeframe,
}) => {
	const [sortedData, setSortedData] = useState<OHLCVData[]>([]);
	const [sortConfig, setSortConfig] = useState<{
		key: string;
		direction: "ascending" | "descending";
	} | null>({ key: "timestamp", direction: "descending" });

	useEffect(() => {
		let sortableData = [...data];
		if (sortConfig !== null) {
			sortableData.sort((a: any, b: any) => {
				if (a[sortConfig.key] < b[sortConfig.key]) {
					return sortConfig.direction === "ascending" ? -1 : 1;
				}
				if (a[sortConfig.key] > b[sortConfig.key]) {
					return sortConfig.direction === "ascending" ? 1 : -1;
				}
				return 0;
			});
		}
		setSortedData(sortableData);
	}, [data, sortConfig]);

	const requestSort = (key: string) => {
		let direction: "ascending" | "descending" = "ascending";
		if (
			sortConfig &&
			sortConfig.key === key &&
			sortConfig.direction === "ascending"
		) {
			direction = "descending";
		}
		setSortConfig({ key, direction });
	};

	const getClassNamesFor = (name: string) => {
		if (!sortConfig) {
			return "";
		}
		return sortConfig.key === name ? sortConfig.direction : "";
	};

	const formatPrice = (price: number) => {
		return price.toLocaleString("en-US", {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		});
	};

	const formatVolume = (volume: number) => {
		return volume.toLocaleString("en-US");
	};

	const formatTimestamp = (timestamp: number) => {
		const date = new Date(timestamp);
		return date.toLocaleString();
	};

	const formatPercentChange = (value: number) => {
		return `${(value * 100).toFixed(2)}%`;
	};

	// Calculate percent change
	const calculatePercentChange = (current: number, previous: number) => {
		if (!previous) return 0;
		return (current - previous) / previous;
	};

	return (
		<div className="bg-gray-800 rounded-lg shadow-lg p-4 overflow-auto max-h-[500px]">
			<div className="flex justify-between items-center mb-4">
				<div className="flex items-center space-x-2">
					{symbol && timeframe && (
						<h3 className="text-lg font-semibold">
							{symbol} - {timeframe} Data
						</h3>
					)}
					{loading && <ChartSpinner size="small" />}
				</div>
			</div>

			{loading && data.length === 0 ? (
				<div className="flex justify-center items-center h-32">
					<ChartSpinner size="large" />
				</div>
			) : data.length === 0 ? (
				<div className="text-center text-gray-400 py-8">No data available</div>
			) : (
				<table className="w-full text-sm text-left text-gray-300">
					<thead className="text-xs uppercase bg-gray-700 sticky top-0">
						<tr>
							<th
								className={`px-4 py-3 cursor-pointer hover:bg-gray-600 ${getClassNamesFor(
									"timestamp"
								)}`}
								onClick={() => requestSort("timestamp")}
							>
								Time
								<span className="ml-1">
									{getClassNamesFor("timestamp") === "ascending"
										? "↑"
										: getClassNamesFor("timestamp") === "descending"
										? "↓"
										: ""}
								</span>
							</th>
							<th
								className={`px-4 py-3 cursor-pointer hover:bg-gray-600 ${getClassNamesFor(
									"open"
								)}`}
								onClick={() => requestSort("open")}
							>
								Open
								<span className="ml-1">
									{getClassNamesFor("open") === "ascending"
										? "↑"
										: getClassNamesFor("open") === "descending"
										? "↓"
										: ""}
								</span>
							</th>
							<th
								className={`px-4 py-3 cursor-pointer hover:bg-gray-600 ${getClassNamesFor(
									"high"
								)}`}
								onClick={() => requestSort("high")}
							>
								High
								<span className="ml-1">
									{getClassNamesFor("high") === "ascending"
										? "↑"
										: getClassNamesFor("high") === "descending"
										? "↓"
										: ""}
								</span>
							</th>
							<th
								className={`px-4 py-3 cursor-pointer hover:bg-gray-600 ${getClassNamesFor(
									"low"
								)}`}
								onClick={() => requestSort("low")}
							>
								Low
								<span className="ml-1">
									{getClassNamesFor("low") === "ascending"
										? "↑"
										: getClassNamesFor("low") === "descending"
										? "↓"
										: ""}
								</span>
							</th>
							<th
								className={`px-4 py-3 cursor-pointer hover:bg-gray-600 ${getClassNamesFor(
									"close"
								)}`}
								onClick={() => requestSort("close")}
							>
								Close
								<span className="ml-1">
									{getClassNamesFor("close") === "ascending"
										? "↑"
										: getClassNamesFor("close") === "descending"
										? "↓"
										: ""}
								</span>
							</th>
							<th
								className={`px-4 py-3 cursor-pointer hover:bg-gray-600 ${getClassNamesFor(
									"volume"
								)}`}
								onClick={() => requestSort("volume")}
							>
								Volume
								<span className="ml-1">
									{getClassNamesFor("volume") === "ascending"
										? "↑"
										: getClassNamesFor("volume") === "descending"
										? "↓"
										: ""}
								</span>
							</th>
							<th className="px-4 py-3">% Change</th>
							{additionalColumns.map((column) => (
								<th
									key={column.header}
									className={`px-4 py-3 cursor-pointer hover:bg-gray-600 ${getClassNamesFor(
										column.accessor
									)}`}
									onClick={() => requestSort(column.accessor)}
								>
									{column.header}
									<span className="ml-1">
										{getClassNamesFor(column.accessor) === "ascending"
											? "↑"
											: getClassNamesFor(column.accessor) === "descending"
											? "↓"
											: ""}
									</span>
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{sortedData.map((row, i) => {
							const percentChange = calculatePercentChange(
								row.close,
								i < sortedData.length - 1 ? sortedData[i + 1].close : row.close
							);

							const isPositive = percentChange > 0;
							const isNegative = percentChange < 0;

							return (
								<tr
									key={row.timestamp}
									className={`border-b border-gray-700 hover:bg-gray-600 ${
										onRowClick ? "cursor-pointer" : ""
									}`}
									onClick={() => onRowClick && onRowClick(row)}
								>
									<td className="px-4 py-3">
										{formatTimestamp(row.timestamp)}
									</td>
									<td className="px-4 py-3">{formatPrice(row.open)}</td>
									<td className="px-4 py-3">{formatPrice(row.high)}</td>
									<td className="px-4 py-3">{formatPrice(row.low)}</td>
									<td className="px-4 py-3">{formatPrice(row.close)}</td>
									<td className="px-4 py-3">{formatVolume(row.volume)}</td>
									<td
										className={`px-4 py-3 ${
											isPositive
												? "text-green-500"
												: isNegative
												? "text-red-500"
												: ""
										}`}
									>
										{formatPercentChange(percentChange)}
									</td>
									{additionalColumns.map((column) => (
										<td key={column.header} className="px-4 py-3">
											{column.formatter
												? column.formatter((row as any)[column.accessor])
												: (row as any)[column.accessor]}
										</td>
									))}
								</tr>
							);
						})}
					</tbody>
				</table>
			)}
		</div>
	);
};

export default TableView;
