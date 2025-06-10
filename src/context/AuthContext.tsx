import React, { createContext, useState, useEffect, useContext } from "react";

interface User {
	id: string;
	username: string;
	apiKey?: string;
	apiSecret?: string;
	createdAt: number;
	lastLogin?: number;
}

interface AuthContextType {
	user: User | null;
	isAuthenticated: boolean;
	isLoading: boolean;
	token: string | null;
	login: (username: string, password: string) => Promise<boolean>;
	register: (username: string, password: string) => Promise<boolean>;
	logout: () => void;
	updateApiCredentials: (apiKey: string, apiSecret: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType>({
	user: null,
	isAuthenticated: false,
	isLoading: true,
	token: null,
	login: async () => false,
	register: async () => false,
	logout: () => {},
	updateApiCredentials: async () => false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const [user, setUser] = useState<User | null>(null);
	const [token, setToken] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	// Load auth state from localStorage on initial render
	useEffect(() => {
		const savedToken = localStorage.getItem("auth_token");
		if (savedToken) {
			setToken(savedToken);
			fetchUserProfile(savedToken);
		} else {
			setIsLoading(false);
		}
	}, []);

	// Fetch user profile with token
	const fetchUserProfile = async (authToken: string) => {
		try {
			setIsLoading(true);
			const response = await fetch("/api/v1/auth/profile", {
				headers: {
					Authorization: `Bearer ${authToken}`,
				},
			});

			if (response.ok) {
				const data = await response.json();
				setUser(data.data);
			} else {
				// Token is invalid or expired
				logout();
			}
		} catch (error) {
			console.error("Error fetching user profile:", error);
			logout();
		} finally {
			setIsLoading(false);
		}
	};

	// Login user
	const login = async (
		username: string,
		password: string
	): Promise<boolean> => {
		try {
			setIsLoading(true);
			const response = await fetch("/api/v1/auth/login", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ username, password }),
			});

			const data = await response.json();

			if (response.ok && data.success) {
				setToken(data.token);
				setUser(data.user);
				localStorage.setItem("auth_token", data.token);
				return true;
			} else {
				return false;
			}
		} catch (error) {
			console.error("Login error:", error);
			return false;
		} finally {
			setIsLoading(false);
		}
	};

	// Register user
	const register = async (
		username: string,
		password: string
	): Promise<boolean> => {
		try {
			setIsLoading(true);
			const response = await fetch("/api/v1/auth/register", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ username, password }),
			});

			const data = await response.json();

			if (response.ok && data.success) {
				setToken(data.token);
				// Fetch user profile after registration
				await fetchUserProfile(data.token);
				localStorage.setItem("auth_token", data.token);
				return true;
			} else {
				return false;
			}
		} catch (error) {
			console.error("Registration error:", error);
			return false;
		} finally {
			setIsLoading(false);
		}
	};

	// Logout user
	const logout = () => {
		setUser(null);
		setToken(null);
		localStorage.removeItem("auth_token");
	};

	// Update API credentials
	const updateApiCredentials = async (
		apiKey: string,
		apiSecret: string
	): Promise<boolean> => {
		if (!token) return false;

		try {
			setIsLoading(true);
			const response = await fetch("/api/v1/auth/api-credentials", {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ apiKey, apiSecret }),
			});

			const data = await response.json();

			if (response.ok && data.success) {
				// Refresh user data
				await fetchUserProfile(token);
				return true;
			} else {
				return false;
			}
		} catch (error) {
			console.error("Error updating API credentials:", error);
			return false;
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<AuthContext.Provider
			value={{
				user,
				isAuthenticated: !!user,
				isLoading,
				token,
				login,
				register,
				logout,
				updateApiCredentials,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
};
