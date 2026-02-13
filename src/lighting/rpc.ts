/**
 * RPC helpers for the lighting subsystem.
 *
 * Because `@zmkfirmware/zmk-studio-ts-client` does not yet include the
 * `lighting` subsystem, we cast through `any` when constructing requests and
 * reading responses. This is safe as long as the field tag (6) matches what the
 * firmware expects.
 */

import type { RpcConnection } from "@zmkfirmware/zmk-studio-ts-client";
import { call_rpc } from "../rpc/logging";
import type { LightingRequest, LightingResponse } from "./types";

export async function callLightingRpc(
  conn: RpcConnection,
  lighting: LightingRequest
): Promise<LightingResponse | undefined> {
  const resp = await call_rpc(conn, { lighting } as any);
  return (resp as any)?.lighting;
}
