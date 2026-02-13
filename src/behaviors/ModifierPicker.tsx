import { useMemo } from "react";
import { Checkbox, CheckboxGroup, Label } from "react-aria-components";
import { MdCheck } from "react-icons/md";
import { useTranslation } from "react-i18next";

export enum Mods {
    LeftControl = 0x01,
    LeftShift = 0x02,
    LeftAlt = 0x04,
    LeftGUI = 0x08,
    RightControl = 0x10,
    RightShift = 0x20,
    RightAlt = 0x40,
    RightGUI = 0x80,
}

export const mod_labels: Record<Mods, string> = {
    [Mods.LeftControl]: "L-Ctrl",
    [Mods.LeftShift]: "L-Shift",
    [Mods.LeftAlt]: "L-Alt",
    [Mods.LeftGUI]: "L-GUI",
    [Mods.RightControl]: "R-Ctrl",
    [Mods.RightShift]: "R-Shift",
    [Mods.RightAlt]: "R-Alt",
    [Mods.RightGUI]: "R-GUI",
};

export const all_mods = [
    Mods.LeftControl, Mods.RightControl,
    Mods.LeftShift, Mods.RightShift,
    Mods.LeftAlt, Mods.RightAlt,
    Mods.LeftGUI, Mods.RightGUI,
];

export function mods_to_flags(mods: Mods[]): number {
    return mods.reduce((a, v) => a + v, 0);
}

export function mask_mods(value: number) {
    return value & ~(mods_to_flags(all_mods) << 24);
}

export interface ModifierPickerProps {
    value?: number;
    onValueChanged: (value?: number) => void;
    vertical?: boolean;
}

export const ModifierPicker = ({ value, onValueChanged, vertical = true }: ModifierPickerProps) => {
    const { t } = useTranslation();
    const selectedMods = useMemo(() => {
        // Mode A: Usage ID (e.g. 0x0700E0)
        if (value && value >= 0x0700E0 && value <= 0x0700E7) {
            const id = value & 0xFFFF;
            switch (id) {
                case 0xE0: return [Mods.LeftControl.toLocaleString()];
                case 0xE1: return [Mods.LeftShift.toLocaleString()];
                case 0xE2: return [Mods.LeftAlt.toLocaleString()];
                case 0xE3: return [Mods.LeftGUI.toLocaleString()];
                case 0xE4: return [Mods.RightControl.toLocaleString()];
                case 0xE5: return [Mods.RightShift.toLocaleString()];
                case 0xE6: return [Mods.RightAlt.toLocaleString()];
                case 0xE7: return [Mods.RightGUI.toLocaleString()];
            }
        }

        // Mode B: Flag Bitmask (Legacy / Key Press)
        let flags = value ? value >> 24 : 0;
        return all_mods.filter((m) => m & flags).map((m) => m.toLocaleString());
    }, [value]);

    const modifiersChanged = (m: string[]) => {
        let baseValue = value || 0;

        // If the current value is a single modifier usage ID, "strip" it to 0
        // so we start fresh with bitmask flags.
        if (baseValue >= 0x0700E0 && baseValue <= 0x0700E7) {
            baseValue = 0;
        } else {
            // Otherwise, just clear the flag bits
            baseValue = mask_mods(baseValue);
        }

        const mod_flags = mods_to_flags(m.map((v) => parseInt(v)));
        let newValue = baseValue | (mod_flags << 24);

        // Optimization: If exactly one modifier is selected and we don't have a base key (like &kp 'A'),
        // we use the official HID Usage ID (0x700Ex) instead of a bitmask.
        // This is more compatible with behaviors like &mt or &sl that expect a single Modifier Usage.
        if (m.length === 1 && baseValue === 0) {
            const singleMod = parseInt(m[0]);
            switch (singleMod) {
                case Mods.LeftControl: newValue = 0x700E0; break;
                case Mods.LeftShift: newValue = 0x700E1; break;
                case Mods.LeftAlt: newValue = 0x700E2; break;
                case Mods.LeftGUI: newValue = 0x700E3; break;
                case Mods.RightControl: newValue = 0x700E4; break;
                case Mods.RightShift: newValue = 0x700E5; break;
                case Mods.RightAlt: newValue = 0x700E6; break;
                case Mods.RightGUI: newValue = 0x700E7; break;
            }
        }

        onValueChanged(newValue);
    };

    return (
        <div className="flex flex-col h-full font-sans">
            <div className="flex items-center h-8 shrink-0 px-1 mb-2">
                <Label className="text-sm font-medium text-base-content/70">{t("categories.mods")}</Label>
            </div>

            <div className={`flex-1 overflow-y-auto custom-scrollbar ${vertical ? 'p-1' : 'p-0 pt-2'}`}>
                <CheckboxGroup
                    className={`grid gap-1.5 lg:gap-2 ${vertical ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'}`}
                    value={selectedMods}
                    onChange={modifiersChanged}
                    aria-label="Modifiers"
                >
                    {all_mods.map((m) => (
                        <Checkbox
                            key={m}
                            value={m.toLocaleString()}
                            className={({ isSelected }) => `
                                flex items-center justify-between px-3 py-2.5 lg:py-3 rounded-xl text-xs font-bold cursor-pointer transition-all outline-none w-full border
                                ${isSelected
                                    ? 'bg-primary/30 text-primary border-transparent'
                                    : 'bg-base-300/50 text-base-content/90 border-transparent hover:bg-base-300 hover:text-base-content'
                                }
                            `}
                        >
                            {({ isSelected }) => (
                                <>
                                    <span className="truncate">{mod_labels[m]}</span>
                                    <div className={`w-4 h-4 rounded-full flex items-center justify-center transition-all shrink-0 ml-1 ${isSelected ? 'bg-primary text-primary-content scale-100' : 'bg-transparent scale-0'}`}>
                                        <MdCheck size={12} />
                                    </div>
                                </>
                            )}
                        </Checkbox>
                    ))}
                </CheckboxGroup>
            </div>
        </div>
    );
};
