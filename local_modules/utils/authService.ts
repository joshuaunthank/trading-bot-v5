import * as jwt from "jsonwebtoken";
import * as bcrypt from "bcrypt";
import * as fs from "fs/promises";
import * as path from "path";
import { config } from "./config";

interface User {
	id: string;
	username: string;
	passwordHash: string;
	apiKey?: string;
	apiSecret?: string;
	createdAt: number;
	lastLogin?: number;
}

class AuthService {
	private usersFilePath: string;

	constructor() {
		this.usersFilePath = path.join(
			process.cwd(),
			"local_modules",
			"data",
			"users.json"
		);
	}

	/**
	 * Initialize the auth service by ensuring the users file exists
	 */
	async init(): Promise<void> {
		try {
			// Ensure the data directory exists
			const dataDir = path.join(process.cwd(), "local_modules", "data");
			try {
				await fs.access(dataDir);
			} catch {
				await fs.mkdir(dataDir, { recursive: true });
			}

			// Check if the users file exists, create it if not
			try {
				await fs.access(this.usersFilePath);
			} catch {
				await fs.writeFile(this.usersFilePath, JSON.stringify([], null, 2));
			}
		} catch (error) {
			console.error("Failed to initialize auth service:", error);
			throw error;
		}
	}

	/**
	 * Get all users
	 */
	async getUsers(): Promise<User[]> {
		try {
			const data = await fs.readFile(this.usersFilePath, "utf8");
			return JSON.parse(data);
		} catch (error) {
			console.error("Failed to get users:", error);
			return [];
		}
	}

	/**
	 * Register a new user
	 */
	async registerUser(
		username: string,
		password: string
	): Promise<{ success: boolean; message: string; token?: string }> {
		try {
			await this.init();

			const users = await this.getUsers();

			// Check if username already exists
			const existingUser = users.find((user) => user.username === username);
			if (existingUser) {
				return { success: false, message: "Username already exists" };
			}

			// Hash the password
			const passwordHash = await bcrypt.hash(password, 10);

			// Create a new user
			const newUser: User = {
				id: Date.now().toString(),
				username,
				passwordHash,
				createdAt: Date.now(),
			};

			// Add the user to the users array
			users.push(newUser);

			// Save the updated users array
			await fs.writeFile(this.usersFilePath, JSON.stringify(users, null, 2));

			// Generate a JWT token
			const token = jwt.sign(
				{ id: newUser.id, username: newUser.username },
				config.JWT_SECRET,
				{ expiresIn: `${config.SESSION_TIMEOUT_MINUTES}m` }
			);

			return { success: true, message: "User registered successfully", token };
		} catch (error) {
			console.error("Failed to register user:", error);
			return { success: false, message: "Failed to register user" };
		}
	}

	/**
	 * Login a user
	 */
	async loginUser(
		username: string,
		password: string
	): Promise<{
		success: boolean;
		message: string;
		token?: string;
		user?: Omit<User, "passwordHash">;
	}> {
		try {
			await this.init();

			const users = await this.getUsers();

			// Find the user
			const user = users.find((user) => user.username === username);
			if (!user) {
				return { success: false, message: "Invalid username or password" };
			}

			// Check the password
			const passwordMatch = await bcrypt.compare(password, user.passwordHash);
			if (!passwordMatch) {
				return { success: false, message: "Invalid username or password" };
			}

			// Update last login timestamp
			user.lastLogin = Date.now();
			await fs.writeFile(this.usersFilePath, JSON.stringify(users, null, 2));

			// Generate a JWT token
			const token = jwt.sign(
				{ id: user.id, username: user.username },
				config.JWT_SECRET,
				{ expiresIn: `${config.SESSION_TIMEOUT_MINUTES}m` }
			);

			// Return user without the passwordHash
			const { passwordHash, ...userWithoutPassword } = user;

			return {
				success: true,
				message: "Login successful",
				token,
				user: userWithoutPassword,
			};
		} catch (error) {
			console.error("Failed to login user:", error);
			return { success: false, message: "Failed to login user" };
		}
	}

	/**
	 * Update user API credentials
	 */
	async updateApiCredentials(
		userId: string,
		apiKey: string,
		apiSecret: string
	): Promise<{ success: boolean; message: string }> {
		try {
			await this.init();

			const users = await this.getUsers();

			// Find the user
			const userIndex = users.findIndex((user) => user.id === userId);
			if (userIndex === -1) {
				return { success: false, message: "User not found" };
			}

			// Update API credentials
			users[userIndex].apiKey = apiKey;
			users[userIndex].apiSecret = apiSecret;

			// Save the updated users array
			await fs.writeFile(this.usersFilePath, JSON.stringify(users, null, 2));

			return { success: true, message: "API credentials updated successfully" };
		} catch (error) {
			console.error("Failed to update API credentials:", error);
			return { success: false, message: "Failed to update API credentials" };
		}
	}

	/**
	 * Get a user by ID
	 */
	async getUserById(
		userId: string
	): Promise<Omit<User, "passwordHash"> | null> {
		try {
			const users = await this.getUsers();
			const user = users.find((user) => user.id === userId);

			if (!user) {
				return null;
			}

			// Return user without the passwordHash
			const { passwordHash, ...userWithoutPassword } = user;
			return userWithoutPassword;
		} catch (error) {
			console.error("Failed to get user by ID:", error);
			return null;
		}
	}
}

// Export as singleton
export const authService = new AuthService();
