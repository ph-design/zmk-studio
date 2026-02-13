import { MdCheck, MdExpandMore, MdLayers, MdTouchApp, MdSchedule } from "react-icons/md";
import { BehaviorBindingParametersSet } from "@zmkfirmware/zmk-studio-ts-client/behaviors";
import { ParameterValuePicker } from "./ParameterValuePicker";
import { validateValue } from "./parameters";
import { Button, ListBox, ListBoxItem, Popover, Select, SelectValue } from "react-aria-components";
import { ModifierPicker } from "./ModifierPicker";
import { useTranslation } from "react-i18next";

export interface BehaviorParametersPickerProps {
  param1?: number;
  param2?: number;
  metadata: BehaviorBindingParametersSet[];
  layers: { id: number; name: string }[];
  onParam1Changed: (value?: number) => void;
  onParam2Changed: (value?: number) => void;
  hideModifiers?: boolean;
  searchTerm?: string;
  onSearchTermChanged?: (term: string) => void;
}

export const BehaviorParametersPicker = ({
  param1,
  param2,
  metadata,
  layers,
  onParam1Changed,
  onParam2Changed,
  hideModifiers,
  searchTerm,
  onSearchTermChanged,
}: BehaviorParametersPickerProps) => {
  const { t } = useTranslation();
  // Check for Layer + Usage pattern (e.g. &lt)
  const layerTapSet = metadata.find(s =>
    s.param1?.length === 1 && s.param1[0].layerId &&
    s.param2?.some(p => p.hidUsage)
  );

  if (layerTapSet) {
    return (
      <div className="flex flex-col h-full w-full">
        {/* Top: Layer Dropdown - Integrated look */}
        <div className="shrink-0 relative z-20 bg-base-100 border-b border-base-content/5">
          <Select
            selectedKey={param1}
            onSelectionChange={(k) => onParam1Changed(Number(k))}
            className="w-full"
          >
            <Button className="w-full flex items-center justify-between px-4 py-3 hover:bg-base-200/50 transition-colors outline-none group text-left">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <MdLayers size={18} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-base-content/40 leading-none mb-0.5">{t("layers.target")}</span>
                  <SelectValue>
                    {({ selectedText }) => (
                      <span className="text-sm font-bold truncate block w-full">{selectedText || t("layers.select")}</span>
                    )}
                  </SelectValue>
                </div>
              </div>
              <MdExpandMore className="text-base-content/30 group-hover:text-base-content/70 transition-colors shrink-0" size={20} />
            </Button>

            <Popover className="min-w-[300px] bg-base-200 border border-base-300 rounded-2xl shadow-xl p-1 max-h-[300px] overflow-y-auto z-50">
              <ListBox className="outline-none flex flex-col gap-0.5">
                {layers.map((l) => (
                  <ListBoxItem
                    key={l.id}
                    id={l.id}
                    textValue={l.name || `Layer ${l.id}`}
                    className={({ isSelected }) => `
                      px-4 py-3 rounded-xl text-sm cursor-pointer outline-none flex items-center justify-between transition-colors
                      ${isSelected ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-base-300 text-base-content/80 hover:text-base-content'}
                    `}
                  >
                    {({ isSelected }) => (
                      <>
                        <span>{l.name || `Layer ${l.id}`}</span>
                        {isSelected && <MdCheck className="text-primary text-lg" />}
                      </>
                    )}
                  </ListBoxItem>
                ))}
              </ListBox>
            </Popover>
          </Select>
        </div>

        {/* Bottom: Usage Picker (Main Body) */}
        <div className="flex-1 min-h-0 relative">
          <ParameterValuePicker
            values={layerTapSet.param2!}
            value={param2}
            layers={layers}
            onValueChanged={onParam2Changed}
            hideModifiers={true} // Handle modifiers in the global drawer column
            searchTerm={searchTerm}
            onSearchTermChanged={onSearchTermChanged}
          />
        </div>
      </div>
    );
  }

  // --- Check for Mod-Tap pattern (Param 1: Mods, Param 2: Usage) ---
  // We identify this if param1 has keyboardMax (modifiers are often treated as hid usages in some contexts, or we check specifically) 
  // OR typically mod-tap is specific. ZMK Studio client might flag it. 
  // Simplest heuristic: param1 is modifiers-like (small range or usage page 7 0xE0-0xE7) AND param2 is standard usage.
  // Actually, standard mod-tap definition:
  // param1: usage (modifiers)
  // param2: usage (key)
  const isModTap = metadata.some(s =>
    s.param1?.some(p => p.hidUsage && p.hidUsage.keyboardMax) &&
    s.param2?.some(p => p.hidUsage && p.hidUsage.keyboardMax)
  );

  if (isModTap) {
    return (
      <div className="flex flex-col md:flex-row h-full w-full md:divide-x divide-base-content/5">
        {/* Left Column: HOLD (Modifier) */}
        <div className="md:w-48 lg:w-64 shrink-0 flex flex-col min-w-0 bg-base-100/50 border-b md:border-b-0 border-base-content/5">
          <div className="shrink-0 px-4 py-2 lg:py-3 border-b border-base-content/5 flex items-center gap-2 text-base-content/60">
            <MdSchedule size={18} />
            <span className="text-xs font-bold uppercase tracking-wider opacity-80">{t("behaviors.hold")}</span>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 max-h-[120px] md:max-h-none">
            <ModifierPicker
              value={param1}
              onValueChanged={onParam1Changed}
              vertical={true}
            />
          </div>
        </div>

        {/* Right Column: TAP (Key) */}
        <div className="flex-1 flex flex-col min-w-0 bg-base-100">
          <div className="shrink-0 px-4 py-2 lg:py-3 border-b border-base-content/5 flex items-center gap-2 text-base-content/70">
            <MdTouchApp size={18} />
            <span className="text-xs font-bold uppercase tracking-wider opacity-80">{t("behaviors.tap")}</span>
          </div>
          <div className="flex-1 min-h-0 relative">
            <ParameterValuePicker
              values={metadata.flatMap(m => m.param2 || [])}
              value={param2}
              layers={layers}
              onValueChanged={onParam2Changed}
              hideModifiers={true}
              searchTerm={searchTerm}
              onSearchTermChanged={onSearchTermChanged}
            />
          </div>
        </div>
      </div>
    );
  }

  if (param1 === undefined) {
    return (
      <div>
        <ParameterValuePicker
          values={metadata.flatMap((m) => m.param1)}
          onValueChanged={onParam1Changed}
          layers={layers}
          hideModifiers={hideModifiers}
          searchTerm={searchTerm}
          onSearchTermChanged={onSearchTermChanged}
        />
      </div>
    );
  } else {
    const set = metadata.find((s) =>
      validateValue(
        layers.map((l) => l.id),
        param1,
        s.param1
      )
    );
    return (
      <>
        <ParameterValuePicker
          values={metadata.flatMap((m) => m.param1)}
          value={param1}
          layers={layers}
          onValueChanged={onParam1Changed}
          hideModifiers={hideModifiers}
          searchTerm={searchTerm}
          onSearchTermChanged={onSearchTermChanged}
        />
        {(set?.param2?.length || 0) > 0 && (
          <ParameterValuePicker
            values={set!.param2}
            value={param2}
            layers={layers}
            onValueChanged={onParam2Changed}
            searchTerm={searchTerm}
            // Typically param2 search is less critical or shares the same search.
            // If we want to allow updating global search from param2 picker, pass it.
            onSearchTermChanged={onSearchTermChanged}
          />
        )}
      </>
    );
  }
};
