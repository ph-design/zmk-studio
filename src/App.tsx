import { create_rpc_connection } from "@zmkfirmware/zmk-studio-ts-client";
import { call_rpc } from "./rpc/logging";
import i18n from "./i18n";
import { I18nextProvider, useTranslation } from "react-i18next";

import type { Notification } from "@zmkfirmware/zmk-studio-ts-client/studio";
import { ConnectionState, ConnectionContext } from "./rpc/ConnectionContext";
import { Dispatch, useCallback, useEffect, useState } from "react";
import { ConnectModal, TransportFactory } from "./ConnectModal";

import type { RpcTransport } from "@zmkfirmware/zmk-studio-ts-client/transport/index";
import { connect as gatt_connect } from "@zmkfirmware/zmk-studio-ts-client/transport/gatt";
import { connect as serial_connect } from "@zmkfirmware/zmk-studio-ts-client/transport/serial";
import {
  connect as tauri_ble_connect,
  list_devices as ble_list_devices,
} from "./tauri/ble";
import {
  connect as tauri_serial_connect,
  list_devices as serial_list_devices,
} from "./tauri/serial";
import Keyboard from "./keyboard/Keyboard";
import { UndoRedoContext, useUndoRedo } from "./undoRedo";
import { usePub, useSub } from "./usePubSub";
import { LockState } from "@zmkfirmware/zmk-studio-ts-client/core";
import { LockStateContext } from "./rpc/LockStateContext";
// import { UnlockModal } from "./UnlockModal"; // Removed, replaced by SystemPanel bubble
import { valueAfter } from "./misc/async";
import { AboutModal } from "./AboutModal";
import { LicenseNoticeModal } from "./misc/LicenseNoticeModal";
import { ConnectCard } from "./ui/ConnectCard";

declare global {
  interface Window {
    __TAURI_INTERNALS__?: object;
  }
}

const TRANSPORTS: TransportFactory[] = [
  navigator.serial && { label: "USB", connect: serial_connect },
  ...(navigator.bluetooth && navigator.userAgent.indexOf("Linux") >= 0
    ? [{ label: "BLE", connect: gatt_connect }]
    : []),
  ...(window.__TAURI_INTERNALS__
    ? [
      {
        label: "BLE",
        isWireless: true,
        pick_and_connect: {
          connect: tauri_ble_connect,
          list: ble_list_devices,
        },
      },
    ]
    : []),
  ...(window.__TAURI_INTERNALS__
    ? [
      {
        label: "USB",
        pick_and_connect: {
          connect: tauri_serial_connect,
          list: serial_list_devices,
        },
      },
    ]
    : []),
].filter((t) => t !== undefined);

async function listen_for_notifications(
  notification_stream: ReadableStream<Notification>,
  signal: AbortSignal
): Promise<void> {
  let reader = notification_stream.getReader();
  const onAbort = () => {
    reader.cancel();
    reader.releaseLock();
  };
  signal.addEventListener("abort", onAbort, { once: true });
  do {
    let pub = usePub();

    try {
      let { done, value } = await reader.read();
      if (done) {
        break;
      }

      if (!value) {
        continue;
      }

      console.log("Notification", value);
      pub("rpc_notification", value);

      const subsystem = Object.entries(value).find(
        ([_k, v]) => v !== undefined
      );
      if (!subsystem) {
        continue;
      }

      const [subId, subData] = subsystem;
      const event = Object.entries(subData).find(([_k, v]) => v !== undefined);

      if (!event) {
        continue;
      }

      const [eventName, eventData] = event;
      const topic = ["rpc_notification", subId, eventName].join(".");

      pub(topic, eventData);
    } catch (e) {
      signal.removeEventListener("abort", onAbort);
      reader.releaseLock();
      throw e;
    }
  } while (true);

  signal.removeEventListener("abort", onAbort);
  reader.releaseLock();
  notification_stream.cancel();
}

async function connect(
  transport: RpcTransport,
  setConn: Dispatch<ConnectionState>,
  setConnectedDeviceName: Dispatch<string | undefined>,
  signal: AbortSignal
) {
  let conn = await create_rpc_connection(transport, { signal });

  let details = await Promise.race([
    call_rpc(conn, { core: { getDeviceInfo: true } })
      .then((r) => r?.core?.getDeviceInfo)
      .catch((e) => {
        console.error("Failed first RPC call", e);
        return undefined;
      }),
    valueAfter(undefined, 1000),
  ]);

  if (!details) {
    // TODO: Show a proper toast/alert not using `window.alert`
    window.alert(i18n.t("errors.failedToConnect"));
    return;
  }

  listen_for_notifications(conn.notification_readable, signal)
    .then(() => {
      setConnectedDeviceName(undefined);
      setConn({ conn: null });
    })
    .catch((_e) => {
      setConnectedDeviceName(undefined);
      setConn({ conn: null });
    });

  setConnectedDeviceName(details.name);
  setConn({ conn });
}

function App() {
  const { t } = useTranslation();
  const [conn, setConn] = useState<ConnectionState>({ conn: null });
  const [connectedDeviceName, setConnectedDeviceName] = useState<
    string | undefined
  >(undefined);
  const [doIt, undo, redo, canUndo, canRedo, reset] = useUndoRedo();
  const undoRedoCtx = { doIt, undo, redo, canUndo, canRedo };
  const [showAbout, setShowAbout] = useState(false);
  const [showLicenseNotice, setShowLicenseNotice] = useState(false);
  const [connectionAbort, setConnectionAbort] = useState(new AbortController());

  const [lockState, setLockState] = useState<LockState>(
    LockState.ZMK_STUDIO_CORE_LOCK_STATE_LOCKED
  );

  useSub("rpc_notification.core.lockStateChanged", (ls) => {
    setLockState(ls);
  });

  useEffect(() => {
    if (!conn) {
      reset();
      setLockState(LockState.ZMK_STUDIO_CORE_LOCK_STATE_LOCKED);
    }

    async function updateLockState() {
      if (!conn.conn) {
        return;
      }

      let locked_resp = await call_rpc(conn.conn, {
        core: { getLockState: true },
      });

      setLockState(
        locked_resp.core?.getLockState ||
        LockState.ZMK_STUDIO_CORE_LOCK_STATE_LOCKED
      );
    }

    updateLockState();
  }, [conn, setLockState]);


  const disconnect = useCallback(() => {
    async function doDisconnect() {
      if (!conn.conn) {
        return;
      }
      await conn.conn.request_writable.close();
      connectionAbort.abort("User disconnected");
      setConnectionAbort(new AbortController());
    }
    doDisconnect();
  }, [conn]);

  const resetSettings = useCallback(() => {
    async function doReset() {
      if (!conn.conn) {
        return;
      }
      let resp = await call_rpc(conn.conn, {
        core: { resetSettings: true },
      });
      if (!resp.core?.resetSettings) {
        console.error(t("errors.failedToReset"), resp);
      }
      reset();
      setConn({ conn: conn.conn });
    }
    doReset();
  }, [conn]);

  useEffect(() => {
    const handleDisconnect = () => disconnect();
    const handleReset = () => resetSettings();

    window.addEventListener('zmk-studio-disconnect', handleDisconnect);
    window.addEventListener('zmk-studio-reset-settings', handleReset);

    return () => {
      window.removeEventListener('zmk-studio-disconnect', handleDisconnect);
      window.removeEventListener('zmk-studio-reset-settings', handleReset);
    };
  }, [disconnect, resetSettings]);


  const [showConnectModal, setShowConnectModal] = useState(false);

  const onConnect = useCallback(
    (t: RpcTransport) => {
      const ac = new AbortController();
      setConnectionAbort(ac);
      connect(t, setConn, setConnectedDeviceName, ac.signal);
      setShowConnectModal(false);
    },
    [setConn, setConnectedDeviceName, setConnectedDeviceName]
  );

  return (
    <I18nextProvider i18n={i18n}>
      <ConnectionContext.Provider value={conn}>
        <LockStateContext.Provider value={lockState}>
          <UndoRedoContext.Provider value={undoRedoCtx}>
            <div className="relative w-full h-full bg-base-100 overflow-hidden font-sans text-base-content selection:bg-primary selection:text-primary-content">
              {/* <UnlockModal />  -- Replaced by Popover in SystemPanel */}
              <ConnectModal
                open={showConnectModal}
                transports={TRANSPORTS}
                onTransportCreated={onConnect}
                onClose={() => setShowConnectModal(false)}
              />
              <AboutModal open={showAbout} onClose={() => setShowAbout(false)} />
              <LicenseNoticeModal
                open={showLicenseNotice}
                onClose={() => setShowLicenseNotice(false)}
              />

              {conn.conn && (
                <div className="absolute inset-0 z-0">
                  <Keyboard />
                </div>
              )}

              {!conn.conn && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-base-100 transition-all duration-500">
                  <ConnectCard
                    transports={TRANSPORTS}
                    onTransportCreated={onConnect}
                    onConnectCommon={() => setShowConnectModal(true)}
                  />

                </div>
              )}

            </div>
          </UndoRedoContext.Provider>
        </LockStateContext.Provider>
      </ConnectionContext.Provider>
    </I18nextProvider>
  );
}

export default App;
