import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type Toast = { message: string; type: "success" | "error" };
const ToastContext = createContext<
  (message: string, type: Toast["type"]) => void
>(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const notify = useCallback(
    (message: string, type: Toast["type"]) => setToast({ message, type }),
    [],
  );
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 6000);
    return () => window.clearTimeout(timer);
  }, [toast]);
  return (
    <ToastContext.Provider value={notify}>
      {children}
      {toast && (
        <div
          role={toast.type === "error" ? "alert" : "status"}
          className={`fixed right-4 bottom-4 z-50 flex max-w-[calc(100vw-2rem)] items-center gap-4 rounded-xl border border-border p-4 shadow-panel ${toast.type === "error" ? "bg-danger-soft text-danger" : "bg-support-soft text-support"}`}
        >
          <p>{toast.message}</p>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => setToast(null)}
          >
            ×
          </button>
        </div>
      )}
    </ToastContext.Provider>
  );
}
