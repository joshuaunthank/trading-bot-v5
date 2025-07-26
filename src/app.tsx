import Dashboard from "./pages/Dashboard";
import { StrategyProvider } from "./context/StrategyContext";

export default function App() {
	return (
		<StrategyProvider>
			<main className="container mx-auto p-4">
				<Dashboard />
			</main>
		</StrategyProvider>
	);
}
