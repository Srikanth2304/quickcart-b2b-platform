export default function DependencyWarningDialog({
  open,
  title,
  message,
  items,
  loading,
  onClose,
  onForceDelete,
}) {
  if (!open) return null;

  return (
    <div className="sa-modal-backdrop" onClick={onClose} role="presentation">
      <div className="sa-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
        <header>{title}</header>
        <section>
          <p style={{ margin: 0, color: "#334155" }}>{message}</p>
          <div className="catalog-dependency-list">
            {items && items.length > 0 ? (
              <ul>
                {items.map((item, idx) => (
                  <li key={item?.id || item?.productId || String(item) || idx}>
                    <span>
                      {typeof item === "string"
                        ? item
                        : item?.name || item?.productName || item?.title || "Unknown Product"}
                    </span>
                    <small>
                      #{typeof item === "string" ? "-" : item?.id || item?.productId || "-"}
                    </small>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="sa-empty" style={{ margin: 0 }}>No dependency details provided by backend.</p>
            )}
          </div>
        </section>
        <footer>
          <button type="button" className="sa-btn secondary" onClick={onClose}>Cancel</button>
          {onForceDelete && (
            <button type="button" className="sa-btn danger" onClick={onForceDelete} disabled={loading}>
              {loading ? "Working..." : "Force Delete"}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
