import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Label } from "react-aria-components";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Sun, Lightbulb } from "lucide-react";

import { ConnectionContext } from "../rpc/ConnectionContext";
import { LockStateContext } from "../rpc/LockStateContext";
import { LockState } from "@zmkfirmware/zmk-studio-ts-client/core";
import { call_rpc } from "../rpc/logging";
import { useSub } from "../usePubSub";

import type {
  RgbUnderglowState,
  BacklightState,
} from "@zmkfirmware/zmk-studio-ts-client";

function hsbToHsl(h: number, s: number, b: number) {
  const s01 = s / 100;
  const b01 = b / 100;
  const l = b01 * (1 - s01 / 2);
  const sl = l === 0 || l === 1 ? 0 : (b01 - l) / Math.min(l, 1 - l);
  return { h, s: Math.round(sl * 100), l: Math.round(l * 100) };
}

type LightSource = "rgb" | "backlight";

export default function LightingControl() {
  const { t } = useTranslation();
  const conn = useContext(ConnectionContext);
  const lockState = useContext(LockStateContext);
  const isUnlocked =
    lockState === LockState.ZMK_STUDIO_CORE_LOCK_STATE_UNLOCKED;

  const [rgbState, setRgbState] = useState<RgbUnderglowState | null>(null);
  const [backlightState, setBacklightState] = useState<BacklightState | null>(
    null
  );
  const [hasRgb, setHasRgb] = useState(false);
  const [hasBacklight, setHasBacklight] = useState(false);
  const [selectedSource, setSelectedSource] = useState<LightSource>("rgb");

  useEffect(() => {
    if (!conn.conn || !isUnlocked) {
      setRgbState(null);
      setBacklightState(null);
      setHasRgb(false);
      setHasBacklight(false);
      return;
    }

    let ignore = false;

    async function fetchStates() {
      if (!conn.conn) return;

      try {
        const rgbResp = await call_rpc(conn.conn, {
          lighting: { getRgbUnderglowState: true },
        });
        if (!ignore && rgbResp.lighting?.getRgbUnderglowState) {
          setRgbState(rgbResp.lighting.getRgbUnderglowState);
          setHasRgb(true);
        }
      } catch {
        if (!ignore) setHasRgb(false);
      }

      try {
        const blResp = await call_rpc(conn.conn, {
          lighting: { getBacklightState: true },
        });
        if (!ignore && blResp.lighting?.getBacklightState) {
          setBacklightState(blResp.lighting.getBacklightState);
          setHasBacklight(true);
        }
      } catch {
        if (!ignore) setHasBacklight(false);
      }
    }

    fetchStates();
    return () => {
      ignore = true;
    };
  }, [conn, isUnlocked]);

  // Auto-select first available source
  useEffect(() => {
    if (hasRgb) {
      setSelectedSource("rgb");
    } else if (hasBacklight) {
      setSelectedSource("backlight");
    }
  }, [hasRgb, hasBacklight]);

  useSub(
    "rpc_notification.lighting.rgbUnderglowStateChanged",
    (state: RgbUnderglowState) => setRgbState(state)
  );

  useSub(
    "rpc_notification.lighting.backlightStateChanged",
    (state: BacklightState) => setBacklightState(state)
  );

  const setRgbProp = useCallback(
    async (props: Partial<RgbUnderglowState>) => {
      if (!conn.conn) return;
      try {
        const resp = await call_rpc(conn.conn, {
          lighting: { setRgbUnderglowState: props },
        });
        if (resp.lighting?.setRgbUnderglowState) {
          setRgbState((prev) => (prev ? { ...prev, ...props } : prev));
        }
      } catch (e) {
        console.error("Failed to set RGB state", e);
      }
    },
    [conn]
  );

  const setBlProp = useCallback(
    async (props: Partial<BacklightState>) => {
      if (!conn.conn) return;
      try {
        const resp = await call_rpc(conn.conn, {
          lighting: { setBacklightState: props },
        });
        if (resp.lighting?.setBacklightState) {
          setBacklightState((prev) => (prev ? { ...prev, ...props } : prev));
        }
      } catch (e) {
        console.error("Failed to set backlight state", e);
      }
    },
    [conn]
  );

  const effectNames = useMemo(() => {
    if (!rgbState) return [];
    if (rgbState.effectNames && rgbState.effectNames.length > 0) {
      return rgbState.effectNames;
    }
    const count = rgbState.effectCount ?? 0;
    return Array.from({ length: count }, (_, i) => `Effect ${i}`);
  }, [rgbState]);

  const colorPreview = useMemo(() => {
    if (!rgbState?.color) return undefined;
    const hsl = hsbToHsl(
      rgbState.color.h ?? 0,
      rgbState.color.s ?? 0,
      rgbState.color.b ?? 0
    );
    return `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
  }, [rgbState?.color]);

  if (!conn.conn || !isUnlocked) {
    return null;
  }

  if (!hasRgb && !hasBacklight) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 px-8">
        <AlertTriangle className="w-8 h-8 text-warning" />
        <span className="text-sm font-medium text-base-content">
          {t("lighting.notSupported")}
        </span>
        <p className="text-sm text-base-content/50 text-center max-w-md leading-relaxed">
          {t("lighting.notSupportedDesc")}
        </p>
      </div>
    );
  }

  const isRgbSelected = selectedSource === "rgb" && hasRgb;
  const isBlSelected = selectedSource === "backlight" && hasBacklight;

  return (
    <div className="flex gap-0 min-h-0 h-full">
      {/* Column 1: Light sources */}
      <div className="flex flex-col gap-0.5 w-36 flex-shrink-0 pr-2 border-r border-base-300 overflow-y-auto">
        {hasRgb && (
          <button
            onClick={() => setSelectedSource("rgb")}
            className={`flex items-center gap-2 px-3 py-2 rounded text-sm cursor-pointer transition-colors text-left ${
              isRgbSelected
                ? "bg-primary text-primary-content"
                : "text-base-content hover:bg-base-300"
            }`}
          >
            <Sun className="w-4 h-4 flex-shrink-0" />
            <span>{t("lighting.rgbUnderglow")}</span>
          </button>
        )}
        {hasBacklight && (
          <button
            onClick={() => setSelectedSource("backlight")}
            className={`flex items-center gap-2 px-3 py-2 rounded text-sm cursor-pointer transition-colors text-left ${
              isBlSelected
                ? "bg-primary text-primary-content"
                : "text-base-content hover:bg-base-300"
            }`}
          >
            <Lightbulb className="w-4 h-4 flex-shrink-0" />
            <span>{t("lighting.backlight")}</span>
          </button>
        )}
      </div>

      {/* Column 2: controls */}
      <div className="flex-1 min-w-0 flex flex-col items-center overflow-y-auto">
        <div className="w-2/3 flex flex-col gap-3 py-1">
        {isRgbSelected && rgbState && (
          <>
            {/* ON/OFF + effects row */}
            <div className="flex items-center gap-1 flex-wrap">
              <button
                onClick={() => setRgbProp({ on: true })}
                disabled={!isUnlocked}
                className={`px-3 py-1.5 rounded text-sm cursor-pointer transition-colors whitespace-nowrap ${
                  rgbState.on
                    ? "bg-primary text-primary-content"
                    : "text-base-content hover:bg-base-300"
                }`}
              >
                {t("lighting.on")}
              </button>
              <button
                onClick={() => setRgbProp({ on: false })}
                disabled={!isUnlocked}
                className={`px-3 py-1.5 rounded text-sm cursor-pointer transition-colors whitespace-nowrap ${
                  !rgbState.on
                    ? "bg-primary text-primary-content"
                    : "text-base-content hover:bg-base-300"
                }`}
              >
                {t("lighting.off")}
              </button>

              <span className="mx-1 h-4 border-l border-base-300" />

              {/* Effect buttons */}
                {effectNames.length > 0 && effectNames.map((name, i) => (
                  <button
                    key={i}
                    onClick={() => setRgbProp({ effect: i })}
                    disabled={!isUnlocked || !rgbState.on}
                    className={`px-3 py-1.5 rounded text-sm cursor-pointer transition-colors whitespace-nowrap ${
                      rgbState.effect === i
                        ? "bg-primary text-primary-content"
                        : "text-base-content hover:bg-base-300"
                    } ${!rgbState.on ? "opacity-40" : ""}`}
                  >
                    {name}
                  </button>
                ))}
            </div>

            {/* Sliders */}
            <div className={`flex flex-col gap-2 ${!rgbState.on ? "opacity-40 pointer-events-none" : ""}`}>
              {colorPreview && (
                <div className="flex items-center gap-3">
                  <Label className="text-sm text-base-content/60 w-12 shrink-0">
                    {t("lighting.color")}
                  </Label>
                  <div
                    className="flex-1 h-8 rounded border border-base-300"
                    style={{ backgroundColor: colorPreview }}
                  />
                </div>
              )}

              <div className="flex items-center gap-3">
                <Label className="text-sm text-base-content/60 w-12 shrink-0">
                  {t("lighting.hue")}
                </Label>
                <input
                  type="range"
                  min={0}
                  max={359}
                  value={rgbState.color?.h ?? 0}
                  onChange={(e) =>
                    setRgbProp({
                      color: {
                        h: Number(e.target.value),
                        s: rgbState.color?.s ?? 100,
                        b: rgbState.color?.b ?? 100,
                      },
                    })
                  }
                  disabled={!isUnlocked}
                  className="flex-1 accent-primary"
                />
                <span className="text-sm text-base-content/50 w-8 text-right tabular-nums">
                  {rgbState.color?.h ?? 0}
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
                  value={rgbState.color?.s ?? 0}
                  onChange={(e) =>
                    setRgbProp({
                      color: {
                        h: rgbState.color?.h ?? 0,
                        s: Number(e.target.value),
                        b: rgbState.color?.b ?? 100,
                      },
                    })
                  }
                  disabled={!isUnlocked}
                  className="flex-1 accent-primary"
                />
                <span className="text-sm text-base-content/50 w-8 text-right tabular-nums">
                  {rgbState.color?.s ?? 0}
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
                  value={rgbState.color?.b ?? 0}
                  onChange={(e) =>
                    setRgbProp({
                      color: {
                        h: rgbState.color?.h ?? 0,
                        s: rgbState.color?.s ?? 100,
                        b: Number(e.target.value),
                      },
                    })
                  }
                  disabled={!isUnlocked}
                  className="flex-1 accent-primary"
                />
                <span className="text-sm text-base-content/50 w-8 text-right tabular-nums">
                  {rgbState.color?.b ?? 0}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Label className="text-sm text-base-content/60 w-12 shrink-0">
                  {t("lighting.speed")}
                </Label>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={rgbState.speed ?? 1}
                  onChange={(e) =>
                    setRgbProp({ speed: Number(e.target.value) })
                  }
                  disabled={!isUnlocked}
                  className="flex-1 accent-primary"
                />
                <span className="text-sm text-base-content/50 w-8 text-right tabular-nums">
                  {rgbState.speed ?? 1}
                </span>
              </div>
            </div>
          </>
        )}

        {isBlSelected && backlightState && (
          <>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setBlProp({ on: true })}
                disabled={!isUnlocked}
                className={`px-3 py-1.5 rounded text-sm cursor-pointer transition-colors whitespace-nowrap ${
                  backlightState.on
                    ? "bg-primary text-primary-content"
                    : "text-base-content hover:bg-base-300"
                }`}
              >
                {t("lighting.on")}
              </button>
              <button
                onClick={() => setBlProp({ on: false })}
                disabled={!isUnlocked}
                className={`px-3 py-1.5 rounded text-sm cursor-pointer transition-colors whitespace-nowrap ${
                  !backlightState.on
                    ? "bg-primary text-primary-content"
                    : "text-base-content hover:bg-base-300"
                }`}
              >
                {t("lighting.off")}
              </button>
            </div>
            <div className={`flex flex-col gap-3 ${!backlightState.on ? "opacity-40 pointer-events-none" : ""}`}>
              <div className="flex items-center gap-3">
                <Label className="text-sm text-base-content/60 w-12 shrink-0">
                  {t("lighting.brt")}
                </Label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={backlightState.brightness}
                  onChange={(e) =>
                    setBlProp({ brightness: Number(e.target.value) })
                  }
                  disabled={!isUnlocked}
                  className="flex-1 accent-primary"
                />
                <span className="text-sm text-base-content/50 w-8 text-right tabular-nums">
                  {backlightState.brightness}
                </span>
              </div>
            </div>
          </>
        )}
        </div>
      </div>
    </div>
  );
}