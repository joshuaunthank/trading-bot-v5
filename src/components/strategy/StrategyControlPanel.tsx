import React, { useState, useEffect, useCallback } from "react";

interface StrategyControlProps {
	strategyId: string;
	strategyName: string;
	currentStatus: "idle" | "running" | "paused" | "stopped" | "error";
	onStatusChange?: (newStatus: string) => void;
	disabled?: boolean;
}

interface StrategyControlResponse {
	success: boolean;
	strategy_id: string;
	status: string;
	message: string;
	error?: string;
}

export const StrategyControlPanel: React.FC<StrategyControlProps> = ({
	strategyId,
	strategyName,
	currentStatus,
	onStatusChange,
	disabled = false,
}) => {
	const [status, setStatus] = useState(currentStatus);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [lastAction, setLastAction] = useState<string | null>(null);

	// Update status when prop changes
	useEffect(() => {
		setStatus(currentStatus);
	}, [currentStatus]);

	// Generic API call handler
	const executeStrategyAction = useCallback(
		async (action: "start" | "stop" | "pause" | "resume") => {
			try {
				setLoading(true);
				setError(null);
				setLastAction(action);

				const response = await fetch(
					`/api/v1/strategies/${strategyId}/${action}`,
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
						},
					}
				);

				if (!response.ok) {
					throw new Error(`Failed to ${action} strategy`);
				}

				const result: StrategyControlResponse = await response.json();

				if (result.success) {
					setStatus(result.status as any);
					onStatusChange?.(result.status);
					console.log(
						`[Strategy Control] ${action} successful:`,
						result.message
					);
				} else {
					throw new Error(result.error || `Failed to ${action} strategy`);
				}
			} catch (err) {
				const errorMessage =
					err instanceof Error ? err.message : `Failed to ${action} strategy`;
				setError(errorMessage);
				console.error(`[Strategy Control] ${action} failed:`, err);
			} finally {
				setLoading(false);
				setLastAction(null);
			}
		},
		[strategyId, onStatusChange]
	);

	// Action handlers
	const handleStart = () => executeStrategyAction("start");
	const handleStop = () => executeStrategyAction("stop");
	const handlePause = () => executeStrategyAction("pause");
	const handleResume = () => executeStrategyAction("resume");

	// Status indicator
	const getStatusColor = () => {
		switch (status) {
			case "running":
				return "bg-green-500";
			case "paused":
				return "bg-yellow-500";
			case "stopped":
				return "bg-gray-500";
			case "error":
				return "bg-red-500";
			default:
				return "bg-gray-400";
		}
	};

	const getStatusText = () => {
		if (loading && lastAction) {
			return `${lastAction.charAt(0).toUpperCase()}${lastAction.slice(
				1
			)}ing...`;
		}
		return status.charAt(0).toUpperCase() + status.slice(1);
	};

	// Button configurations
	const getAvailableActions = () => {
		switch (status) {
			case "idle":
			case "stopped":
				return [
					{
						action: "start",
						label: "Start",
						onClick: handleStart,
						variant: "primary",
					},
				];
			case "running":
				return [
					{
						action: "pause",
						label: "Pause",
						onClick: handlePause,
						variant: "secondary",
					},
					{
						action: "stop",
						label: "Stop",
						onClick: handleStop,
						variant: "danger",
					},
				];
			case "paused":
				return [
					{
						action: "resume",
						label: "Resume",
						onClick: handleResume,
						variant: "primary",
					},
					{
						action: "stop",
						label: "Stop",
						onClick: handleStop,
						variant: "danger",
					},
				];
			default:
				return [];
		}
	};

	const getButtonClasses = (variant: string) => {
		const base =
			"px-3 py-1 rounded-md font-medium text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";

		switch (variant) {
			case "primary":
				return `${base} bg-green-600 hover:bg-green-700 text-white`;
			case "secondary":
				return `${base} bg-yellow-600 hover:bg-yellow-700 text-white`;
			case "danger":
				return `${base} bg-red-600 hover:bg-red-700 text-white`;
			default:
				return `${base} bg-gray-600 hover:bg-gray-700 text-white`;
		}
	};

	return (
		<div className="flex items-center space-x-3 p-3 bg-gray-800 rounded-lg border border-gray-700">
			{/* Strategy Info */}
			<div className="flex-1 min-w-0">
				<div className="font-medium text-white truncate">{strategyName}</div>
				<div className="flex items-center space-x-2 mt-1">
					<div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
					<span className="text-sm text-gray-300">{getStatusText()}</span>
				</div>
			</div>

			{/* Action Buttons */}
			<div className="flex space-x-2">
				{getAvailableActions().map(({ action, label, onClick, variant }) => (
					<button
						key={action}
						onClick={onClick}
						disabled={disabled || loading}
						className={getButtonClasses(variant)}
						title={`${label} ${strategyName}`}
					>
						{loading && lastAction === action ? (
							<div className="flex items-center space-x-1">
								<div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
								<span>{label}ing...</span>
							</div>
						) : (
							label
						)}
					</button>
				))}
			</div>

			{/* Error Display */}
			{error && (
				<div className="flex-shrink-0">
					<div className="text-red-400 text-xs bg-red-900/30 px-2 py-1 rounded border border-red-500/30">
						{error}
					</div>
				</div>
			)}
		</div>
	);
};

export default StrategyControlPanel;
