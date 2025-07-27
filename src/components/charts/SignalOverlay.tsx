import React from "react";
import { ChartOptions } from "chart.js";
import { StrategySignal } from "../../services/strategyService";

// Extended interface for live trading signals with execution data
interface LiveTradingSignal extends StrategySignal {
	timestamp: number;
	price: number;
	reason?: string;
	strategyId?: string;
	executed?: boolean;
}

interface SignalOverlayProps {
	signals: LiveTradingSignal[];
	ohlcvData: any[];
	onSignalClick?: (signal: LiveTradingSignal) => void;
}

interface SignalMarker {
	id: string;
	timestamp: number;
	price: number;
	type: "entry" | "exit";
	side: "long" | "short";
	confidence: number;
	reason?: string;
	color: string;
	symbol: string;
}

/**
 * Signal Overlay Hook for Chart.js
 * Processes trading signals and returns chart configuration for markers
 */
export const useSignalOverlay = (
	signals: LiveTradingSignal[],
	ohlcvData: any[],
	onSignalClick?: (signal: LiveTradingSignal) => void
) => {
	// Convert strategy signals to chart markers
	const createSignalMarkers = (
		signals: LiveTradingSignal[]
	): SignalMarker[] => {
		return signals
			.map((signal, index) => {
				// Find corresponding OHLCV data point
				const dataPoint = ohlcvData.find(
					(d) => Math.abs(d.timestamp - signal.timestamp) < 60000 // Within 1 minute
				);

				if (!dataPoint) {
					console.warn(`No OHLCV data found for signal at ${signal.timestamp}`);
					return null;
				}

				// Determine marker style based on signal type and side
				const getMarkerStyle = (type: string, side: string) => {
					if (type === "entry") {
						return side === "long"
							? { color: "#10B981", symbol: "▲" } // Green triangle up for long entry
							: { color: "#EF4444", symbol: "▼" }; // Red triangle down for short entry
					} else {
						return side === "long"
							? { color: "#F59E0B", symbol: "▲" } // Orange triangle up for long exit
							: { color: "#8B5CF6", symbol: "▼" }; // Purple triangle down for short exit
					}
				};

				const style = getMarkerStyle(signal.type, signal.side);

				return {
					id: signal.id || `signal-${index}`,
					timestamp: signal.timestamp,
					price: signal.price,
					type: signal.type as "entry" | "exit",
					side: signal.side as "long" | "short",
					confidence: signal.confidence || 0.5,
					reason: signal.reason,
					color: style.color,
					symbol: style.symbol,
				};
			})
			.filter(Boolean) as SignalMarker[];
	};

	const signalMarkers = createSignalMarkers(signals);

	// Convert to Chart.js annotation format
	const createChartAnnotations = (markers: SignalMarker[]) => {
		const annotations: any = {};

		markers.forEach((marker, index) => {
			annotations[`signal-${marker.id}`] = {
				type: "point",
				xValue: marker.timestamp,
				yValue: marker.price,
				backgroundColor: marker.color,
				borderColor: marker.color,
				borderWidth: 2,
				radius: 8,
				pointStyle: marker.type === "entry" ? "triangle" : "circle",
				rotation: marker.side === "short" ? 180 : 0,

				// Tooltip configuration
				label: {
					enabled: true,
					content: `${marker.type.toUpperCase()} ${marker.side.toUpperCase()}`,
					backgroundColor: marker.color,
					color: "white",
					padding: 4,
					cornerRadius: 4,
					font: {
						size: 11,
						weight: "500",
					},
				},

				// Click handler
				click: onSignalClick
					? () => {
							const matchingSignal = signals.find((s) => s.id === marker.id);
							if (matchingSignal) onSignalClick(matchingSignal);
					  }
					: undefined,
			};
		});

		return annotations;
	};

	// Chart.js plugin configuration for signal overlays
	const getSignalPluginConfig = () => {
		return {
			tooltip: {
				callbacks: {
					// Enhanced tooltip for signal markers
					label: (context: any) => {
						const marker = signalMarkers.find(
							(m) =>
								Math.abs(context.parsed.x - m.timestamp) < 60000 &&
								Math.abs(context.parsed.y - m.price) < m.price * 0.001
						);

						if (marker) {
							return [
								`${marker.type.toUpperCase()} ${marker.side.toUpperCase()}`,
								`Price: $${marker.price.toFixed(2)}`,
								`Confidence: ${(marker.confidence * 100).toFixed(1)}%`,
								...(marker.reason ? [`Reason: ${marker.reason}`] : []),
							];
						}

						return context.formattedValue;
					},
				},
			},
		};
	};

	return {
		signalMarkers,
		pluginConfig: getSignalPluginConfig(),
		annotations: createChartAnnotations(signalMarkers),
	};
};

/**
 * Signal Legend Component
 * Shows legend for signal types and colors
 */
export const SignalLegend: React.FC<{ signals: LiveTradingSignal[] }> = ({
	signals,
}) => {
	const signalTypes = [
		{
			type: "entry",
			side: "long",
			color: "#10B981",
			label: "Long Entry",
			symbol: "▲",
		},
		{
			type: "entry",
			side: "short",
			color: "#EF4444",
			label: "Short Entry",
			symbol: "▼",
		},
		{
			type: "exit",
			side: "long",
			color: "#F59E0B",
			label: "Long Exit",
			symbol: "▲",
		},
		{
			type: "exit",
			side: "short",
			color: "#8B5CF6",
			label: "Short Exit",
			symbol: "▼",
		},
	];

	const activeTypes = signalTypes.filter((type) =>
		signals.some(
			(signal) => signal.type === type.type && signal.side === type.side
		)
	);

	if (activeTypes.length === 0) return null;

	return (
		<div className="flex items-center gap-4 px-4 py-2 bg-gray-800 rounded-lg border border-gray-700">
			<span className="text-sm font-medium text-gray-300">Signals:</span>
			{activeTypes.map((type, index) => (
				<div key={index} className="flex items-center gap-1">
					<span className="text-lg font-bold" style={{ color: type.color }}>
						{type.symbol}
					</span>
					<span className="text-xs text-gray-400">{type.label}</span>
				</div>
			))}
		</div>
	);
};

/**
 * Signal Statistics Component
 * Shows summary statistics for signals
 */
export const SignalStats: React.FC<{ signals: LiveTradingSignal[] }> = ({
	signals,
}) => {
	const stats = {
		total: signals.length,
		entries: signals.filter((s) => s.type === "entry").length,
		exits: signals.filter((s) => s.type === "exit").length,
		long: signals.filter((s) => s.side === "long").length,
		short: signals.filter((s) => s.side === "short").length,
		avgConfidence:
			signals.reduce((acc, s) => acc + (s.confidence || 0.5), 0) /
			Math.max(signals.length, 1),
	};

	if (stats.total === 0) return null;

	return (
		<div className="grid grid-cols-3 gap-2 p-3 bg-gray-800 rounded-lg border border-gray-700">
			<div className="text-center">
				<div className="text-lg font-bold text-blue-400">{stats.total}</div>
				<div className="text-xs text-gray-400">Total Signals</div>
			</div>
			<div className="text-center">
				<div className="text-lg font-bold text-green-400">{stats.entries}</div>
				<div className="text-xs text-gray-400">Entries</div>
			</div>
			<div className="text-center">
				<div className="text-lg font-bold text-orange-400">{stats.exits}</div>
				<div className="text-xs text-gray-400">Exits</div>
			</div>
			<div className="text-center">
				<div className="text-lg font-bold text-emerald-400">{stats.long}</div>
				<div className="text-xs text-gray-400">Long</div>
			</div>
			<div className="text-center">
				<div className="text-lg font-bold text-red-400">{stats.short}</div>
				<div className="text-xs text-gray-400">Short</div>
			</div>
			<div className="text-center">
				<div className="text-lg font-bold text-purple-400">
					{(stats.avgConfidence * 100).toFixed(1)}%
				</div>
				<div className="text-xs text-gray-400">Avg Confidence</div>
			</div>
		</div>
	);
};

export default useSignalOverlay;
