import { useLayoutEffect, useRef, useState } from "react";

export function calculateWindow(
  count: number,
  rowHeight: number,
  scrollTop: number,
  height: number,
  overscan = 3,
) {
  const first = Math.floor(Math.max(0, scrollTop) / rowHeight);
  const start = Math.min(Math.max(0, first - overscan), Math.max(0, count - 1));
  const end = Math.min(
    count,
    Math.max(
      start,
      Math.ceil((Math.max(0, scrollTop) + height) / rowHeight) + overscan,
    ),
  );
  return { start, end, totalHeight: count * rowHeight };
}

export function useVirtualWindow(
  count: number,
  rowHeight: number,
  headerHeight = 0,
) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const frame = useRef<number | null>(null);
  const [metrics, setMetrics] = useState({
    width: 0,
    height: 480,
    scrollTop: 0,
  });

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const measure = () =>
      setMetrics({
        width: viewport.clientWidth,
        height: viewport.clientHeight || 480,
        scrollTop: viewport.scrollTop,
      });
    measure();
    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(measure)
        : null;
    observer?.observe(viewport);
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, []);

  function onScroll() {
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      const viewport = viewportRef.current;
      if (viewport)
        setMetrics((current) => ({
          ...current,
          scrollTop: viewport.scrollTop,
        }));
    });
  }

  return {
    viewportRef,
    onScroll,
    width: metrics.width,
    ...calculateWindow(
      count,
      rowHeight,
      metrics.scrollTop - headerHeight,
      metrics.height,
    ),
  };
}
