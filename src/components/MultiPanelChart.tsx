import React, { useState, useRef } from "react";
import ChartPanel, { ChartPanelHandle } from "./ChartPanel";
import Loader from "./Loader";
import { CalculatedIndicator, OHLCVData } from "../types/indicators";
import { categorizeIndicators, getPanelHeight } from "./ChartPanelUtils";

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

	// Refs for chart panels
	const priceChartRef = useRef<ChartPanelHandle>(null);
	const oscillatorChartRef = useRef<ChartPanelHandle>(null);
	const volumeChartRef = useRef<ChartPanelHandle>(null);

	// Debounce for zoom changes to prevent infinite loops
	const zoomTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const isUpdatingRef = useRef<boolean>(false);

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

	// Handle zoom state changes from any panel with debouncing to prevent loops
	const handleZoomChange = (newZoomState: any) => {
		// Prevent multiple rapid updates
		if (isUpdatingRef.current) return;

		// Clear any existing timeout
		if (zoomTimeoutRef.current) {
			clearTimeout(zoomTimeoutRef.current);
		}

		// Set a flag that we're updating to prevent loops
		isUpdatingRef.current = true;

		// Short delay to debounce zoom changes
		zoomTimeoutRef.current = setTimeout(() => {
			setSharedZoomState(newZoomState);
			setIsZoomed(
				newZoomState &&
					(newZoomState.min !== undefined || newZoomState.max !== undefined)
			);
			isUpdatingRef.current = false;
		}, 50); // 50ms debounce
	};

	// Reset zoom across all panels by calling Chart.js resetZoom method directly
	const resetZoom = () => {
		try {
			// Update state
			setSharedZoomState(null);
			setIsZoomed(false);

			// Call resetZoom on each chart instance
			priceChartRef.current?.resetZoom();
			oscillatorChartRef.current?.resetZoom();
			volumeChartRef.current?.resetZoom();

			console.log("Reset zoom successful");
		} catch (error) {
			console.error("Error in reset zoom operation:", error);

			// Attempt to force reset by updating state only
			try {
				setSharedZoomState(null);
				setIsZoomed(false);

				// Add a small delay to ensure state is updated before trying again
				setTimeout(() => {
					try {
						priceChartRef.current?.resetZoom();
						oscillatorChartRef.current?.resetZoom();
						volumeChartRef.current?.resetZoom();
					} catch (retryError) {
						console.error("Retry reset failed:", retryError);
					}
				}, 100);
			} catch (fallbackError) {
				console.error("Fallback reset failed:", fallbackError);
			}
		}
	};

	return (
		<div className="bg-gray-800 rounded-lg shadow-lg p-4">
			{/* Chart Header */}
			<div className="flex justify-between items-center mb-4">
				<div className="flex items-center space-x-2">
					<h3 className="text-lg font-semibold text-white">
						{symbol} - {timeframe}
					</h3>
					{loading && <Loader size="small" />}
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
					ref={priceChartRef}
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
						ref={oscillatorChartRef}
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
						ref={volumeChartRef}
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
