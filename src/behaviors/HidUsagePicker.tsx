import {
  Button,
  Input,
} from "react-aria-components";
import {
  hid_usage_get_labels,
  hid_usage_page_get_ids,
} from "../hid-usages";
import { useEffect, useMemo, useRef, useState } from "react";
import { MdSearch } from "react-icons/md";
import {
  mask_mods,
  ModifierPicker
} from "./ModifierPicker";
import { useTranslation } from "react-i18next";

export interface HidUsagePage {
  id: number;
  min?: number;
  max?: number;
}

export interface HidUsagePickerProps {
  label?: string;
  value?: number;
  usagePages: HidUsagePage[];
  onValueChanged: (value?: number) => void;
  showModifiers?: boolean;
  searchTerm?: string;
  onSearchTermChanged?: (term: string) => void;
}



function getTabForUsage(page: number, id: number): string {
  if (page === 0x07) {
    if (id >= 0x04 && id <= 0x1d) return "alpha";
    if ((id >= 0x1e && id <= 0x27) || (id >= 0x59 && id <= 0x61)) return "num";
    if ((id >= 0x3a && id <= 0x45) || (id >= 0x68 && id <= 0x73)) return "func";
    if ([0x28, 0x29, 0x2a, 0x2b, 0x2c, 0x2d, 0x2e, 0x2f, 0x30, 0x31, 0x32, 0x33, 0x34, 0x35, 0x36, 0x37, 0x38].includes(id)) return "sym";
    if ([0x4f, 0x50, 0x51, 0x52, 0x4a, 0x4b, 0x4d, 0x4e, 0x49, 0x4c, 0x46, 0x47, 0x48].includes(id)) return "nav";
    if (id >= 0xe0 && id <= 0xe7) return "mods";
    return "other";
  }
  if (page === 0x0c) return "media";
  return "other";
}

export const HidUsagePicker = ({
  // label kept in props interface for compatibility
  value,
  usagePages,
  onValueChanged,
  showModifiers = true,
  searchTerm = "",
  onSearchTermChanged,
}: HidUsagePickerProps) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("alpha");

  const TABS = [
    { id: "alpha", label: t("hid.alpha") },
    { id: "num", label: t("hid.num") },
    { id: "nav", label: t("hid.nav") },
    { id: "func", label: t("hid.func") },
    { id: "sym", label: t("hid.sym") },
    { id: "media", label: t("hid.media") },
    { id: "mods", label: t("hid.mods") },
    { id: "other", label: t("hid.other") },
  ];

  const rawUsageValue = value ? mask_mods(value) : undefined;

  // Flatten all available usages
  const allUsages = useMemo(() => {
    let result: { page: number; id: number; name: string; shortName?: string }[] = [];

    for (const p of usagePages) {
      const info = hid_usage_page_get_ids(p.id);
      if (!info) continue;

      let ids = info.UsageIds;
      if (p.max || p.min) {
        ids = ids.filter(i =>
          (i.Id <= (p.max || Number.MAX_SAFE_INTEGER) && i.Id >= (p.min || 0)) ||
          (p.id === 0x07 && i.Id >= 0xe0 && i.Id <= 0xe7) // Always include mods if keyboard page
        );
      }

      ids.forEach(u => {
        const labels = hid_usage_get_labels(p.id, u.Id);
        let name = labels.long || labels.med || labels.short || u.Name;
        let shortName = labels.short || u.Name;

        // --- Name Cleanup Logic ---
        if (name.startsWith("Keyboard ")) name = name.replace(/^Keyboard /, "");
        if (shortName.startsWith("Keyboard ")) shortName = shortName.replace(/^Keyboard /, "");

        if (name.startsWith("Keypad ") && name.length > 7) name = name.replace(/^Keypad /, "KP ");
        if (shortName.startsWith("Keypad ") && shortName.length > 7) shortName = shortName.replace(/^Keypad /, "KP ");

        result.push({
          page: p.id,
          id: u.Id,
          name: name,
          shortName: shortName
        });
      });
    }
    return result;
  }, [usagePages]);

  // Filter based on Tab or Search
  const displayUsages = useMemo(() => {
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      return allUsages.filter(u =>
        u.name.toLowerCase().includes(lower) ||
        (u.shortName && u.shortName.toLowerCase().includes(lower)) ||
        (lower.startsWith("0x") && u.id.toString(16).includes(lower.substring(2)))
      );
    }
    return allUsages.filter(u => getTabForUsage(u.page, u.id) === activeTab);
  }, [allUsages, searchTerm, activeTab]);

  // Auto-select tab logic
  useEffect(() => {
    if (value !== undefined) {
      const cleanValue = mask_mods(value);
      const page = (cleanValue >> 16) & 0xFFFF;
      const id = cleanValue & 0xFFFF;

      if ((page << 16 | id) !== 0) {
        const tab = getTabForUsage(page, id);
        if (tab) {
          setActiveTab(tab);
        }
      }
    }
  }, [value]);

  const handleUsageSelect = (page: number, id: number) => {
    let base = (page << 16) | id;
    let current_mods = value ? (value >> 24) : 0;
    onValueChanged(base | (current_mods << 24));
  };

  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const openSearch = () => {
    setSearchOpen(true);
    // Focus the input after render
    setTimeout(() => searchInputRef.current?.focus(), 50);
  };

  const closeSearch = () => {
    setSearchOpen(false);
    onSearchTermChanged?.("");
  };

  return (
    <div className="flex flex-col h-full w-full font-sans">
      {/* Top Bar: Tabs + Search toggle */}
      <div className="shrink-0 px-4 pt-4 pb-3 flex items-center gap-2">
        {searchOpen ? (
          /* Expanded search — replaces tabs */
          <div className="flex-1 flex items-center gap-2 animate-in fade-in duration-150">
            <div className="relative flex-1">
              <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-base-content/40" />
              <Input
                ref={searchInputRef}
                value={searchTerm}
                onChange={(e) => onSearchTermChanged?.(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Escape') closeSearch(); }}
                placeholder={t("hid.filter")}
                className="w-full bg-base-200/60 hover:bg-base-200 border border-base-content/10 focus:border-primary/40 rounded-full pl-10 pr-4 py-1.5 text-sm font-medium outline-none transition-all placeholder:text-base-content/40 focus:bg-base-100"
              />
            </div>
            <Button
              onPress={closeSearch}
              className="p-2 rounded-full text-base-content/50 hover:text-base-content hover:bg-base-content/5 transition-all outline-none shrink-0"
            >
              ✕
            </Button>
          </div>
        ) : (
          /* Tabs + Search icon button */
          <>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide flex-1 items-center p-0.5">
              {TABS.map(tab => (
                <Button
                  key={tab.id}
                  onPress={() => setActiveTab(tab.id)}
                  className={`
                    px-4 py-1.5 rounded-full text-xs font-bold transition-all border shrink-0 outline-none
                    ${(!searchTerm && activeTab === tab.id)
                      ? 'bg-primary text-primary-content border-transparent scale-105 shadow-sm'
                      : 'bg-base-200/50 border-transparent text-base-content/60 hover:bg-base-200 hover:text-base-content'
                    }
                  `}
                >
                  {tab.label}
                </Button>
              ))}
            </div>
            <Button
              onPress={openSearch}
              className="p-2 rounded-full text-base-content/40 hover:text-base-content hover:bg-base-content/5 transition-all outline-none shrink-0"
              aria-label="Search"
            >
              <MdSearch size={20} />
            </Button>
          </>
        )}
      </div>

      {/* Separator */}
      <div className="shrink-0 border-b border-base-content/5" />

      {/* Grid Content - Responsive columns */}
      <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar p-2">
        {displayUsages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-base-content/30 gap-3">
            <div className="w-16 h-16 rounded-full bg-base-200/50 flex items-center justify-center animate-pulse">
              <MdSearch size={24} className="opacity-50" />
            </div>
            <span className="text-sm font-medium">{t("behaviors.noResults")}</span>
          </div>
        ) : (
          <div className={`grid gap-1.5 lg:gap-2 ${activeTab === 'media' || searchTerm
            ? 'grid-cols-1 sm:grid-cols-2'
            : 'grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-8 xl:grid-cols-10'
            }`}>
            {displayUsages.map(u => {
              const usageVal = (u.page << 16) | u.id;
              const isSelected = rawUsageValue === usageVal;

              if (activeTab === 'media' || searchTerm) {
                return (
                  <Button
                    key={`${u.page}-${u.id}`}
                    onPress={() => handleUsageSelect(u.page, u.id)}
                    className={`
                      flex items-center justify-between px-3 lg:px-4 py-2.5 lg:py-3 rounded-2xl border text-left transition-all text-xs font-bold outline-none group
                      ${isSelected
                        ? 'bg-primary/30 text-primary border-transparent shadow-none'
                        : 'bg-base-300/50 border-transparent hover:bg-base-300 hover:text-base-content'
                      }
                    `}
                  >
                    <span className={`truncate ${isSelected ? 'text-primary' : 'text-base-content/90'}`}>{u.name}</span>
                    {searchTerm && <span className={`text-[10px] font-mono ml-2 ${isSelected ? 'opacity-80' : 'opacity-40'}`}>{(u.page << 16 | u.id).toString(16)}</span>}
                  </Button>
                )
              }

              return (
                <Button
                  key={`${u.page}-${u.id}`}
                  onPress={() => handleUsageSelect(u.page, u.id)}
                  className={`
                    aspect-[1/1] flex flex-col items-center justify-center p-0.5 lg:p-1 rounded-xl lg:rounded-2xl border transition-all outline-none
                    ${isSelected
                      ? 'bg-primary/30 text-primary border-transparent shadow-none scale-105 z-10'
                      : 'bg-base-300/50 border-transparent hover:bg-base-300 hover:text-base-content hover:scale-105'
                    }
                  `}
                >
                  <span className={`text-[10px] lg:text-xs font-bold text-center leading-tight break-words ${isSelected ? 'text-primary' : 'text-base-content/90'}`}>{u.shortName || u.name}</span>
                </Button>
              );
            })}
          </div>
        )}
      </div>

      {/* Internal Modifiers Footer (Optional - uses shared logic) */}
      {showModifiers && (
        <div className="pt-2 lg:pt-4 border-t border-base-content/5 mt-auto">
          <ModifierPicker value={value} onValueChanged={onValueChanged} vertical={false} />
        </div>
      )}
    </div>
  );
};
