import { Pencil, Minus, Plus, Layers, GripVertical } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import {
  DropIndicator,
  Label,
  ListBox,
  ListBoxItem,
  Selection,
  useDragAndDrop,
  Button,
} from "react-aria-components";
import { useModalRef } from "../misc/useModalRef";
import { GenericModal } from "../GenericModal";
import { useTranslation } from "react-i18next";

interface Layer {
  id: number;
  name?: string;
}

export type LayerClickCallback = (index: number) => void;
export type LayerMovedCallback = (index: number, destination: number) => void;

interface LayerPickerProps {
  layers: Array<Layer>;
  selectedLayerIndex: number;
  canAdd?: boolean;
  canRemove?: boolean;

  onLayerClicked?: LayerClickCallback;
  onLayerMoved?: LayerMovedCallback;
  onAddClicked?: () => void | Promise<void>;
  onRemoveClicked?: () => void | Promise<void>;
  onLayerNameChanged?: (
    id: number,
    oldName: string,
    newName: string
  ) => void | Promise<void>;
}

interface EditLabelData {
  id: number;
  name: string;
}

const EditLabelModal = ({
  open,
  onClose,
  editLabelData,
  handleSaveNewLabel,
}: {
  open: boolean;
  onClose: () => void;
  editLabelData: EditLabelData;
  handleSaveNewLabel: (
    id: number,
    oldName: string,
    newName: string | null
  ) => void;
}) => {
  const ref = useModalRef(open);
  const [newLabelName, setNewLabelName] = useState(editLabelData.name);

  const handleSave = () => {
    handleSaveNewLabel(editLabelData.id, editLabelData.name, newLabelName);
    onClose();
  };

  return (
    <GenericModal
      ref={ref}
      onClose={onClose}
      className="min-w-min w-[30vw] flex flex-col"
    >
      <span className="mb-3 text-lg">New Layer Name</span>
      <input
        className="p-1 border rounded border-base-content border-solid"
        type="text"
        defaultValue={editLabelData.name}
        autoFocus
        onChange={(e) => setNewLabelName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleSave();
          }
        }}
      />
      <div className="mt-4 flex justify-end">
        <button className="py-1.5 px-2" type="button" onClick={onClose}>
          Cancel
        </button>
        <button
          className="py-1.5 px-2 ml-4 rounded-md bg-gray-100 text-black hover:bg-gray-300"
          type="button"
          onClick={() => {
            handleSave();
          }}
        >
          Save
        </button>
      </div>
    </GenericModal>
  );
};

export const LayerPicker = ({
  layers,
  selectedLayerIndex,
  canAdd,
  canRemove,
  onLayerClicked,
  onLayerMoved,
  onAddClicked,
  onRemoveClicked,
  onLayerNameChanged,
  ...props
}: LayerPickerProps) => {
  const { t } = useTranslation();
  const [editLabelData, setEditLabelData] = useState<EditLabelData | null>(
    null
  );

  const layer_items = useMemo(() => {
    return layers.map((l, i) => ({
      name: l.name || i.toLocaleString(),
      id: l.id,
      index: i,
      selected: i === selectedLayerIndex,
    }));
  }, [layers, selectedLayerIndex]);

  const selectionChanged = useCallback(
    (s: Selection) => {
      if (s === "all") {
        return;
      }

      onLayerClicked?.(layer_items.findIndex((l) => s.has(l.id)));
    },
    [onLayerClicked, layer_items]
  );

  let { dragAndDropHooks } = useDragAndDrop({
    renderDropIndicator(target) {
      return (
        <DropIndicator
          target={target}
          className={"data-[drop-target]:outline outline-1 outline-accent"}
        />
      );
    },
    getItems: (keys) =>
      [...keys].map((key) => ({ "text/plain": key.toLocaleString() })),
    onReorder(e) {
      let startIndex = layer_items.findIndex((l) => e.keys.has(l.id));
      let endIndex = layer_items.findIndex((l) => l.id === e.target.key);
      onLayerMoved?.(startIndex, endIndex);
    },
  });

  const handleSaveNewLabel = useCallback(
    (id: number, oldName: string, newName: string | null) => {
      if (newName !== null) {
        onLayerNameChanged?.(id, oldName, newName);
      }
    },
    [onLayerNameChanged]
  );

  return (
    <div className="flex flex-col gap-3 min-w-40 flex-1 min-h-0">
      <div className="flex items-center justify-between px-1">
        <Label className="text-xs font-bold uppercase tracking-wider text-base-content/50 flex items-center gap-2">
          <Layers className="size-3.5" />
          {t('keyboard.category.layers', 'Layers')}
        </Label>
        <div className="flex items-center gap-1">
          {onRemoveClicked && (
            <Button
              className="p-1.5 rounded-md hover:bg-base-300 text-base-content/50 hover:text-error disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-base-content/50 transition-colors"
              isDisabled={!canRemove}
              onPress={onRemoveClicked}
            >
              <Minus className="size-3.5" />
            </Button>
          )}
          {onAddClicked && (
            <Button
              isDisabled={!canAdd}
              className="p-1.5 rounded-md hover:bg-base-300 text-base-content/50 hover:text-primary disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-base-content/50 transition-colors"
              onPress={onAddClicked}
            >
              <Plus className="size-3.5" />
            </Button>
          )}
        </div>
      </div>
      {editLabelData !== null && (
        <EditLabelModal
          open={editLabelData !== null}
          onClose={() => setEditLabelData(null)}
          editLabelData={editLabelData}
          handleSaveNewLabel={handleSaveNewLabel}
        />
      )}
      <ListBox
        aria-label="Keymap Layer"
        selectionMode="single"
        items={layer_items}
        disallowEmptySelection={true}
        selectedKeys={
          layer_items[selectedLayerIndex]
            ? [layer_items[selectedLayerIndex].id]
            : []
        }
        className="flex-1 overflow-y-auto min-h-0 flex flex-col gap-1 pr-1 outline-none"
        onSelectionChange={selectionChanged}
        dragAndDropHooks={dragAndDropHooks}
        {...props}
      >
        {(layer_item) => (
          <ListBoxItem
            textValue={layer_item.name}
            className="group relative flex items-center gap-3 p-2.5 rounded-xl cursor-pointer outline-none border border-transparent selected:bg-primary selected:text-primary-content selected:shadow-md hover:bg-base-100 hover:border-base-200 transition-all text-sm font-medium"
          >
            <Button slot="drag" className="cursor-grab active:cursor-grabbing text-base-content/20 hover:text-base-content/50 group-selected:text-primary-content/50 group-selected:hover:text-primary-content">
              <GripVertical className="size-3.5" />
            </Button>
            <span className="flex-1 truncate font-semibold">{layer_item.name}</span>
            <Button
              className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-base-content/10 group-selected:hover:bg-primary-content/20 transition-all"
              onPress={() =>
                setEditLabelData({ id: layer_item.id, name: layer_item.name })
              }
            >
              <Pencil className="size-3.5" />
            </Button>
          </ListBoxItem>
        )}
      </ListBox>
    </div>
  );
};
