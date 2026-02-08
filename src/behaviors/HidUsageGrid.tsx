import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Checkbox, CheckboxGroup } from "react-aria-components";
import { useTranslation } from "react-i18next";
import {
  hid_usage_from_page_and_id,
  hid_usage_page_get_ids,
  hid_usage_get_label,
} from "../hid-usages";
import type { HidUsagePage } from "./HidUsagePicker";

function shortenKeyLabel(fullLabel: string): string {
  if (fullLabel.startsWith("Keyboard ")) {
    return fullLabel.slice(9);
  }
  if (fullLabel.startsWith("Keypad ")) {
    const rest = fullLabel.slice(7).split(" and ")[0];
    return "KP " + rest;
  }
  if (fullLabel.length > 8) {
    const words = fullLabel.split(/[\s/,-]+/);
    if (words.length >= 2) {
      if (words[0].length <= 4) {
        return words[0] + " " + words.slice(1).map(w => w[0]).join("");
      }
      return words.map(w => w.substring(0, 3)).join("");
    }
    return fullLabel.substring(0, 7);
  }
  return fullLabel;
}

interface KeyTab {
  id: string;
  label: string;
  filter: (pageId: number, usageId: number) => boolean;
}

const KEY_TABS: KeyTab[] = [
  {
    id: "alpha",
    label: "Alpha",
    filter: (page, id) => page === 7 && id >= 0x04 && id <= 0x1d,
  },
  {
    id: "numbers",
    label: "Numbers",
    filter: (page, id) => page === 7 && id >= 0x1e && id <= 0x27,
  },
  {
    id: "navigation",
    label: "Navigation",
    filter: (page, id) =>
      page === 7 &&
      ((id >= 0x49 && id <= 0x52) ||
        id === 0x28 ||
        id === 0x29 ||
        id === 0x2a ||
        id === 0x2b ||
        id === 0x2c ||
        id === 0x39),
  },
  {
    id: "functions",
    label: "Functions",
    filter: (page, id) =>
      page === 7 &&
      ((id >= 0x3a && id <= 0x45) ||
        (id >= 0x68 && id <= 0x73)),
  },
  {
    id: "symbols",
    label: "Symbols",
    filter: (page, id) =>
      page === 7 &&
      ((id >= 0x2d && id <= 0x38) ||
        id === 0x64 ||
        id === 0x32),
  },
  {
    id: "media",
    label: "Media",
    filter: (page) => page === 12,
  },
  {
    id: "modkeys",
    label: "Modifiers",
    filter: (page, id) => page === 7 && id >= 0xe0 && id <= 0xe7,
  },
  {
    id: "other",
    label: "Other",
    filter: () => false,
  },
];

enum Mods {
  LeftControl = 0x01,
  LeftShift = 0x02,
  LeftAlt = 0x04,
  LeftGUI = 0x08,
  RightControl = 0x10,
  RightShift = 0x20,
  RightAlt = 0x40,
  RightGUI = 0x80,
}

const mod_labels: Record<Mods, string> = {
  [Mods.LeftControl]: "L-Ctrl",
  [Mods.LeftShift]: "L-Shift",
  [Mods.LeftAlt]: "L-Alt",
  [Mods.LeftGUI]: "L-GUI",
  [Mods.RightControl]: "R-Ctrl",
  [Mods.RightShift]: "R-Shift",
  [Mods.RightAlt]: "R-Alt",
  [Mods.RightGUI]: "R-GUI",
};

const all_mods = [
  Mods.LeftControl,
  Mods.LeftShift,
  Mods.LeftAlt,
  Mods.LeftGUI,
  Mods.RightControl,
  Mods.RightShift,
  Mods.RightAlt,
  Mods.RightGUI,
];

const mod_pairs: [Mods, Mods][] = [
  [Mods.LeftControl, Mods.RightControl],
  [Mods.LeftShift, Mods.RightShift],
  [Mods.LeftAlt, Mods.RightAlt],
  [Mods.LeftGUI, Mods.RightGUI],
];

function mods_to_flags(mods: Mods[]): number {
  return mods.reduce((a, v) => a + v, 0);
}

function mask_mods(value: number) {
  return value & ~(mods_to_flags(all_mods) << 24);
}

interface KeyGridItem {
  usageValue: number;
  label: string;
  shortLabel: string;
  displayLabel: string;
  pageId: number;
  usageId: number;
  colSpan: 1 | 2 | 3;
}

export interface HidUsageGridProps {
  value?: number;
  usagePages: HidUsagePage[];
  onValueChanged: (value?: number) => void;
}

export const HidUsageGrid = ({
  value,
  usagePages,
  onValueChanged,
}: HidUsageGridProps) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("alpha");
  const [filter, setFilter] = useState("");
  const gridRef = useRef<HTMLDivElement>(null);

  const mods = useMemo(() => {
    const flags = value ? value >> 24 : 0;
    return all_mods.filter((m) => m & flags).map((m) => m.toLocaleString());
  }, [value]);

  const allKeys = useMemo(() => {
    const keys: KeyGridItem[] = [];
    for (const page of usagePages) {
      const info = hid_usage_page_get_ids(page.id);
      if (!info) continue;
      for (const usage of info.UsageIds) {
        if (
          (page.min !== undefined && usage.Id < page.min) ||
          (page.max !== undefined && usage.Id > page.max)
        ) {
          if (!(page.id === 7 && usage.Id >= 0xe0 && usage.Id <= 0xe7)) {
            continue;
          }
        }
        const label =
          hid_usage_get_label(page.id, usage.Id) || usage.Name;
        const short = shortenKeyLabel(label);
        const colSpan: 1 | 2 | 3 = short.length > 7 ? 3 : short.length > 3 ? 2 : 1;
        let displayLabel = short;
        if (colSpan > 1) {
          if (label.startsWith("Keyboard ")) {
            displayLabel = label.slice(9);
          } else if (label.startsWith("Keypad ")) {
            displayLabel = "KP " + label.slice(7).split(" and ")[0];
          } else {
            displayLabel = label;
          }
        }
        keys.push({
          usageValue: hid_usage_from_page_and_id(page.id, usage.Id),
          label,
          shortLabel: short,
          displayLabel,
          pageId: page.id,
          usageId: usage.Id,
          colSpan,
        });
      }
    }
    return keys;
  }, [usagePages]);

  const tabKeys = useMemo(() => {
    const result: Record<string, KeyGridItem[]> = {};
    const classified = new Set<number>();

    for (const tab of KEY_TABS) {
      if (tab.id === "other") continue;
      result[tab.id] = [];
      for (const key of allKeys) {
        if (tab.filter(key.pageId, key.usageId)) {
          result[tab.id].push(key);
          classified.add(key.usageValue);
        }
      }
    }

    result["other"] = allKeys.filter((k) => !classified.has(k.usageValue));

    return result;
  }, [allKeys]);

  useEffect(() => {
    if (value === undefined) return;
    const masked = mask_mods(value);
    if (masked === 0) return;
    for (const tab of KEY_TABS) {
      if (tab.id === "other") continue;
      const keys = tabKeys[tab.id];
      if (keys?.some((k) => k.usageValue === masked)) {
        setActiveTab(tab.id);
        return;
      }
    }
    if (tabKeys["other"]?.some((k) => k.usageValue === masked)) {
      setActiveTab("other");
    }
  }, [value, tabKeys]);

  useEffect(() => {
    if (value === undefined) return;
    const masked = mask_mods(value);
    if (masked === 0) return;
    requestAnimationFrame(() => {
      const container = gridRef.current;
      if (!container) return;
      const selected = container.querySelector('[data-selected="true"]') as HTMLElement | null;
      if (selected) {
        selected.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    });
  }, [value, activeTab]);

  const filteredKeys = useMemo(() => {
    const keys = tabKeys[activeTab] || [];
    if (!filter) return keys;
    const lowerFilter = filter.toLowerCase();
    return keys.filter((k) => k.label.toLowerCase().includes(lowerFilter));
  }, [tabKeys, activeTab, filter]);

  const selectedUsageValue = value !== undefined ? mask_mods(value) : undefined;

  const handleKeyClick = useCallback(
    (usageValue: number) => {
      const modFlags = mods_to_flags(mods.map((m) => parseInt(m)));
      const newValue = usageValue | (modFlags << 24);
      onValueChanged(newValue);
    },
    [onValueChanged, mods]
  );

  const modifiersChanged = useCallback(
    (m: string[]) => {
      if (!value) return;
      const modFlags = mods_to_flags(m.map((m) => parseInt(m)));
      const newValue = mask_mods(value) | (modFlags << 24);
      onValueChanged(newValue);
    },
    [value, onValueChanged]
  );

  const availableTabs = useMemo(
    () => KEY_TABS.filter((t) => (tabKeys[t.id]?.length || 0) > 0),
    [tabKeys]
  );

  return (
    <div className="flex gap-3 min-h-0 flex-1">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <div className="flex gap-1 flex-wrap">
            {availableTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1 rounded text-sm transition-colors cursor-pointer ${activeTab === tab.id
                    ? "bg-primary text-primary-content"
                    : "bg-base-300 text-base-content hover:bg-base-100"
                  }`}
              >
                {t(`hid.tabs.${tab.id}`)}
              </button>
            ))}
          </div>
          <div className="relative ml-auto">
            <input
              type="text"
              placeholder={t("hid.general.filter")}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-7 pr-2 py-1 rounded bg-base-300 text-base-content text-sm w-32 focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <svg
              className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-base-content/50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        <div ref={gridRef} className="grid grid-cols-[repeat(auto-fill,minmax(3.2rem,1fr))] gap-1.5 overflow-y-auto max-h-52 pr-1">
          {filteredKeys.map((key) => {
            const spanClass = key.colSpan === 3 ? "col-span-3" : key.colSpan === 2 ? "col-span-2" : "";
            const isSelected = selectedUsageValue === key.usageValue;
            return (
              <button
                key={key.usageValue}
                data-selected={isSelected ? "true" : undefined}
                onClick={() => handleKeyClick(key.usageValue)}
                title={key.label}
                className={`${spanClass} h-[3.2rem] rounded text-sm font-medium cursor-pointer transition-colors flex items-center justify-center ${isSelected
                    ? "bg-primary text-primary-content"
                    : "bg-base-100 text-base-content hover:bg-base-300"
                  }`}
              >
                <span className="truncate px-1 leading-tight text-center">{key.displayLabel}</span>
              </button>
            );
          })}
          {filteredKeys.length === 0 && (
            <div className="col-span-full text-center text-base-content/50 py-4 text-sm">
              {t("hid.general.noKeys")}
            </div>
          )}
        </div>
      </div>

      <div className="flex-shrink-0 w-40">
        <div className="text-sm text-base-content/60 mb-2 font-medium">
          {t("hid.general.modifiersTitle")}
        </div>
        <CheckboxGroup
          aria-label={t("hid.general.implicitModifiers")}
          className="grid grid-cols-2 gap-1.5"
          value={mods}
          onChange={modifiersChanged}
        >
          {mod_pairs.map(([left, right]) => (
            <div key={left} className="contents">
              <Checkbox
                value={left.toLocaleString()}
                className="text-nowrap cursor-pointer grid px-2 py-2 content-center justify-center text-sm rounded rac-selected:bg-primary bg-base-100 hover:bg-base-300 rac-selected:text-primary-content text-base-content"
              >
                {mod_labels[left]}
              </Checkbox>
              <Checkbox
                value={right.toLocaleString()}
                className="text-nowrap cursor-pointer grid px-2 py-2 content-center justify-center text-sm rounded rac-selected:bg-primary bg-base-100 hover:bg-base-300 rac-selected:text-primary-content text-base-content"
              >
                {mod_labels[right]}
              </Checkbox>
            </div>
          ))}
        </CheckboxGroup>
      </div>
    </div>
  );
};
