import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";

interface RegisterFormProps {
	onSuccess?: () => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess }) => {
	const { register, isLoading } = useAuth();
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [error, setError] = useState<string | null>(null);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);

		// Validation
		if (!username || !password || !confirmPassword) {
			setError("All fields are required");
			return;
		}

		if (password.length < 8) {
			setError("Password must be at least 8 characters long");
			return;
		}

		if (password !== confirmPassword) {
			setError("Passwords do not match");
			return;
		}

		const success = await register(username, password);
		if (success) {
			if (onSuccess) onSuccess();
		} else {
			setError("Registration failed. Username may already be taken.");
		}
	};

	return (
		<div className="bg-gray-800 p-6 rounded-lg shadow-md w-full max-w-md mx-auto">
			<h2 className="text-2xl font-bold mb-6 text-center">Register</h2>

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

				<div className="mb-4">
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
					<p className="text-xs text-gray-400 mt-1">
						Must be at least 8 characters long
					</p>
				</div>

				<div className="mb-6">
					<label
						htmlFor="confirmPassword"
						className="block text-sm font-medium mb-1"
					>
						Confirm Password
					</label>
					<input
						type="password"
						id="confirmPassword"
						value={confirmPassword}
						onChange={(e) => setConfirmPassword(e.target.value)}
						className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
						disabled={isLoading}
					/>
				</div>

				<button
					type="submit"
					className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
					disabled={isLoading}
				>
					{isLoading ? "Registering..." : "Register"}
				</button>
			</form>
		</div>
	);
};

export default RegisterForm;
