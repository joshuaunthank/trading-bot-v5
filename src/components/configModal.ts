import {
	fetchStrategyConfigSchema,
	StrategyConfigSchema,
} from "./strategyConfig";

export async function showConfigModal(
	strategyName: string,
	onSave: (config: Record<string, any>) => void
) {
	// Fetch config schema from backend
	let schemaData;
	try {
		schemaData = await fetchStrategyConfigSchema(strategyName);
	} catch (err) {
		alert("Failed to load strategy config: " + err);
		return;
	}
	const { schema, name, description } = schemaData;

	// Create modal container
	let modal = document.getElementById("config-modal");
	if (!modal) {
		modal = document.createElement("div");
		modal.id = "config-modal";
		modal.style.position = "fixed";
		modal.style.top = "0";
		modal.style.left = "0";
		modal.style.width = "100vw";
		modal.style.height = "100vh";
		modal.style.background = "rgba(0,0,0,0.5)";
		modal.style.display = "flex";
		modal.style.alignItems = "center";
		modal.style.justifyContent = "center";
		modal.style.zIndex = "2000";
		document.body.appendChild(modal);
	}
	modal.innerHTML = `
    <div style="background:#181a20;padding:2em 2.5em;border-radius:12px;min-width:340px;max-width:95vw;box-shadow:0 4px 32px #000a;">
      <h2 style="margin-top:0;">Configure <span style='color:#ffb347;'>${name}</span></h2>
      <div style="color:#aaa;font-size:1em;margin-bottom:1em;">${
				description || ""
			}</div>
      <form id="config-form">
        <div id="config-fields"></div>
        <div style="margin-top:2em;display:flex;gap:1em;justify-content:flex-end;">
          <button type="button" id="config-cancel">Cancel</button>
          <button type="submit" id="config-save">Save</button>
        </div>
      </form>
    </div>
  `;
	modal.style.display = "flex";

	// Render fields
	const fieldsDiv = modal.querySelector("#config-fields")!;
	fieldsDiv.innerHTML = Object.entries(schema)
		.map(([key, def]) => {
			let inputHtml = "";
			const label = `<label style='font-weight:bold;'>${key}</label>`;
			const desc = def.description
				? `<div style='color:#888;font-size:0.95em;'>${def.description}</div>`
				: "";
			if (def.type === "number") {
				inputHtml = `<input type='number' name='${key}' value='${
					def.default
				}' min='${def.min ?? ""}' max='${
					def.max ?? ""
				}' step='any' style='width:100%;margin-bottom:0.5em;' />`;
			} else if (def.type === "string") {
				inputHtml = `<input type='text' name='${key}' value='${def.default}' style='width:100%;margin-bottom:0.5em;' />`;
			} else if (def.type === "boolean") {
				inputHtml = `<input type='checkbox' name='${key}' ${
					def.default ? "checked" : ""
				} />`;
			} else if (def.type === "enum" && Array.isArray(def.options)) {
				inputHtml = `<select name='${key}' style='width:100%;margin-bottom:0.5em;'>${def.options
					.map(
						(opt: any) =>
							`<option value='${opt}' ${
								opt === def.default ? "selected" : ""
							}>${opt}</option>`
					)
					.join("")}</select>`;
			} else {
				inputHtml = `<input type='text' name='${key}' value='${
					def.default ?? ""
				}' style='width:100%;margin-bottom:0.5em;' />`;
			}
			return `<div style='margin-bottom:1em;'>${label}${desc}${inputHtml}</div>`;
		})
		.join("");

	// Cancel button
	(modal.querySelector("#config-cancel") as HTMLButtonElement).onclick = () => {
		modal!.style.display = "none";
	};

	// Save handler
	(modal.querySelector("#config-form") as HTMLFormElement).onsubmit = (e) => {
		e.preventDefault();
		const form = e.target as HTMLFormElement;
		const formData = new FormData(form);
		const config: Record<string, any> = {};
		for (const [key, def] of Object.entries(schema)) {
			if (def.type === "boolean") {
				config[key] = formData.get(key) === "on";
			} else if (def.type === "number") {
				config[key] = Number(formData.get(key));
			} else {
				config[key] = formData.get(key);
			}
		}
		modal!.style.display = "none";
		onSave(config);
	};
}
