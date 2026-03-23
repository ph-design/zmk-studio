import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Label } from "react-aria-components";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Sun, Lightbulb, Lock, Layers } from "lucide-react";

import { ConnectionContext } from "../rpc/ConnectionContext";
import { LockStateContext } from "../rpc/LockStateContext";
import { LockState } from "@zmkfirmware/zmk-studio-ts-client/core";
import { call_rpc } from "../rpc/logging";

import type {
  RgbUnderglowState,
  BacklightState,
  CapsLockIndicatorState,
  GetLayerLedColorsResponse,
} from "@zmkfirmware/zmk-studio-ts-client/lighting";
import type { Keymap } from "@zmkfirmware/zmk-studio-ts-client/keymap";

import HsbColorPicker, {
  type HsbColor,
  rgbToHsb,
  hsbToRgb,
} from "./HsbColorPicker";

type LightSource = "rgb" | "backlight" | "capslock" | "layerLed";

export interface LightingControlProps {
  hasLayerLed?: boolean;
  selectedLedPositions?: Set<number>;
  ledData?: GetLayerLedColorsResponse | null;
  selectedLayerIndex?: number;
  keymap?: Keymap;
  onLayerLedColorChanged?: (positions: number[], color: number) => void;
  layerLedEnabled?: boolean;
  onLayerLedEnabledChanged?: (enabled: boolean) => void;
  rgbState: RgbUnderglowState | null;
  setRgbState: React.Dispatch<React.SetStateAction<RgbUnderglowState | null>>;
  backlightState: BacklightState | null;
  setBacklightState: React.Dispatch<React.SetStateAction<BacklightState | null>>;
  capsLockState: CapsLockIndicatorState | null;
  setCapsLockState: React.Dispatch<React.SetStateAction<CapsLockIndicatorState | null>>;
  hasRgb: boolean;
  hasBacklight: boolean;
  hasCapsLock: boolean;
}

export default function LightingControl({
  hasLayerLed,
  selectedLedPositions,
  ledData,
  selectedLayerIndex,
  keymap,
  onLayerLedColorChanged,
  layerLedEnabled,
  onLayerLedEnabledChanged,
  rgbState,
  setRgbState,
  backlightState,
  setBacklightState,
  capsLockState,
  setCapsLockState,
  hasRgb,
  hasBacklight,
  hasCapsLock,
}: LightingControlProps) {
  const { t } = useTranslation();
  const conn = useContext(ConnectionContext);
  const lockState = useContext(LockStateContext);
  const isUnlocked =
    lockState === LockState.ZMK_STUDIO_CORE_LOCK_STATE_UNLOCKED;

  const [selectedSource, setSelectedSource] = useState<LightSource>("rgb");

  const [layerLedHsb, setLayerLedHsb] = useState<HsbColor>({ h: 0, s: 100, b: 100 });

  const [capsOnHsb, setCapsOnHsb] = useState<HsbColor>({ h: 0, s: 100, b: 100 });
  const [capsOffHsb, setCapsOffHsb] = useState<HsbColor>({ h: 0, s: 0, b: 0 });

  useEffect(() => {
    if (!capsLockState) return;
    setCapsOnHsb(rgbToHsb(capsLockState.onColor));
    setCapsOffHsb(rgbToHsb(capsLockState.offColor));
  }, [capsLockState]);

  useEffect(() => {
    if (!selectedLedPositions || selectedLedPositions.size === 0 || !ledData || !keymap) return;
    const layerIdx = selectedLayerIndex ?? 0;
    const layerId = keymap.layers[layerIdx]?.id;
    if (layerId === undefined) return;
    const firstPos = Math.min(...selectedLedPositions);
    const layerConfig = ledData.layers.find((l) => l.layerId === layerId);
    const binding = layerConfig?.bindings.find((b) => b.keyPosition === firstPos);
    const color = binding?.color ?? 0;
    if (color > 0) {
      setLayerLedHsb(rgbToHsb(color));
    } else {
      setLayerLedHsb({ h: 0, s: 100, b: 100 });
    }
  }, [selectedLedPositions, ledData, keymap, selectedLayerIndex]);

  const handleLayerLedHsbChanged = useCallback(
    (hsb: HsbColor) => {
      setLayerLedHsb(hsb);
      if (!selectedLedPositions || selectedLedPositions.size === 0 || !onLayerLedColorChanged) return;
      const rgbColor = hsbToRgb(hsb);
      onLayerLedColorChanged(Array.from(selectedLedPositions), rgbColor);
    },
    [selectedLedPositions, onLayerLedColorChanged]
  );

  const handleClearLayerLed = useCallback(() => {
    if (!selectedLedPositions || selectedLedPositions.size === 0 || !onLayerLedColorChanged) return;
    onLayerLedColorChanged(Array.from(selectedLedPositions), 0);
  }, [selectedLedPositions, onLayerLedColorChanged]);

  useEffect(() => {
    if (hasRgb) {
      setSelectedSource("rgb");
    } else if (hasBacklight) {
      setSelectedSource("backlight");
    } else if (hasLayerLed) {
      setSelectedSource("layerLed");
    }
  }, [hasRgb, hasBacklight, hasLayerLed]);

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

  const setCapsLockProp = useCallback(
    async (props: Partial<{ enabled: boolean; offColor: number; onColor: number }>) => {
      if (!conn.conn) return;
      try {
        const resp = await call_rpc(conn.conn, {
          lighting: { setCapsLockIndicator: props },
        });
        if (resp.lighting?.setCapsLockIndicator) {
          setCapsLockState((prev) => (prev ? { ...prev, ...props } : prev));
        }
      } catch (e) {
        console.error("Failed to set CapsLock indicator", e);
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

  if (!conn.conn || !isUnlocked) {
    return null;
  }

  if (!hasRgb && !hasBacklight && !hasCapsLock && !hasLayerLed) {
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
  const isCapsSelected = selectedSource === "capslock" && hasCapsLock;
  const isLayerLedSelected = selectedSource === "layerLed" && hasLayerLed;

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
        {hasCapsLock && (
          <button
            onClick={() => setSelectedSource("capslock")}
            className={`flex items-center gap-2 px-3 py-2 rounded text-sm cursor-pointer transition-colors text-left ${
              isCapsSelected
                ? "bg-primary text-primary-content"
                : "text-base-content hover:bg-base-300"
            }`}
          >
            <Lock className="w-4 h-4 flex-shrink-0" />
            <span>{t("lighting.capsLock.title")}</span>
          </button>
        )}
        {hasLayerLed && (
          <button
            onClick={() => setSelectedSource("layerLed")}
            className={`flex items-center gap-2 px-3 py-2 rounded text-sm cursor-pointer transition-colors text-left ${
              isLayerLedSelected
                ? "bg-primary text-primary-content"
                : "text-base-content hover:bg-base-300"
            }`}
          >
            <Layers className="w-4 h-4 flex-shrink-0" />
            <span>{t("lighting.layerLed.title")}</span>
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
              <HsbColorPicker
                hsb={{
                  h: rgbState.color?.h ?? 0,
                  s: rgbState.color?.s ?? 0,
                  b: rgbState.color?.b ?? 0,
                }}
                onHsbChanged={(hsb) =>
                  setRgbProp({ color: { h: hsb.h, s: hsb.s, b: hsb.b } })
                }
                disabled={!isUnlocked}
              />
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

        {isCapsSelected && capsLockState && (
          <>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCapsLockProp({ enabled: true })}
                disabled={!isUnlocked}
                className={`px-3 py-1.5 rounded text-sm cursor-pointer transition-colors whitespace-nowrap ${
                  capsLockState.enabled
                    ? "bg-primary text-primary-content"
                    : "text-base-content hover:bg-base-300"
                }`}
              >
                {t("lighting.on")}
              </button>
              <button
                onClick={() => setCapsLockProp({ enabled: false })}
                disabled={!isUnlocked}
                className={`px-3 py-1.5 rounded text-sm cursor-pointer transition-colors whitespace-nowrap ${
                  !capsLockState.enabled
                    ? "bg-primary text-primary-content"
                    : "text-base-content hover:bg-base-300"
                }`}
              >
                {t("lighting.off")}
              </button>
            </div>

            <div className={`flex gap-4 ${!capsLockState.enabled ? "opacity-40 pointer-events-none" : ""}`}>
              <div className="flex-1 flex flex-col gap-2">
                <Label className="text-sm text-base-content/60 font-medium">
                  {t("lighting.capsLock.onColor")}
                </Label>
                <HsbColorPicker
                  hsb={capsOnHsb}
                  onHsbChanged={(hsb) => {
                    setCapsOnHsb(hsb);
                    setCapsLockProp({ onColor: hsbToRgb(hsb) });
                  }}
                  disabled={!isUnlocked}
                />
              </div>
              <div className="flex-1 flex flex-col gap-2">
                <Label className="text-sm text-base-content/60 font-medium">
                  {t("lighting.capsLock.offColor")}
                </Label>
                <HsbColorPicker
                  hsb={capsOffHsb}
                  onHsbChanged={(hsb) => {
                    setCapsOffHsb(hsb);
                    setCapsLockProp({ offColor: hsbToRgb(hsb) });
                  }}
                  disabled={!isUnlocked}
                />
              </div>
            </div>
            {capsLockState.keyPosition > 0 && (
              <div className="text-sm text-base-content/50">
                {t("lighting.capsLock.keyPosition", { pos: capsLockState.keyPosition })}
              </div>
            )}
          </>
        )}

        {isLayerLedSelected && (
          <>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onLayerLedEnabledChanged?.(true)}
                disabled={!isUnlocked}
                className={`px-3 py-1.5 rounded text-sm cursor-pointer transition-colors whitespace-nowrap ${
                  layerLedEnabled
                    ? "bg-primary text-primary-content"
                    : "text-base-content hover:bg-base-300"
                }`}
              >
                {t("lighting.on")}
              </button>
              <button
                onClick={() => onLayerLedEnabledChanged?.(false)}
                disabled={!isUnlocked}
                className={`px-3 py-1.5 rounded text-sm cursor-pointer transition-colors whitespace-nowrap ${
                  !layerLedEnabled
                    ? "bg-primary text-primary-content"
                    : "text-base-content hover:bg-base-300"
                }`}
              >
                {t("lighting.off")}
              </button>
            </div>
            <div className={`flex flex-col gap-2 ${!layerLedEnabled ? "opacity-40 pointer-events-none" : ""}`}>
              {(!selectedLedPositions || selectedLedPositions.size === 0) ? (
                <div className="text-sm text-base-content/50">
                  {t("lighting.layerLed.selectKey")}
                </div>
              ) : (
                <>
                  <div className="text-sm text-base-content/60 mb-1">
                    {selectedLedPositions.size === 1
                      ? t("lighting.layerLed.editKey", { key: Math.min(...selectedLedPositions) })
                      : t("lighting.layerLed.editKeys", { count: selectedLedPositions.size })}
                  </div>
                  <HsbColorPicker
                    hsb={layerLedHsb}
                    onHsbChanged={handleLayerLedHsbChanged}
                    disabled={!isUnlocked}
                  />
                  <button
                    onClick={handleClearLayerLed}
                    disabled={!isUnlocked}
                    className="mt-1 px-3 py-1.5 rounded text-sm cursor-pointer transition-colors bg-base-300 hover:bg-base-content/20 self-start"
                  >
                    {t("lighting.layerLed.clear")}
                  </button>
                </>
              )}
            </div>
          </>
        )}
        </div>
      </div>
    </div>
  );
}