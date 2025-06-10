import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import ApiCredentialsForm from "../auth/ApiCredentialsForm";
import ChartSpinner from "../ChartSpinner";

interface Position {
	symbol: string;
	side: "long" | "short" | "none";
	amount: number;
	entryPrice: number;
	markPrice: number;
	pnl: number;
	pnlPercentage: number;
	liquidationPrice?: number;
	leverage?: number;
}

interface Balance {
	total: Record<string, number>;
	free: Record<string, number>;
	used: Record<string, number>;
}

interface OrderFormData {
	symbol: string;
	type: "market" | "limit";
	side: "buy" | "sell";
	amount: number;
	price?: number;
}

const TradingPanel: React.FC<{ symbol: string }> = ({ symbol }) => {
	const { isAuthenticated, user } = useAuth();
	const [position, setPosition] = useState<Position | null>(null);
	const [balance, setBalance] = useState<Balance | null>(null);
	const [leverage, setLeverage] = useState<number>(3);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [orderForm, setOrderForm] = useState<OrderFormData>({
		symbol,
		type: "market",
		side: "buy",
		amount: 0.01,
		price: undefined,
	});

	// Fetch position and balance data
	const fetchTradingData = async () => {
		if (!isAuthenticated) return;

		setIsLoading(true);
		setError(null);

		try {
			// Initialize trading service first
			await fetch("/api/v1/trading/init", {
				headers: {
					Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
				},
			});

			// Fetch position
			const posRes = await fetch(`/api/v1/trading/positions/${symbol}`, {
				headers: {
					Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
				},
			});

			if (posRes.ok) {
				const posData = await posRes.json();
				setPosition(posData.data);
				if (posData.data && posData.data.leverage) {
					setLeverage(posData.data.leverage);
				}
			}

			// Fetch balance
			const balRes = await fetch("/api/v1/trading/balance", {
				headers: {
					Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
				},
			});

			if (balRes.ok) {
				const balData = await balRes.json();
				setBalance(balData.data);
			}
		} catch (err) {
			setError(
				"Failed to fetch trading data. Please check your API credentials."
			);
			console.error("Error fetching trading data:", err);
		} finally {
			setIsLoading(false);
		}
	};

	// Handle order form changes
	const handleOrderFormChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
	) => {
		const { name, value } = e.target;

		setOrderForm((prev) => ({
			...prev,
			[name]: name === "amount" || name === "price" ? parseFloat(value) : value,
		}));
	};

	// Place an order
	const placeOrder = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!isAuthenticated) return;

		setIsLoading(true);
		setError(null);
		setSuccess(null);

		try {
			const response = await fetch("/api/v1/trading/order", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
				},
				body: JSON.stringify(orderForm),
			});

			const data = await response.json();

			if (response.ok && data.success) {
				setSuccess(
					`Order placed successfully: ${orderForm.side} ${orderForm.amount} ${orderForm.symbol}`
				);
				// Refresh data
				fetchTradingData();
			} else {
				setError(data.message || "Failed to place order");
			}
		} catch (err) {
			setError("Error placing order");
			console.error("Error placing order:", err);
		} finally {
			setIsLoading(false);
		}
	};

	// Close position
	const closePosition = async () => {
		if (!isAuthenticated || !position || position.side === "none") return;

		setIsLoading(true);
		setError(null);
		setSuccess(null);

		try {
			const response = await fetch("/api/v1/trading/close-position", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
				},
				body: JSON.stringify({
					symbol,
					positionSide: position.side,
				}),
			});

			const data = await response.json();

			if (response.ok && data.success) {
				setSuccess(`Position closed successfully`);
				// Refresh data
				fetchTradingData();
			} else {
				setError(data.message || "Failed to close position");
			}
		} catch (err) {
			setError("Error closing position");
			console.error("Error closing position:", err);
		} finally {
			setIsLoading(false);
		}
	};

	// Set leverage
	const updateLeverage = async () => {
		if (!isAuthenticated) return;

		setIsLoading(true);
		setError(null);
		setSuccess(null);

		try {
			const response = await fetch("/api/v1/trading/leverage", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
				},
				body: JSON.stringify({
					symbol,
					leverage,
				}),
			});

			const data = await response.json();

			if (response.ok && data.success) {
				setSuccess(`Leverage set to ${leverage}x`);
			} else {
				setError(data.message || "Failed to set leverage");
			}
		} catch (err) {
			setError("Error setting leverage");
			console.error("Error setting leverage:", err);
		} finally {
			setIsLoading(false);
		}
	};

	// Fetch data on mount and when symbol changes
	useEffect(() => {
		if (isAuthenticated) {
			fetchTradingData();

			// Update symbol in order form
			setOrderForm((prev) => ({
				...prev,
				symbol,
			}));
		}
	}, [isAuthenticated, symbol]);

	if (!isAuthenticated) {
		return (
			<div className="bg-gray-800 rounded-lg shadow-lg p-4">
				<h2 className="text-xl font-semibold mb-4">Trading</h2>
				<p className="text-gray-400 mb-4">
					Please log in to access trading features
				</p>
			</div>
		);
	}

	if (!user?.apiKey || !user?.apiSecret) {
		return (
			<div className="bg-gray-800 rounded-lg shadow-lg p-4">
				<h2 className="text-xl font-semibold mb-4">Trading</h2>
				<p className="text-gray-400 mb-4">
					Please set up your API credentials to start trading
				</p>
				<ApiCredentialsForm onSuccess={fetchTradingData} />
			</div>
		);
	}

	return (
		<div className="bg-gray-800 rounded-lg shadow-lg p-4">
			<h2 className="text-xl font-semibold mb-4">Trading Panel</h2>

			{error && (
				<div className="bg-red-900/50 border border-red-500 text-red-200 p-3 rounded-md mb-4">
					{error}
				</div>
			)}

			{success && (
				<div className="bg-green-900/50 border border-green-500 text-green-200 p-3 rounded-md mb-4">
					{success}
				</div>
			)}

			{isLoading && (
				<div className="flex items-center justify-center p-4">
					<ChartSpinner size="medium" />
					<span className="ml-2">Loading trading data...</span>
				</div>
			)}

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				{/* Position Information */}
				<div className="bg-gray-700 rounded-md p-4">
					<h3 className="text-lg font-medium mb-3">Position</h3>

					{position ? (
						position.side === "none" ? (
							<p className="text-gray-400">No open position</p>
						) : (
							<div>
								<div className="grid grid-cols-2 gap-2 mb-4">
									<div>
										<p className="text-sm text-gray-400">Side</p>
										<p
											className={`font-medium ${
												position.side === "long"
													? "text-green-400"
													: "text-red-400"
											}`}
										>
											{position.side.toUpperCase()}
										</p>
									</div>
									<div>
										<p className="text-sm text-gray-400">Size</p>
										<p className="font-medium">
											{position.amount} {symbol.split("/")[0]}
										</p>
									</div>
									<div>
										<p className="text-sm text-gray-400">Entry Price</p>
										<p className="font-medium">
											${position.entryPrice.toFixed(2)}
										</p>
									</div>
									<div>
										<p className="text-sm text-gray-400">Mark Price</p>
										<p className="font-medium">
											${position.markPrice.toFixed(2)}
										</p>
									</div>
									<div>
										<p className="text-sm text-gray-400">PnL</p>
										<p
											className={`font-medium ${
												position.pnl >= 0 ? "text-green-400" : "text-red-400"
											}`}
										>
											${position.pnl.toFixed(2)} (
											{position.pnlPercentage.toFixed(2)}%)
										</p>
									</div>
									<div>
										<p className="text-sm text-gray-400">Liquidation</p>
										<p className="font-medium">
											${position.liquidationPrice?.toFixed(2) || "N/A"}
										</p>
									</div>
								</div>

								<button
									className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md transition duration-200"
									onClick={closePosition}
									disabled={isLoading}
								>
									Close Position
								</button>
							</div>
						)
					) : (
						<p className="text-gray-400">Loading position data...</p>
					)}

					<div className="mt-4">
						<h4 className="text-md font-medium mb-2">Leverage</h4>
						<div className="flex items-center">
							<input
								type="range"
								min="1"
								max="20"
								value={leverage}
								onChange={(e) => setLeverage(parseInt(e.target.value))}
								className="w-full mr-2"
							/>
							<span className="text-sm font-medium">{leverage}x</span>
						</div>
						<button
							className="mt-2 w-full bg-gray-600 hover:bg-gray-500 text-white py-1 px-3 rounded-md text-sm transition duration-200"
							onClick={updateLeverage}
							disabled={isLoading}
						>
							Set Leverage
						</button>
					</div>
				</div>

				{/* Order Form */}
				<div className="bg-gray-700 rounded-md p-4">
					<h3 className="text-lg font-medium mb-3">Place Order</h3>

					<form onSubmit={placeOrder}>
						<div className="mb-3">
							<label className="block text-sm font-medium mb-1">
								Order Type
							</label>
							<select
								name="type"
								value={orderForm.type}
								onChange={handleOrderFormChange}
								className="w-full p-2 bg-gray-800 border border-gray-600 rounded-md"
								disabled={isLoading}
							>
								<option value="market">Market</option>
								<option value="limit">Limit</option>
							</select>
						</div>

						<div className="mb-3">
							<label className="block text-sm font-medium mb-1">Side</label>
							<div className="grid grid-cols-2 gap-2">
								<button
									type="button"
									className={`py-2 px-4 rounded-md transition duration-200 ${
										orderForm.side === "buy"
											? "bg-green-600 text-white"
											: "bg-gray-600 text-gray-200 hover:bg-gray-500"
									}`}
									onClick={() =>
										setOrderForm((prev) => ({ ...prev, side: "buy" }))
									}
									disabled={isLoading}
								>
									Buy/Long
								</button>
								<button
									type="button"
									className={`py-2 px-4 rounded-md transition duration-200 ${
										orderForm.side === "sell"
											? "bg-red-600 text-white"
											: "bg-gray-600 text-gray-200 hover:bg-gray-500"
									}`}
									onClick={() =>
										setOrderForm((prev) => ({ ...prev, side: "sell" }))
									}
									disabled={isLoading}
								>
									Sell/Short
								</button>
							</div>
						</div>

						<div className="mb-3">
							<label className="block text-sm font-medium mb-1">Amount</label>
							<input
								type="number"
								name="amount"
								value={orderForm.amount}
								onChange={handleOrderFormChange}
								className="w-full p-2 bg-gray-800 border border-gray-600 rounded-md"
								step="0.001"
								min="0.001"
								disabled={isLoading}
							/>
						</div>

						{orderForm.type === "limit" && (
							<div className="mb-3">
								<label className="block text-sm font-medium mb-1">Price</label>
								<input
									type="number"
									name="price"
									value={orderForm.price}
									onChange={handleOrderFormChange}
									className="w-full p-2 bg-gray-800 border border-gray-600 rounded-md"
									step="0.01"
									min="0.01"
									disabled={isLoading}
									required={orderForm.type === "limit"}
								/>
							</div>
						)}

						<button
							type="submit"
							className={`w-full py-2 px-4 rounded-md transition duration-200 ${
								orderForm.side === "buy"
									? "bg-green-600 hover:bg-green-700 text-white"
									: "bg-red-600 hover:bg-red-700 text-white"
							}`}
							disabled={isLoading}
						>
							{isLoading
								? "Processing..."
								: `${orderForm.type === "market" ? "Market" : "Limit"} ${
										orderForm.side === "buy" ? "Buy" : "Sell"
								  } ${orderForm.amount} ${symbol.split("/")[0]}`}
						</button>
					</form>
				</div>
			</div>

			{/* Balance Information */}
			<div className="mt-6 bg-gray-700 rounded-md p-4">
				<h3 className="text-lg font-medium mb-3">Account Balance</h3>

				{balance ? (
					<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
						{Object.entries(balance.total)
							.filter(([currency, amount]) => amount > 0)
							.slice(0, 8)
							.map(([currency, amount]) => (
								<div key={currency} className="bg-gray-800 p-3 rounded-md">
									<p className="text-sm text-gray-400">{currency}</p>
									<p className="font-medium">{amount.toFixed(4)}</p>
									<p className="text-xs text-gray-500">
										Free: {balance.free[currency]?.toFixed(4) || 0}
									</p>
								</div>
							))}
					</div>
				) : (
					<p className="text-gray-400">Loading balance data...</p>
				)}
			</div>

			<div className="mt-4 flex justify-end">
				<button
					className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition duration-200"
					onClick={fetchTradingData}
					disabled={isLoading}
				>
					Refresh Data
				</button>
			</div>
		</div>
	);
};

export default TradingPanel;
