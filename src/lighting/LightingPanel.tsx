import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Slider,
  SliderTrack,
  SliderThumb,
  SliderOutput,
  Label,
  Switch,
} from "react-aria-components";
import { Save } from "lucide-react";

import { ConnectionContext } from "../rpc/ConnectionContext";
import { LockStateContext } from "../rpc/LockStateContext";
import { LockState } from "@zmkfirmware/zmk-studio-ts-client/core";
import { useSub } from "../usePubSub";
import { callLightingRpc } from "./rpc";
import type { LightingState } from "./types";
import { SetLightingResponse } from "./types";

/** Convert HSB (H 0-360, S 0-100, B 0-100) to CSS hsl() string. */
function hsbToHsl(h: number, s: number, b: number): string {
  const s01 = s / 100;
  const b01 = b / 100;
  const l = b01 * (1 - s01 / 2);
  const sl =
    l === 0 || l === 1 ? 0 : (b01 - l) / Math.min(l, 1 - l);
  return `hsl(${h}, ${Math.round(sl * 100)}%, ${Math.round(l * 100)}%)`;
}

export default function LightingPanel() {
  const { t } = useTranslation();
  const conn = useContext(ConnectionContext);
  const lockState = useContext(LockStateContext);

  const isUnlocked =
    lockState === LockState.ZMK_STUDIO_CORE_LOCK_STATE_UNLOCKED;

  // --------------- state ---------------
  const [state, setState] = useState<LightingState | null>(null);
  const [effects, setEffects] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // --------------- fetch ---------------
  useEffect(() => {
    if (!conn.conn || !isUnlocked) {
      setState(null);
      setEffects([]);
      return;
    }

    let ignore = false;

    async function fetchData() {
      if (!conn.conn) return;

      const [stateResp, effectsResp] = await Promise.all([
        callLightingRpc(conn.conn, { getState: true }),
        callLightingRpc(conn.conn, { listEffects: true }),
      ]);

      if (ignore) return;

      if (stateResp?.getState) {
        setState(stateResp.getState);
      }
      if (effectsResp?.listEffects) {
        setEffects(effectsResp.listEffects.effects);
      }
    }

    fetchData();
    return () => {
      ignore = true;
    };
  }, [conn, isUnlocked]);

  // --------------- notifications ---------------
  useSub("rpc_notification.lighting.stateChanged", (newState: LightingState) =>
    setState(newState)
  );

  // --------------- handlers ---------------
  const setPower = useCallback(
    async (on: boolean) => {
      if (!conn.conn) return;
      const resp = await callLightingRpc(conn.conn, { setPower: { on } });
      if (resp?.setPower === SetLightingResponse.OK) {
        setState((prev) => (prev ? { ...prev, on } : prev));
      }
    },
    [conn]
  );

  const setEffect = useCallback(
    async (effectIndex: number) => {
      if (!conn.conn) return;
      const resp = await callLightingRpc(conn.conn, {
        setEffect: { effectIndex },
      });
      if (resp?.setEffect === SetLightingResponse.OK) {
        setState((prev) =>
          prev ? { ...prev, activeEffect: effectIndex } : prev
        );
      }
    },
    [conn]
  );

  const setColor = useCallback(
    async (hue: number, saturation: number, brightness: number) => {
      if (!conn.conn) return;
      const resp = await callLightingRpc(conn.conn, {
        setColor: { hue, saturation, brightness },
      });
      if (resp?.setColor === SetLightingResponse.OK) {
        setState((prev) =>
          prev ? { ...prev, hue, saturation, brightness } : prev
        );
      }
    },
    [conn]
  );

  const setSpeed = useCallback(
    async (speed: number) => {
      if (!conn.conn) return;
      const resp = await callLightingRpc(conn.conn, {
        setSpeed: { speed },
      });
      if (resp?.setSpeed === SetLightingResponse.OK) {
        setState((prev) => (prev ? { ...prev, speed } : prev));
      }
    },
    [conn]
  );

  const setBrightness = useCallback(
    async (brightness: number) => {
      if (!conn.conn) return;
      const resp = await callLightingRpc(conn.conn, {
        setBrightness: { brightness },
      });
      if (resp?.setBrightness === SetLightingResponse.OK) {
        setState((prev) => (prev ? { ...prev, brightness } : prev));
      }
    },
    [conn]
  );

  const saveState = useCallback(async () => {
    if (!conn.conn) return;
    setSaving(true);
    try {
      await callLightingRpc(conn.conn, { saveState: true });
    } finally {
      setSaving(false);
    }
  }, [conn]);

  // --------------- derived ---------------
  const previewColor = useMemo(() => {
    if (!state) return "transparent";
    return hsbToHsl(state.hue, state.saturation, state.brightness);
  }, [state]);

  // --------------- hue gradient ---------------
  const hueGradient =
    "linear-gradient(to right, hsl(0,100%,50%), hsl(60,100%,50%), hsl(120,100%,50%), hsl(180,100%,50%), hsl(240,100%,50%), hsl(300,100%,50%), hsl(360,100%,50%))";

  // --------------- render ---------------
  if (!conn.conn || !isUnlocked) {
    return (
      <div className="flex items-center justify-center h-full text-base-content/40 text-sm">
        {t("lighting.connectFirst")}
      </div>
    );
  }

  if (!state) {
    return (
      <div className="flex items-center justify-center h-full text-base-content/40 text-sm">
        {t("lighting.loading")}
      </div>
    );
  }

  return (
    <div className="flex items-start justify-center h-full bg-base-300 p-6 overflow-auto">
      <div className="w-full max-w-xl flex flex-col gap-6">
        {/* ---- Power + Effect ---- */}
        <div className="flex items-center gap-6">
          <Switch
            isSelected={state.on}
            onChange={setPower}
            className="group flex items-center gap-3 cursor-pointer outline-none"
          >
            <div className="w-11 h-6 rounded-full bg-base-100 group-rac-selected:bg-primary transition-colors flex items-center px-0.5">
              <span className="block w-5 h-5 rounded-full bg-base-content/60 transition-transform group-rac-selected:translate-x-5 group-rac-selected:bg-primary-content" />
            </div>
            <span className="text-sm text-base-content select-none">
              {state.on ? t("lighting.on") : t("lighting.off")}
            </span>
          </Switch>

          <select
            className="flex-1 h-9 rounded px-3 bg-base-100 text-base-content text-sm outline-none focus:ring-2 focus:ring-primary"
            value={state.activeEffect}
            onChange={(e) => setEffect(Number(e.target.value))}
            disabled={!state.on}
          >
            {effects.map((name, i) => (
              <option key={i} value={i}>
                {name}
              </option>
            ))}
          </select>
        </div>

        {/* ---- Color Preview ---- */}
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-lg border border-base-100 flex-shrink-0 transition-colors"
            style={{ backgroundColor: state.on ? previewColor : "transparent" }}
          />
          <div className="flex-1 flex flex-col gap-4">
            {/* Hue */}
            <Slider
              className="w-full"
              minValue={0}
              maxValue={360}
              step={1}
              value={state.hue}
              isDisabled={!state.on}
              onChange={(v) =>
                setState((prev) => (prev ? { ...prev, hue: v } : prev))
              }
              onChangeEnd={(v) =>
                setColor(v, state.saturation, state.brightness)
              }
            >
              <div className="flex justify-between mb-1">
                <Label className="text-sm text-base-content/60">
                  {t("lighting.hue")}
                </Label>
                <SliderOutput className="text-sm text-base-content">
                  {({ state: s }) => `${s.values[0]}°`}
                </SliderOutput>
              </div>
              <SliderTrack
                className="h-3 rounded-full relative"
                style={{ background: hueGradient }}
              >
                <SliderThumb className="w-5 h-5 rounded-full bg-white border-2 border-base-content/40 shadow top-1/2 cursor-grab outline-none focus-visible:ring-2 focus-visible:ring-primary dragging:cursor-grabbing" />
              </SliderTrack>
            </Slider>

            {/* Saturation */}
            <Slider
              className="w-full"
              minValue={0}
              maxValue={100}
              step={1}
              value={state.saturation}
              isDisabled={!state.on}
              onChange={(v) =>
                setState((prev) =>
                  prev ? { ...prev, saturation: v } : prev
                )
              }
              onChangeEnd={(v) => setColor(state.hue, v, state.brightness)}
            >
              <div className="flex justify-between mb-1">
                <Label className="text-sm text-base-content/60">
                  {t("lighting.saturation")}
                </Label>
                <SliderOutput className="text-sm text-base-content">
                  {({ state: s }) => `${s.values[0]}%`}
                </SliderOutput>
              </div>
              <SliderTrack
                className="h-3 rounded-full relative"
                style={{
                  background: `linear-gradient(to right, ${hsbToHsl(state.hue, 0, state.brightness)}, ${hsbToHsl(state.hue, 100, state.brightness)})`,
                }}
              >
                <SliderThumb className="w-5 h-5 rounded-full bg-white border-2 border-base-content/40 shadow top-1/2 cursor-grab outline-none focus-visible:ring-2 focus-visible:ring-primary dragging:cursor-grabbing" />
              </SliderTrack>
            </Slider>
          </div>
        </div>

        {/* ---- Brightness ---- */}
        <Slider
          className="w-full"
          minValue={0}
          maxValue={100}
          step={1}
          value={state.brightness}
          isDisabled={!state.on}
          onChange={(v) =>
            setState((prev) => (prev ? { ...prev, brightness: v } : prev))
          }
          onChangeEnd={setBrightness}
        >
          <div className="flex justify-between mb-1">
            <Label className="text-sm text-base-content/60">
              {t("lighting.brightness")}
            </Label>
            <SliderOutput className="text-sm text-base-content">
              {({ state: s }) => `${s.values[0]}%`}
            </SliderOutput>
          </div>
          <SliderTrack
            className="h-3 rounded-full relative"
            style={{
              background: `linear-gradient(to right, ${hsbToHsl(state.hue, state.saturation, 0)}, ${hsbToHsl(state.hue, state.saturation, 100)})`,
            }}
          >
            <SliderThumb className="w-5 h-5 rounded-full bg-white border-2 border-base-content/40 shadow top-1/2 cursor-grab outline-none focus-visible:ring-2 focus-visible:ring-primary dragging:cursor-grabbing" />
          </SliderTrack>
        </Slider>

        {/* ---- Speed ---- */}
        <Slider
          className="w-full"
          minValue={1}
          maxValue={5}
          step={1}
          value={state.speed}
          isDisabled={!state.on}
          onChange={(v) =>
            setState((prev) => (prev ? { ...prev, speed: v } : prev))
          }
          onChangeEnd={setSpeed}
        >
          <div className="flex justify-between mb-1">
            <Label className="text-sm text-base-content/60">
              {t("lighting.speed")}
            </Label>
            <SliderOutput className="text-sm text-base-content" />
          </div>
          <SliderTrack className="h-3 rounded-full bg-base-100 relative">
            <SliderThumb className="w-5 h-5 rounded-full bg-primary border-2 border-primary-content shadow top-1/2 cursor-grab outline-none focus-visible:ring-2 focus-visible:ring-primary dragging:cursor-grabbing" />
          </SliderTrack>
        </Slider>

        {/* ---- Save ---- */}
        <div className="flex justify-end">
          <button
            onClick={saveState}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded bg-primary text-primary-content text-sm font-medium cursor-pointer transition-colors hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {saving ? t("lighting.saving") : t("lighting.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
