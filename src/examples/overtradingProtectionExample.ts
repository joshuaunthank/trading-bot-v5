/**
 * Example integration of Enhanced Strategy Runner with existing WebSocket system
 */

import {
	EnhancedStrategyRunner,
	EnhancedStrategyConfig,
} from "../lib/trading/EnhancedStrategyRunner";

// Example configuration
const strategyConfig: EnhancedStrategyConfig = {
	strategyId: "conservative_ema_rsi_v2",
	overtradingProtection: {
		enabled: true,
		signalCooldownMinutes: 30,
		maxTradesPerHour: 2,
		maxTradesPerDay: 8,
		minTimeBetweenEntries: 900, // 15 minutes
		minTimeBetweenExits: 300, // 5 minutes
		signalStrengthThreshold: 0.65,
		volumeSpikeDetection: {
			enabled: true,
			minVolumeMultiplier: 1.2,
		},
	},
	signalFiltering: {
		enableTrendConfirmation: true,
		requireVolumeConfirmation: true,
		minimumIndicatorAgreement: 0.6, // 60% of indicators must agree
	},
};

// Create enhanced strategy runner
const strategyRunner = new EnhancedStrategyRunner(strategyConfig);

// Example: Process incoming strategy signals
export function processIncomingSignal(rawSignal: any) {
	const strategySignal = {
		id: `signal_${Date.now()}`,
		timestamp: Date.now(),
		side: rawSignal.side,
		type: rawSignal.type,
		confidence: rawSignal.confidence || 0.7,
		price: rawSignal.price,
		volume: rawSignal.volume,
		indicators: rawSignal.indicators || {},
		metadata: rawSignal.metadata,
	};

	// Process through enhanced runner (includes overtrading protection)
	const filteredSignal = strategyRunner.processStrategySignal(strategySignal);

	if (filteredSignal) {
		console.log("✅ Signal approved for execution:", filteredSignal);
		// Here you would execute the actual trade
		executeTradeSignal(filteredSignal);
	} else {
		console.log("🚫 Signal rejected by overtrading protection");
	}

	// Log statistics for monitoring
	const stats = strategyRunner.getStatistics();
	console.log("📊 Trading Statistics:", stats);
}

function executeTradeSignal(signal: any) {
	// Your existing trade execution logic here
	console.log(`Executing ${signal.side} ${signal.type} at ${signal.price}`);
}

// Example: Monitor overtrading protection effectiveness
export function getOvertradingStats() {
	return strategyRunner.getStatistics();
}

// Example: Adjust protection settings dynamically
export function updateProtectionSettings(newSettings: any) {
	strategyRunner.updateConfig({
		overtradingProtection: {
			...strategyConfig.overtradingProtection,
			...newSettings,
		},
	});
}
