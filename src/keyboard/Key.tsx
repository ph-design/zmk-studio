import { PropsWithChildren } from "react";
import BehaviorShortNames from "./behavior-short-names.json";

interface KeyProps {
  selected?: boolean;
  width: number;
  height: number;
  oneU: number;
  header?: string;
  onClick?: () => void;
}

interface BehaviorShortName {
  short?: string;
}

const MAX_HEADER_LENGTH = 9;
const shortNames: Record<string, BehaviorShortName> = BehaviorShortNames;

// Hide "Key Press" and "Transparent" as they are the default/implied states and create visual noise.
const formatHeader = (header: string | undefined) => {
  if (typeof header === "undefined") return "";
  if (header === "Key Press" || header === "&kp" || header === "Transparent" || header === "&trans") return "";

  return header;
};

export const Key = ({
  selected = false,
  width,
  height,
  oneU,
  header,
  onClick,
  children,
}: PropsWithChildren<KeyProps>) => {
  const pixelWidth = width * oneU - 2;
  const pixelHeight = height * oneU - 2;

  // Determine font size based on text length to prevent overflow
  // When header is hidden (headerText is empty), we can afford a slightly larger font for the main keycode
  const headerText = formatHeader(header);
  const contentLength = typeof children === 'string' ? children.length : 0;

  // Reduced base font sizes as requested
  let fontSizeClass = "text-[10px]"; // Default small
  if (!headerText) {
    // Clean keys (no header) get slightly larger but still contained text
    fontSizeClass = "text-xs font-bold";
  }

  // Auto-scale down for long labels
  if (contentLength > 5) fontSizeClass = "text-[10px]";
  if (contentLength > 8) fontSizeClass = "text-[9px] leading-tight";

  return (
    <button
      // Removed scale transforms to fix overlap issues.
      // Simplified z-index: Selected is elevated (z-10), Hover is elevated (z-20) to ensure tooltips/borders clarify.
      // rounded-lg (8px) instead of rounded-xl (12px) for a slightly sharper look
      className={`
          group relative flex flex-col justify-center items-center cursor-pointer transition-colors duration-200
          rounded-lg border shadow-sm overflow-hidden select-none outline-none
          ${selected
          ? "bg-primary text-primary-content border-primary z-10 shadow-md"
          : "bg-base-200 text-base-content border-base-300 hover:border-primary/50 hover:bg-base-300 z-0 hover:z-20 hover:shadow-md"
        }
        `}
      style={{
        width: `${pixelWidth}px`,
        height: `${pixelHeight}px`,
      }}
      onClick={onClick}
    >
      {/* Header - Only shown for "interesting" behaviors like Mod-Tap, Layers, etc. */}
      {headerText && (
        <div className={`
                absolute top-1 left-1.5 right-1.5 
                text-[9px] font-bold opacity-60 truncate text-left
                ${selected ? "text-primary-content" : "text-base-content"} 
            `}>
          {headerText}
        </div>
      )}

      {/* Main Center Content */}
      <div className={`
            flex-1 flex items-center justify-center font-bold px-1 text-center w-full break-words
            ${fontSizeClass}
            ${headerText ? 'pt-3' : ''} 
        `}>
        {children}
      </div>

      {/* Selection Indicator Bar - Kept as the primary selection cue */}
      {selected && (
        <div className="absolute inset-x-3 bottom-1.5 h-0.5 bg-primary-content/30 rounded-full" />
      )}
    </button>
  );
};
