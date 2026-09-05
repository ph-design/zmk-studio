import { useEffect, useRef, type ReactNode, type RefObject } from "react";

import type { CarbonTheme } from "../carbon/theme";
import { ZoomControl } from "../carbon/CarbonChrome";
import type { LayoutZoom } from "./PhysicalLayout";

interface KeyboardCanvasProps {
  th: CarbonTheme;
  t: (k: string, d: string) => string;
  scale: LayoutZoom;
  setScale: (v: LayoutZoom) => void;
  padding?: number;
  /** Receives the fit container so the inner layout can size itself to it. */
  children: (fitContainerRef: RefObject<HTMLDivElement>) => ReactNode;
}

/*
 * The frame every full-size keyboard canvas shares: a centred scroll area that
 * doubles as the auto-fit measuring box, plus the zoom control.
 *
 * `PhysicalLayout` falls back to `element.parentElement` when no
 * `fitContainerRef` is given, which silently breaks auto-fit whenever the
 * layout is nested inside a content-sized wrapper (as it is in the lighting
 * views). Handing the ref down explicitly is the whole point of this component,
 * so every canvas fits and zooms the same way.
 *
 * Not used by the combo trigger picker: that one is a compact inline selector
 * at a fixed 1u size inside a scrolling form, not a canvas. It shares
 * `PhysicalLayout` — the key rendering — which is the part that should be
 * common.
 */
export function KeyboardCanvas({ th, t, scale, setScale, padding = 12, children }: KeyboardCanvasProps) {
  const fitContainerRef = useRef<HTMLDivElement>(null);
  const setScaleRef = useRef(setScale);
  setScaleRef.current = setScale;

  useEffect(() => {
    const el = fitContainerRef.current;
    if (!el) return;

    // Wheel zooms from the canvas's *current visual* scale, so an "auto" fit
    // continues exactly where it landed instead of jumping to 100%.
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const canvas = el.querySelector<HTMLElement>(".keyboard-scale");
      const matrix = canvas ? new DOMMatrixReadOnly(getComputedStyle(canvas).transform) : null;
      const current = matrix && matrix.a > 0 ? matrix.a : 1;
      const next = Math.min(2, Math.max(0.4, Math.round((current + (e.deltaY < 0 ? 0.1 : -0.1)) * 100) / 100));
      setScaleRef.current(next);
    };
    el.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      el.removeEventListener("wheel", onWheel);
    };
  }, []);

  return (
    <div
      ref={fitContainerRef}
      style={{
        position: "relative",
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding,
        // Panning is a translate layer with its own bounds, so a native scroll
        // bar appearing/vanishing as the canvas moves is just noise.
        overflow: "hidden",
      }}
    >
      {children(fitContainerRef)}
      <ZoomControl th={th} t={t} scale={scale} setScale={setScale} />
    </div>
  );
}
