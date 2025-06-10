import { Request, Response, NextFunction } from "express";
import * as jwt from "jsonwebtoken";
import { config } from "./config";

export interface AuthRequest extends Request {
	user?: {
		id: string;
		username: string;
	};
}

/**
 * Middleware to authenticate JWT tokens
 */
export const authenticateToken = (
	req: AuthRequest,
	res: Response,
	next: NextFunction
): void => {
	const authHeader = req.headers["authorization"];
	const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN format

	if (!token) {
		res
			.status(401)
			.json({ success: false, message: "Authentication token required" });
		return;
	}

	try {
		const user = jwt.verify(token, config.JWT_SECRET) as {
			id: string;
			username: string;
		};
		req.user = user;
		next();
	} catch (error) {
		res
			.status(403)
			.json({ success: false, message: "Invalid or expired token" });
		return;
	}
};

/**
 * Optional authentication - doesn't reject if token is missing
 * Used for endpoints that can work with or without authentication but provide enhanced
 * functionality when authenticated
 */
export const optionalAuthentication = (
	req: AuthRequest,
	res: Response,
	next: NextFunction
): void => {
	const authHeader = req.headers["authorization"];
	const token = authHeader && authHeader.split(" ")[1];

	if (token) {
		try {
			const user = jwt.verify(token, config.JWT_SECRET) as {
				id: string;
				username: string;
			};
			req.user = user;
		} catch (error) {
			// Invalid token, but we'll continue anyway
			console.warn(
				"Invalid authentication token provided but continuing as unauthenticated"
			);
		}
	}

	next();
};
