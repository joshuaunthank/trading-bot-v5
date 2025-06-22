import { IndicatorCalculator } from "./types";

class IndicatorRegistry {
	private calculators = new Map<string, IndicatorCalculator>();

	register(calculator: IndicatorCalculator) {
		this.calculators.set(calculator.type, calculator);
	}

	get(type: string): IndicatorCalculator | undefined {
		return this.calculators.get(type);
	}

	getAll(): IndicatorCalculator[] {
		return Array.from(this.calculators.values());
	}

	getByCategory(yAxisType: string): IndicatorCalculator[] {
		return this.getAll().filter((calc) => calc.yAxisType === yAxisType);
	}

	getTypes(): string[] {
		return Array.from(this.calculators.keys());
	}

	has(type: string): boolean {
		return this.calculators.has(type);
	}

	unregister(type: string): boolean {
		return this.calculators.delete(type);
	}

	clear() {
		this.calculators.clear();
	}
}

export const indicatorRegistry = new IndicatorRegistry();
