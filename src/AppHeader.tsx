import { useRef } from "react";
import {
  Button,
  Menu,
  MenuItem,
  MenuTrigger,
  Popover,
  Separator,
  Toolbar,
} from "react-aria-components";
import { useTranslation } from "react-i18next";
import { MdKeyboardArrowDown, MdUndo, MdRedo, MdSave, MdDelete, MdLanguage } from "react-icons/md";

import { useKeymapStore } from "./store";
import { KeyboardNameEditor } from "./keyboard/KeyboardNameEditor";

export const AppHeader = () => {
  const {
    canUndo,
    canRedo,
    undo,
    redo,
    isDirty,
    save,
    clear,
    name,
    setName,
  } = useKeymapStore((s) => ({
    canUndo: s.pastStates.length > 0,
    canRedo: s.futureStates.length > 0,
    undo: s.undo,
    redo: s.redo,
    isDirty: s.isDirty,
    save: s.save(s),
    clear: s.clear,
    name: s.keymap?.name,
    setName: s.setName,
  }));

  const { i18n } = useTranslation();

  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // Helper to handle language change since Menu onAction returns Key
  const handleLanguageChange = (key: React.Key) => {
    i18n.changeLanguage(key as string);
  };

  return (
    <div className="flex items-center justify-between px-4 py-2 shrink-0 h-14 bg-base-100 border-b border-base-content/5 z-20">
      <div className="flex items-center gap-4">
        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
          <div className="w-4 h-4 rounded-full bg-current" />
        </div>
        <div className="h-6 w-px bg-base-content/10" />
        <KeyboardNameEditor name={name ?? "Untitled"} setName={setName} />
      </div>

      <div className="flex items-center gap-2">
        <Button
          className={`
            w-9 h-9 flex items-center justify-center rounded-lg transition-all outline-none
            ${!canUndo ? 'text-base-content/30 cursor-not-allowed' : 'text-base-content/70 hover:bg-base-200 hover:text-base-content active:scale-95'}
          `}
          isDisabled={!canUndo}
          onPress={undo}
        >
          <MdUndo size={20} />
        </Button>
        <Button
          className={`
            w-9 h-9 flex items-center justify-center rounded-lg transition-all outline-none
            ${!canRedo ? 'text-base-content/30 cursor-not-allowed' : 'text-base-content/70 hover:bg-base-200 hover:text-base-content active:scale-95'}
          `}
          isDisabled={!canRedo}
          onPress={redo}
        >
          <MdRedo size={20} />
        </Button>

        <div className="h-6 w-px bg-base-content/10 mx-2" />

        <Button
          className={`
            h-9 px-4 flex items-center gap-2 rounded-full font-medium text-sm transition-all outline-none
            ${!isDirty
              ? 'bg-base-200/50 text-base-content/40 cursor-not-allowed'
              : 'bg-primary text-primary-content hover:bg-primary-hover shadow-sm active:scale-95'
            }
          `}
          isDisabled={!isDirty}
          onPress={save}
        >
          <MdSave size={18} />
          <span>Save</span>
        </Button>

        <div className="h-6 w-px bg-base-content/10 mx-2" />

        <MenuTrigger>
          <Button className="w-9 h-9 flex items-center justify-center rounded-lg text-base-content/70 hover:bg-base-200 hover:text-base-content transition-all outline-none">
            <MdLanguage size={20} />
          </Button>
          <Popover placement="bottom end" className="min-w-[150px] p-1 bg-base-200 border border-base-300 rounded-xl shadow-xl z-50 animate-in fade-in zoom-in-95 duration-200">
            <Menu onAction={handleLanguageChange} className="outline-none">
              <MenuItem id="en" className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-base-300 cursor-pointer outline-none transition-colors data-[focused]:bg-base-300">
                <span className="text-sm font-medium">English</span>
                {i18n.language === 'en' && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
              </MenuItem>
              <MenuItem id="zh" className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-base-300 cursor-pointer outline-none transition-colors data-[focused]:bg-base-300">
                <span className="text-sm font-medium">中文</span>
                {i18n.language === 'zh' && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
              </MenuItem>
            </Menu>
          </Popover>
        </MenuTrigger>

        <Button
          className="w-9 h-9 flex items-center justify-center rounded-lg text-error/70 hover:bg-error/10 hover:text-error transition-all outline-none"
          onPress={clear}
        >
          <MdDelete size={20} />
        </Button>

      </div>
    </div>
  );
};
