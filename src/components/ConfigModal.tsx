import React, { useEffect, useState } from "react";

// --- Local type and API for strategy config schema ---
type StrategyConfigSchema = {
	[key: string]: {
		type: string;
		default: any;
		description?: string;
		min?: number;
		max?: number;
		options?: any[];
	};
};

async function fetchStrategyConfigSchema(name: string): Promise<{
	schema: StrategyConfigSchema;
	name: string;
	description: string;
}> {
	const baseUrl = `http://${window.location.hostname}:3001/api/v1`;
	const res = await fetch(
		`${baseUrl}/strategies/${encodeURIComponent(name)}/config`
	);
	if (!res.ok) throw new Error("Failed to fetch strategy config schema");
	return await res.json();
}

interface ConfigModalProps {
	strategyName: string;
	open: boolean;
	onClose: () => void;
	onSave: (config: Record<string, any>) => void;
}

export default function ConfigModal({
	strategyName,
	open,
	onClose,
	onSave,
}: ConfigModalProps) {
	const [schema, setSchema] = useState<StrategyConfigSchema | null>(null);
	const [config, setConfig] = useState<Record<string, any>>({});
	const [meta, setMeta] = useState<{ name?: string; description?: string }>({});

	useEffect(() => {
		if (open) {
			fetchStrategyConfigSchema(strategyName).then((data) => {
				setSchema(data.schema);
				setMeta({ name: data.name, description: data.description });
				// Set defaults
				const defaults: Record<string, any> = {};
				Object.entries(data.schema).forEach(([key, def]) => {
					defaults[key] = def.default;
				});
				setConfig(defaults);
			});
		}
	}, [strategyName, open]);

	if (!open) return null;
	if (!schema) return <div className="modal">Loading...</div>;

	const handleChange = (key: string, value: any) => {
		setConfig((prev) => ({ ...prev, [key]: value }));
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		onSave(config);
		onClose();
	};

	return (
		<div
			className="modal"
			style={{
				position: "fixed",
				top: 0,
				left: 0,
				width: "100vw",
				height: "100vh",
				background: "rgba(0,0,0,0.5)",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				zIndex: 2000,
			}}
		>
			<div
				style={{
					background: "#181a20",
					padding: "2em 2.5em",
					borderRadius: 12,
					minWidth: 340,
					maxWidth: "95vw",
					boxShadow: "0 4px 32px #000a",
				}}
			>
				<h2 style={{ marginTop: 0 }}>
					Configure <span style={{ color: "#ffb347" }}>{meta.name}</span>
				</h2>
				<div style={{ color: "#aaa", fontSize: "1em", marginBottom: "1em" }}>
					{meta.description}
				</div>
				<form onSubmit={handleSubmit}>
					<div>
						{Object.entries(schema).map(([key, def]) => (
							<div key={key} style={{ marginBottom: "1em" }}>
								<label style={{ fontWeight: "bold" }}>{key}</label>
								{def.description && (
									<div style={{ color: "#888", fontSize: "0.95em" }}>
										{def.description}
									</div>
								)}
								{def.type === "number" ? (
									<input
										type="number"
										value={config[key] ?? ""}
										min={def.min}
										max={def.max}
										step="any"
										style={{ width: "100%", marginBottom: "0.5em" }}
										onChange={(e) => handleChange(key, Number(e.target.value))}
									/>
								) : def.type === "string" ? (
									<input
										type="text"
										value={config[key] ?? ""}
										style={{ width: "100%", marginBottom: "0.5em" }}
										onChange={(e) => handleChange(key, e.target.value)}
									/>
								) : def.type === "boolean" ? (
									<input
										type="checkbox"
										checked={!!config[key]}
										onChange={(e) => handleChange(key, e.target.checked)}
									/>
								) : def.type === "enum" && Array.isArray(def.options) ? (
									<select
										value={config[key] ?? def.default}
										style={{ width: "100%", marginBottom: "0.5em" }}
										onChange={(e) => handleChange(key, e.target.value)}
									>
										{def.options.map((opt: any) => (
											<option key={opt} value={opt}>
												{opt}
											</option>
										))}
									</select>
								) : (
									<input
										type="text"
										value={config[key] ?? ""}
										style={{ width: "100%", marginBottom: "0.5em" }}
										onChange={(e) => handleChange(key, e.target.value)}
									/>
								)}
							</div>
						))}
					</div>
					<div
						style={{
							marginTop: "2em",
							display: "flex",
							gap: "1em",
							justifyContent: "flex-end",
						}}
					>
						<button type="button" onClick={onClose}>
							Cancel
						</button>
						<button type="submit">Save</button>
					</div>
				</form>
			</div>
		</div>
	);
}
