import { Button, Menu, MenuItem, MenuTrigger, Popover } from "react-aria-components";
import { Languages, LogOut, RotateCcw, Save, Settings, Trash2, Undo2, Redo2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Tooltip } from "../misc/Tooltip";

interface FloatingToolbarProps {
    connectedDeviceLabel?: string;
    onSave?: () => void;
    onDiscard?: () => void;
    onUndo?: () => void;
    onRedo?: () => void;
    onResetSettings?: () => void;
    onDisconnect?: () => void;
    canUndo?: boolean;
    canRedo?: boolean;
    unsaved?: boolean;
}

export const FloatingToolbar = ({
    connectedDeviceLabel,
    onSave,
    onDiscard,
    onUndo,
    onRedo,
    onResetSettings,
    onDisconnect,
    canUndo,
    canRedo,
    unsaved
}: FloatingToolbarProps) => {
    const { t, i18n } = useTranslation();

    return (
        <>
            {/* Top Left: Status Panel */}
            <div className="absolute top-6 left-6 z-50 pointer-events-auto flex flex-col gap-2 transition-all duration-300">
                <div className="surface-panel h-11 px-4 flex items-center gap-3 shadow-md">
                    <div className={`w-2.5 h-2.5 rounded-full ${connectedDeviceLabel ? 'bg-green-500' : 'bg-red-400'}`} />
                    <span className="font-bold text-xs uppercase tracking-widest text-base-content/60">
                        {connectedDeviceLabel || t("common.disconnected", "No Device")}
                    </span>
                    {connectedDeviceLabel && (
                        <MenuTrigger>
                            <Button className="ml-1 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-base-300 text-base-content/40 transition-colors">
                                <Settings size={14} />
                            </Button>
                            <Popover placement="bottom start">
                                <Menu className="surface-panel p-1 rounded-xl flex flex-col min-w-[160px] shadow-xl animate-in fade-in zoom-in-95 duration-200">
                                    <MenuItem onAction={onDisconnect} className="p-2.5 hover:bg-base-300 rounded-lg flex items-center gap-3 text-sm cursor-pointer outline-none transition-colors">
                                        <LogOut size={16} className="text-base-content/40" /> {t("header.disconnect")}
                                    </MenuItem>
                                    <MenuItem onAction={onResetSettings} className="p-2.5 hover:bg-red-500/10 hover:text-red-500 rounded-lg flex items-center gap-3 text-sm cursor-pointer outline-none transition-colors">
                                        <RotateCcw size={16} /> {t("header.restoreStock")}
                                    </MenuItem>
                                </Menu>
                            </Popover>
                        </MenuTrigger>
                    )}
                </div>
            </div>

            {/* Top Right: Actions Panel */}
            <div className="absolute top-6 right-6 z-50 pointer-events-auto flex gap-3">
                {/* Undo/Redo Group */}
                {connectedDeviceLabel && (
                    <div className="surface-panel h-11 px-1 flex items-center shadow-md">
                        <Tooltip label={t("common.undo")}>
                            <Button isDisabled={!canUndo} onPress={onUndo} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-base-300 disabled:opacity-20 transition-all">
                                <Undo2 size={18} />
                            </Button>
                        </Tooltip>
                        <Tooltip label={t("common.redo")}>
                            <Button isDisabled={!canRedo} onPress={onRedo} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-base-300 disabled:opacity-20 transition-all">
                                <Redo2 size={18} />
                            </Button>
                        </Tooltip>
                    </div>
                )}

                {/* Save/Discard Group */}
                {connectedDeviceLabel && (
                    <div className="surface-panel h-11 px-1 flex items-center shadow-md gap-1">
                        <Tooltip label={t("common.discard")}>
                            <Button isDisabled={!unsaved} onPress={onDiscard} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-red-500/10 text-red-500 disabled:opacity-20 transition-all">
                                <Trash2 size={18} />
                            </Button>
                        </Tooltip>
                        <Tooltip label={t("common.save")}>
                            <Button
                                isDisabled={!unsaved}
                                onPress={onSave}
                                className={`h-9 px-4 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${unsaved ? 'bg-primary text-primary-content shadow-sm' : 'bg-base-300 text-base-content/20'}`}>
                                <Save size={14} className="inline mr-2" />
                                {t("common.save")}
                            </Button>
                        </Tooltip>
                    </div>
                )}

                {/* System Group */}
                <div className="surface-panel h-11 px-1 flex items-center shadow-md">
                    <MenuTrigger>
                        <Button className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-base-300 transition-colors">
                            <Languages size={18} />
                        </Button>
                        <Popover placement="bottom end">
                            <Menu className="surface-panel p-1 rounded-xl flex flex-col min-w-[120px] shadow-xl animate-in fade-in zoom-in-95 duration-200">
                                <MenuItem onAction={() => i18n.changeLanguage("en")} className="p-2.5 hover:bg-base-300 rounded-lg text-sm cursor-pointer outline-none transition-colors">English</MenuItem>
                                <MenuItem onAction={() => i18n.changeLanguage("zh")} className="p-2.5 hover:bg-base-300 rounded-lg text-sm cursor-pointer outline-none transition-colors">中文</MenuItem>
                            </Menu>
                        </Popover>
                    </MenuTrigger>
                </div>
            </div>
        </>
    );
};
