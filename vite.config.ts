import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
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
				target: "ws://localhost:3001",
				ws: true,
			},
		},
	},
	plugins: [react()],
});
