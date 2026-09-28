import { useLayoutEffect, useRef, useState } from "react";

import {
  DEFAULT_VIEWPORT_HEIGHT_PX,
  VIRTUAL_OVERSCAN_ROWS,
} from "../constants/ui";

export function calculateWindow(
  count: number,
  rowHeight: number,
  scrollTop: number,
  height: number,
  overscan = VIRTUAL_OVERSCAN_ROWS,
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
    height: DEFAULT_VIEWPORT_HEIGHT_PX,
    scrollTop: 0,
  });

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const measure = () => {
      const next = {
        width: viewport.clientWidth,
        height: viewport.clientHeight || DEFAULT_VIEWPORT_HEIGHT_PX,
        scrollTop: viewport.scrollTop,
      };
      setMetrics((current) =>
        current.width === next.width &&
        current.height === next.height &&
        current.scrollTop === next.scrollTop
          ? current
          : next,
      );
    };
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
        setMetrics((current) =>
          current.scrollTop === viewport.scrollTop
            ? current
            : { ...current, scrollTop: viewport.scrollTop },
        );
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
