import {
  Button,
  Menu,
  MenuItem,
  MenuTrigger,
  Popover,
  Section,
  Header,
  Separator,
} from "react-aria-components";
import { useConnectedDeviceData } from "./rpc/useConnectedDeviceData";
import { useSub } from "./usePubSub";
import { useContext, useEffect, useState } from "react";
import { useModalRef } from "./misc/useModalRef";
import { LockStateContext } from "./rpc/LockStateContext";
import { LockState } from "@zmkfirmware/zmk-studio-ts-client/core";
import { ConnectionContext } from "./rpc/ConnectionContext";
import { ChevronDown, Undo2, Redo2, Save, Trash2, Settings, Sun, Moon, Monitor, Languages, Contrast, Snowflake } from "lucide-react";
import { Tooltip } from "./misc/Tooltip";
import { GenericModal } from "./GenericModal";
import { useTranslation } from "react-i18next";
import { useTheme, Theme } from "./contexts/ThemeContext";

export interface AppHeaderProps {
  connectedDeviceLabel?: string;
  onSave?: () => void | Promise<void>;
  onDiscard?: () => void | Promise<void>;
  onUndo?: () => Promise<void>;
  onRedo?: () => Promise<void>;
  onResetSettings?: () => void | Promise<void>;
  onDisconnect?: () => void | Promise<void>;
  onNicknameChange?: (nickname: string) => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

export const AppHeader = ({
  connectedDeviceLabel,
  canRedo,
  canUndo,
  onRedo,
  onUndo,
  onSave,
  onDiscard,
  onDisconnect,
  onResetSettings,
  onNicknameChange,
}: AppHeaderProps) => {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const [showSettingsReset, setShowSettingsReset] = useState(false);
  const [showNicknameEdit, setShowNicknameEdit] = useState(false);
  const [tempNickname, setTempNickname] = useState(connectedDeviceLabel || "");

  const lockState = useContext(LockStateContext);
  const connectionState = useContext(ConnectionContext);

  useEffect(() => {
    setTempNickname(connectedDeviceLabel || "");
  }, [connectedDeviceLabel]);

  useEffect(() => {
    if (
      (!connectionState.conn ||
        lockState != LockState.ZMK_STUDIO_CORE_LOCK_STATE_UNLOCKED) &&
      showSettingsReset
    ) {
      setShowSettingsReset(false);
    }
  }, [lockState, showSettingsReset]);

  const showSettingsRef = useModalRef(showSettingsReset);
  const showNicknameRef = useModalRef(showNicknameEdit);
  const [unsaved, setUnsaved] = useConnectedDeviceData<boolean>(
    { keymap: { checkUnsavedChanges: true } },
    (r) => r.keymap?.checkUnsavedChanges
  );

  useSub("rpc_notification.keymap.unsavedChangesStatusChanged", (unsaved) =>
    setUnsaved(unsaved)
  );

  return (
    <header className="top-0 left-0 right-0 grid grid-cols-[1fr_auto_1fr] items-center justify-between h-14 px-4 bg-base-100 shadow-sm z-50">
      <div className="flex items-center gap-2">
        <img src="/zmk.svg" alt="ZMK Logo" className="h-8 rounded" />
        <p className="text-xl font-medium">{t('app.title')}</p>
      </div>

      <GenericModal ref={showNicknameRef} className="max-w-[400px] p-6 rounded-2xl bg-base-100 shadow-xl">
        <h2 className="my-2 text-2xl font-medium">{t('header.edit_nickname', 'Edit Nickname')}</h2>
        <div className="flex flex-col gap-4">
          <p className="text-base-content/80">
            {t('header.edit_nickname_desc', 'Enter a custom nickname for this device.')}
          </p>
          <input
            autoFocus
            className="w-full px-4 py-2 rounded-lg bg-base-200 border border-base-300 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            value={tempNickname}
            onChange={(e) => setTempNickname(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onNicknameChange?.(tempNickname);
                setShowNicknameEdit(false);
              }
            }}
          />
          <div className="flex justify-end gap-3 mt-2">
            <Button
              className="rounded-full px-6 py-2 text-primary font-medium hover:bg-base-200 transition-colors"
              onPress={() => {
                setTempNickname(connectedDeviceLabel || "");
                setShowNicknameEdit(false);
              }}
            >
              {t('header.cancel')}
            </Button>
            <Button
              className="rounded-full bg-primary text-primary-content px-6 py-2 font-medium hover:brightness-95 transition-colors shadow-sm"
              onPress={() => {
                onNicknameChange?.(tempNickname);
                setShowNicknameEdit(false);
              }}
            >
              {t('header.save')}
            </Button>
          </div>
        </div>
      </GenericModal>

      <GenericModal ref={showSettingsRef} className="max-w-[50vw] p-6 rounded-2xl bg-base-100 shadow-xl">
        <h2 className="my-2 text-2xl font-medium">{t('header.restore_stock_settings')}</h2>
        <div>
          <p className="mb-4 text-base-content/80">
            {t('header.restore_stock_settings_desc')}
          </p>
          <p className="font-medium">{t('header.continue')}</p>
          <div className="flex justify-end my-4 gap-3">
            <Button
              className="rounded-full px-6 py-2 text-primary font-medium hover:bg-base-200 transition-colors"
              onPress={() => setShowSettingsReset(false)}
            >
              {t('header.cancel')}
            </Button>
            <Button
              className="rounded-full bg-primary text-primary-content px-6 py-2 font-medium hover:brightness-95 transition-colors shadow-sm"
              onPress={() => {
                setShowSettingsReset(false);
                onResetSettings?.();
              }}
            >
              {t('header.restore_stock_settings')}
            </Button>
          </div>
        </div>
      </GenericModal>
      
      <div className="flex items-center gap-4">
        <MenuTrigger>
          <Button
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 hover:bg-secondary/20 transition-all duration-200 rac-disabled:opacity-0"
            isDisabled={!connectedDeviceLabel}
          >
            {connectedDeviceLabel}
            <ChevronDown className="w-4 h-4" />
          </Button>
          <Popover>
            <Menu className="min-w-[200px] shadow-lg rounded-xl bg-base-100 text-base-content p-2 border border-base-200">
              <MenuItem
                className="px-4 py-2 rounded-lg hover:bg-base-200 cursor-pointer outline-none"
                onAction={() => setShowNicknameEdit(true)}
              >
                {t('header.edit_nickname', 'Edit Nickname')}
              </MenuItem>
              <MenuItem
                className="px-4 py-2 rounded-lg hover:bg-base-200 cursor-pointer outline-none"
                onAction={onDisconnect}
              >
                {t('header.disconnect')}
              </MenuItem>
              <MenuItem
                className="px-4 py-2 rounded-lg hover:bg-base-200 cursor-pointer outline-none"
                onAction={() => setShowSettingsReset(true)}
              >
                {t('header.restore_stock_settings')}
              </MenuItem>
            </Menu>
          </Popover>
        </MenuTrigger>
      </div>

      <div className="flex justify-end items-center gap-2">
        {onUndo && (
          <Tooltip label={t('header.undo')}>
            <Button
              className="p-2 rounded-full hover:bg-base-200 disabled:opacity-50 transition-colors"
              isDisabled={!canUndo}
              onPress={onUndo}
            >
              <Undo2 className="w-5 h-5" aria-label={t('header.undo')} />
            </Button>
          </Tooltip>
        )}

        {onRedo && (
          <Tooltip label={t('header.redo')}>
            <Button
              className="p-2 rounded-full hover:bg-base-200 disabled:opacity-50 transition-colors"
              isDisabled={!canRedo}
              onPress={onRedo}
            >
              <Redo2 className="w-5 h-5" aria-label={t('header.redo')} />
            </Button>
          </Tooltip>
        )}
        
        <Tooltip label={t('header.save')}>
          <Button
            className="p-2 rounded-full hover:bg-base-200 disabled:opacity-50 transition-colors text-primary"
            isDisabled={!unsaved}
            onPress={onSave}
          >
            <Save className="w-5 h-5" aria-label={t('header.save')} />
          </Button>
        </Tooltip>
        
        <Tooltip label={t('header.discard')}>
          <Button
            className="p-2 rounded-full hover:bg-base-200 disabled:opacity-50 transition-colors text-error"
            onPress={onDiscard}
            isDisabled={!unsaved}
          >
            <Trash2 className="w-5 h-5" aria-label={t('header.discard')} />
          </Button>
        </Tooltip>

        <div className="w-px h-6 bg-base-300 mx-1"></div>

        <MenuTrigger>
          <Button aria-label={t('header.settings')} className="p-2 rounded-full hover:bg-base-200 transition-colors">
            <Settings className="w-5 h-5" />
          </Button>
          <Popover>
            <Menu
              onAction={(key) => {
                if (key === 'en' || key === 'zh') {
                  i18n.changeLanguage(key);
                } else {
                  setTheme(key as Theme);
                }
              }}
              className="min-w-[220px] shadow-lg rounded-xl bg-base-100 text-base-content p-2 border border-base-200 outline-none"
            >
              <Section className="flex flex-col gap-1">
                <Header className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-base-content/40 flex items-center gap-2">
                  <Languages className="w-3.5 h-3.5" /> {t('language.toggle')}
                </Header>
                <MenuItem
                  id="en"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-base-200 cursor-pointer outline-none text-sm transition-colors"
                >
                  {t('language.en')}
                </MenuItem>
                <MenuItem
                  id="zh"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-base-200 cursor-pointer outline-none text-sm transition-colors"
                >
                  {t('language.zh')}
                </MenuItem>
              </Section>

              <Separator className="h-px bg-base-200 my-2 mx-1" />

              <Section className="flex flex-col gap-1">
                <Header className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-base-content/40 flex items-center gap-2">
                  {theme === 'light' ? <Sun className="w-3.5 h-3.5" /> : 
                   theme === 'dark' ? <Moon className="w-3.5 h-3.5" /> : 
                   theme === 'high-contrast-dark' ? <Contrast className="w-3.5 h-3.5" /> :
                   theme === 'nord' ? <Snowflake className="w-3.5 h-3.5" /> :
                   <Monitor className="w-3.5 h-3.5" />}
                  {t('theme.toggle')}
                </Header>
                <MenuItem id="light" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-base-200 cursor-pointer outline-none text-sm transition-colors">
                  <Sun className="w-4 h-4 opacity-70" /> {t('theme.light')}
                </MenuItem>
                <MenuItem id="dark" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-base-200 cursor-pointer outline-none text-sm transition-colors">
                  <Moon className="w-4 h-4 opacity-70" /> {t('theme.dark')}
                </MenuItem>
                <MenuItem id="high-contrast-dark" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-base-200 cursor-pointer outline-none text-sm transition-colors">
                  <Contrast className="w-4 h-4 opacity-70" /> {t('theme.high_contrast')}
                </MenuItem>
                <MenuItem id="nord" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-base-200 cursor-pointer outline-none text-sm transition-colors">
                  <Snowflake className="w-4 h-4 opacity-70" /> {t('theme.nord')}
                </MenuItem>
                <MenuItem id="system" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-base-200 cursor-pointer outline-none text-sm transition-colors">
                  <Monitor className="w-4 h-4 opacity-70" /> {t('theme.system')}
                </MenuItem>
              </Section>
            </Menu>
          </Popover>
        </MenuTrigger>
      </div>
    </header>
  );
};

