import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import type { RpcTransport } from "@zmkfirmware/zmk-studio-ts-client/transport/index";
import { UserCancelledError } from "@zmkfirmware/zmk-studio-ts-client/transport/errors";
import type { AvailableDevice } from "./tauri/index";
import { MdBluetooth, MdRefresh, MdClose, MdUsb, MdDevices } from "react-icons/md";
import {
  Key,
  ListBox,
  ListBoxItem,
  Selection,
  Button,
} from "react-aria-components";
import { useModalRef } from "./misc/useModalRef";
import { ExternalLink } from "./misc/ExternalLink";
import { GenericModal } from "./GenericModal";

export type TransportFactory = {
  label: string;
  isWireless?: boolean;
  connect?: () => Promise<RpcTransport>;
  pick_and_connect?: {
    list: () => Promise<Array<AvailableDevice>>;
    connect: (dev: AvailableDevice) => Promise<RpcTransport>;
  };
};

export interface ConnectModalProps {
  open?: boolean;
  transports: TransportFactory[];
  onTransportCreated: (t: RpcTransport) => void;
  onClose?: () => void;
}

function DeviceListPicker({
  open,
  transports,
  onTransportCreated,
}: {
  open: boolean;
  transports: TransportFactory[];
  onTransportCreated: (t: RpcTransport) => void;
}) {
  const { t } = useTranslation();
  const [devices, setDevices] = useState<
    Array<[TransportFactory, AvailableDevice]>
  >([]);
  const [selectedDev, setSelectedDev] = useState(new Set<Key>());
  const [refreshing, setRefreshing] = useState(false);

  async function LoadEm() {
    setRefreshing(true);
    let entries: Array<[TransportFactory, AvailableDevice]> = [];
    for (const t of transports.filter((t) => t.pick_and_connect)) {
      const devices = await t.pick_and_connect?.list();
      if (!devices) {
        continue;
      }

      entries.push(
        ...devices.map<[TransportFactory, AvailableDevice]>((d) => {
          return [t, d];
        })
      );
    }

    setDevices(entries);
    setRefreshing(false);
  }

  useEffect(() => {
    setSelectedDev(new Set());
    setDevices([]);

    LoadEm();
  }, [transports, open, setDevices]);

  const onRefresh = useCallback(() => {
    setSelectedDev(new Set());
    setDevices([]);

    LoadEm();
  }, [setDevices]);

  const onSelect = useCallback(
    async (keys: Selection) => {
      if (keys === "all") {
        return;
      }
      const dev = devices.find(([_t, d]) => keys.has(d.id));
      if (dev) {
        dev[0]
          .pick_and_connect!.connect(dev[1])
          .then(onTransportCreated)
          .catch((e) => alert(e));
      }
    },
    [devices, onTransportCreated]
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Header row: label + refresh */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-base-content/70">
          {t("welcome.selectDevice")}
        </span>
        <Button
          className="p-2 rounded-xl hover:bg-base-content/5 text-base-content/50 hover:text-base-content transition-all outline-none disabled:opacity-40"
          isDisabled={refreshing}
          onPress={onRefresh}
        >
          <MdRefresh
            className={`size-5 transition-transform ${refreshing ? "animate-spin" : ""}`}
          />
        </Button>
      </div>

      {/* Device list */}
      {refreshing && devices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-3 text-base-content/30">
          <div className="w-10 h-10 rounded-full bg-base-200/50 flex items-center justify-center animate-pulse">
            <MdDevices size={20} />
          </div>
          <span className="text-xs font-medium">{t("common.loading", "Scanning...")}</span>
        </div>
      ) : devices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-3 text-base-content/30">
          <div className="w-10 h-10 rounded-full bg-base-200/50 flex items-center justify-center">
            <MdDevices size={20} />
          </div>
          <span className="text-xs font-medium">{t("welcome.noDevices", "No devices found")}</span>
          <span className="text-[11px] text-base-content/20">{t("welcome.tryRefresh", "Try refreshing or check your connection")}</span>
        </div>
      ) : (
        <ListBox
          aria-label="Device"
          items={devices}
          onSelectionChange={onSelect}
          selectionMode="single"
          selectedKeys={selectedDev}
          className="flex flex-col gap-1.5"
        >
          {([t, d]) => (
            <ListBoxItem
              className={({ isSelected, isFocused }) => `
                flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer outline-none transition-all
                ${isSelected
                  ? 'bg-primary/10 text-primary font-bold ring-1 ring-primary/20'
                  : isFocused
                    ? 'bg-base-content/5 text-base-content'
                    : 'hover:bg-base-content/5 text-base-content/80'
                }
              `}
              id={d.id}
              aria-label={d.label}
            >
              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${t.isWireless ? 'bg-blue-500/10 text-blue-500' : 'bg-emerald-500/10 text-emerald-500'
                }`}>
                {t.isWireless ? <MdBluetooth size={18} /> : <MdUsb size={18} />}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium truncate">{d.label}</span>
                <span className="text-[10px] text-base-content/40 font-medium uppercase tracking-wider">
                  {t.isWireless ? 'Bluetooth' : 'USB'}
                </span>
              </div>
            </ListBoxItem>
          )}
        </ListBox>
      )}
    </div>
  );
}

function SimpleDevicePicker({
  transports,
  onTransportCreated,
}: {
  transports: TransportFactory[];
  onTransportCreated: (t: RpcTransport) => void;
}) {
  const { t } = useTranslation();
  const [availableDevices, setAvailableDevices] = useState<
    AvailableDevice[] | undefined
  >(undefined);
  const [selectedTransport, setSelectedTransport] = useState<
    TransportFactory | undefined
  >(undefined);

  useEffect(() => {
    if (!selectedTransport) {
      setAvailableDevices(undefined);
      return;
    }

    let ignore = false;

    if (selectedTransport.connect) {
      async function connectTransport() {
        try {
          const transport = await selectedTransport?.connect?.();

          if (!ignore) {
            if (transport) {
              onTransportCreated(transport);
            }
            setSelectedTransport(undefined);
          }
        } catch (e) {
          if (!ignore) {
            console.error(e);
            if (e instanceof Error && !(e instanceof UserCancelledError)) {
              alert(e.message);
            }
            setSelectedTransport(undefined);
          }
        }
      }

      connectTransport();
    } else {
      async function loadAvailableDevices() {
        const devices = await selectedTransport?.pick_and_connect?.list();

        if (!ignore) {
          setAvailableDevices(devices);
        }
      }

      loadAvailableDevices();
    }

    return () => {
      ignore = true;
    };
  }, [selectedTransport]);

  return (
    <div className="flex flex-col gap-4">
      <span className="text-sm font-medium text-base-content/70">
        {t("welcome.selectConnection")}
      </span>
      <div className="flex gap-3">
        {transports.map((tp) => (
          <Button
            key={tp.label}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-base-content/5 hover:bg-primary/10 hover:text-primary text-base-content/70 text-sm font-bold transition-all outline-none"
            onPress={() => setSelectedTransport(tp)}
          >
            {tp.isWireless || tp.label === "BLE" ? <MdBluetooth size={18} /> : <MdUsb size={18} />}
            {tp.label}
          </Button>
        ))}
      </div>
      {selectedTransport && availableDevices && (
        <div className="flex flex-col gap-1.5">
          {availableDevices.map((d) => (
            <button
              key={d.id}
              className="w-full text-left px-4 py-3 rounded-2xl hover:bg-base-content/5 text-sm transition-all"
              onClick={async () => {
                onTransportCreated(
                  await selectedTransport!.pick_and_connect!.connect(d)
                );
                setSelectedTransport(undefined);
              }}
            >
              {d.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function NoTransportsPrompt() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-4 text-sm text-base-content/70">
      <p>
        {t("welcome.unsupportedPrefix")} {" "}
        <ExternalLink href="https://caniuse.com/web-serial">Web Serial</ExternalLink> {" "}
        {t("welcome.unsupportedMiddle")} {" "}
        <ExternalLink href="https://caniuse.com/web-bluetooth">Web Bluetooth</ExternalLink> {" "}
        {t("welcome.unsupportedSuffix")}
      </p>
      <div>
        <p className="font-medium text-base-content/80 mb-2">{t("welcome.unsupportedOptions")}</p>
        <ul className="list-disc list-inside space-y-1 text-base-content/60">
          <li>{t("welcome.chromeBrowser")}</li>
          <li>
            {t("welcome.downloadAppPrefix")} {" "}
            <ExternalLink href="/download">{t("welcome.crossPlatformApp")}</ExternalLink>.
          </li>
        </ul>
      </div>
    </div>
  );
}

function ConnectContent({
  transports,
  onTransportCreated,
  open,
}: {
  transports: TransportFactory[];
  onTransportCreated: (t: RpcTransport) => void;
  open?: boolean;
}) {
  const useSimplePicker = useMemo(
    () => transports.every((t) => !t.pick_and_connect),
    [transports]
  );

  return useSimplePicker ? (
    <SimpleDevicePicker
      transports={transports}
      onTransportCreated={onTransportCreated}
    />
  ) : (
    <DeviceListPicker
      open={open || false}
      transports={transports}
      onTransportCreated={onTransportCreated}
    />
  );
}

export const ConnectModal = ({
  open,
  transports,
  onTransportCreated,
  onClose,
}: ConnectModalProps) => {
  const { t } = useTranslation();
  const dialog = useModalRef(open || false, !!onClose, !!onClose);

  const haveTransports = useMemo(() => transports.length > 0, [transports]);

  return (
    <GenericModal ref={dialog} className="max-w-md w-full" onClose={onClose}>
      <div className="p-6 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <MdDevices size={22} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-base-content leading-tight">
                {t("welcome.title")}
              </h1>
              <span className="text-[11px] text-base-content/40 font-medium">
                ZMK Studio
              </span>
            </div>
          </div>
          {onClose && (
            <Button
              className="p-2 rounded-xl hover:bg-base-content/5 text-base-content/40 hover:text-base-content transition-all outline-none"
              onPress={onClose}
            >
              <MdClose size={20} />
            </Button>
          )}
        </div>

        {/* Separator */}
        <div className="border-b border-base-content/5" />

        {/* Content */}
        {haveTransports ? (
          <ConnectContent
            transports={transports}
            onTransportCreated={onTransportCreated}
            open={open}
          />
        ) : (
          <NoTransportsPrompt />
        )}
      </div>
    </GenericModal>
  );
};
