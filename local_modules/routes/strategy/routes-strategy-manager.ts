import * as express from "express";
import { strategyManager } from "../../utils/StrategyManager";
import * as strategyFileStore from "../../utils/strategyFileStore";

const strategyManagerRoutes = (api: any) => {
	const router = express.Router();

	/**
	 * Get all active strategies
	 * GET /api/v1/strategies/manager/active
	 */
	router.get("/active", async (req: express.Request, res: express.Response) => {
		try {
			const activeStrategies = strategyManager.getActiveStrategies();
			res.json({
				success: true,
				data: activeStrategies,
				count: activeStrategies.length,
			});
		} catch (error) {
			console.error(
				"[Strategy Routes] Error getting active strategies:",
				error
			);
			res.status(500).json({
				success: false,
				error: "Failed to get active strategies",
				details: error instanceof Error ? error.message : "Unknown error",
			});
		}
	});

	/**
	 * Start a strategy instance
	 * POST /api/v1/strategies/manager/:id/start
	 */
	router.post(
		"/:id/start",
		async (req: express.Request, res: express.Response) => {
			try {
				const { id: strategyId } = req.params;

				if (!strategyId) {
					res.status(400).json({
						success: false,
						error: "Strategy ID is required",
					});
					return;
				}

				// Load strategy configuration from file store
				const strategyConfig = await strategyFileStore.getStrategy(strategyId);
				if (!strategyConfig) {
					res.status(404).json({
						success: false,
						error: `Strategy '${strategyId}' not found`,
					});
					return;
				}

				// Start the strategy
				const instanceId = await strategyManager.startStrategy(strategyConfig);

				res.json({
					success: true,
					data: {
						instanceId,
						strategyId,
						name: strategyConfig.name,
						status: "starting",
					},
					message: `Strategy '${strategyConfig.name}' started successfully`,
				});
			} catch (error) {
				console.error("[Strategy Routes] Error starting strategy:", error);
				res.status(500).json({
					success: false,
					error: "Failed to start strategy",
					details: error instanceof Error ? error.message : "Unknown error",
				});
			}
		}
	);

	/**
	 * Stop a strategy instance
	 * POST /api/v1/strategies/manager/:id/stop
	 */
	router.post(
		"/:id/stop",
		async (req: express.Request, res: express.Response) => {
			try {
				const { id } = req.params;

				await strategyManager.stopStrategy(id);

				res.json({
					success: true,
					message: `Strategy '${id}' stopped successfully`,
				});
			} catch (error) {
				console.error("[Strategy Routes] Error stopping strategy:", error);

				if (error instanceof Error && error.message.includes("not found")) {
					res.status(404).json({
						success: false,
						error: error.message,
					});
					return;
				}

				res.status(500).json({
					success: false,
					error: "Failed to stop strategy",
					details: error instanceof Error ? error.message : "Unknown error",
				});
			}
		}
	);

	/**
	 * Pause a strategy instance
	 * PUT /api/v1/strategies/manager/:id/pause
	 */
	router.put(
		"/:id/pause",
		async (req: express.Request, res: express.Response) => {
			try {
				const { id } = req.params;

				await strategyManager.pauseStrategy(id);

				res.json({
					success: true,
					message: `Strategy '${id}' paused successfully`,
				});
			} catch (error) {
				console.error("[Strategy Routes] Error pausing strategy:", error);

				if (error instanceof Error && error.message.includes("not found")) {
					res.status(404).json({
						success: false,
						error: error.message,
					});
					return;
				}

				res.status(500).json({
					success: false,
					error: "Failed to pause strategy",
					details: error instanceof Error ? error.message : "Unknown error",
				});
			}
		}
	);

	/**
	 * Resume a strategy instance
	 * PUT /api/v1/strategies/manager/:id/resume
	 */
	router.put(
		"/:id/resume",
		async (req: express.Request, res: express.Response) => {
			try {
				const { id } = req.params;

				await strategyManager.resumeStrategy(id);

				res.json({
					success: true,
					message: `Strategy '${id}' resumed successfully`,
				});
			} catch (error) {
				console.error("[Strategy Routes] Error resuming strategy:", error);

				if (error instanceof Error && error.message.includes("not found")) {
					res.status(404).json({
						success: false,
						error: error.message,
					});
					return;
				}

				res.status(500).json({
					success: false,
					error: "Failed to resume strategy",
					details: error instanceof Error ? error.message : "Unknown error",
				});
			}
		}
	);

	/**
	 * Get strategy performance metrics
	 * GET /api/v1/strategies/manager/:id/metrics
	 */
	router.get(
		"/:id/metrics",
		async (req: express.Request, res: express.Response) => {
			try {
				const { id } = req.params;

				const metrics = strategyManager.getStrategyMetrics(id);

				res.json({
					success: true,
					data: metrics,
				});
			} catch (error) {
				console.error(
					"[Strategy Routes] Error getting strategy metrics:",
					error
				);

				if (error instanceof Error && error.message.includes("not found")) {
					res.status(404).json({
						success: false,
						error: error.message,
					});
					return;
				}

				res.status(500).json({
					success: false,
					error: "Failed to get strategy metrics",
					details: error instanceof Error ? error.message : "Unknown error",
				});
			}
		}
	);

	/**
	 * Get strategy manager status
	 * GET /api/v1/strategies/manager/status
	 */
	router.get("/status", async (req: express.Request, res: express.Response) => {
		try {
			const status = strategyManager.getStatus();

			res.json({
				success: true,
				data: status,
			});
		} catch (error) {
			console.error("[Strategy Routes] Error getting manager status:", error);
			res.status(500).json({
				success: false,
				error: "Failed to get manager status",
				details: error instanceof Error ? error.message : "Unknown error",
			});
		}
	});

	// Mount the router
	api.use("/strategies/manager", router);
};

export = strategyManagerRoutes;
