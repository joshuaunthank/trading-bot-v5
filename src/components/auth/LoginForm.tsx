import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";

interface LoginFormProps {
	onSuccess?: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
	const { login, isLoading } = useAuth();
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);

		if (!username || !password) {
			setError("Username and password are required");
			return;
		}

		const success = await login(username, password);
		if (success) {
			if (onSuccess) onSuccess();
		} else {
			setError("Invalid username or password");
		}
	};

	return (
		<div className="bg-gray-800 p-6 rounded-lg shadow-md w-full max-w-md mx-auto">
			<h2 className="text-2xl font-bold mb-6 text-center">Login</h2>

			{error && (
				<div className="bg-red-900/50 border border-red-500 text-red-200 p-3 rounded-md mb-4">
					{error}
				</div>
			)}

			<form onSubmit={handleSubmit}>
				<div className="mb-4">
					<label htmlFor="username" className="block text-sm font-medium mb-1">
						Username
					</label>
					<input
						type="text"
						id="username"
						value={username}
						onChange={(e) => setUsername(e.target.value)}
						className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
						disabled={isLoading}
					/>
				</div>

				<div className="mb-6">
					<label htmlFor="password" className="block text-sm font-medium mb-1">
						Password
					</label>
					<input
						type="password"
						id="password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
						disabled={isLoading}
					/>
				</div>

				<button
					type="submit"
					className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
					disabled={isLoading}
				>
					{isLoading ? "Logging in..." : "Login"}
				</button>
			</form>
		</div>
	);
};

export default LoginForm;
