import { useMemo, useState, useRef, useEffect } from "react";
import {
  Button,
  Input,
  SearchField,
  Tab,
  TabList,
  TabPanel,
  Tabs,
} from "react-aria-components";
import { Search, X, ChevronDown, LayoutGrid, Eraser } from "lucide-react";
import { CATEGORIZED_KEYCODES, KEYCODE_CATEGORIES } from "./keycodes";
import { hid_usage_from_page_and_id } from "../hid-usages";
import { GetBehaviorDetailsResponse } from "@zmkfirmware/zmk-studio-ts-client/behaviors";
import { BehaviorBinding } from "@zmkfirmware/zmk-studio-ts-client/keymap";
import { useTranslation } from "react-i18next";

export interface KeycodePanelProps {
  behaviors: GetBehaviorDetailsResponse[];
  layers: { id: number; name: string }[];
  selectedBinding: BehaviorBinding | null;
  onBindingChanged: (binding: BehaviorBinding) => void;
}

export const KeycodePanel = ({
  behaviors,
  layers,
  selectedBinding,
  onBindingChanged,
}: KeycodePanelProps) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [columnCount, setColumnCount] = useState(7);

  const kpBehavior = useMemo(
    () => behaviors.find((b) => b.metadata.some(m => m.param1.some(p => p.hidUsage))),
    [behaviors]
  );

  const moBehavior = useMemo(
    () => behaviors.find((b) => b.metadata.some(m => m.param1.some(p => p.layerId))),
    [behaviors]
  );

  const transBehavior = useMemo(
    () => behaviors.find((b) => b.displayName === "&trans" || b.displayName === "Transparent" || b.displayName === "Trans"),
    [behaviors]
  );

  const handleClearClick = () => {
    if (!transBehavior) return;
    onBindingChanged({
      behaviorId: transBehavior.id,
      param1: 0,
      param2: 0,
    });
  };

  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredKeycodes = useMemo(() => {
    if (!searchTerm) return null;
    const term = searchTerm.toLowerCase();
    const results: { page: number; id: number; name: string; label: string; category: string; description?: string }[] = [];
    
    Object.entries(CATEGORIZED_KEYCODES).forEach(([category, codes]) => {
      codes.forEach((code) => {
        if (
          code.name.toLowerCase().includes(term) ||
          code.label.toLowerCase().includes(term)
        ) {
          results.push({ ...code, category });
        }
      });
    });
    
    return results;
  }, [searchTerm]);

  const handleKeycodeClick = (page: number, id: number) => {
    if (!kpBehavior) return;
    onBindingChanged({
      behaviorId: kpBehavior.id,
      param1: hid_usage_from_page_and_id(page, id),
      param2: 0,
    });
  };

  const handleLayerClick = (layerId: number) => {
    if (!moBehavior) return;
    onBindingChanged({
      behaviorId: moBehavior.id,
      param1: layerId,
      param2: 0,
    });
  };

  const tabListRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = tabListRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY === 0) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  return (
    <div className="flex flex-col h-full bg-base-100 rounded-xl shadow-sm border border-base-200 overflow-hidden">
      <div className="p-3 border-b border-base-200 flex flex-col gap-3 bg-base-100/50 backdrop-blur-sm z-10">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 overflow-hidden">
            <h3 className="text-xs font-bold uppercase tracking-wider text-base-content/50 flex items-center gap-2 whitespace-nowrap">
              <LayoutGrid className="size-3.5" />
              {t('keyboard.keycode_picker', 'Keycodes')}
            </h3>
            {!selectedBinding && (
              <span className="text-xs text-base-content/40 font-medium border-l border-base-content/10 pl-3 truncate">
                {t('keyboard.select_key_hint', 'Select a key to assign')}
              </span>
            )}
            {selectedBinding && transBehavior && (
              <div title={t('keyboard.clear_binding', 'Clear Keycode')}>
                <Button
                  onPress={handleClearClick}
                  className="ml-auto flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-base-content/60 hover:text-error hover:bg-base-200 rounded-md transition-colors"
                >
                  <Eraser className="size-3.5" />
                  <span>{t('keyboard.clear', 'Clear')}</span>
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-center bg-base-200/50 hover:bg-base-200 rounded-lg px-4 py-2 transition-colors border border-transparent hover:border-base-300 shrink-0 h-9 hidden">
            <span className="text-xs font-bold uppercase tracking-wider text-base-content/50 select-none mr-2">
              {t('keyboard.columns', 'Cols')}
            </span>
            <div className="h-4 w-px bg-base-content/10 mr-3" />
            <div className="relative flex items-center">
              <select
                value={columnCount}
                onChange={(e) => setColumnCount(parseInt(e.target.value))}
                className="bg-transparent text-sm font-bold outline-none cursor-pointer appearance-none pl-1 pr-5 text-center"
              >
                {[4, 5, 6, 7, 8, 9, 10, 12].map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 size-3 opacity-50 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        <Tabs className="flex-1 flex flex-col overflow-hidden">
          <div ref={tabListRef} className="flex items-center border-b border-base-200 pr-2">
            <TabList className="flex-1 flex gap-2 px-4 pb-0 overflow-x-auto no-scrollbar scroll-smooth">
              {KEYCODE_CATEGORIES.map((cat) => (
                <Tab
                  key={cat}
                  id={cat}
                  className={({ isSelected }) =>
                    `px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-all cursor-pointer outline-none relative ${
                      isSelected
                        ? "text-primary border-primary"
                        : "text-base-content/60 border-transparent hover:text-base-content hover:bg-base-200/50"
                    }`
                  }
                >
                  {t(`keyboard.category.${cat.toLowerCase()}`, cat)}
                </Tab>
              ))}
              <Tab
                id="Layers"
                className={({ isSelected }) =>
                  `px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-all cursor-pointer outline-none relative ${
                    isSelected
                      ? "text-primary border-primary"
                      : "text-base-content/60 border-transparent hover:text-base-content hover:bg-base-200/50"
                  }`
                }
              >
                {t('keyboard.category.layers', 'Layers')}
              </Tab>
            </TabList>

            <SearchField
              value={searchTerm}
              onChange={(val) => {
                setSearchTerm(val);
                if (!val && !isSearchExpanded) {
                  setIsSearchExpanded(false);
                }
              }}
              className="relative group flex items-center justify-end shrink-0 ml-2 py-1"
            >
              <div className={`flex items-center transition-all duration-300 ease-in-out ${isSearchExpanded || searchTerm ? 'w-48 bg-base-200/70' : 'w-8 bg-transparent'} h-8 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 border border-transparent focus-within:border-primary/20 focus-within:bg-base-100`}>
                <Button 
                  className={`flex items-center justify-center h-full w-8 shrink-0 text-base-content/50 hover:text-base-content hover:bg-base-200 transition-colors ${!isSearchExpanded && !searchTerm ? 'cursor-pointer' : 'cursor-default'}`}
                  onPress={() => {
                    setIsSearchExpanded(true);
                    setTimeout(() => searchInputRef.current?.focus(), 10);
                  }}
                >
                  <Search className="size-4" />
                </Button>
                <Input
                  ref={searchInputRef}
                  placeholder={t('keyboard.search_keycodes', 'Search...')}
                  className={`bg-transparent border-none outline-none text-xs w-full placeholder:text-base-content/30 h-full px-2 ${!isSearchExpanded && !searchTerm ? 'hidden' : 'block'}`}
                  onBlur={() => {
                    if (!searchTerm) setIsSearchExpanded(false);
                  }}
                />
                {searchTerm && (
                  <Button
                    onPress={() => {
                      setSearchTerm("");
                      setIsSearchExpanded(false);
                    }}
                    className="flex items-center justify-center h-full w-8 shrink-0 text-base-content/50 hover:text-base-content hover:bg-base-200 transition-colors"
                  >
                    <X className="size-3" />
                  </Button>
                )}
              </div>
            </SearchField>
          </div>

          {searchTerm ? (
            <div className="flex-1 overflow-y-auto p-2">
              <h4 className="text-[10px] font-semibold uppercase tracking-wider text-base-content/40 mb-2 px-1">
                {t('keyboard.search_results', 'Search Results')}
              </h4>
              <div 
                className="flex flex-wrap gap-1 content-start"
              >
                {filteredKeycodes?.map((code) => (
                  <div key={`${code.page}-${code.id}`} title={code.description ? t(code.description) : code.category}>
                    <Button
                      onPress={() => handleKeycodeClick(code.page, code.id)}
                      isDisabled={!selectedBinding}
                      className="flex flex-col items-center justify-center px-3 py-1.5 rounded-lg bg-base-200 hover:bg-primary hover:text-primary-content transition-all border border-transparent hover:shadow-md active:scale-95 disabled:opacity-50 disabled:hover:bg-base-200 disabled:hover:text-base-content group h-10 min-w-[40px]"
                    >
                      <span className="text-sm font-bold truncate max-w-[100px]">{code.label}</span>
                    </Button>
                  </div>
                ))}
                {filteredKeycodes?.length === 0 && (
                  <div className="col-span-full py-8 text-center text-base-content/50">
                    {t('keyboard.no_results', 'No keycodes found')}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              {KEYCODE_CATEGORIES.map((cat) => (
                <TabPanel key={cat} id={cat} className="flex-1 overflow-y-auto p-2 outline-none">
                  <div 
                    className="flex flex-wrap gap-1 content-start"
                  >
                    {CATEGORIZED_KEYCODES[cat]?.map((code) => (
                      <div key={`${code.page}-${code.id}`} title={code.description ? t(code.description) : code.name}>
                        <Button
                          onPress={() => handleKeycodeClick(code.page, code.id)}
                          isDisabled={!selectedBinding}
                          className="flex flex-col items-center justify-center px-3 py-1.5 rounded-lg bg-base-200 hover:bg-primary hover:text-primary-content transition-all border border-transparent hover:shadow-md active:scale-95 disabled:opacity-50 disabled:hover:bg-base-200 disabled:hover:text-base-content group h-10 min-w-[40px]"
                        >
                          <span className="text-sm font-bold truncate max-w-[100px]">{code.label}</span>
                        </Button>
                      </div>
                    ))}
                  </div>
                </TabPanel>
              ))}
              
              <TabPanel id="Layers" className="flex-1 overflow-y-auto p-2 outline-none">
                <div 
                  className="flex flex-wrap gap-1 content-start"
                >
                  {layers.map((layer) => (
                    <div key={layer.id} title={`MO(${layer.id})`}>
                      <Button
                        onPress={() => handleLayerClick(layer.id)}
                        isDisabled={!selectedBinding}
                        className="flex flex-col items-center justify-center px-3 py-1.5 rounded-lg bg-base-200 hover:bg-primary hover:text-primary-content transition-all border border-transparent hover:shadow-md active:scale-95 disabled:opacity-50 disabled:hover:bg-base-200 disabled:hover:text-base-content group h-10 min-w-[40px]"
                      >
                        <span className="text-sm font-bold truncate max-w-[100px]">{layer.name}</span>
                      </Button>
                    </div>
                  ))}
                </div>
              </TabPanel>
            </>
          )}
        </Tabs>
      </div>
    </div>
  );
};
