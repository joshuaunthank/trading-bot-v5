import React from "react";

interface ConnectionStatusProps {
	status: string;
	type: string;
	onReconnect?: () => void;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
	status,
	type,
	onReconnect,
}) => {
	const getStatusColor = (status: string) => {
		switch (status) {
			case "connected":
			case "open":
				return "text-green-400";
			case "connecting":
				return "text-yellow-400";
			case "disconnected":
			case "closed":
			case "closing":
				return "text-red-400";
			default:
				return "text-gray-400";
		}
	};

	const getStatusText = (status: string) => {
		switch (status) {
			case "connected":
			case "open":
				return "Connected";
			case "connecting":
				return "Connecting...";
			case "disconnected":
			case "closed":
			case "closing":
				return "Disconnected";
			default:
				return "Unknown";
		}
	};

	return (
		<div className="flex items-center space-x-2">
			<div
				className={`w-2 h-2 rounded-full ${getStatusColor(status).replace(
					"text-",
					"bg-"
				)}`}
			/>
			<span className={`text-sm ${getStatusColor(status)}`}>
				{type}: {getStatusText(status)}
			</span>
			{onReconnect && (status === "disconnected" || status === "closed") && (
				<button
					onClick={onReconnect}
					className="text-xs text-blue-400 hover:text-blue-300 underline"
				>
					Reconnect
				</button>
			)}
		</div>
	);
};

export default ConnectionStatus;
