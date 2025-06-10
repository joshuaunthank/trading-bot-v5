import { Router, Request, Response } from "express";
import { tradingService } from "../../utils/tradingService";
import { authenticateToken, AuthRequest } from "../../utils/authMiddleware";
import { authService } from "../../utils/authService";

const router = Router();

/**
 * Initialize trading service
 * GET /api/v1/trading/init
 */
router.get(
	"/init",
	authenticateToken,
	async (req: AuthRequest, res: Response): Promise<void> => {
		try {
			// If authenticated, try to use the user's API credentials
			if (req.user && req.user.id) {
				const user = await authService.getUserById(req.user.id);
				if (user && user.apiKey && user.apiSecret) {
					const result = await tradingService.init(user.apiKey, user.apiSecret);
					if (result) {
						res.status(200).json({
							success: true,
							message: "Trading service initialized with user credentials",
						});
						return;
					}
				}
			}

			// Fall back to default credentials
			const result = await tradingService.init();
			if (result) {
				res.status(200).json({
					success: true,
					message: "Trading service initialized with default credentials",
				});
			} else {
				res.status(500).json({
					success: false,
					message: "Failed to initialize trading service",
				});
			}
		} catch (error) {
			console.error("Error initializing trading service:", error);
			res.status(500).json({
				success: false,
				message: "Error initializing trading service",
				error: String(error),
			});
		}
	}
);

/**
 * Get account balance
 * GET /api/v1/trading/balance
 */
router.get(
	"/balance",
	authenticateToken,
	async (req: AuthRequest, res: Response): Promise<void> => {
		try {
			if (!tradingService.isInitialized()) {
				// Initialize with user credentials if available
				if (req.user && req.user.id) {
					const user = await authService.getUserById(req.user.id);
					if (user && user.apiKey && user.apiSecret) {
						await tradingService.init(user.apiKey, user.apiSecret);
					} else {
						await tradingService.init();
					}
				} else {
					await tradingService.init();
				}
			}

			const balance = await tradingService.getBalance();
			res.status(200).json({ success: true, data: balance });
		} catch (error) {
			console.error("Error fetching balance:", error);
			res.status(500).json({
				success: false,
				message: "Error fetching balance",
				error: String(error),
			});
		}
	}
);

/**
 * Get open positions
 * GET /api/v1/trading/positions/:symbol?
 */
router.get(
	["/positions", "/positions/:symbol"],
	authenticateToken,
	async (req: AuthRequest, res: Response) => {
		try {
			if (!tradingService.isInitialized()) {
				// Initialize with user credentials if available
				if (req.user && req.user.id) {
					const user = await authService.getUserById(req.user.id);
					if (user && user.apiKey && user.apiSecret) {
						await tradingService.init(user.apiKey, user.apiSecret);
					} else {
						await tradingService.init();
					}
				} else {
					await tradingService.init();
				}
			}

			const { symbol } = req.params;
			const position = await tradingService.getPosition(symbol);
			res.status(200).json({ success: true, data: position });
		} catch (error) {
			console.error("Error fetching positions:", error);
			res.status(500).json({
				success: false,
				message: "Error fetching positions",
				error: String(error),
			});
		}
	}
);

/**
 * Get open orders
 * GET /api/v1/trading/orders/:symbol?
 */
router.get(
	["/orders", "/orders/:symbol"],
	authenticateToken,
	async (req: AuthRequest, res: Response) => {
		try {
			if (!tradingService.isInitialized()) {
				// Initialize with user credentials if available
				if (req.user && req.user.id) {
					const user = await authService.getUserById(req.user.id);
					if (user && user.apiKey && user.apiSecret) {
						await tradingService.init(user.apiKey, user.apiSecret);
					} else {
						await tradingService.init();
					}
				} else {
					await tradingService.init();
				}
			}

			const { symbol } = req.params;
			const orders = await tradingService.getOpenOrders(symbol);
			res.status(200).json({ success: true, data: orders });
		} catch (error) {
			console.error("Error fetching orders:", error);
			res.status(500).json({
				success: false,
				message: "Error fetching orders",
				error: String(error),
			});
		}
	}
);

/**
 * Place a new order
 * POST /api/v1/trading/order
 */
router.post(
	"/order",
	authenticateToken,
	async (req: AuthRequest, res: Response) => {
		try {
			if (!tradingService.isInitialized()) {
				// Initialize with user credentials if available
				if (req.user && req.user.id) {
					const user = await authService.getUserById(req.user.id);
					if (user && user.apiKey && user.apiSecret) {
						await tradingService.init(user.apiKey, user.apiSecret);
					} else {
						await tradingService.init();
					}
				} else {
					await tradingService.init();
				}
			}

			const { symbol, type, side, amount, price, params } = req.body;

			// Validate required parameters
			if (!symbol || !type || !side || !amount) {
				res.status(400).json({
					success: false,
					message:
						"Missing required parameters. Required: symbol, type, side, amount",
				});
				return;
			}

			const order = await tradingService.placeOrder({
				symbol,
				type,
				side,
				amount,
				price,
				params,
			});

			res.status(200).json({ success: true, data: order });
		} catch (error) {
			console.error("Error placing order:", error);
			res.status(500).json({
				success: false,
				message: "Error placing order",
				error: String(error),
			});
		}
	}
);

/**
 * Cancel an order
 * DELETE /api/v1/trading/order/:id/:symbol
 */
router.delete(
	"/order/:id/:symbol",
	authenticateToken,
	async (req: AuthRequest, res: Response) => {
		try {
			if (!tradingService.isInitialized()) {
				// Initialize with user credentials if available
				if (req.user && req.user.id) {
					const user = await authService.getUserById(req.user.id);
					if (user && user.apiKey && user.apiSecret) {
						await tradingService.init(user.apiKey, user.apiSecret);
					} else {
						await tradingService.init();
					}
				} else {
					await tradingService.init();
				}
			}

			const { id, symbol } = req.params;

			// Validate required parameters
			if (!id || !symbol) {
				res.status(400).json({
					success: false,
					message: "Missing required parameters. Required: id, symbol",
				});
				return;
			}

			const result = await tradingService.cancelOrder(id, symbol);

			if (result) {
				res.status(200).json({
					success: true,
					message: `Order ${id} cancelled successfully`,
				});
			} else {
				res
					.status(500)
					.json({ success: false, message: `Failed to cancel order ${id}` });
			}
		} catch (error) {
			console.error("Error cancelling order:", error);
			res.status(500).json({
				success: false,
				message: "Error cancelling order",
				error: String(error),
			});
		}
	}
);

/**
 * Close a position
 * POST /api/v1/trading/close-position
 */
router.post(
	"/close-position",
	authenticateToken,
	async (req: AuthRequest, res: Response) => {
		try {
			if (!tradingService.isInitialized()) {
				// Initialize with user credentials if available
				if (req.user && req.user.id) {
					const user = await authService.getUserById(req.user.id);
					if (user && user.apiKey && user.apiSecret) {
						await tradingService.init(user.apiKey, user.apiSecret);
					} else {
						await tradingService.init();
					}
				} else {
					await tradingService.init();
				}
			}

			const { symbol, positionSide } = req.body;

			// Validate required parameters
			if (!symbol || !positionSide) {
				res.status(400).json({
					success: false,
					message:
						"Missing required parameters. Required: symbol, positionSide",
				});
				return;
			}

			const result = await tradingService.closePosition(symbol, positionSide);

			res.status(200).json({ success: true, data: result });
		} catch (error) {
			console.error("Error closing position:", error);
			res.status(500).json({
				success: false,
				message: "Error closing position",
				error: String(error),
			});
		}
	}
);

/**
 * Set leverage
 * POST /api/v1/trading/leverage
 */
router.post(
	"/leverage",
	authenticateToken,
	async (req: AuthRequest, res: Response) => {
		try {
			if (!tradingService.isInitialized()) {
				// Initialize with user credentials if available
				if (req.user && req.user.id) {
					const user = await authService.getUserById(req.user.id);
					if (user && user.apiKey && user.apiSecret) {
						await tradingService.init(user.apiKey, user.apiSecret);
					} else {
						await tradingService.init();
					}
				} else {
					await tradingService.init();
				}
			}

			const { symbol, leverage } = req.body;

			// Validate required parameters
			if (!symbol || leverage === undefined) {
				res.status(400).json({
					success: false,
					message: "Missing required parameters. Required: symbol, leverage",
				});
				return;
			}

			const result = await tradingService.setLeverage(symbol, leverage);

			if (result) {
				res.status(200).json({
					success: true,
					message: `Leverage for ${symbol} set to ${leverage}x`,
				});
			} else {
				res.status(500).json({
					success: false,
					message: `Failed to set leverage for ${symbol}`,
				});
			}
		} catch (error) {
			console.error("Error setting leverage:", error);
			res.status(500).json({
				success: false,
				message: "Error setting leverage",
				error: String(error),
			});
		}
	}
);

export default router;
