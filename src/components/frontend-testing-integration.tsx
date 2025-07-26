/**
 * Frontend Testing Integration - Add to App.tsx
 *
 * This shows how to integrate the Strategy Engine Test Panel into your main app
 */

import React from "react";
import StrategyEngineTestPanel from "./StrategyEngineTestPanel";

// Example: Add this to your main App.tsx
const AppWithStrategyTesting = () => {
	return (
		<div className="min-h-screen bg-gray-100">
			<div className="container mx-auto px-4 py-8">
				<h1 className="text-3xl font-bold text-gray-900 mb-8">
					Trading Bot Dashboard
				</h1>

				{/* Your existing components */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
					{/* Existing chart component */}
					{/* <ChartPanel /> */}

					{/* Existing table component */}
					{/* <TableView /> */}
				</div>

				{/* NEW: Strategy Engine Test Panel */}
				<StrategyEngineTestPanel className="mb-8" />

				{/* Your existing components */}
				<div className="grid grid-cols-1 gap-8">
					{/* Existing summary component */}
					{/* <SummaryView /> */}
				</div>
			</div>
		</div>
	);
};

export default AppWithStrategyTesting;

// Alternative: Create a separate testing page
const StrategyTestingPage = () => {
	return (
		<div className="min-h-screen bg-gray-100">
			<div className="container mx-auto px-4 py-8">
				<div className="mb-8">
					<h1 className="text-3xl font-bold text-gray-900 mb-2">
						Strategy Engine Testing
					</h1>
					<p className="text-gray-600">
						Test and monitor your trading strategies in real-time
					</p>
				</div>

				<StrategyEngineTestPanel />
			</div>
		</div>
	);
};

export { StrategyTestingPage };
