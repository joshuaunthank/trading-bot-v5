import React, { useEffect, useState } from "react";
import ConfigModal from "./ConfigModal";

type Strategy = { name: string; [key: string]: any };

type StrategyConfigSelectorProps = {
	onSave: (config: any) => void; // Replace 'any' with a more specific type if available
};

export default function StrategyConfigSelector({
	onSave,
}: StrategyConfigSelectorProps) {
	const [strategies, setStrategies] = useState<Strategy[]>([]);
	const [selected, setSelected] = useState("");
	const [modalOpen, setModalOpen] = useState(false);

	useEffect(() => {
		const baseUrl = `http://${window.location.hostname}:3001/api/v1`;
		fetch(`${baseUrl}/strategies`)
			.then((res) => res.json())
			.then(setStrategies)
			.catch(console.error);
	}, []);

	const handleSelect = (e: {
		target: { value: React.SetStateAction<string> };
	}) => {
		setSelected(e.target.value);
		setModalOpen(true);
	};

	return (
		<div>
			<label>
				Select strategy:
				<select value={selected} onChange={handleSelect}>
					<option value="">-- Choose --</option>
					{strategies.map((s) => (
						<option key={s.name} value={s.name}>
							{s.name}
						</option>
					))}
				</select>
			</label>
			{modalOpen && selected && (
				<ConfigModal
					strategyName={selected}
					open={modalOpen}
					onClose={() => setModalOpen(false)}
					onSave={onSave}
				/>
			)}
		</div>
	);
}
