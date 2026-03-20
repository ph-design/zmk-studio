import { useMemo } from "react";
import { Label } from "react-aria-components";
import { useTranslation } from "react-i18next";

export interface HsbColor {
  h: number; // 0-359
  s: number; // 0-100
  b: number; // 0-100
}

function hsbToHsl(h: number, s: number, b: number) {
  const s01 = s / 100;
  const b01 = b / 100;
  const l = b01 * (1 - s01 / 2);
  const sl = l === 0 || l === 1 ? 0 : (b01 - l) / Math.min(l, 1 - l);
  return { h, s: Math.round(sl * 100), l: Math.round(l * 100) };
}

/** Convert 0xRRGGBB to HSB */
export function rgbToHsb(rgb: number): HsbColor {
  const r = ((rgb >> 16) & 0xff) / 255;
  const g = ((rgb >> 8) & 0xff) / 255;
  const b = (rgb & 0xff) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;

  let h = 0;
  if (d !== 0) {
    if (max === r) h = 60 * (((g - b) / d + 6) % 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }

  const s = max === 0 ? 0 : d / max;

  return {
    h: Math.round(h),
    s: Math.round(s * 100),
    b: Math.round(max * 100),
  };
}

/** Convert HSB to 0xRRGGBB */
export function hsbToRgb(hsb: HsbColor): number {
  const s = hsb.s / 100;
  const v = hsb.b / 100;
  const c = v * s;
  const x = c * (1 - Math.abs(((hsb.h / 60) % 2) - 1));
  const m = v - c;

  let r1: number, g1: number, b1: number;
  const h = ((hsb.h % 360) + 360) % 360;
  if (h < 60) {
    r1 = c; g1 = x; b1 = 0;
  } else if (h < 120) {
    r1 = x; g1 = c; b1 = 0;
  } else if (h < 180) {
    r1 = 0; g1 = c; b1 = x;
  } else if (h < 240) {
    r1 = 0; g1 = x; b1 = c;
  } else if (h < 300) {
    r1 = x; g1 = 0; b1 = c;
  } else {
    r1 = c; g1 = 0; b1 = x;
  }

  const r = Math.round((r1 + m) * 255);
  const g = Math.round((g1 + m) * 255);
  const b = Math.round((b1 + m) * 255);

  return (r << 16) | (g << 8) | b;
}

/** Convert 0xRRGGBB to CSS hex string */
export function colorToHex(color: number): string {
  return "#" + (color & 0xffffff).toString(16).padStart(6, "0");
}

interface HsbColorPickerProps {
  hsb: HsbColor;
  onHsbChanged: (hsb: HsbColor) => void;
  disabled?: boolean;
}

export default function HsbColorPicker({
  hsb,
  onHsbChanged,
  disabled,
}: HsbColorPickerProps) {
  const { t } = useTranslation();

  const colorPreview = useMemo(() => {
    const hsl = hsbToHsl(hsb.h, hsb.s, hsb.b);
    return `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
  }, [hsb]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <Label className="text-sm text-base-content/60 w-12 shrink-0">
          {t("lighting.color")}
        </Label>
        <div
          className="flex-1 h-8 rounded border border-base-300"
          style={{ backgroundColor: colorPreview }}
        />
      </div>
      <div className="flex items-center gap-3">
        <Label className="text-sm text-base-content/60 w-12 shrink-0">
          {t("lighting.hue")}
        </Label>
        <input
          type="range"
          min={0}
          max={359}
          value={hsb.h}
          onChange={(e) =>
            onHsbChanged({ ...hsb, h: Number(e.target.value) })
          }
          disabled={disabled}
          className="flex-1 accent-primary"
        />
        <span className="text-sm text-base-content/50 w-8 text-right tabular-nums">
          {hsb.h}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <Label className="text-sm text-base-content/60 w-12 shrink-0">
          {t("lighting.sat")}
        </Label>
        <input
          type="range"
          min={0}
          max={100}
          value={hsb.s}
          onChange={(e) =>
            onHsbChanged({ ...hsb, s: Number(e.target.value) })
          }
          disabled={disabled}
          className="flex-1 accent-primary"
        />
        <span className="text-sm text-base-content/50 w-8 text-right tabular-nums">
          {hsb.s}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <Label className="text-sm text-base-content/60 w-12 shrink-0">
          {t("lighting.brt")}
        </Label>
        <input
          type="range"
          min={0}
          max={100}
          value={hsb.b}
          onChange={(e) =>
            onHsbChanged({ ...hsb, b: Number(e.target.value) })
          }
          disabled={disabled}
          className="flex-1 accent-primary"
        />
        <span className="text-sm text-base-content/50 w-8 text-right tabular-nums">
          {hsb.b}
        </span>
      </div>
    </div>
  );
}
