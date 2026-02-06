import { useEffect, useMemo, useState, useRef } from "react";
import { Search, ChevronRight, Keyboard, Layers, Command, Zap, Bluetooth, Lightbulb, Settings, MoreHorizontal } from "lucide-react";
import {
  GetBehaviorDetailsResponse,
  BehaviorBindingParametersSet,
} from "@zmkfirmware/zmk-studio-ts-client/behaviors";
import { BehaviorBinding } from "@zmkfirmware/zmk-studio-ts-client/keymap";
import { BehaviorParametersPicker } from "./BehaviorParametersPicker";
import { validateValue } from "./parameters";
import { Button, TextField, Input } from "react-aria-components";

export interface BehaviorBindingPickerProps {
  binding: BehaviorBinding;
  behaviors: GetBehaviorDetailsResponse[];
  layers: { id: number; name: string }[];
  onBindingChanged: (binding: BehaviorBinding) => void;
}

// --- Categorization Logic ---
const CATEGORIES = [
  { id: "basic", label: "Basic", icon: Keyboard, match: ["Key Press", "Transparent", "None"] },
  { id: "layers", label: "Layers", icon: Layers, match: ["Layer", "Momentary", "Toggle", "To Layer"] },
  { id: "mods", label: "Modifiers", icon: Command, match: ["Mod-Tap", "Sticky Key", "Caps Word", "Key Repeat"] },
  { id: "conn", label: "Bluetooth", icon: Bluetooth, match: ["Bluetooth", "Output"] },
  { id: "media", label: "System", icon: Settings, match: ["Reset", "Bootloader", "Studio Unlock"] },
  { id: "lighting", label: "Lighting", icon: Lightbulb, match: ["RGB", "Backlight"] },
  { id: "other", label: "Other", icon: MoreHorizontal, match: [] },
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

export const BehaviorBindingPicker = ({
  binding,
  layers,
  behaviors,
  onBindingChanged,
}: BehaviorBindingPickerProps) => {
  const [behaviorId, setBehaviorId] = useState(binding.behaviorId);
  const [param1, setParam1] = useState<number | undefined>(binding.param1);
  const [param2, setParam2] = useState<number | undefined>(binding.param2);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("basic");

  const metadata = useMemo(
    () => behaviors.find((b) => b.id == behaviorId)?.metadata,
    [behaviorId, behaviors]
  );

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

  useEffect(() => {
    if (
      binding.behaviorId === behaviorId &&
      binding.param1 === param1 &&
      binding.param2 === param2
    ) return;

    if (!metadata) return;

    if (
      validateBinding(
        metadata,
        layers.map(({ id }) => id),
        param1,
        param2
      )
    ) {
      onBindingChanged({
        behaviorId,
        param1: param1 || 0,
        param2: param2 || 0,
      });
    }
  }, [behaviorId, param1, param2]);

  useEffect(() => {
    setBehaviorId(binding.behaviorId);
    setParam1(binding.param1);
    setParam2(binding.param2);
  }, [binding]);

  const currentBehavior = behaviors.find(b => b.id === behaviorId);

  return (
    <div className="flex h-full w-full bg-base-100">

      {/* 1. LEFT SIDEBAR: Navigation (Fixed Width) */}
      <div className="w-64 flex flex-col border-r border-base-content/5 bg-base-200/30 p-4 gap-4">
        {/* Search */}
        <div className="px-0">
          <TextField value={searchTerm} onChange={setSearchTerm} className="relative group w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-base-content/40 group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Search..."
              className="w-full bg-base-100 border border-transparent focus:border-primary/20 rounded-full pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-base-content/30 shadow-sm"
            />
          </TextField>
        </div>

        {/* Vertical Category List */}
        <div className="flex flex-col gap-1 overflow-y-auto flex-1 pr-1 custom-scrollbar">
          {CATEGORIES.map(cat => {
            const Icon = cat.icon;
            const isActive = selectedCategory === cat.id && !searchTerm;
            return (
              <Button
                key={cat.id}
                onPress={() => {
                  setSelectedCategory(cat.id);
                  setSearchTerm(""); // Clear search when picking category
                }}
                className={`
                        flex items-center gap-3 px-4 py-3 rounded-full text-xs font-bold transition-all border outline-none w-full text-left
                        ${isActive
                    ? 'bg-primary/10 text-primary border-transparent'
                    : 'bg-transparent text-base-content/60 border-transparent hover:bg-base-content/5 hover:text-base-content'
                  }
                    `}
              >
                <Icon size={18} strokeWidth={2} className={isActive ? "opacity-100" : "opacity-70"} />
                <span className="flex-1 tracking-wide">{cat.label}</span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* 2. MIDDLE COLUMN: Behavior Grid (Restricted Width) */}
      <div className="w-[450px] flex flex-col border-r border-base-content/5 bg-base-100">
        <div className="px-6 py-4 border-b border-base-content/5 sticky top-0 bg-base-100/95 backdrop-blur z-10 flex items-center justify-between">
          <span className="text-xs font-bold text-base-content/50 uppercase tracking-widest">
            {searchTerm ? `Results` : CATEGORIES.find(c => c.id === selectedCategory)?.label}
          </span>
          <span className="text-[10px] font-mono text-base-content/30">{filteredBehaviors.length} items</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {filteredBehaviors.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-base-content/40 gap-3">
              <Search size={32} className="opacity-20" />
              <span className="text-sm font-medium">No behaviors found</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 pb-8">
              {filteredBehaviors.map((b) => {
                const isSelected = b.id === behaviorId;
                return (
                  <Button
                    key={b.id}
                    onPress={() => {
                      setBehaviorId(b.id);
                      setParam1(0);
                      setParam2(0);
                    }}
                    className={`
                            p-4 rounded-2xl border text-left transition-all group relative overflow-hidden flex flex-col gap-1 outline-none
                            ${isSelected
                        ? 'bg-primary text-primary-content border-primary shadow-md scale-[1.02]'
                        : 'bg-base-200/50 border-transparent hover:bg-base-200 text-base-content hover:scale-[1.01]'
                      }
                        `}
                  >
                    <span className="text-sm font-bold truncate w-full block">{b.displayName}</span>
                    <span className={`text-[10px] font-mono opacity-60 ${isSelected ? 'text-primary-content/80' : ''}`}>#{b.id}</span>
                  </Button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 3. RIGHT COLUMN: Configuration (Takes Remaining Space) */}
      <div className="flex-1 bg-base-50 flex flex-col min-w-[300px]">
        {metadata ? (
          <div className="flex flex-col h-full animate-in slide-in-from-right-4 duration-300 fade-in">
            <div className="p-6 border-b border-base-content/5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Settings size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-base-content">{currentBehavior?.displayName}</h3>
                <p className="text-xs text-base-content/40 font-medium">Configure parameters</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              {/* Proper themed container for parameters */}
              <div className="w-full max-w-lg">
                <BehaviorParametersPicker
                  metadata={metadata}
                  param1={param1}
                  param2={param2}
                  layers={layers}
                  onParam1Changed={setParam1}
                  onParam2Changed={setParam2}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-base-content/20 gap-4">
            <div className="w-16 h-16 rounded-full bg-base-200/50 flex items-center justify-center">
              <Settings size={24} />
            </div>
            <span className="text-sm font-medium">Select a behavior to configure</span>
          </div>
        )}
      </div>
    </div>
  );
};
