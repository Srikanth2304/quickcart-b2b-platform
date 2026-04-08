import { useEffect, useLayoutEffect, useRef, useState } from "react";
import "./Toast.css";

const EXIT_DURATION_MS = 300;
const TOAST_DURATION_MS = 3600;

export default function Toast() {
  const [toasts, setToasts] = useState([]);
  const autoTimersRef = useRef(new Map());
  const exitTimersRef = useRef(new Map());
  const toastElsRef = useRef(new Map());
  const prevPositionsRef = useRef(new Map());

  const dismissToast = (id) => {
    const autoTimer = autoTimersRef.current.get(id);
    if (autoTimer) {
      window.clearTimeout(autoTimer);
      autoTimersRef.current.delete(id);
    }

    setToasts((prev) => {
      const hasTarget = prev.some((item) => item.id === id);
      if (!hasTarget) return prev;
      return prev.map((item) =>
        item.id === id ? { ...item, isLeaving: true } : item
      );
    });

    if (exitTimersRef.current.has(id)) return;

    const exitTimer = window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
      exitTimersRef.current.delete(id);
      prevPositionsRef.current.delete(id);
      toastElsRef.current.delete(id);
    }, EXIT_DURATION_MS);

    exitTimersRef.current.set(id, exitTimer);
  };

  useEffect(() => {
    const handleToast = (event) => {
      const { message, type } = event.detail || {};
      if (!message) return;
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { id, message, type, isLeaving: false }]);
      const timer = window.setTimeout(() => {
        dismissToast(id);
      }, TOAST_DURATION_MS);
      autoTimersRef.current.set(id, timer);
    };

    window.addEventListener("app-toast", handleToast);
    return () => {
      window.removeEventListener("app-toast", handleToast);
      autoTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      exitTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      autoTimersRef.current.clear();
      exitTimersRef.current.clear();
      prevPositionsRef.current.clear();
      toastElsRef.current.clear();
    };
  }, []);

  useLayoutEffect(() => {
    toasts.forEach((toast) => {
      const el = toastElsRef.current.get(toast.id);
      if (!el) return;

      const prevTop = prevPositionsRef.current.get(toast.id);
      const nextTop = el.getBoundingClientRect().top;

      if (prevTop !== undefined) {
        const delta = prevTop - nextTop;
        if (Math.abs(delta) > 0.5) {
          el.style.transition = "transform 0s";
          el.style.transform = `translateY(${delta}px)`;
          requestAnimationFrame(() => {
            el.style.transition = "transform 300ms ease";
            el.style.transform = "translateY(0)";
          });
        }
      }

      prevPositionsRef.current.set(toast.id, nextTop);
    });
  }, [toasts]);

  if (toasts.length === 0) return null;

  return (
    <div className="app-toast-stack" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          ref={(el) => {
            if (el) toastElsRef.current.set(toast.id, el);
            else toastElsRef.current.delete(toast.id);
          }}
          className={`app-toast ${toast.type || "success"} ${toast.isLeaving ? "is-leaving" : ""}`}
        >
          <div className="app-toast-icon-wrap" aria-hidden="true">
            <span className="app-toast-icon">{toast.type === "error" ? "!" : toast.type === "info" ? "i" : "✓"}</span>
          </div>
          <div className="app-toast-message">{toast.message}</div>
          <button
            type="button"
            className="app-toast-close"
            aria-label="Dismiss notification"
            onClick={() => dismissToast(toast.id)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
