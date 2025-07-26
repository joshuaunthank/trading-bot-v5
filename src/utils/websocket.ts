/**
 * WebSocket URL utility for trading bot
 * Handles dynamic URL generation for different environments (localhost, production, mobile)
 */

export function getWebSocketUrl(path: string = "/ws/ohlcv"): string {
	// In production, use the current host with wss://
	if (window.location.protocol === "https:") {
		return `wss://${window.location.host}${path}`;
	}

	// For development, check if we're on localhost or a different host
	const host = window.location.hostname;
	const port =
		window.location.port ||
		(window.location.protocol === "https:" ? "443" : "80");

	// If accessing via IP address (like from mobile), use that IP with the backend port
	if (host !== "localhost" && host !== "127.0.0.1") {
		// Assume backend is running on port 3001 when accessed via IP
		return `ws://${host}:3001${path}`;
	}

	// Default localhost development
	return `ws://localhost:3001${path}`;
}

export function getApiUrl(path: string = ""): string {
	// In production, use the current host
	if (window.location.protocol === "https:") {
		return `https://${window.location.host}${path}`;
	}

	// For development, check if we're on localhost or a different host
	const host = window.location.hostname;

	// If accessing via IP address (like from mobile), use that IP with the backend port
	if (host !== "localhost" && host !== "127.0.0.1") {
		return `http://${host}:3001${path}`;
	}

	// Default localhost development
	return `http://localhost:3001${path}`;
}
