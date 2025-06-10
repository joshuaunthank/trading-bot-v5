import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

interface Strategy {
	id: string;
	name: string;
	description: string;
	symbol: string;
	timeframe: string;
	enabled: boolean;
	tags: string[];
}

export default function StrategyLibrary() {
	const [strategies, setStrategies] = useState<Strategy[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const navigate = useNavigate();

	useEffect(() => {
		const fetchStrategies = async () => {
			try {
				const response = await fetch("/api/v1/strategies");

				if (!response.ok) {
					throw new Error(`Failed to fetch strategies: ${response.statusText}`);
				}

				const data = await response.json();
				setStrategies(data);
				setLoading(false);
			} catch (err) {
				setError(
					err instanceof Error ? err.message : "An unknown error occurred"
				);
				setLoading(false);
			}
		};

		fetchStrategies();
	}, []);

	const handleDelete = async (id: string) => {
		if (
			window.confirm(`Are you sure you want to delete the strategy: ${id}?`)
		) {
			try {
				const response = await fetch(`/api/v1/strategies/${id}`, {
					method: "DELETE",
				});

				if (!response.ok) {
					throw new Error(`Failed to delete strategy: ${response.statusText}`);
				}

				// Remove the deleted strategy from state
				setStrategies(strategies.filter((strategy) => strategy.id !== id));
			} catch (err) {
				setError(
					err instanceof Error ? err.message : "Failed to delete strategy"
				);
			}
		}
	};

	const handleEdit = (id: string) => {
		navigate(`/builder/${id}`);
	};

	const handleCreate = () => {
		navigate("/builder");
	};

	if (loading) {
		return (
			<div className="flex justify-center items-center h-64">
				<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
			</div>
		);
	}

	if (error) {
		return (
			<div
				className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
				role="alert"
			>
				<strong className="font-bold">Error!</strong>
				<span className="block sm:inline"> {error}</span>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center">
				<h1 className="text-2xl font-bold">Strategy Library</h1>
				<button
					onClick={handleCreate}
					className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
				>
					Create New Strategy
				</button>
			</div>

			{strategies.length === 0 ? (
				<div className="text-center py-10">
					<p className="text-xl text-gray-500">No strategies found</p>
					<button
						onClick={handleCreate}
						className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
					>
						Create Your First Strategy
					</button>
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{strategies.map((strategy) => (
						<div
							key={strategy.id}
							className="bg-gray-800 rounded-lg shadow-lg overflow-hidden"
						>
							<div className="p-5">
								<h3 className="text-xl font-semibold mb-2">{strategy.name}</h3>
								<p className="text-gray-400 mb-4">{strategy.description}</p>
								<div className="flex flex-wrap gap-2 mb-4">
									<span className="px-2 py-1 bg-blue-900 text-blue-200 text-xs rounded-full">
										{strategy.symbol}
									</span>
									<span className="px-2 py-1 bg-purple-900 text-purple-200 text-xs rounded-full">
										{strategy.timeframe}
									</span>
									{strategy.tags.map((tag) => (
										<span
											key={tag}
											className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded-full"
										>
											{tag}
										</span>
									))}
								</div>
								<div className="flex justify-between items-center">
									<span
										className={`px-2 py-1 text-xs rounded-full ${
											strategy.enabled
												? "bg-green-900 text-green-200"
												: "bg-red-900 text-red-200"
										}`}
									>
										{strategy.enabled ? "Enabled" : "Disabled"}
									</span>
									<div className="space-x-2">
										<button
											onClick={() => handleEdit(strategy.id)}
											className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
										>
											Edit
										</button>
										<button
											onClick={() => handleDelete(strategy.id)}
											className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
										>
											Delete
										</button>
									</div>
								</div>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
