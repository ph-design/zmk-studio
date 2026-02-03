import { PropsWithChildren } from "react";
import BehaviorShortNames from "./behavior-short-names.json";
import { HidUsageLabel } from "./HidUsageLabel";

export interface LayerBinding {
  layerIndex: number;
  layerName: string;
  behaviorDisplayName: string;
  binding?: {
    param1: number;
  };
}

interface KeyProps {
  selected?: boolean;
  width: number;
  height: number;
  oneU: number;
  header?: string;
  onClick?: () => void;
  layerBindings?: LayerBinding[];
  previewMode?: boolean;
}

interface BehaviorShortName {
  short?: string;
}

const MAX_HEADER_LENGTH = 9;
const shortNames: Record<string, BehaviorShortName> = BehaviorShortNames;

const shortenHeader = (header: string | undefined) => {
  if(typeof header === "undefined"){
    return "";
  }
  // Empty string is a valid header for behaviors where we don't want to see a header, which is falsy
  // So we use an undefined check here
  if(typeof shortNames[header]?.short !== "undefined"){
    return shortNames[header].short;
  } else if(header.length > MAX_HEADER_LENGTH){
    const words = header.split(/[\s,-]+/);
    const lettersPerWord = Math.trunc(MAX_HEADER_LENGTH / words.length);
    return words.map((word) => (word.substring(0,lettersPerWord))).join("");
  } else {
    return header;
  }
}

export const Key = ({
  selected = false,
  width,
  height,
  oneU,
  header,
  onClick,
  children,
  layerBindings,
  previewMode = false,
}: PropsWithChildren<KeyProps>) => {
  const pixelWidth = width * oneU - 6;
  const pixelHeight = height * oneU - 6;

  return (
    <button
      className={`group rounded-xl relative flex justify-center items-center cursor-pointer transition-all duration-200 active:scale-95 ${
        selected
          ? "bg-primary text-primary-content shadow-lg ring-2 ring-primary ring-offset-2 ring-offset-base-100"
          : `bg-base-100 text-base-content shadow-md hover:shadow-lg hover:bg-base-200 hover:-translate-y-0.5 border ${
              previewMode 
                ? "!border-black !border-[1.5px] shadow-none !bg-white dark:!bg-base-300 dark:!border-white/50" 
                : "border-base-300/50 dark:border-base-content/20 dark:shadow-base-content/5"
            }`
      }`}
      style={{
        width: `${pixelWidth}px`,
        height: `${pixelHeight}px`,
      }}
      onClick={onClick}
    >
      <div className={`absolute text-[9px] leading-none ${selected ? "text-primary-content/90" : "text-base-content/60"} top-2 left-1/2 font-bold -translate-x-1/2 text-center w-[90%] truncate uppercase tracking-wider`}>
        {shortenHeader(header)}
      </div>
      <div className="z-10 relative mt-2 opacity-90">
        {children}
      </div>

      {/* Multi-layer Tooltip */}
      {layerBindings && layerBindings.length > 0 && (
        <div className="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 bg-base-300 text-base-content text-xs p-2 rounded-lg shadow-xl border border-base-content/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] w-auto min-w-[120px] hidden group-hover:block">
          <div className="flex flex-col gap-1 max-h-48 overflow-hidden">
            {layerBindings.map((lb) => (
              <div key={lb.layerIndex} className="flex items-center text-[10px] gap-1">
                <span className="opacity-70 text-[9px] uppercase tracking-wide whitespace-nowrap">{lb.layerName}:</span>
                <span className="font-bold text-primary truncate flex gap-1">
                  <span>{shortenHeader(lb.behaviorDisplayName)}</span>
                  {lb.binding && (
                    <span className="opacity-80">
                      <HidUsageLabel hid_usage={lb.binding.param1} />
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </button>
  );
};
