import { useEffect, useMemo, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { MdSearch, MdKeyboard, MdLayers, MdKeyboardCommandKey, MdBluetooth, MdLightbulbOutline, MdSettings, MdMoreHoriz, MdInfoOutline } from "react-icons/md";
import { Button } from "react-aria-components";
import { useTranslation } from "react-i18next";
import {
  GetBehaviorDetailsResponse,
  BehaviorBindingParametersSet,
} from "@zmkfirmware/zmk-studio-ts-client/behaviors";
import { BehaviorBinding } from "@zmkfirmware/zmk-studio-ts-client/keymap";
import { BehaviorParametersPicker } from "./BehaviorParametersPicker";
import { validateValue } from "./parameters";
import { ModifierPicker } from "./ModifierPicker";

export interface BehaviorBindingPickerProps {
  binding: BehaviorBinding;
  behaviors: GetBehaviorDetailsResponse[];
  layers: { id: number; name: string }[];
  onBindingChanged: (binding: BehaviorBinding) => void;
}

// --- Categorization Logic ---
const CATEGORIES = [
  { id: "basic", labelKey: "categories.basic", icon: MdKeyboard, match: ["Key Press", "Transparent", "None"] },
  { id: "layers", labelKey: "categories.layers", icon: MdLayers, match: ["Layer", "Momentary", "Toggle", "To Layer"] },
  { id: "mods", labelKey: "categories.mods", icon: MdKeyboardCommandKey, match: ["Mod-Tap", "Sticky Key", "Caps Word", "Key Repeat"] },
  { id: "conn", labelKey: "categories.conn", icon: MdBluetooth, match: ["Bluetooth", "Output"] },
  { id: "media", labelKey: "categories.media", icon: MdSettings, match: ["Reset", "Bootloader", "Studio Unlock"] },
  { id: "lighting", labelKey: "categories.lighting", icon: MdLightbulbOutline, match: ["RGB", "Backlight", "Underglow"] },
  { id: "other", labelKey: "categories.other", icon: MdMoreHoriz, match: [] },
];

function getCategory(displayName: string): string {
  const lowerName = displayName.toLowerCase();
  for (const cat of CATEGORIES) {
    if (cat.id === "other") continue;
    if (cat.match.some(m => lowerName.includes(m.toLowerCase()))) {
      return cat.id;
    }
    if (cat.id === "basic" && lowerName === "&kp") return "basic";
    if (cat.id === "layers" && ["&mo", "&to", "&tog", "&lt", "&sl"].includes(lowerName)) return "layers";
  }
  return "other";
}



function validateBinding(
  metadata: BehaviorBindingParametersSet[],
  layerIds: number[],
  param1?: number,
  param2?: number
): boolean {
  if (
    (param1 === undefined || param1 === 0) &&
    metadata.every((s) => !s.param1 || s.param1.length === 0)
  ) {
    return true;
  }

  let matchingSet = metadata.find((s) =>
    validateValue(layerIds, param1, s.param1)
  );

  if (!matchingSet) {
    return false;
  }

  return validateValue(layerIds, param2, matchingSet.param2);
}

// Responsive navigation state:
// 'categories' = showing category list (small screens only)
// 'behaviors' = showing behavior list within a category
// 'config' = showing parameter config for selected behavior
type NavView = 'categories' | 'behaviors' | 'config';

export const BehaviorBindingPicker = ({
  binding,
  layers,
  behaviors,
  onBindingChanged,
}: BehaviorBindingPickerProps) => {
  const { t } = useTranslation();
  const [behaviorId, setBehaviorId] = useState(binding.behaviorId);
  const [param1, setParam1] = useState<number | undefined>(binding.param1);
  const [param2, setParam2] = useState<number | undefined>(binding.param2);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("basic");

  // Responsive: track which "page" we're on for compact view
  const [mobileView, setMobileView] = useState<NavView>('config');

  const metadata = useMemo(
    () => behaviors.find((b) => b.id == behaviorId)?.metadata,
    [behaviorId, behaviors]
  );

  const modifierParamIndex = useMemo(() => {
    if (!metadata) return -1;
    const p1Supported = metadata.some(m => m.param1?.some(v => v.hidUsage && v.hidUsage.keyboardMax));
    if (p1Supported) return 1;

    const p2Supported = metadata.some(m => m.param2?.some(v => v.hidUsage && v.hidUsage.keyboardMax));
    if (p2Supported) return 2;

    return -1;
  }, [metadata]);

  const supportsModifiers = modifierParamIndex !== -1;

  const isSpecialLayout = useMemo(() => {
    if (!metadata) return false;
    const isModTap = metadata.some(s => s.param1?.some(p => p.hidUsage && p.hidUsage.keyboardMax) && s.param2?.some(p => p.hidUsage && p.hidUsage.keyboardMax));
    return isModTap;
  }, [metadata]);

  const filteredBehaviors = useMemo(() => {
    return behaviors
      .filter(b => {
        const matchesSearch = b.displayName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = searchTerm
          ? true
          : getCategory(b.displayName) === selectedCategory;

        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [behaviors, searchTerm, selectedCategory]);

  // --- BIDIRECTIONAL SYNC LOGIC ---
  const lastBindingSent = useRef<BehaviorBinding | null>(null);
  const lastPropBehaviorId = useRef<number | string>(binding.behaviorId);

  const updateBinding = (newId: number, p1: number | undefined, p2: number | undefined) => {
    const newBinding = {
      behaviorId: newId,
      param1: p1 || 0,
      param2: p2 || 0
    };

    setBehaviorId(newId);
    setParam1(p1);
    setParam2(p2);

    lastBindingSent.current = newBinding;

    const behaviorMetadata = behaviors.find(b => b.id === newId)?.metadata;

    if (!behaviorMetadata || validateBinding(behaviorMetadata, layers.map(l => l.id), p1, p2)) {
      onBindingChanged(newBinding);
    }
  };

  useEffect(() => {
    const isSelfUpdate = lastBindingSent.current &&
      binding.behaviorId === lastBindingSent.current.behaviorId &&
      binding.param1 === lastBindingSent.current.param1 &&
      binding.param2 === lastBindingSent.current.param2;

    if (isSelfUpdate) {
      return;
    }

    setBehaviorId(binding.behaviorId);
    setParam1(binding.param1);
    setParam2(binding.param2);

    if (binding.behaviorId !== lastPropBehaviorId.current) {
      const behavior = behaviors.find(b => b.id === binding.behaviorId);
      if (behavior) {
        setSelectedCategory(getCategory(behavior.displayName));
      }
      lastPropBehaviorId.current = binding.behaviorId;
    }

    lastBindingSent.current = null;
  }, [binding.behaviorId, binding.param1, binding.param2, behaviors]);

  const onParam1Changed = (v?: number) => updateBinding(behaviorId, v, param2);
  const onParam2Changed = (v?: number) => updateBinding(behaviorId, param1, v);
  const onBehaviorChanged = (id: number) => {
    updateBinding(id, 0, 0);
    setMobileView('config'); // Auto-navigate to config after selecting behavior
  };

  const DESCRIPTION_KEYS: Record<string, string> = {
    "Key Press": "behaviorDescriptions.Key Press",
    "Momentary Layer": "behaviorDescriptions.Momentary Layer",
    "Toggle Layer": "behaviorDescriptions.Toggle Layer",
    "To Layer": "behaviorDescriptions.To Layer",
    "Mod-Tap": "behaviorDescriptions.Mod-Tap",
    "Layer-Tap": "behaviorDescriptions.Layer-Tap",
    "Sticky Key": "behaviorDescriptions.Sticky Key",
    "Key Repeat": "behaviorDescriptions.Key Repeat",
    "Bootloader": "behaviorDescriptions.Bootloader",
    "Reset": "behaviorDescriptions.Reset",
    "Studio Unlock": "behaviorDescriptions.Studio Unlock",
    "Bluetooth": "behaviorDescriptions.Bluetooth",
    "Output Selection": "behaviorDescriptions.Output Selection",
    "RGB": "behaviorDescriptions.RGB",
    "Backlight": "behaviorDescriptions.Backlight",
    "Underglow": "behaviorDescriptions.Underglow",
    "Caps Word": "behaviorDescriptions.Caps Word",
    "None": "behaviorDescriptions.None",
    "Transparent": "behaviorDescriptions.Transparent",
  };

  const FALLBACK_DESCRIPTIONS: Record<string, string> = {
    "Key Press": "Send a standard key code",
    "Momentary Layer": "Activate layer while held",
    "Toggle Layer": "Switch layer on/off",
    "To Layer": "Jump to layer",
    "Mod-Tap": "Tap for key, hold for modifier",
    "Layer-Tap": "Tap for key, hold for layer",
    "Sticky Key": "Modifier stays active until next key",
    "Key Repeat": "Repeats the last pressed key",
    "Bootloader": "Enter bootloader mode for flashing",
    "Reset": "Reboot the keyboard",
    "Studio Unlock": "Unlock ZMK Studio access",
    "Bluetooth": "Manage Bluetooth profiles",
    "Output Selection": "Switch between USB and BLE",
    "RGB": "Control RGB lighting",
    "Backlight": "Control backlight brightness",
    "Underglow": "Control underglow effects",
    "Caps Word": "Caps Lock for one word only",
    "None": "No action",
    "Transparent": "Inherit behavior from lower layers",
  };

  const getDescription = (displayName: string): string | null => {
    const key = DESCRIPTION_KEYS[displayName];
    if (!key) return null;
    const translated = t(key);
    if (translated === key) return FALLBACK_DESCRIPTIONS[displayName] || null;
    return translated || FALLBACK_DESCRIPTIONS[displayName] || null;
  };

  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);

  const showTooltip = (e: React.MouseEvent, text: string) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltip({
      text,
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
  };

  const hideTooltip = () => setTooltip(null);

  // Current behavior display name for the mobile breadcrumb
  const currentBehaviorName = behaviors.find(b => b.id === behaviorId)?.displayName || "—";
  const currentCategoryLabel = CATEGORIES.find(c => c.id === selectedCategory)?.labelKey;

  return (
    <div className="flex h-full w-full bg-base-100 font-sans overflow-hidden">

      {/* Fixed Tooltip — rendered via portal to avoid transform containment */}
      {tooltip && createPortal(
        <div
          className="fixed z-[9999] pointer-events-none -translate-x-1/2 -translate-y-full px-3 py-2 text-white text-xs rounded-lg shadow-xl max-w-[200px] text-center leading-relaxed"
          style={{ left: tooltip.x, top: tooltip.y - 6, backgroundColor: '#1f2937' }}
        >
          {tooltip.text}
          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px]" style={{ borderTopColor: '#1f2937' }} />
        </div>,
        document.body
      )}

      {/* ============================== */}
      {/* DESKTOP LAYOUT (lg+): 4-column */}
      {/* ============================== */}

      {/* 1. LEFT SIDEBAR: Category Navigation Rail */}
      <div className="hidden lg:flex flex-col bg-base-200/50 p-4 gap-1 overflow-y-auto custom-scrollbar shrink-0 w-auto min-w-[170px]">
        {CATEGORIES.map(cat => {
          const Icon = cat.icon;
          const isActive = selectedCategory === cat.id && !searchTerm;
          return (
            <Button
              key={cat.id}
              onPress={() => {
                setSelectedCategory(cat.id);
                setSearchTerm("");
              }}
              className={`
                flex items-center gap-4 px-4 py-3 rounded-full text-sm font-medium transition-all outline-none w-full text-left
                ${isActive
                  ? 'bg-primary/10 text-primary font-bold'
                  : 'bg-transparent text-base-content/70 hover:bg-base-content/10 hover:text-base-content'
                }
              `}
            >
              <Icon size={20} />
              <span className="flex-1 tracking-wide truncate">{t(cat.labelKey)}</span>
            </Button>
          );
        })}
      </div>

      {/* 2. MIDDLE COLUMN: Behavior List */}
      <div className="hidden lg:flex flex-col bg-base-100 shrink-0 w-fit border-r border-base-content/5">
        <div className="flex-1 overflow-y-auto px-2 py-4 custom-scrollbar">
          {filteredBehaviors.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-base-content/40 gap-3">
              <MdSearch size={24} className="opacity-20" />
              <span className="text-xs font-medium">{t("behaviors.noResults")}</span>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {filteredBehaviors.map((b) => {
                const isSelected = b.id === behaviorId;
                const description = getDescription(b.displayName);

                return (
                  <div
                    key={b.id}
                    className={`
                      group flex items-center gap-1 pr-1 rounded-full transition-colors
                      ${isSelected ? 'bg-primary/10' : 'hover:bg-base-200/50'}
                    `}
                  >
                    <Button
                      onPress={() => onBehaviorChanged(b.id)}
                      className={`
                        flex-1 px-4 py-3 text-left outline-none truncate
                        ${isSelected
                          ? 'text-primary font-bold'
                          : 'text-base-content/80 group-hover:text-base-content'
                        }
                      `}
                    >
                      <span className="text-sm truncate block">{b.displayName}</span>
                    </Button>

                    {description && (
                      <div
                        className={`
                          p-1.5 rounded-full cursor-help transition-all duration-200 shrink-0
                          ${isSelected
                            ? 'opacity-100 text-primary/60'
                            : 'opacity-0 group-hover:opacity-100 text-base-content/30 hover:text-base-content/70'
                          }
                        `}
                        onMouseEnter={(e) => showTooltip(e, description)}
                        onMouseLeave={hideTooltip}
                      >
                        <MdInfoOutline size={14} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 3. RIGHT AREA: Config & Mods (desktop) */}
      <div className="hidden lg:flex flex-1 bg-base-100 flex-col min-w-[400px]">
        <div className="flex-1 flex min-h-0">
          {/* CONFIG COLUMN */}
          <div className="flex-1 overflow-y-auto custom-scrollbar relative flex flex-col">
            <div className="flex-1 relative flex flex-col">
              {metadata ? (
                <div className="flex-1 w-full flex flex-col min-h-0">
                  <div className="flex-1 flex flex-col">
                    <BehaviorParametersPicker
                      metadata={metadata}
                      param1={param1}
                      param2={param2}
                      layers={layers}
                      onParam1Changed={onParam1Changed}
                      onParam2Changed={onParam2Changed}
                      hideModifiers={supportsModifiers}
                      searchTerm={searchTerm}
                      onSearchTermChanged={setSearchTerm}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-base-content/20 gap-4">
                  <div className="w-16 h-16 rounded-full bg-base-200/50 flex items-center justify-center">
                    <MdSettings size={28} />
                  </div>
                  <span className="text-sm font-medium">{t("behaviors.selectToConfigure")}</span>
                </div>
              )}
            </div>
          </div>

          {/* MODIFIERS COLUMN */}
          {metadata && supportsModifiers && !isSpecialLayout && (
            <div className="w-64 bg-base-50/30 flex flex-col border-l border-base-content/5">
              <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
                <ModifierPicker
                  value={modifierParamIndex === 2 ? param2 : param1}
                  onValueChanged={modifierParamIndex === 2 ? onParam2Changed : onParam1Changed}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ====================================== */}
      {/* MOBILE/TABLET LAYOUT (<lg): Stacked    */}
      {/* ====================================== */}
      <div className="flex lg:hidden flex-1 flex-col min-w-0 overflow-hidden">

        {/* Mobile top nav bar */}
        <div className="shrink-0 flex items-center gap-1 px-2 py-2 border-b border-base-content/5 bg-base-200/30">
          {/* Breadcrumb-style navigation */}
          <button
            onClick={() => setMobileView('categories')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all outline-none shrink-0
              ${mobileView === 'categories'
                ? 'bg-primary text-primary-content'
                : 'text-base-content/50 hover:text-base-content hover:bg-base-content/5'
              }`}
          >
            {currentCategoryLabel ? t(currentCategoryLabel) : t("categories.basic")}
          </button>
          <span className="text-base-content/20 text-xs">›</span>
          <button
            onClick={() => setMobileView('behaviors')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all outline-none truncate max-w-[140px]
              ${mobileView === 'behaviors'
                ? 'bg-primary text-primary-content'
                : 'text-base-content/50 hover:text-base-content hover:bg-base-content/5'
              }`}
          >
            {currentBehaviorName}
          </button>
          <span className="text-base-content/20 text-xs">›</span>
          <button
            onClick={() => setMobileView('config')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all outline-none shrink-0
              ${mobileView === 'config'
                ? 'bg-primary text-primary-content'
                : 'text-base-content/50 hover:text-base-content hover:bg-base-content/5'
              }`}
          >
            {t("behaviors.config", "Config")}
          </button>
        </div>

        {/* Mobile content area */}
        <div className="flex-1 overflow-hidden relative">

          {/* Categories view */}
          {mobileView === 'categories' && (
            <div className="absolute inset-0 overflow-y-auto custom-scrollbar p-3 flex flex-col gap-1 animate-in fade-in slide-in-from-left-4 duration-200">
              {CATEGORIES.map(cat => {
                const Icon = cat.icon;
                const isActive = selectedCategory === cat.id;
                const count = behaviors.filter(b => getCategory(b.displayName) === cat.id).length;
                return (
                  <Button
                    key={cat.id}
                    onPress={() => {
                      setSelectedCategory(cat.id);
                      setSearchTerm("");
                      setMobileView('behaviors');
                    }}
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all outline-none w-full text-left
                      ${isActive
                        ? 'bg-primary/10 text-primary font-bold'
                        : 'bg-transparent text-base-content/70 hover:bg-base-content/5 hover:text-base-content'
                      }
                    `}
                  >
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${isActive ? 'bg-primary/10' : 'bg-base-200/50'}`}>
                      <Icon size={18} />
                    </div>
                    <span className="flex-1 tracking-wide">{t(cat.labelKey)}</span>
                    <span className="text-[10px] font-bold text-base-content/30">{count}</span>
                  </Button>
                );
              })}
            </div>
          )}

          {/* Behaviors list view */}
          {mobileView === 'behaviors' && (
            <div className="absolute inset-0 overflow-y-auto custom-scrollbar p-2 animate-in fade-in slide-in-from-left-4 duration-200">
              <div className="flex flex-col gap-1">
                {filteredBehaviors.map((b) => {
                  const isSelected = b.id === behaviorId;
                  const description = getDescription(b.displayName);
                  return (
                    <div
                      key={b.id}
                      className={`
                        group flex items-center gap-2 pr-2 rounded-2xl transition-colors
                        ${isSelected ? 'bg-primary/10' : 'hover:bg-base-200/50'}
                      `}
                    >
                      <Button
                        onPress={() => onBehaviorChanged(b.id)}
                        className={`
                          flex-1 px-4 py-3 text-left outline-none
                          ${isSelected
                            ? 'text-primary font-bold'
                            : 'text-base-content/80'
                          }
                        `}
                      >
                        <span className="text-sm block">{b.displayName}</span>
                        {description && (
                          <span className="text-[11px] text-base-content/40 mt-0.5 block">{description}</span>
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Config view */}
          {mobileView === 'config' && (
            <div className="absolute inset-0 flex flex-col animate-in fade-in slide-in-from-right-4 duration-200">
              <div className="flex-1 overflow-y-auto custom-scrollbar relative flex flex-col">
                {metadata ? (
                  <div className="flex-1 w-full flex flex-col min-h-0 px-2 py-2">
                    <div className="flex-1 flex flex-col">
                      <BehaviorParametersPicker
                        metadata={metadata}
                        param1={param1}
                        param2={param2}
                        layers={layers}
                        onParam1Changed={onParam1Changed}
                        onParam2Changed={onParam2Changed}
                        hideModifiers={supportsModifiers}
                        searchTerm={searchTerm}
                        onSearchTermChanged={setSearchTerm}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-base-content/20 gap-4">
                    <div className="w-16 h-16 rounded-full bg-base-200/50 flex items-center justify-center">
                      <MdSettings size={28} />
                    </div>
                    <span className="text-sm font-medium">{t("behaviors.selectToConfigure")}</span>
                  </div>
                )}
              </div>

              {/* Modifiers section at the bottom on mobile */}
              {metadata && supportsModifiers && !isSpecialLayout && (
                <div className="shrink-0 border-t border-base-content/5 p-3">
                  <ModifierPicker
                    value={modifierParamIndex === 2 ? param2 : param1}
                    onValueChanged={modifierParamIndex === 2 ? onParam2Changed : onParam1Changed}
                    vertical={false}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
