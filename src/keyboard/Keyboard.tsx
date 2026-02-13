import { useCallback, useEffect, useMemo, useState, useContext } from "react";
import { useTranslation } from "react-i18next";
import { MdLock, MdUndo, MdRedo, MdSave, MdRefresh, MdMenu, MdArrowBack } from "react-icons/md";
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
import { AboutModal } from "../AboutModal";


export default function Keyboard() {
    const { t } = useTranslation();
    const conn = useContext(ConnectionContext);
    const undoRedo = useContext(UndoRedoContext);
    const doIt = undoRedo?.doIt;
    const lockState = useContext(LockStateContext);

    // Unsaved Changes State - Default to false on connect to avoid false positives
    const [unsaved, setUnsaved] = useState(false);
    const [showAbout, setShowAbout] = useState(false);
    const [kaomojiClicks, setKaomojiClicks] = useState(0);

    // Loading states for actions
    const [isSaving, setIsSaving] = useState(false);
    const [isDiscarding, setIsDiscarding] = useState(false);

    // Responsive sidebar state
    const [sidebarOpen, setSidebarOpen] = useState(false);

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
    const handleSave = async () => {
        setIsSaving(true);
        try {
            await conn.conn?.keymap?.saveChanges();
            setUnsaved(false);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDiscard = async () => {
        if (!conn.conn) return;
        setIsDiscarding(true);
        try {
            // 1. Force UI into loading state (clear keymap)
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
        } finally {
            setIsDiscarding(false);
        }
    };


    return (
        <div className="flex w-full h-full bg-base-100 overflow-hidden text-base-content font-sans selection:bg-primary selection:text-primary-content">

            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/40 z-40 lg:hidden animate-in fade-in duration-200"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar Area - Responsive: overlay on mobile, fixed on large screens */}
            <aside className={`
                flex flex-col bg-base-200 border-r border-base-content/5
                fixed lg:relative inset-y-0 left-0 z-50 lg:z-30
                w-72 lg:w-72 xl:w-80 2xl:w-80
                transform transition-transform duration-300 ease-out
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                {/* Mobile: Back button header - clearly distinct from device actions */}
                <div className="lg:hidden px-4 pt-4 pb-1">
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 rounded-full border border-base-content/15 bg-base-100/60 text-sm font-semibold text-base-content/60 hover:text-base-content hover:bg-base-100 transition-all group"
                    >
                        <MdArrowBack size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                        <span>{t("common.back", "Back")}</span>
                    </button>
                </div>

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
                            {lockState !== LockState.ZMK_STUDIO_CORE_LOCK_STATE_UNLOCKED ? (
                                <>
                                    <MdLock size={24} />
                                    <span>{t("status.locked")}</span>
                                </>
                            ) : (
                                <>
                                    <span className="loading loading-spinner text-primary"></span>
                                    <span>{t("common.loading")}</span>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Sidebar Action Bar: Undo/Redo + Save/Discard */}
                <div className="px-4 py-2">
                    <div className="flex items-center justify-between rounded-2xl bg-base-100/60 border border-base-content/10 p-1">
                        {/* Undo / Redo */}
                        <div className="flex items-center gap-0.5">
                            <button
                                title={t("common.undo")}
                                onClick={undoRedo?.undo}
                                disabled={!undoRedo?.canUndo}
                                className="p-2 rounded-xl hover:bg-base-content/5 disabled:opacity-30 disabled:cursor-not-allowed text-base-content transition-all active:scale-90 flex items-center justify-center outline-none group"
                            >
                                <MdUndo size={18} className="group-active:-rotate-12 transition-transform" />
                            </button>
                            <button
                                title={t("common.redo")}
                                onClick={undoRedo?.redo}
                                disabled={!undoRedo?.canRedo}
                                className="p-2 rounded-xl hover:bg-base-content/5 disabled:opacity-30 disabled:cursor-not-allowed text-base-content transition-all active:scale-90 flex items-center justify-center outline-none group"
                            >
                                <MdRedo size={18} className="group-active:rotate-12 transition-transform" />
                            </button>
                        </div>

                        {/* Save / Discard - appear when unsaved */}
                        {unsaved ? (
                            <div className="flex items-center gap-0.5 animate-in fade-in zoom-in-95 duration-200">
                                <button
                                    title={t("common.discard")}
                                    onClick={handleDiscard}
                                    disabled={isDiscarding || isSaving}
                                    className="p-2 rounded-xl hover:bg-error/10 text-error disabled:opacity-50 transition-all active:scale-90 flex items-center justify-center outline-none group"
                                >
                                    <MdRefresh size={18} className={`transition-transform ${isDiscarding ? 'animate-spin' : 'group-hover:-rotate-90'}`} />
                                </button>
                                <button
                                    title={t("common.save")}
                                    onClick={handleSave}
                                    disabled={isSaving || isDiscarding}
                                    className="p-2 rounded-xl bg-primary text-primary-content shadow-sm hover:brightness-110 disabled:opacity-50 transition-all active:scale-90 flex items-center justify-center outline-none group"
                                >
                                    {isSaving ? (
                                        <MdRefresh size={18} className="animate-spin" />
                                    ) : (
                                        <MdSave size={18} />
                                    )}
                                </button>
                            </div>
                        ) : (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-base-content/25 pr-2 select-none">
                                {t("status.saved", "Saved")}
                            </span>
                        )}
                    </div>
                </div>

                <SystemPanel
                    unsaved={unsaved}
                    locked={lockState !== LockState.ZMK_STUDIO_CORE_LOCK_STATE_UNLOCKED}
                    onSave={handleSave}
                    onDiscard={handleDiscard}
                    onResetSettings={dispatchReset}
                    onShowAbout={() => setShowAbout(true)}
                />
            </aside>

            {/* Main Canvas Area - Responsive bottom padding for drawer */}
            <main className="flex-1 relative bg-base-100 overflow-hidden flex flex-col pb-[240px] md:pb-[280px] lg:pb-[320px] xl:pb-[360px]">
                {/* Mobile-only: Hamburger menu button */}
                <button
                    onClick={() => setSidebarOpen(true)}
                    className="lg:hidden absolute top-3 left-4 z-20 p-2.5 rounded-xl bg-base-100/80 backdrop-blur-md border border-base-content/20 shadow-sm hover:bg-base-content/5 text-base-content transition-all active:scale-90 flex items-center justify-center outline-none animate-in fade-in duration-300"
                >
                    <MdMenu size={18} />
                </button>

                <div
                    className="flex-1 relative flex items-center justify-center p-2 cursor-alias"
                    onClick={() => setSelectedKeyPosition(undefined)}
                >
                    {layouts && keymap && behaviors ? (
                        <div className="w-full h-full flex items-center justify-center animate-in fade-in duration-700 fill-mode-both">
                            <KeymapComp
                                keymap={keymap}
                                layout={layouts[selectedPhysicalLayoutIndex]}
                                behaviors={behaviors}
                                scale="auto" // Auto scale will fill the container, which is now smaller (top half)
                                selectedLayerIndex={selectedLayerIndex}
                                selectedKeyPosition={selectedKeyPosition}
                                onKeyPositionClicked={setSelectedKeyPosition}
                            />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-4 text-base-content/20 animate-pulse duration-1000">
                            {lockState !== LockState.ZMK_STUDIO_CORE_LOCK_STATE_UNLOCKED ? (
                                <>
                                    <MdLock size={48} className="text-warning/50" />
                                    <span className="font-bold tracking-widest text-sm uppercase">{t("status.waitingForUnlock", "Waiting for Unlock...")}</span>
                                </>
                            ) : (
                                <>
                                    <span className="loading loading-spinner loading-lg text-primary"></span>
                                    <span className="font-bold tracking-widest text-sm">{t("common.loading")}</span>
                                </>
                            )}
                        </div>
                    )}

                    {layouts && layouts.length > 1 && (
                        <div className="absolute top-8 z-20"> {/* Re-positioned Model picker to top */}
                            <div className="surface-panel p-2 flex items-center gap-2 backdrop-blur-md bg-base-200/80 rounded-2xl">
                                <span className="text-[10px] uppercase tracking-widest text-base-content/40 px-2 font-bold">{t("common.model")}</span>
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

            {/* Permanent Bottom Drawer - Responsive height handled by BehaviorDrawer */}
            <BehaviorDrawer
                isOpen={true} // Always Open
                onClose={() => { }} // No closing
                sidebarOpen={sidebarOpen}
                title={selectedKeyPosition !== undefined ? t("behaviors.editBinding") : t("behaviors.configuration")}
                hideHeader={true}
            >
                {selectedKeyPosition !== undefined && keymap && behaviors && selectedBinding ? (
                    <BehaviorBindingPicker
                        binding={selectedBinding}
                        behaviors={Object.values(behaviors)}
                        layers={keymap.layers.map(({ id, name }, li: number) => ({
                            id,
                            name: name || li.toLocaleString(),
                        }))}
                        onBindingChanged={doUpdateBinding}
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center flex-col bg-base-100 select-none overflow-hidden">
                        <div
                            onClick={() => setKaomojiClicks(c => c + 1)}
                            className={`
                                text-8xl font-sans text-base-content/10 
                                select-none
                                ${kaomojiClicks < 10 ? "cursor-pointer hover:scale-110 active:scale-90 active:rotate-12 transition-all duration-200 ease-out" : ""}
                            `}
                            style={kaomojiClicks >= 10 ? {
                                transition: 'all 2s ease-in',
                                transform: 'translateY(-50vh) scale(0.75)',
                                opacity: 0,
                                filter: 'blur(20px)',
                                pointerEvents: 'none'
                            } : {}}
                        >
                            {kaomojiClicks >= 10 ? "( x _ x )" : "╮(￣▽￣)╭"}
                        </div>
                    </div>
                )}
            </BehaviorDrawer>

            <AboutModal open={showAbout} onClose={() => setShowAbout(false)} />
        </div>
    );
}
