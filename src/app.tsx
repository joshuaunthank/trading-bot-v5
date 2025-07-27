import Dashboard from "./pages/Dashboard";
import { StrategyProvider } from "./context/StrategyContext";
import { WebSocketProvider } from "./context/WebSocketContext";

export default function App() {
	return (
		<StrategyProvider>
			<WebSocketProvider>
				<Dashboard />
			</WebSocketProvider>
		</StrategyProvider>
	);
}
