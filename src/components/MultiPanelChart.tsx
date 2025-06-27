import React, { useState } from "react";
import ChartPanel from "./ChartPanel";
import ChartSpinner from "./ChartSpinner";
import { CalculatedIndicator } from "../hooks/useLocalIndicators";
import { categorizeIndicators, getPanelHeight } from "./ChartPanelUtils";

interface OHLCVData {
	timestamp: number;
	open: number;
	high: number;
	close: number;
	low: number;
	volume: number;
}

interface MultiPanelChartProps {
	data: OHLCVData[];
	symbol: string;
	timeframe: string;
	loading?: boolean;
	indicators?: CalculatedIndicator[];
	onTimeframeChange?: (timeframe: string) => void;
}

// Utility to get responsive chart height
function getResponsiveChartHeight() {
	if (typeof window !== "undefined") {
		if (window.innerWidth >= 1024) return 520;
		if (window.innerWidth >= 768) return 400;
		return 300;
	}
	return 350;
}

const MultiPanelChart: React.FC<MultiPanelChartProps> = ({
	data,
	symbol,
	timeframe,
	loading = false,
	indicators = [],
	onTimeframeChange,
}) => {
	const [sharedZoomState, setSharedZoomState] = useState<any>(null);
	const [isZoomed, setIsZoomed] = useState(false);
	const timeframes = ["1m", "5m", "15m", "1h", "4h", "1d"];

	// Responsive chart height for price panel
	const getResponsiveChartHeight = () => {
		if (typeof window !== "undefined") {
			if (window.innerWidth >= 1024) return 520;
			if (window.innerWidth >= 768) return 400;
			return 300;
		}
		return 350;
	};
	const [chartHeight, setChartHeight] = useState(getResponsiveChartHeight());
	React.useEffect(() => {
		function handleResize() {
			setChartHeight(getResponsiveChartHeight());
		}
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	// Categorize indicators by type
	const categorizedIndicators = categorizeIndicators(indicators);
	const hasOscillators = categorizedIndicators.oscillator.length > 0;
	const hasVolume = categorizedIndicators.volume.length > 0;

	// Handle zoom state changes from any panel
	const handleZoomChange = (newZoomState: any) => {
		setSharedZoomState(newZoomState);
		setIsZoomed(
			newZoomState &&
				(newZoomState.min !== undefined || newZoomState.max !== undefined)
		);
	};

	// Reset zoom across all panels
	const resetZoom = () => {
		setSharedZoomState(null);
		setIsZoomed(false);
		// The panels will handle the actual chart reset in their useEffect
	};

	return (
		<div className="bg-gray-800 rounded-lg shadow-lg p-4">
			{/* Chart Header */}
			<div className="flex justify-between items-center mb-4">
				<div className="flex items-center space-x-2">
					<h3 className="text-lg font-semibold text-white">
						{symbol} - {timeframe}
					</h3>
					{loading && <ChartSpinner />}
				</div>
				<div className="flex space-x-4">
					{/* Zoom Reset Button */}
					<button
						onClick={resetZoom}
						className={`text-sm px-3 py-1 rounded-md transition-colors ${
							isZoomed
								? "bg-orange-600 hover:bg-orange-700 text-white"
								: "bg-gray-600 hover:bg-gray-700 text-gray-300"
						}`}
						disabled={loading}
						title={isZoomed ? "Reset zoom and pan" : "No zoom applied"}
					>
						{isZoomed ? "🔍 Reset Zoom" : "Reset Zoom"}
					</button>

					{/* Zoom status indicator */}
					{isZoomed && (
						<span className="text-xs text-orange-300 self-center">
							📍 Zoomed
						</span>
					)}

					{/* Timeframe selector */}
					{onTimeframeChange && (
						<select
							className="bg-gray-700 border border-gray-600 text-white rounded-md px-2 py-1"
							value={timeframe}
							onChange={(e) => onTimeframeChange(e.target.value)}
						>
							{timeframes.map((tf) => (
								<option key={tf} value={tf}>
									{tf}
								</option>
							))}
						</select>
					)}
				</div>
			</div>

			{/* Chart Panels */}
			<div className="space-y-2">
				{/* Price Panel - Always visible, now with explicit heightPx prop */}
				<ChartPanel
					data={data}
					symbol={symbol}
					timeframe={timeframe}
					loading={loading}
					indicators={categorizedIndicators.price}
					panelType="price"
					showPrice={true}
					zoomState={sharedZoomState}
					onZoomChange={handleZoomChange}
					heightPx={chartHeight}
				/>

				{/* Oscillator Panel - Only if oscillators exist */}
				{hasOscillators && (
					<ChartPanel
						data={data}
						symbol={symbol}
						timeframe={timeframe}
						loading={loading}
						indicators={categorizedIndicators.oscillator}
						panelType="oscillator"
						showPrice={false}
						zoomState={sharedZoomState}
						onZoomChange={handleZoomChange}
					/>
				)}

				{/* Volume Panel - Only if volume indicators exist */}
				{hasVolume && (
					<ChartPanel
						data={data}
						symbol={symbol}
						timeframe={timeframe}
						loading={loading}
						indicators={categorizedIndicators.volume}
						panelType="volume"
						showPrice={false}
						zoomState={sharedZoomState}
						onZoomChange={handleZoomChange}
					/>
				)}

				{/* Always show volume chart if no volume indicators but we want to see volume */}
				{!hasVolume && (
					<ChartPanel
						data={data}
						symbol={symbol}
						timeframe={timeframe}
						loading={loading}
						indicators={[]}
						panelType="volume"
						showPrice={false}
						zoomState={sharedZoomState}
						onZoomChange={handleZoomChange}
					/>
				)}
			</div>

			{/* Panel Legend */}
			<div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-400">
				<div className="flex items-center space-x-1">
					<div className="w-3 h-3 bg-gray-700 rounded"></div>
					<span>Price: {categorizedIndicators.price.length} indicators</span>
				</div>
				{hasOscillators && (
					<div className="flex items-center space-x-1">
						<div className="w-3 h-3 bg-blue-600 rounded"></div>
						<span>
							Oscillators: {categorizedIndicators.oscillator.length} indicators
						</span>
					</div>
				)}
				{hasVolume && (
					<div className="flex items-center space-x-1">
						<div className="w-3 h-3 bg-yellow-600 rounded"></div>
						<span>
							Volume: {categorizedIndicators.volume.length} indicators
						</span>
					</div>
				)}
			</div>
		</div>
	);
};

export default React.memo(MultiPanelChart, (prevProps, nextProps) => {
	// Custom comparison function for optimal performance
	return (
		prevProps.symbol === nextProps.symbol &&
		prevProps.timeframe === nextProps.timeframe &&
		prevProps.loading === nextProps.loading &&
		prevProps.data === nextProps.data && // Reference equality check
		JSON.stringify(prevProps.indicators) ===
			JSON.stringify(nextProps.indicators)
	);
});
