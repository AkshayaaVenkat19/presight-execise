import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

type PopoverProps = {
  label: string;
  trigger: ReactNode;
  children: ReactNode;
  align?: "start" | "end";
  className?: string;
  triggerClassName?: string;
  panelClassName?: string;
  portal?: boolean;
};

export function Popover({
  label,
  trigger,
  children,
  align = "end",
  className = "",
  triggerClassName = "",
  panelClassName = "",
  portal = false,
}: PopoverProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open || !portal) return;
    function placePanel() {
      const trigger = triggerRef.current?.getBoundingClientRect();
      const panel = panelRef.current?.getBoundingClientRect();
      if (!trigger || !panel) return;
      const left =
        align === "start" ? trigger.left : trigger.right - panel.width;
      const top =
        trigger.bottom + 8 + panel.height <= window.innerHeight - 16
          ? trigger.bottom + 8
          : trigger.top - panel.height - 8;
      setPosition({
        left: Math.max(
          16,
          Math.min(left, window.innerWidth - panel.width - 16),
        ),
        top: Math.max(
          16,
          Math.min(top, window.innerHeight - panel.height - 16),
        ),
      });
    }
    placePanel();
    window.addEventListener("resize", placePanel);
    window.addEventListener("scroll", placePanel, true);
    return () => {
      window.removeEventListener("resize", placePanel);
      window.removeEventListener("scroll", placePanel, true);
    };
  }, [open, portal, align]);

  useEffect(() => {
    if (!open) return;

    const firstControl = panelRef.current?.querySelector<HTMLElement>(
      'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
    );
    (firstControl ?? panelRef.current)?.focus();

    function handlePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !rootRef.current?.contains(event.target) &&
        !panelRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  const panel = open ? (
    <div
      ref={panelRef}
      id={id}
      role="dialog"
      aria-label={label}
      tabIndex={-1}
      style={portal ? position : undefined}
      className={`z-30 w-56 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-surface p-1.5 text-text shadow-panel ${portal ? "fixed max-h-[calc(100dvh-2rem)] overflow-y-auto" : `absolute top-full mt-2 ${align === "start" ? "left-0" : "right-0"}`} ${panelClassName}`}
    >
      {children}
    </div>
  ) : null;

  return (
    <div
      ref={rootRef}
      className={`relative ${className}`}
      onBlur={(event) => {
        if (
          !event.currentTarget.contains(event.relatedTarget) &&
          !panelRef.current?.contains(event.relatedTarget)
        )
          setOpen(false);
      }}
      onKeyDown={(event) => {
        if (open && event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
          triggerRef.current?.focus();
        }
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        title={label}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        className={triggerClassName}
        onClick={() => setOpen((current) => !current)}
      >
        {trigger}
      </button>
      {portal ? createPortal(panel, document.body) : panel}
    </div>
  );
}
