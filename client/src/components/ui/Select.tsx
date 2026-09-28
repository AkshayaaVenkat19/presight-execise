import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./Icon";

interface SelectProps {
  id: string;
  value: string;
  options: { value: string; label: string }[];
  onValueChange: (value: string) => void;
  wrapperClassName?: string;
}

export function Select({
  id,
  value,
  options,
  onValueChange,
  wrapperClassName = "",
}: SelectProps) {
  const listId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [position, setPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
    maxHeight: 240,
  });
  const selected = options.findIndex((option) => option.value === value);

  function show() {
    setActive(Math.max(0, selected));
    setOpen(true);
  }

  function choose(index: number) {
    if (!options[index]) return;
    onValueChange(options[index].value);
    setOpen(false);
    trigger.current?.focus();
  }

  useLayoutEffect(() => {
    if (!open) return;
    function positionPanel() {
      const rect = trigger.current?.getBoundingClientRect();
      if (!rect) return;
      setPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        maxHeight: Math.max(
          0,
          Math.min(240, window.innerHeight - rect.bottom - 12),
        ),
      });
    }
    positionPanel();
    window.addEventListener("resize", positionPanel);
    window.addEventListener("scroll", positionPanel, true);
    return () => {
      window.removeEventListener("resize", positionPanel);
      window.removeEventListener("scroll", positionPanel, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function dismiss(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !trigger.current?.contains(event.target) &&
        !panel.current?.contains(event.target)
      )
        setOpen(false);
    }
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open]);

  useEffect(() => {
    if (open)
      document
        .getElementById(`${listId}-${active}`)
        ?.scrollIntoView?.({ block: "nearest" });
  }, [open, active, listId]);

  return (
    <span className={`relative inline-block min-w-0 ${wrapperClassName}`}>
      <button
        ref={trigger}
        id={id}
        type="button"
        value={value}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        className="flex min-h-11 w-full items-center justify-between gap-4 rounded-[9px] border border-border bg-surface px-2.5 py-2 text-left text-[11px] text-text focus:border-accent"
        onClick={() => (open ? setOpen(false) : show())}
        onBlur={() => setOpen(false)}
        onKeyDown={(event) => {
          if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
            event.preventDefault();
            if (!open) show();
            else
              setActive((current) =>
                event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? options.length - 1
                    : Math.max(
                        0,
                        Math.min(
                          options.length - 1,
                          current + (event.key === "ArrowDown" ? 1 : -1),
                        ),
                      ),
              );
          } else if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (open) choose(active);
            else show();
          } else if (event.key === "Escape") {
            event.preventDefault();
            setOpen(false);
          } else if (
            event.key.length === 1 &&
            !event.ctrlKey &&
            !event.metaKey &&
            !event.altKey
          ) {
            const match = options.findIndex((option) =>
              option.label.toLowerCase().startsWith(event.key.toLowerCase()),
            );
            if (match >= 0) {
              event.preventDefault();
              setActive(match);
              setOpen(true);
            }
          }
        }}
      >
        <span className="truncate">{options[selected]?.label}</span>
        <Icon
          name="chevron-down"
          width="16"
          height="16"
          className="text-muted"
        />
      </button>
      {open &&
        createPortal(
          <div
            ref={panel}
            id={listId}
            role="listbox"
            aria-labelledby={id}
            style={position}
            className="scrollbar-thin fixed z-40 overflow-y-auto rounded-[9px] border border-border bg-surface-soft p-1 text-text shadow-panel"
            onMouseDown={(event) => event.preventDefault()}
          >
            {options.map((option, index) => (
              <div
                key={option.value}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={option.value === value}
                className={`cursor-pointer rounded-md px-2.5 py-2 text-[11px] ${active === index ? "bg-surface text-accent" : "hover:bg-surface"}`}
                onMouseMove={() => setActive(index)}
                onClick={() => choose(index)}
              >
                {option.label}
              </div>
            ))}
          </div>,
          document.body,
        )}
    </span>
  );
}
