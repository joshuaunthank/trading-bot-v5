// strategyConfig.ts

export interface ModalOptions {
	id: string;
	title: string;
	content: string;
	onOpen?: () => void;
	onClose?: () => void;
}

export function createModal({
	id,
	title,
	content,
	onOpen,
	onClose,
}: ModalOptions) {
	let modal = document.getElementById(id) as HTMLDivElement | null;
	if (!modal) {
		modal = document.createElement("div");
		modal.id = id;
		modal.className = "modal";
		modal.style.display = "none";
		modal.innerHTML = `
      <div class="modal-content">
        <h3>${title}</h3>
        <div class="modal-body">${content}</div>
        <button class="close-modal-btn">Close</button>
      </div>
    `;
		document.body.appendChild(modal);
	}
	const closeBtn = modal.querySelector(".close-modal-btn")!;
	closeBtn.addEventListener("click", () => {
		modal!.style.display = "none";
		if (onClose) onClose();
	});
	return {
		open: () => {
			modal!.style.display = "block";
			if (onOpen) onOpen();
		},
		close: () => {
			modal!.style.display = "none";
			if (onClose) onClose();
		},
		modal,
	};
}
