import React, { useEffect, useState } from "react";

type Indicator = {
	id: string;
	name: string;
	description: string;
	type: string;
	parameters: Record<string, any>;
	modifiers: Record<string, any>;
	[key: string]: any;
};

type StrategyIndicator = Indicator & { config: Record<string, any> };

export default function IndicatorConfigForm({
	initialIndicators = [],
	onSave,
}: {
	initialIndicators?: StrategyIndicator[];
	onSave: (indicators: StrategyIndicator[]) => void;
}) {
	const [availableIndicators, setAvailableIndicators] = useState<Indicator[]>(
		[]
	);
	const [selected, setSelected] =
		useState<StrategyIndicator[]>(initialIndicators);

	useEffect(() => {
		const baseUrl = `http://${window.location.hostname}:3001/api/v1`;
		fetch(`${baseUrl}/indicators`)
			.then((res) => res.json())
			.then(setAvailableIndicators)
			.catch(console.error);
	}, []);

	const addIndicator = (id: string) => {
		const ind = availableIndicators.find((i) => i.id === id);
		if (ind && !selected.some((s) => s.id === id)) {
			setSelected([...selected, { ...ind, config: { ...ind.parameters } }]);
		}
	};

	const removeIndicator = (id: string) => {
		setSelected(selected.filter((s) => s.id !== id));
	};

	const updateConfig = (id: string, key: string, value: any) => {
		setSelected((prev) =>
			prev.map((s) =>
				s.id === id ? { ...s, config: { ...s.config, [key]: value } } : s
			)
		);
	};

	return (
		<div>
			<h2>Strategy Indicators</h2>
			<select onChange={(e) => addIndicator(e.target.value)} defaultValue="">
				<option value="" disabled>
					Add indicator...
				</option>
				{availableIndicators
					.filter((i) => !selected.some((s) => s.id === i.id))
					.map((i) => (
						<option key={i.id} value={i.id}>
							{i.name}
						</option>
					))}
			</select>
			<ul>
				{selected.map((ind) => (
					<li key={ind.id} style={{ margin: "1em 0" }}>
						<b>{ind.name}</b> - {ind.description}
						<button onClick={() => removeIndicator(ind.id)}>Remove</button>
						<div>
							{Object.entries(ind.parameters).map(([key, def]) => (
								<div key={key}>
									<label>
										{key}:{" "}
										<input
											value={ind.config[key] ?? ""}
											onChange={(e) =>
												updateConfig(ind.id, key, e.target.value)
											}
										/>
									</label>
								</div>
							))}
						</div>
					</li>
				))}
			</ul>
			<button onClick={() => onSave(selected)}>Save Strategy</button>
		</div>
	);
}
