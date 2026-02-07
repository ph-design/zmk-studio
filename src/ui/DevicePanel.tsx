import { MdBluetooth, MdUsb, MdLogout, MdReplay } from "react-icons/md";
import { Button } from "react-aria-components";
import { useTranslation } from "react-i18next";

interface DevicePanelProps {
    deviceName?: string;
    transportLabel?: string; // "BLE" | "USB"
    onDisconnect?: () => void;
    onResetSettings?: () => void;
}

export const DevicePanel = ({
    deviceName,
    transportLabel = "USB",
    onDisconnect,
    onResetSettings
}: DevicePanelProps) => {
    const { t } = useTranslation();

    return (
        <div className="p-4 pb-0">
            <div className="w-full flex items-center justify-between p-4 pl-5 rounded-[20px] bg-primary/10">

                {/* Left: Icon + Name */}
                <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        {transportLabel === "BLE" ? (
                            <MdBluetooth size={20} className="text-primary" />
                        ) : (
                            <MdUsb size={20} className="text-primary" />
                        )}
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-90 leading-none mb-0.5 text-primary">
                            {t("status.connected")}
                        </span>
                        <span className="text-base font-bold truncate leading-tight text-base-content">
                            {deviceName || "Keyboard"}
                        </span>
                    </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-1 pl-2">
                    <Button
                        onPress={onResetSettings}
                        className="w-9 h-9 rounded-full bg-transparent hover:bg-primary/10 active:bg-primary/20 text-base-content/60 hover:text-primary transition-colors flex items-center justify-center outline-none"
                        aria-label={t("header.restoreStock")}
                    >
                        <MdReplay size={18} />
                    </Button>

                    <Button
                        onPress={onDisconnect}
                        className="w-9 h-9 rounded-full bg-transparent hover:bg-primary/10 active:bg-primary/20 text-base-content/60 hover:text-primary transition-colors flex items-center justify-center outline-none"
                        aria-label={t("header.disconnect")}
                    >
                        <MdLogout size={18} />
                    </Button>
                </div>
            </div>
        </div>
    );
};
