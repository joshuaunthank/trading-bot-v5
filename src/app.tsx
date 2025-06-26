import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import StrategyManager from "./components/StrategyManager";
import EnhancedDashboard from "./pages/EnhancedDashboard";
import { StrategyProvider } from "./context/StrategyContext";

export default function App() {
	const [darkMode, setDarkMode] = useState(true);

	return (
		<StrategyProvider>
			<Router>
				<div
					className={`min-h-screen ${
						darkMode ? "bg-gray-900 text-white" : "bg-white text-gray-900"
					}`}
				>
					<nav className="bg-gray-800 text-white p-4">
						<div className="container mx-auto flex justify-between items-center">
							<div className="font-bold text-xl">Trading Bot Dashboard</div>
							<div className="flex space-x-4">
								<Link to="/" className="hover:text-blue-400">
									Dashboard
								</Link>
								<Link to="/manager" className="hover:text-blue-400">
									Strategy Manager
								</Link>
								<button
									onClick={() => setDarkMode(!darkMode)}
									className="ml-4 p-2 rounded bg-gray-700 hover:bg-gray-600"
								>
									{darkMode ? "☀️" : "🌙"}
								</button>
							</div>
						</div>
					</nav>

					<main className="container mx-auto p-4">
						<Routes>
							<Route path="/" element={<EnhancedDashboard />} />
							<Route path="/manager" element={<StrategyManager />} />
						</Routes>
					</main>
				</div>
			</Router>
		</StrategyProvider>
	);
}
