import {
  Button,
  Key,
  Label,
  ListBox,
  ListBoxItem,
  Popover,
  Select,
  SelectValue,
  Text,
} from "react-aria-components";
import { PhysicalLayout, type KeyPosition } from "./PhysicalLayout";
import { useCallback } from "react";
import { ChevronDown, Keyboard } from "lucide-react";
import { useTranslation } from "react-i18next";

export interface PhysicalLayoutItem {
  name: string;
  keys: Array<Omit<KeyPosition, "id">>;
}

export type PhysicalLayoutClickCallback = (index: number) => void;

export interface PhysicalLayoutPickerProps {
  layouts: Array<PhysicalLayoutItem>;
  selectedPhysicalLayoutIndex: number;
  onPhysicalLayoutClicked?: PhysicalLayoutClickCallback;
}

export const PhysicalLayoutPicker = ({
  layouts,
  selectedPhysicalLayoutIndex,
  onPhysicalLayoutClicked,
}: PhysicalLayoutPickerProps) => {
  const { t } = useTranslation();
  const selectionChanged = useCallback(
    (e: Key) => {
      onPhysicalLayoutClicked?.(layouts.findIndex((l) => l.name === e));
    },
    [layouts, onPhysicalLayoutClicked],
  );

  return (
    <div className="flex flex-col gap-3">
      <Label className="text-xs font-bold uppercase tracking-wider text-base-content/50 flex items-center gap-2 px-1">
        <Keyboard className="size-3.5" />
        {t('keyboard.layout', 'Layout')}
      </Label>
      <Select
        onSelectionChange={selectionChanged}
        className="flex flex-col w-full"
        selectedKey={layouts[selectedPhysicalLayoutIndex].name}
      >
        <Button className="flex items-center justify-between w-full bg-base-100 border border-base-200 hover:border-base-300 rounded-xl px-4 py-2.5 transition-all text-left text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20 shadow-sm hover:shadow-md">
          <SelectValue<PhysicalLayoutItem> className="truncate mr-2">
            {(v) => v.selectedItem?.name}
          </SelectValue>
          <ChevronDown className="size-4 opacity-50 shrink-0" />
        </Button>
        <Popover className="min-w-[var(--trigger-width)] max-h-80 shadow-2xl rounded-xl border border-base-200 bg-base-100 overflow-auto z-50 p-1.5">
          <ListBox items={layouts} className="outline-none flex flex-col gap-1">
            {(l) => (
              <ListBoxItem
                id={l.name}
                textValue={l.name}
                className="group flex flex-col gap-2 p-2.5 rounded-lg cursor-pointer outline-none selected:bg-primary selected:text-primary-content hover:bg-base-200 hover:text-base-content transition-colors"
              >
                <Text slot="label" className="text-sm font-medium">{l.name}</Text>
                <div className="w-full aspect-[3/1] bg-base-200/50 rounded-md p-1.5 flex items-center justify-center group-selected:bg-primary-content/10 group-hover:bg-base-100 transition-colors">
                  <div className="w-full h-full pointer-events-none">
                    <PhysicalLayout
                      oneU={10}
                      hoverZoom={false}
                      previewMode={true}
                      positions={l.keys.map(
                        ({ x, y, width, height, r, rx, ry }, i) => ({
                          id: `${layouts[selectedPhysicalLayoutIndex].name}-${i}`,
                          x: x / 100.0,
                          y: y / 100.0,
                          width: width / 100.0,
                          height: height / 100.0,
                          r: (r || 0) / 100.0,
                          rx: (rx || 0) / 100.0,
                          ry: (ry || 0) / 100.0,
                        }),
                      )}
                    />
                  </div>
                </div>
              </ListBoxItem>
            )}
          </ListBox>
        </Popover>
      </Select>
    </div>
  );
};
