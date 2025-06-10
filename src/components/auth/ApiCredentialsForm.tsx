import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";

interface ApiCredentialsFormProps {
	onSuccess?: () => void;
}

const ApiCredentialsForm: React.FC<ApiCredentialsFormProps> = ({
	onSuccess,
}) => {
	const { updateApiCredentials, isLoading, user } = useAuth();
	const [apiKey, setApiKey] = useState(user?.apiKey || "");
	const [apiSecret, setApiSecret] = useState(user?.apiSecret || "");
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setSuccess(null);

		// Validation
		if (!apiKey || !apiSecret) {
			setError("Both API key and secret are required");
			return;
		}

		const result = await updateApiCredentials(apiKey, apiSecret);
		if (result) {
			setSuccess("API credentials updated successfully");
			if (onSuccess) onSuccess();
		} else {
			setError("Failed to update API credentials");
		}
	};

	return (
		<div className="bg-gray-800 p-6 rounded-lg shadow-md w-full">
			<h2 className="text-xl font-bold mb-4">Exchange API Credentials</h2>

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

			<form onSubmit={handleSubmit}>
				<div className="mb-4">
					<label htmlFor="apiKey" className="block text-sm font-medium mb-1">
						API Key
					</label>
					<input
						type="text"
						id="apiKey"
						value={apiKey}
						onChange={(e) => setApiKey(e.target.value)}
						className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
						disabled={isLoading}
						placeholder="Enter your Binance API key"
					/>
				</div>

				<div className="mb-4">
					<label htmlFor="apiSecret" className="block text-sm font-medium mb-1">
						API Secret
					</label>
					<input
						type="password"
						id="apiSecret"
						value={apiSecret}
						onChange={(e) => setApiSecret(e.target.value)}
						className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
						disabled={isLoading}
						placeholder="Enter your Binance API secret"
					/>
					<p className="text-xs text-gray-400 mt-1">
						Your API secret is stored securely and only used for trading
						operations
					</p>
				</div>

				<div className="flex justify-end">
					<button
						type="submit"
						className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
						disabled={isLoading}
					>
						{isLoading ? "Saving..." : "Save Credentials"}
					</button>
				</div>
			</form>
		</div>
	);
};

export default ApiCredentialsForm;
