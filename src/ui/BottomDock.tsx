import { MdAdd } from "react-icons/md";
import { Button } from "react-aria-components";

interface Layer {
    id: number;
    name?: string;
}

interface BottomDockProps {
    layers: Layer[];
    selectedLayerIndex: number;
    onLayerClicked: (index: number) => void;
    onAddClicked?: () => void;
    canAdd?: boolean;
}

export const BottomDock = ({
    layers,
    selectedLayerIndex,
    onLayerClicked,
    onAddClicked,
    canAdd
}: BottomDockProps) => {

    return (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 pointer-events-auto w-full max-w-4xl flex justify-center">
            <div className="glass-panel p-3 rounded-[2.5rem] flex items-center gap-2 shadow-2xl overflow-visible mx-4">
                {/* Scrollable Area */}
                <div className="flex items-center gap-2 overflow-x-auto px-2 py-1 scrollbar-hide max-w-[calc(100vw-8rem)]">
                    {layers.map((layer, index) => {
                        const isSelected = index === selectedLayerIndex;
                        return (
                            <Button
                                key={layer.id}
                                onPress={() => onLayerClicked(index)}
                                className={`
                                    relative px-6 py-3 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap outline-none
                                    ${isSelected
                                        ? 'bg-primary text-primary-content shadow-lg shadow-primary-transparent scale-105'
                                        : 'hover:bg-surface-glass text-base-content/70 hover:text-base-content'}
                                `}
                            >
                                {layer.name || `Layer ${index}`}
                                {isSelected && (
                                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full opacity-50" />
                                )}
                            </Button>
                        );
                    })}
                </div>

                {/* Add Button Divider */}
                {canAdd && (
                    <>
                        <div className="w-px h-6 bg-base-300 mx-1" />
                        <Button
                            onPress={onAddClicked}
                            className="w-10 h-10 flex flex-shrink-0 items-center justify-center rounded-full hover:bg-surface-glass text-base-content/60 transition-colors outline-none"
                        >
                            <MdAdd size={20} />
                        </Button>
                    </>
                )}
            </div>
        </div>
    );
};
