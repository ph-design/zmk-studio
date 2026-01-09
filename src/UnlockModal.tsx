import { useContext, useMemo } from "react";

import type { RpcTransport } from "@zmkfirmware/zmk-studio-ts-client/transport/index";
import type { AvailableDevice } from "./tauri/index";
import { LockStateContext } from "./rpc/LockStateContext";
import { LockState } from "@zmkfirmware/zmk-studio-ts-client/core";
import { ConnectionContext } from "./rpc/ConnectionContext";
import { useModalRef } from "./misc/useModalRef";
import { GenericModal } from "./GenericModal";
import { ExternalLink } from "./misc/ExternalLink";
import { useTranslation } from "react-i18next";

export type TransportFactory = {
  label: string;
  connect?: () => Promise<RpcTransport>;
  pick_and_connect?: {
    list: () => Promise<Array<AvailableDevice>>;
    connect: (dev: AvailableDevice) => Promise<RpcTransport>;
  };
};

export interface UnlockModalProps {}

export const UnlockModal = ({}: UnlockModalProps) => {
  let conn = useContext(ConnectionContext);
  let lockState = useContext(LockStateContext);
  const { t } = useTranslation();

  let open = useMemo(
    () =>
      !!conn.conn && lockState != LockState.ZMK_STUDIO_CORE_LOCK_STATE_UNLOCKED,
    [conn, lockState]
  );
  const dialog = useModalRef(open, false, false);

  return (
    <GenericModal ref={dialog}>
      <h1 className="text-xl">{t("unlock.title")}</h1>
      <p>{t("unlock.body1")}</p>
      <p>
        {t("unlock.body2Prefix")}{" "}
        <ExternalLink href="https://zmk.dev/docs/keymaps/behaviors/studio-unlock">
          {t("unlock.docs")}
        </ExternalLink>{" "}
        {t("unlock.body2Suffix")}
      </p>
    </GenericModal>
  );
};
