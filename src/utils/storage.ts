/**
 * Centralized local storage utilities
 * Provides type-safe storage operations with error handling
 */

import { CONFIG } from "./config";

class LocalStorageManager {
	/**
	 * Get a value from localStorage with fallback
	 */
	get<T>(key: string, fallback: T): T {
		try {
			const item = localStorage.getItem(key);
			if (item === null) return fallback;
			return JSON.parse(item);
		} catch (error) {
			console.warn(`Failed to get localStorage item "${key}":`, error);
			return fallback;
		}
	}

	/**
	 * Set a value in localStorage
	 */
	set<T>(key: string, value: T): void {
		try {
			localStorage.setItem(key, JSON.stringify(value));
		} catch (error) {
			console.warn(`Failed to set localStorage item "${key}":`, error);
		}
	}

	/**
	 * Remove a value from localStorage
	 */
	remove(key: string): void {
		try {
			localStorage.removeItem(key);
		} catch (error) {
			console.warn(`Failed to remove localStorage item "${key}":`, error);
		}
	}

	/**
	 * Clear all app-related localStorage items
	 */
	clearAll(): void {
		Object.values(CONFIG.STORAGE_KEYS).forEach((key) => {
			this.remove(key);
		});
	}

	// Typed getters/setters for common app data
	getSelectedSymbol(): string {
		return this.get(CONFIG.STORAGE_KEYS.SELECTED_SYMBOL, CONFIG.DEFAULT_SYMBOL);
	}

	setSelectedSymbol(symbol: string): void {
		this.set(CONFIG.STORAGE_KEYS.SELECTED_SYMBOL, symbol);
	}

	getSelectedTimeframe(): string {
		return this.get(
			CONFIG.STORAGE_KEYS.SELECTED_TIMEFRAME,
			CONFIG.DEFAULT_TIMEFRAME
		);
	}

	setSelectedTimeframe(timeframe: string): void {
		this.set(CONFIG.STORAGE_KEYS.SELECTED_TIMEFRAME, timeframe);
	}

	getSelectedStrategy(): string | null {
		return this.get(CONFIG.STORAGE_KEYS.SELECTED_STRATEGY, null);
	}

	setSelectedStrategy(strategyId: string | null): void {
		this.set(CONFIG.STORAGE_KEYS.SELECTED_STRATEGY, strategyId);
	}

	getChartConfig(): any {
		return this.get(CONFIG.STORAGE_KEYS.CHART_CONFIG, {});
	}

	setChartConfig(config: any): void {
		this.set(CONFIG.STORAGE_KEYS.CHART_CONFIG, config);
	}

	getUIPreferences(): any {
		return this.get(CONFIG.STORAGE_KEYS.UI_PREFERENCES, {});
	}

	setUIPreferences(preferences: any): void {
		this.set(CONFIG.STORAGE_KEYS.UI_PREFERENCES, preferences);
	}
}

// Export singleton instance
export const storage = new LocalStorageManager();
