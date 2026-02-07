import { BehaviorParameterValueDescription } from "@zmkfirmware/zmk-studio-ts-client/behaviors";
import { HidUsagePicker } from "./HidUsagePicker";
import { Button } from "react-aria-components";

export interface ParameterValuePickerProps {
  value?: number;
  values: BehaviorParameterValueDescription[];
  layers: { id: number; name: string }[];
  onValueChanged: (value?: number) => void;
  hideModifiers?: boolean;
  searchTerm?: string;
  onSearchTermChanged?: (term: string) => void;
}

export const ParameterValuePicker = ({
  value,
  values,
  layers,
  onValueChanged,
  hideModifiers,
  searchTerm,
  onSearchTermChanged,
}: ParameterValuePickerProps) => {
  if (values.length == 0) {
    return <></>;
  } else if (values.every((v) => v.constant !== undefined)) {
    const filter = (searchTerm || "").toLowerCase();
    const filteredValues = values.filter(v =>
      !filter || v.name.toLowerCase().includes(filter)
    );

    return (
      <div className="flex-1 w-full h-full flex flex-col relative min-h-[300px]">
        <div className="flex-1 overflow-y-auto custom-scrollbar px-2 py-3">
          {filteredValues.length === 0 ? (
            <div className="flex items-center justify-center h-full text-base-content/40 text-sm italic">
              No matching options
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {filteredValues.map((v) => {
                const isSelected = value === v.constant;
                return (
                  <Button
                    key={v.constant}
                    onPress={() => onValueChanged(v.constant || 0)}
                    className={`
                      w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all outline-none group text-left
                      ${isSelected
                        ? 'bg-primary/10 text-primary font-bold shadow-sm'
                        : 'bg-transparent text-base-content/70 hover:bg-base-200/50 hover:text-base-content'
                      }
                    `}
                  >
                    <span className="text-sm font-medium">{v.name}</span>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-primary text-primary-content flex items-center justify-center shadow-sm animate-in zoom-in duration-200">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      </div>
                    )}
                  </Button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  } else if (values.length == 1) {
    if (values[0].range) {
      const { min, max } = values[0].range;
      const isSmallRange = (max - min) <= 12;

      if (isSmallRange) {
        const rangeValues = [];
        for (let i = min; i <= max; i++) rangeValues.push(i);

        return (
          <div className="flex flex-col gap-3 p-4 bg-base-200/30 rounded-2xl mx-2 my-1">
            <span className="text-xs font-bold uppercase tracking-wider text-base-content/50">{values[0].name}</span>
            <div className="flex flex-wrap gap-2">
              {rangeValues.map((v) => {
                const isSelected = value === v;
                const isProfile = values[0].name.toLowerCase().includes("profile");
                const label = isProfile ? `P${v}` : v.toString();

                return (
                  <Button
                    key={v}
                    onPress={() => onValueChanged(v)}
                    className={`
                      min-w-[48px] h-[48px] flex items-center justify-center rounded-xl text-sm font-bold transition-all outline-none
                      ${isSelected
                        ? 'bg-primary text-primary-content scale-105'
                        : 'bg-base-200 text-base-content/70 hover:bg-base-300 hover:text-base-content hover:scale-105 active:scale-95'
                      }
                    `}
                  >
                    {label}
                  </Button>
                );
              })}
            </div>
          </div>
        );
      }

      return (
        <div className="flex flex-col gap-3 p-4 bg-base-200/30 rounded-2xl mx-2 my-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-base-content/50">{values[0].name}</span>
            <span className="text-sm font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">{value}</span>
          </div>
          <div className="flex gap-4 items-center">
            <input
              type="range"
              aria-label={`${values[0].name} slider`}
              min={min}
              max={max}
              value={value}
              onChange={(e) => onValueChanged(parseInt(e.target.value))}
              className="flex-1 accent-primary h-1.5 bg-base-300 rounded-lg appearance-none cursor-pointer"
            />
            <input
              type="number"
              aria-label={`${values[0].name} input`}
              min={min}
              max={max}
              value={value}
              onChange={(e) => onValueChanged(parseInt(e.target.value))}
              className="w-16 bg-base-200 border border-transparent focus:border-primary/50 rounded-lg px-2 py-1 text-sm font-mono outline-none transition-all"
            />
          </div>
        </div>
      );
    } else if (values[0].hidUsage) {
      return (
        <HidUsagePicker
          onValueChanged={onValueChanged}
          label={values[0].name}
          value={value}
          usagePages={[
            { id: 7, min: 4, max: values[0].hidUsage.keyboardMax },
            { id: 12, max: values[0].hidUsage.consumerMax },
          ]}
          showModifiers={!hideModifiers}
          searchTerm={searchTerm}
          onSearchTermChanged={onSearchTermChanged}
        />
      );
    } else if (values[0].layerId) {
      const filter = (searchTerm || "").toLowerCase();
      const filteredLayers = layers.filter(l =>
        !filter || (l.name || `Layer ${l.id}`).toLowerCase().includes(filter)
      );

      return (
        <div className="flex flex-col gap-4 h-full w-full font-sans">


          <div className="flex-1 overflow-y-auto px-2 py-3 custom-scrollbar">
            {filteredLayers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-base-content/40 gap-3">
                <div className="w-16 h-16 rounded-full bg-base-200/50 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                </div>
                <span className="text-sm font-medium">No matching layers</span>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {filteredLayers.map((l) => {
                  const isSelected = value === l.id;
                  return (
                    <Button
                      key={l.id}
                      onPress={() => onValueChanged(l.id)}
                      className={`
                        w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all outline-none group
                        ${isSelected
                          ? 'bg-primary/10 text-primary font-bold shadow-sm'
                          : 'bg-transparent text-base-content/70 hover:bg-base-200/50 hover:text-base-content'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`
                          w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono
                          ${isSelected ? 'bg-primary text-primary-content' : 'bg-base-200 text-base-content/50'}
                        `}>
                          {l.id}
                        </div>
                        <span className="text-sm font-medium">{l.name || `Layer ${l.id}`}</span>
                      </div>

                      {isSelected && (
                        <div className="w-6 h-6 rounded-full bg-primary text-primary-content flex items-center justify-center shadow-sm animate-in zoom-in duration-200">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        </div>
                      )}
                    </Button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      );
    }
  } else {
    console.log("Not sure how to handle", values);
    return (
      <>
        <p>Some composite?</p>
      </>
    );
  }

  return <></>;
};
