export default function ConfirmDialog({ open, title, message, confirmText = "Confirm", loading, onClose, onConfirm }) {
  if (!open) return null;

  return (
    <div className="sa-modal-backdrop" onClick={onClose} role="presentation">
      <div className="sa-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
        <header>{title}</header>
        <section>
          <p style={{ margin: 0, color: "#334155" }}>{message}</p>
        </section>
        <footer>
          <button type="button" className="sa-btn secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="sa-btn danger" onClick={onConfirm} disabled={loading}>
            {loading ? "Working..." : confirmText}
          </button>
        </footer>
      </div>
    </div>
  );
}
