/**
 * Local type definitions for the lighting RPC subsystem.
 *
 * These mirror the protobuf schema defined in `lighting.proto` on the firmware
 * side. Once the upstream `zmk-studio-ts-client` package adds native lighting
 * support, these types can be replaced by the generated ones.
 */

export interface LightingState {
  on: boolean;
  activeEffect: number;
  hue: number; // 0-360
  saturation: number; // 0-100
  brightness: number; // 0-100
  speed: number; // 1-5
}

export interface EffectList {
  effects: string[];
}

export enum SetLightingResponse {
  OK = 0,
  ERROR = 1,
  INVALID_INDEX = 2,
}

export interface LightingRequest {
  getState?: boolean;
  setPower?: { on: boolean };
  setEffect?: { effectIndex: number };
  setColor?: { hue: number; saturation: number; brightness: number };
  setSpeed?: { speed: number };
  setBrightness?: { brightness: number };
  listEffects?: boolean;
  saveState?: boolean;
}

export interface LightingResponse {
  getState?: LightingState;
  setPower?: SetLightingResponse;
  setEffect?: SetLightingResponse;
  setColor?: SetLightingResponse;
  setSpeed?: SetLightingResponse;
  setBrightness?: SetLightingResponse;
  listEffects?: EffectList;
  saveState?: SetLightingResponse;
}

export interface LightingNotification {
  stateChanged?: LightingState;
}
