import { Router, Request, Response } from "express";
import { authService } from "../../utils/authService";
import { authenticateToken, AuthRequest } from "../../utils/authMiddleware";

const router = Router();

/**
 * Register a new user
 * POST /api/v1/auth/register
 */
router.post("/register", async (req: Request, res: Response) => {
	try {
		const { username, password } = req.body;

		if (!username || !password) {
			res.status(400).json({
				success: false,
				message: "Username and password are required",
			});
			return;
		}

		// Password validation
		if (password.length < 8) {
			res.status(400).json({
				success: false,
				message: "Password must be at least 8 characters long",
			});
			return;
		}

		const result = await authService.registerUser(username, password);

		if (result.success) {
			res.status(201).json(result);
		} else {
			res.status(400).json(result);
		}
	} catch (error) {
		console.error("Error registering user:", error);
		res.status(500).json({
			success: false,
			message: "Error registering user",
			error: String(error),
		});
	}
});

/**
 * Login a user
 * POST /api/v1/auth/login
 */
router.post("/login", async (req: Request, res: Response) => {
	try {
		const { username, password } = req.body;

		if (!username || !password) {
			res.status(400).json({
				success: false,
				message: "Username and password are required",
			});
			return;
		}

		const result = await authService.loginUser(username, password);

		if (result.success) {
			res.status(200).json(result);
		} else {
			res.status(401).json(result);
		}
	} catch (error) {
		console.error("Error logging in user:", error);
		res.status(500).json({
			success: false,
			message: "Error logging in user",
			error: String(error),
		});
	}
});

/**
 * Get current user's profile
 * GET /api/v1/auth/profile
 */
router.get(
	"/profile",
	authenticateToken,
	async (req: AuthRequest, res: Response) => {
		try {
			if (!req.user || !req.user.id) {
				res.status(401).json({
					success: false,
					message: "Authentication required",
				});
				return;
			}

			const user = await authService.getUserById(req.user.id);

			if (!user) {
				res.status(404).json({
					success: false,
					message: "User not found",
				});
				return;
			}

			res.status(200).json({
				success: true,
				data: user,
			});
		} catch (error) {
			console.error("Error fetching user profile:", error);
			res.status(500).json({
				success: false,
				message: "Error fetching user profile",
				error: String(error),
			});
		}
	}
);

/**
 * Update API credentials
 * PUT /api/v1/auth/api-credentials
 */
router.put(
	"/api-credentials",
	authenticateToken,
	async (req: AuthRequest, res: Response) => {
		try {
			if (!req.user || !req.user.id) {
				res.status(401).json({
					success: false,
					message: "Authentication required",
				});
				return;
			}

			const { apiKey, apiSecret } = req.body;

			if (!apiKey || !apiSecret) {
				res.status(400).json({
					success: false,
					message: "API key and secret are required",
				});
				return;
			}

			const result = await authService.updateApiCredentials(
				req.user.id,
				apiKey,
				apiSecret
			);

			if (result.success) {
				res.status(200).json(result);
			} else {
				res.status(400).json(result);
			}
		} catch (error) {
			console.error("Error updating API credentials:", error);
			res.status(500).json({
				success: false,
				message: "Error updating API credentials",
				error: String(error),
			});
		}
	}
);

export default router;
