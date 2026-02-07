import { MdLayers, MdAdd, MdDragIndicator, MdDelete, MdEdit, MdCheck, MdClose } from "react-icons/md";
import { Button, TextField, Input } from "react-aria-components";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Layer {
    id: number;
    name?: string;
}

interface LayersPanelProps {
    layers: Layer[];
    selectedLayerIndex: number;
    onLayerClicked: (index: number) => void;
    onAddClicked?: () => void;
    onRemoveClicked?: (index: number) => void;
    onRenameLayer?: (index: number, newName: string) => void;
    onMoveLayer?: (startIndex: number, endIndex: number) => void;
    canAdd?: boolean;
}

interface SortableLayerItemProps {
    layer: Layer;
    index: number;
    isSelected: boolean;
    isEditing: boolean;
    onLayerClicked: (index: number) => void;
    startEditing: (index: number, name: string) => void;
    saveEdit: (index: number) => void;
    setEditingIndex: (index: number | null) => void;
    onRemoveClicked?: (index: number) => void;
    editName: string;
    setEditName: (name: string) => void;
    layersLength: number;
}

const SortableLayerItem = ({
    layer,
    index,
    isSelected,
    isEditing,
    onLayerClicked,
    startEditing,
    saveEdit,
    setEditingIndex,
    onRemoveClicked,
    editName,
    setEditName,
    layersLength
}: SortableLayerItemProps) => {

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: layer.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 'auto',
        opacity: isDragging ? 0.5 : 1
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            onClick={() => !isEditing && onLayerClicked(index)}
            // MD3: Active Indicator Shape (rounded-full), now using Primary for color!
            className={`
                group relative min-h-[56px] rounded-full transition-all duration-200
                flex items-center gap-4 px-4 border border-base-content/20 cursor-pointer
                ${isSelected
                    ? 'bg-primary text-primary-content border-primary'
                    : 'hover:bg-black/5 hover:text-base-content active:bg-black/10'
                }
            `}
        >
            {/* Drag Handle */}
            <div
                {...attributes}
                {...listeners}
                onClick={(e) => e.stopPropagation()}
                className={`cursor-move p-2 -ml-2 rounded-full transition-colors ${isSelected ? 'text-primary-content/50 hover:text-primary-content' : 'text-base-content/30 hover:bg-black/5'}`}
            >
                <MdDragIndicator size={18} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                {isEditing ? (
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <TextField value={editName} onChange={setEditName} aria-label="Layer Name" className="flex-1 min-w-0">
                            <Input
                                className="w-full bg-base-100 rounded-lg px-3 py-1.5 text-sm font-bold border-2 border-primary outline-none text-base-content"
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveEdit(index);
                                    if (e.key === 'Escape') setEditingIndex(null);
                                }}
                            />
                        </TextField>
                        <Button onPress={() => saveEdit(index)} className="p-2 rounded bg-primary/10 text-primary hover:bg-primary hover:text-primary-content transition-colors"><MdCheck size={18} /></Button>
                    </div>
                ) : (
                    <div
                        className="py-1 flex items-center justify-between"
                    >
                        <div className={`text-sm font-bold truncate ${isSelected ? 'text-primary-content' : 'text-base-content/90'}`}>
                            {layer.name || `Layer ${index}`}
                        </div>
                        <div className={`text-[10px] font-mono px-1.5 rounded opacity-60 ${isSelected ? 'bg-black/20 text-primary-content' : 'bg-base-300 text-base-content'}`}>
                            {layer.id}
                        </div>
                    </div>
                )}
            </div>

            {/* Actions */}
            {!isEditing && !isDragging && (
                <div
                    onClick={(e) => e.stopPropagation()}
                    className={`flex items-center gap-1 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}
                >
                    <Button
                        onPress={() => startEditing(index, layer.name || `Layer ${index}`)}
                        className={`p-2 rounded-full transition-colors ${isSelected ? 'hover:bg-black/20 text-primary-content/70 hover:text-primary-content' : 'hover:bg-black/10 text-base-content/40 hover:text-base-content'}`}
                    >
                        <MdEdit size={16} />
                    </Button>
                    {layersLength > 1 && (
                        <Button
                            onPress={() => onRemoveClicked?.(index)}
                            className={`p-2 rounded-full transition-colors ${isSelected ? 'hover:bg-red-500/20 text-primary-content/70 hover:text-red-100' : 'hover:bg-red-500/10 text-base-content/40 hover:text-red-600'}`}
                        >
                            <MdDelete size={16} />
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
};

export const LayersPanel = ({
    layers,
    selectedLayerIndex,
    onLayerClicked,
    onAddClicked,
    onRemoveClicked,
    onRenameLayer,
    onMoveLayer,
    canAdd
}: LayersPanelProps) => {
    const { t } = useTranslation();
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editName, setEditName] = useState("");

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const startEditing = (index: number, name: string) => {
        setEditingIndex(index);
        setEditName(name);
    };

    const saveEdit = (index: number) => {
        onRenameLayer?.(index, editName);
        setEditingIndex(null);
    };

    // Create a local mapping of ID to index to handle DragEnd correctly
    // The keymap is array index based for most operations, but dnd-kit uses IDs.
    // We assume layers have unique IDs.

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (active.id !== over?.id && onMoveLayer) {
            const oldIndex = layers.findIndex((l) => l.id === active.id);
            const newIndex = layers.findIndex((l) => l.id === over?.id);
            if (oldIndex !== -1 && newIndex !== -1) {
                onMoveLayer(oldIndex, newIndex);
            }
        }
    };

    return (
        <div className="flex flex-col h-full w-full overflow-hidden bg-transparent">
            {/* Header - MD3 Styling */}
            <div className="px-5 py-4 flex items-center justify-between ml-1 mr-1">
                <div className="flex items-center gap-3 text-base-content/70">
                    <span className="block text-sm font-bold tracking-wide uppercase opacity-80 pl-1">{t("layers.title")}</span>
                </div>
                {canAdd && (
                    <Button
                        onPress={onAddClicked}
                        aria-label={t("layers.add")}
                        className="w-8 h-8 rounded-full bg-base-300/50 hover:bg-white/10 text-base-content/80 flex items-center justify-center transition-all shadow-sm hover:scale-105 active:scale-95"
                    >
                        <MdAdd size={18} />
                    </Button>
                )}
            </div>

            {/* Sortable List */}
            <div className="flex-1 overflow-y-auto px-4 pb-4 custom-scrollbar pt-2 space-y-1">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={layers.map(l => l.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        {layers.map((layer, index) => (
                            <SortableLayerItem
                                key={layer.id}
                                layer={layer}
                                index={index}
                                isSelected={index === selectedLayerIndex}
                                isEditing={editingIndex === index}
                                onLayerClicked={onLayerClicked}
                                startEditing={startEditing}
                                saveEdit={saveEdit}
                                setEditingIndex={setEditingIndex}
                                onRemoveClicked={onRemoveClicked}
                                editName={editName}
                                setEditName={setEditName}
                                layersLength={layers.length}
                            />
                        ))}
                    </SortableContext>
                </DndContext>
            </div>
        </div>
    );
};
