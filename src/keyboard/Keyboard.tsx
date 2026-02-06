import { useCallback, useEffect, useMemo, useState, useContext } from "react";
import { useTranslation } from "react-i18next";
import { call_rpc } from "../rpc/logging";
import { produce } from "immer";
import { Keymap as KeymapComp } from "./Keymap";
import { PhysicalLayoutPicker } from "./PhysicalLayoutPicker";
import { Keymap, SetLayerBindingResponse, BehaviorBinding, Layer } from "@zmkfirmware/zmk-studio-ts-client/keymap";
import type { GetBehaviorDetailsResponse } from "@zmkfirmware/zmk-studio-ts-client/behaviors";
import { BehaviorBindingPicker } from "../behaviors/BehaviorBindingPicker";
import { UndoRedoContext } from "../undoRedo";
import { LayersPanel } from "../ui/LayersPanel";
import { DevicePanel } from "../ui/DevicePanel";
import { SystemPanel } from "../ui/SystemPanel";
import { BehaviorDrawer } from "../ui/BehaviorDrawer";
import { useConnectedDeviceData } from "../rpc/useConnectedDeviceData";
import { ConnectionContext } from "../rpc/ConnectionContext";
import { LockStateContext } from "../rpc/LockStateContext";
import { LockState } from "@zmkfirmware/zmk-studio-ts-client/core";
import { useSub } from "../usePubSub";


export default function Keyboard() {
    const { t } = useTranslation();
    const conn = useContext(ConnectionContext);
    const doIt = useContext(UndoRedoContext);
    const lockState = useContext(LockStateContext);

    // Unsaved Changes State
    const [unsaved, setUnsaved] = useConnectedDeviceData<boolean>(
        { keymap: { checkUnsavedChanges: true } },
        (r) => r.keymap?.checkUnsavedChanges,
        false // Default to false to avoid initial popup
    );

    useSub("rpc_notification.keymap.unsavedChangesStatusChanged", (status) =>
        setUnsaved(status)
    );

    const [layoutsData] = useConnectedDeviceData<any>(
        { keymap: { getPhysicalLayouts: true } },
        (r) => r.keymap?.getPhysicalLayouts,
        true
    );
    const layouts = layoutsData?.layouts;

    const [keymap, setKeymap] = useConnectedDeviceData<Keymap>(
        { keymap: { getKeymap: true } },
        (r) => r.keymap?.getKeymap,
        true
    );

    // --- Behaviors Loading Logic ---
    const [behaviors, setBehaviors] = useState<Record<number, GetBehaviorDetailsResponse>>({});

    useEffect(() => {
        let ignore = false;
        async function loadBehaviors() {
            if (!conn.conn) return;

            // 1. List all behavior IDs
            const listResp = await call_rpc(conn.conn, { behaviors: { listAllBehaviors: true } });
            const ids = listResp.behaviors?.listAllBehaviors?.behaviors;

            if (!ids || ignore) return;

            // 2. Fetch details for each behavior
            const promises = ids.map(id =>
                call_rpc(conn.conn!, { behaviors: { getBehaviorDetails: { behaviorId: id } } })
                    .then(r => r.behaviors?.getBehaviorDetails)
            );

            const results = await Promise.all(promises);

            if (ignore) return;

            const newBehaviors: Record<number, GetBehaviorDetailsResponse> = {};
            results.forEach(b => {
                if (b) newBehaviors[b.id] = b;
            });

            console.log("Loaded Behaviors:", Object.keys(newBehaviors).length);
            setBehaviors(newBehaviors);
        }

        // Load behaviors when connected or unlocked
        if (conn.conn && lockState === LockState.ZMK_STUDIO_CORE_LOCK_STATE_UNLOCKED) {
            loadBehaviors();
        } else {
            setBehaviors({});
        }

        return () => { ignore = true; };
    }, [conn.conn, lockState]);


    const [selectedPhysicalLayoutIndex, setSelectedPhysicalLayoutIndex] = useState(0);
    const [selectedLayerIndex, setSelectedLayerIndex] = useState(0);
    const [selectedKeyPosition, setSelectedKeyPosition] = useState<number | undefined>(undefined);

    // Device Info for Panel
    const [deviceInfo] = useConnectedDeviceData<any>(
        { core: { getDeviceInfo: true } },
        (r) => r.core?.getDeviceInfo
    );

    const selectedBinding = useMemo(() => {
        if (
            !keymap ||
            selectedLayerIndex >= keymap.layers.length ||
            selectedKeyPosition === undefined
        ) {
            return undefined;
        }

        return keymap.layers[selectedLayerIndex].bindings[selectedKeyPosition];
    }, [keymap, selectedLayerIndex, selectedKeyPosition]);

    const doSelectPhysicalLayout = useCallback(
        (index: number) => {
            setSelectedKeyPosition(undefined);
            setSelectedPhysicalLayoutIndex(index);
        },
        [setSelectedKeyPosition, setSelectedPhysicalLayoutIndex]
    );

    const doUpdateBinding = useCallback(
        (binding: BehaviorBinding) => {
            async function updateBinding(
                layerId: number,
                keyPosition: number,
                binding: BehaviorBinding,
                layerIdx: number
            ) {
                if (!conn.conn) return;

                const resp = await call_rpc(conn.conn, {
                    keymap: { setLayerBinding: { layerId, keyPosition, binding } },
                });

                if (resp.keymap?.setLayerBinding === SetLayerBindingResponse.SET_LAYER_BINDING_RESP_OK) {
                    setKeymap(
                        produce((draft: any) => {
                            if (draft) draft.layers[layerIdx].bindings[keyPosition] = binding;
                        })
                    );
                    // Optimistically set unsaved to true when binding changes
                    setUnsaved(true);
                }
            }

            if (selectedKeyPosition === undefined || !keymap) return;

            const layerIdx = selectedLayerIndex;
            const layerId = keymap.layers[layerIdx].id;
            const keyPosition = selectedKeyPosition;
            const oldBinding = keymap.layers[layerIdx].bindings[keyPosition];

            doIt?.(async () => {
                await updateBinding(layerId, keyPosition, binding, layerIdx);
                return () => updateBinding(layerId, keyPosition, oldBinding, layerIdx);
            });
        },
        [conn, doIt, keymap, selectedLayerIndex, selectedKeyPosition, setKeymap, setUnsaved]
    );

    const addLayer = useCallback(() => {
        async function doAddLayer(): Promise<number> {
            if (!conn.conn || !keymap) throw new Error("Not connected");
            const resp = await call_rpc(conn.conn, { keymap: { addLayer: {} } });
            if (resp.keymap?.addLayer?.ok) {
                const newLayer = resp.keymap.addLayer.ok.layer;
                const index = resp.keymap.addLayer.ok.index;
                setKeymap(produce((draft: any) => {
                    if (draft) {
                        draft.layers.push(newLayer);
                        draft.availableLayers--;
                    }
                }));
                setSelectedLayerIndex(index);
                setUnsaved(true);
                return index;
            }
            throw new Error("Failed to add layer");
        }

        async function doRemoveLayer(layerIdx: number) {
            if (!conn.conn) return;
            await call_rpc(conn.conn, { keymap: { removeLayer: { layerIndex: layerIdx } } });
            setKeymap(produce((draft: any) => {
                if (draft) {
                    draft.layers.splice(layerIdx, 1);
                    draft.availableLayers++;
                }
            }));
        }

        doIt?.(async () => {
            const idx = await doAddLayer();
            return () => doRemoveLayer(idx);
        });
    }, [conn, doIt, keymap, setKeymap, setUnsaved]);

    const removeLayer = useCallback((layerIdx: number) => {
        async function doRemoveLayer(idx: number): Promise<Layer> {
            if (!conn.conn || !keymap) throw new Error("Not connected");
            const layer = keymap.layers[idx];
            const resp = await call_rpc(conn.conn, { keymap: { removeLayer: { layerIndex: idx } } });
            if (resp.keymap?.removeLayer?.ok) {
                setKeymap(produce((draft: any) => {
                    if (draft) {
                        draft.layers.splice(idx, 1);
                        draft.availableLayers++;
                    }
                }));
                setUnsaved(true);
                return layer;
            }
            throw new Error("Failed to remove layer");
        }

        async function doRestoreLayer(layerId: number, atIndex: number) {
            if (!conn.conn) return;
            const resp = await call_rpc(conn.conn, { keymap: { restoreLayer: { layerId, atIndex } } });
            if (resp.keymap?.restoreLayer?.ok) {
                setKeymap(produce((draft: any) => {
                    if (draft) {
                        draft.layers.splice(atIndex, 0, resp.keymap!.restoreLayer!.ok);
                        draft.availableLayers--;
                    }
                }));
            }
        }

        if (!keymap) return;
        const layerId = keymap.layers[layerIdx].id;
        doIt?.(async () => {
            await doRemoveLayer(layerIdx);
            return () => doRestoreLayer(layerId, layerIdx);
        });
    }, [conn, doIt, keymap, setKeymap, setUnsaved]);

    const changeLayerName = useCallback((layerIdx: number, name: string) => {
        async function doSetName(idx: number, newName: string) {
            if (!conn.conn || !keymap) return;
            const layerId = keymap.layers[idx].id;
            await call_rpc(conn.conn, { keymap: { setLayerProps: { layerId, name: newName } } });
            setKeymap(produce((draft: any) => {
                if (draft) draft.layers[idx].name = newName;
            }));
            setUnsaved(true);
        }

        if (!keymap) return;
        const oldName = keymap.layers[layerIdx].name || "";
        doIt?.(async () => {
            await doSetName(layerIdx, name);
            return () => doSetName(layerIdx, oldName);
        });
    }, [conn, doIt, keymap, setKeymap, setUnsaved]);

    const moveLayer = useCallback((startIndex: number, destIndex: number) => {
        async function doMoveLayer(s: number, d: number) {
            if (!conn.conn) return;
            const resp = await call_rpc(conn.conn, { keymap: { moveLayer: { startIndex: s, destIndex: d } } });
            if (resp.keymap?.moveLayer?.ok) {
                setKeymap(resp.keymap.moveLayer.ok);
                setSelectedLayerIndex(d);
                setUnsaved(true);
            }
        }
        doIt?.(async () => {
            await doMoveLayer(startIndex, destIndex);
            return () => doMoveLayer(destIndex, startIndex);
        });
    }, [conn, doIt, setKeymap, setUnsaved]);

    useEffect(() => {
        if (!keymap?.layers) return;
        if (selectedLayerIndex >= keymap.layers.length) {
            setSelectedLayerIndex(Math.max(0, keymap.layers.length - 1));
        }
    }, [keymap, selectedLayerIndex]);

    const dispatchDisconnect = () => window.dispatchEvent(new CustomEvent('zmk-studio-disconnect'));
    const dispatchReset = () => window.dispatchEvent(new CustomEvent('zmk-studio-reset-settings'));

    // --- Handlers for Save/Discard ---
    // We manually optimistically update unsaved state to false to provide immediate UI feedback.
    // The backend will eventually send a notification (or we'll refetch), but this feels snappier.
    const handleSave = async () => {
        await conn.conn?.keymap?.saveChanges();
        setUnsaved(false);
    };

    const handleDiscard = async () => {
        if (!conn.conn) return;

        // 1. Force UI into loading state (clear keymap)
        // This gives distinct visual feedback that a "Reset" is occurring
        // AND ensures that when we setKeymap later, it's a fresh render
        setKeymap(undefined as any);

        // 2. Tell device to revert to last saved state
        await conn.conn.keymap?.discardChanges();

        // 3. Wait ample time for device to reload from flash
        await new Promise(resolve => setTimeout(resolve, 600));

        // 4. Explicitly re-fetch the keymap data
        const result = await call_rpc(conn.conn, { keymap: { getKeymap: true } });
        if (result.keymap?.getKeymap) {
            console.log("Keymap reverted successfully, UI updated.");
            setKeymap(result.keymap.getKeymap);
        }

        setUnsaved(false);
    };


    return (
        <div className="flex w-full h-full bg-base-100 overflow-hidden text-base-content font-sans selection:bg-primary selection:text-primary-content">

            {/* Sidebar Area - MD3 Surface Container Low (base-200) */}
            <aside className="w-80 flex flex-col bg-base-200 relative z-30 shadow-xl">
                <DevicePanel
                    deviceName={deviceInfo?.name || "ZMK Keyboard"}
                    transportLabel="USB"
                    onDisconnect={dispatchDisconnect}
                    onResetSettings={dispatchReset}
                />

                <div className="flex-1 min-h-0 overflow-hidden">
                    {keymap && (
                        <LayersPanel
                            layers={keymap.layers}
                            selectedLayerIndex={selectedLayerIndex}
                            onLayerClicked={setSelectedLayerIndex}
                            canAdd={(keymap.availableLayers || 0) > 0}
                            onAddClicked={addLayer}
                            onRemoveClicked={removeLayer}
                            onRenameLayer={changeLayerName}
                            onMoveLayer={moveLayer}
                        />
                    )}
                    {!keymap && (
                        <div className="p-6 text-center opacity-50 text-sm flex flex-col items-center gap-2">
                            <span className="loading loading-spinner text-primary"></span>
                            <span>Loading Layers...</span>
                        </div>
                    )}
                </div>

                <SystemPanel
                    unsaved={unsaved}
                    locked={lockState !== LockState.ZMK_STUDIO_CORE_LOCK_STATE_UNLOCKED}
                    onSave={handleSave}
                    onDiscard={handleDiscard}
                />
            </aside>

            {/* Main Canvas Area */}
            <main className="flex-1 relative bg-base-100 overflow-hidden flex flex-col">
                <div className="flex-1 relative flex items-center justify-center p-10">
                    {layouts && keymap && behaviors ? (
                        <KeymapComp
                            keymap={keymap}
                            layout={layouts[selectedPhysicalLayoutIndex]}
                            behaviors={behaviors}
                            scale="auto"
                            selectedLayerIndex={selectedLayerIndex}
                            selectedKeyPosition={selectedKeyPosition}
                            onKeyPositionClicked={setSelectedKeyPosition}
                        />
                    ) : (
                        <div className="flex flex-col items-center gap-4 text-base-content/20 animate-pulse">
                            <span className="loading loading-spinner loading-lg text-primary"></span>
                            <span className="font-bold tracking-widest text-sm">Now Loading...</span>
                        </div>
                    )}

                    {layouts && layouts.length > 1 && (
                        <div className="absolute bottom-8 z-20">
                            <div className="surface-panel p-2 flex items-center gap-2 shadow-lg backdrop-blur-md bg-base-200/80">
                                <span className="text-[10px] uppercase tracking-widest text-base-content/40 px-2 font-bold">{t("Model")}</span>
                                <PhysicalLayoutPicker
                                    layouts={layouts}
                                    selectedPhysicalLayoutIndex={selectedPhysicalLayoutIndex}
                                    onPhysicalLayoutClicked={doSelectPhysicalLayout}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </main>

            <BehaviorDrawer
                isOpen={selectedKeyPosition !== undefined}
                onClose={() => setSelectedKeyPosition(undefined)}
                title="Edit Binding"
            >
                {keymap && behaviors && selectedBinding && (
                    <BehaviorBindingPicker
                        binding={selectedBinding}
                        behaviors={Object.values(behaviors)}
                        layers={keymap.layers.map(({ id, name }, li: number) => ({
                            id,
                            name: name || li.toLocaleString(),
                        }))}
                        onBindingChanged={doUpdateBinding}
                    />
                )}
            </BehaviorDrawer>
        </div>
    );
}
