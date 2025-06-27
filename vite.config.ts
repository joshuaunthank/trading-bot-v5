import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(async () => {
	// @ts-ignore - @tailwindcss/vite is ESM-only
	const { default: tailwindcss } = await import("@tailwindcss/vite");

	return {
		plugins: [react(), tailwindcss()],
		server: {
			port: 5173,
			proxy: {
				// Proxy API requests to the backend server
				"/api": {
					target: "http://localhost:3001",
					changeOrigin: true,
					secure: false,
				},
				// Proxy WebSocket connections to the backend WS server
				"/ws": {
					target: "http://localhost:3001",
					changeOrigin: true,
					ws: true,
					rewrite: (path) => path,
				},
			},
		},
	};
});
