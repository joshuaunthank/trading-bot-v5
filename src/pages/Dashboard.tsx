/**
 * Simplified, Clean Dashboard Component
 * Broken down into manageable sections with proper separation of concerns
 */

import React from "react";
import { useDashboard } from "../hooks/useDashboard";
import ConnectionStatus from "../components/ConnectionStatus";
import TabNavigation from "../components/ui/TabNavigation";
import StrategySelect from "../components/StrategySelect";
import ChartTab from "../components/tabs/ChartTab";
import TestingTab from "../components/tabs/TestingTab";
import ConfigModal from "../components/ConfigModal";
import StrategyEditor from "../components/strategy/StrategyEditor";
import { getSymbolLabel, getTimeframeLabel } from "../utils/config";

const Dashboard: React.FC = () => {
	const {
		// UI State
		activeTab,
		setActiveTab,
		loading,
		error,
		setError,

		// Data
		symbol,
		timeframe,
		selectedStrategyId,
		availableStrategies,
		detailedStrategy,
		ohlcvData,
		indicators,
		connectionStatus,
		reconnectOhlcvWs,

		// Modal states
		isConfigModalOpen,
		setIsConfigModalOpen,
		isStrategyEditorOpen,
		editingStrategyId,
		editingStrategy,

		// Event handlers
		handleStrategySelect,
		handleEditStrategy,
		handleDeleteStrategy,
		handleSaveStrategy,
		handleCloseStrategyEditor,
		handleSaveConfig,
		onCreateStrategy,
	} = useDashboard();

	const tabs = [
		{ id: "chart" as const, label: "Chart & Indicators" },
		{ id: "testing" as const, label: "Strategy Testing" },
	];

	return (
		<div className="min-h-screen bg-gray-900 text-white">
			{/* Header */}
			<header className="bg-gray-800 border-b border-gray-700 p-4">
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
					<div>
						<h1 className="text-2xl font-bold text-white">
							Trading Bot Dashboard
						</h1>
						<p className="text-gray-400 text-sm">
							{getSymbolLabel(symbol)} • {getTimeframeLabel(timeframe)}
						</p>
					</div>

					<div className="flex flex-col sm:flex-row gap-2">
						<ConnectionStatus
							status={connectionStatus}
							type="Market Data"
							onReconnect={reconnectOhlcvWs}
						/>
						<button
							onClick={() => setIsConfigModalOpen(true)}
							className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 rounded transition-colors"
						>
							Settings
						</button>
					</div>
				</div>
			</header>

			{/* Error Banner */}
			{error && (
				<div className="bg-red-900/50 border border-red-700 p-3 mx-4 mt-4 rounded">
					<div className="flex justify-between items-center">
						<span className="text-red-200">{error}</span>
						<button
							onClick={() => setError(null)}
							className="text-red-400 hover:text-red-300"
						>
							×
						</button>
					</div>
				</div>
			)}

			{/* Main Content */}
			<main className="p-4">
				{/* Strategy Selection - Global for all tabs */}
				<div className="mb-6">
					<StrategySelect
						strategies={availableStrategies || []}
						selectedStrategyId={selectedStrategyId}
						onStrategySelect={handleStrategySelect}
						onCreateStrategy={onCreateStrategy}
						onEditStrategy={handleEditStrategy}
						onDeleteStrategy={handleDeleteStrategy}
					/>
				</div>

				{/* Tab Navigation */}
				<TabNavigation
					tabs={tabs}
					activeTab={activeTab}
					onTabChange={(tabId) => setActiveTab(tabId as any)}
					className="mb-6"
				/>

				{/* Tab Content */}
				{activeTab === "chart" && (
					<ChartTab
						ohlcvData={ohlcvData}
						indicators={indicators}
						symbol={getSymbolLabel(symbol)}
						timeframe={getTimeframeLabel(timeframe)}
						loading={loading}
						error={error}
					/>
				)}

				{activeTab === "testing" && <TestingTab />}
			</main>

			{/* Modals */}
			<ConfigModal
				isOpen={isConfigModalOpen}
				onClose={() => setIsConfigModalOpen(false)}
				onSave={handleSaveConfig}
				strategyId=""
				title="Trading Configuration"
			/>

			<StrategyEditor
				isOpen={isStrategyEditorOpen}
				onClose={handleCloseStrategyEditor}
				onSave={handleSaveStrategy}
				strategyId={editingStrategyId}
				existingStrategy={editingStrategy}
			/>
		</div>
	);
};

export default Dashboard;
