import { useEffect, useRef, useState } from "react";
import "./Toast.css";

export default function Toast() {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  useEffect(() => {
    const handleToast = (event) => {
      const { message, type } = event.detail || {};
      if (!message) return;
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { id, message, type }]);
      const timer = window.setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== id));
        timersRef.current.delete(id);
      }, 2800);
      timersRef.current.set(id, timer);
    };

    window.addEventListener("app-toast", handleToast);
    return () => {
      window.removeEventListener("app-toast", handleToast);
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
      timersRef.current.clear();
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="app-toast-stack" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`app-toast ${toast.type || "success"}`}>
          {toast.message}
        </div>
      ))}
    </div>
  );
}
