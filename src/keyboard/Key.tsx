import { PropsWithChildren } from "react";
import {
  MdArrowDownward,
  MdBlock,
  MdBluetooth,
  MdLightbulbOutline,
  MdHighlight,
  MdSettingsEthernet,
  MdRestartAlt,
  MdSystemUpdate,
  MdVolumeUp,
  MdVolumeDown,
  MdVolumeOff,
  MdPlayArrow,
  MdPause,
  MdSkipNext,
  MdSkipPrevious,
  MdKeyboard
} from "react-icons/md";
import BehaviorShortNames from "./behavior-short-names.json";

interface KeyProps {
  selected?: boolean;
  width: number;
  height: number;
  oneU: number;
  header?: string;
  hasModifiers?: boolean;
  onClick?: () => void;
}

interface BehaviorShortName {
  short?: string;
}

const shortNames: Record<string, BehaviorShortName> = BehaviorShortNames;

// Map behavior names to icons
const BEHAVIOR_ICONS: Record<string, React.ElementType> = {
  "Underglow": MdLightbulbOutline,
  "Backlight": MdHighlight,
  "Bluetooth": MdBluetooth,
  "Output Selection": MdSettingsEthernet,
  "Reset": MdRestartAlt,
  "Bootloader": MdSystemUpdate,
  "Volume Up": MdVolumeUp,
  "Volume Down": MdVolumeDown,
  "Mute": MdVolumeOff,
  "Play": MdPlayArrow,
  "Pause": MdPause,
  "Next Track": MdSkipNext,
  "Prev Track": MdSkipPrevious,
  "Grave/Escape": MdKeyboard,
  // Use abbreviation keys as fallback/alternatives if needed
  "Ext Pwr": MdLightbulbOutline,
};

// Hide "Key Press" and "Transparent" as they are the default/implied states and create visual noise.
const formatHeader = (header: string | undefined) => {
  if (typeof header === "undefined") return "";
  if (header === "Key Press" || header === "&kp" || header === "Transparent" || header === "&trans" || header === "None" || header === "&none") return "";

  const shortName = shortNames[header]?.short;
  if (shortName !== undefined) {
    return shortName;
  }

  return header;
};

export const Key = ({
  selected = false,
  width,
  height,
  oneU,
  header,
  hasModifiers,
  onClick,
  children,
}: PropsWithChildren<KeyProps>) => {
  // MD3: Increased gap (4px margin implied by -4) for better separation
  const pixelWidth = width * oneU - 4;
  const pixelHeight = height * oneU - 4;

  // Determine font size based on text length to prevent overflow
  const headerText = formatHeader(header);
  const HeaderIcon = header ? BEHAVIOR_ICONS[header] : undefined;

  const contentLength = typeof children === 'string' ? children.length : 0;

  // Reduced font sizes & lighter weight as requested
  let fontSizeClass = "text-[9px] font-medium"; // Default small
  if (!headerText && !HeaderIcon) {
    // Clean keys (no header) get slightly larger
    fontSizeClass = "text-[11px] font-semibold";
  }

  // Auto-scale down for long labels
  if (contentLength > 5) fontSizeClass = "text-[9px]";
  if (contentLength > 8) fontSizeClass = "text-[8px] leading-tight";

  return (
    <button
      // MD3: rounded-2xl for "Extra Small" to "Small" components shape
      // Tonal Selection: bg-primary vs bg-surface-container
      className={`
          group relative flex flex-col justify-center items-center cursor-pointer transition-all duration-200
          rounded-xl overflow-hidden select-none outline-none shadow-none border-0
          ${selected
          ? "bg-primary text-primary-content shadow-md scale-[0.98]"
          : "bg-base-200 text-base-content hover:bg-base-300 hover:scale-[0.98]"
        }
        `}
      style={{
        width: `${pixelWidth}px`,
        height: `${pixelHeight}px`,
      }}
      onClick={onClick}
    >
      {/* Modifier Indicator - Small dot in top right */}
      {hasModifiers && (
        <div className={`
                absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full
                ${selected ? "bg-primary-content opacity-80" : "bg-primary"}
            `} />
      )}

      {/* Header - Only shown for "interesting" behaviors like Mod-Tap, Layers, etc. */}
      {(headerText || HeaderIcon) && (
        <div className={`
                absolute top-1 left-1.5 right-4
                text-[8px] font-bold opacity-50 truncate text-left tracking-wide flex items-center
                ${selected ? "text-primary-content" : "text-base-content"} 
            `}>
          {HeaderIcon ? <HeaderIcon size={12} /> : headerText}
        </div>
      )}

      {/* Main Center Content */}
      <div className={`
            flex-1 flex items-center justify-center px-1 text-center w-full break-words
            ${fontSizeClass}
            ${(headerText || HeaderIcon) ? 'pt-2' : ''} 
        `}>
        {(headerText === "Trans" || header === "Transparent" || header === "&trans") ? (
          <MdArrowDownward size={14} className="opacity-20 translate-y-0.5" />
        ) : (headerText === "None" || header === "None" || header === "&none") ? (
          <MdBlock size={14} className="opacity-20 translate-y-0.5" />
        ) : (
          children
        )}
      </div>
    </button>
  );
};
