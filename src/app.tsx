import Dashboard from "./pages/Dashboard";
import { StrategyProvider } from "./context/StrategyContext";

export default function App() {
	return (
		<StrategyProvider>
			<Dashboard />
		</StrategyProvider>
	);
}
