import { useContext, useMemo } from "react";

import type { RpcTransport } from "@zmkfirmware/zmk-studio-ts-client/transport/index";
import type { AvailableDevice } from "./tauri/index";
import { LockStateContext } from "./rpc/LockStateContext";
import { LockState } from "@zmkfirmware/zmk-studio-ts-client/core";
import { ConnectionContext } from "./rpc/ConnectionContext";
import { useModalRef } from "./misc/useModalRef";
import { GenericModal } from "./GenericModal";
import { ExternalLink } from "./misc/ExternalLink";
import { useTranslation, Trans } from "react-i18next";

export type TransportFactory = {
  label: string;
  connect?: () => Promise<RpcTransport>;
  pick_and_connect?: {
    list: () => Promise<Array<AvailableDevice>>;
    connect: (dev: AvailableDevice) => Promise<RpcTransport>;
  };
};

export interface UnlockModalProps {}

export const UnlockModal = (_props: UnlockModalProps) => {
  const { t } = useTranslation();
  const conn = useContext(ConnectionContext);
  const lockState = useContext(LockStateContext);

  const open = useMemo(
    () =>
      !!conn.conn && lockState != LockState.ZMK_STUDIO_CORE_LOCK_STATE_UNLOCKED,
    [conn, lockState]
  );
  const dialog = useModalRef(open, false, false);

  return (
    <GenericModal ref={dialog} className="p-6 rounded-2xl bg-base-100 shadow-xl max-w-md">
      <h1 className="text-2xl font-medium mb-4">{t('unlock.title')}</h1>
      <p className="mb-4 text-base-content/80">
        {t('unlock.desc1')}
      </p>
      <p className="text-base-content/80">
        <Trans i18nKey="unlock.desc2">
          If studio unlocking hasn't been added to your keymap or a combo, see the{" "}
          <ExternalLink href="https://zmk.dev/docs/keymaps/behaviors/studio-unlock">
            Studio Unlock Behavior
          </ExternalLink>{" "}
          documentation for more infomation.
        </Trans>
      </p>
    </GenericModal>
  );
};
