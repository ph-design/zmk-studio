import { useRef, useState, useEffect } from "react";
import { Save, Settings, Lock, Unlock, CheckCircle2, BookOpen, Loader2 } from "lucide-react";
import { Button, Menu, MenuItem, MenuTrigger, Popover, Dialog, OverlayArrow } from "react-aria-components";
import { useTranslation } from "react-i18next";

interface SystemPanelProps {
    unsaved?: boolean;
    locked?: boolean;
    onSave?: () => Promise<void> | void;
    onDiscard?: () => Promise<void> | void;
    onToggleLock?: () => void;
}

export const SystemPanel = ({
    unsaved = false,
    locked = false,
    onSave,
    onDiscard,
    onToggleLock
}: SystemPanelProps) => {
    const { t, i18n } = useTranslation();
    const lockRef = useRef(null);

    // Loading states for actions
    const [isSaving, setIsSaving] = useState(false);
    const [isDiscarding, setIsDiscarding] = useState(false);

    // Track unlock transition for Green -> White animation
    const [justUnlocked, setJustUnlocked] = useState(false);
    const prevLocked = useRef(locked);

    useEffect(() => {
        if (prevLocked.current === true && locked === false) {
            // Transitioned from Locked to Unlocked
            setJustUnlocked(true);
            const timer = setTimeout(() => setJustUnlocked(false), 2000); // Green flash duration
            return () => clearTimeout(timer);
        }
        prevLocked.current = locked;
    }, [locked]);

    const handleSave = async () => {
        if (!onSave) return;
        setIsSaving(true);
        try {
            await onSave();
        } catch (e) {
            console.error("Save failed", e);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDiscard = async () => {
        if (!onDiscard) return;
        setIsDiscarding(true);
        try {
            await onDiscard();
        } catch (e) {
            console.error("Discard failed", e);
        } finally {
            setIsDiscarding(false);
        }
    };

    // Determine current visual state
    const isLocked = locked;
    const isSuccess = !locked && justUnlocked;
    const isReady = !locked && !justUnlocked;

    // Determine panel visibility state
    const isVisible = unsaved || isSaving || isDiscarding;

    return (
        <div className="p-4 pt-2 mt-auto relative">
            {/* Unsaved Changes Card - Always Absolute - MD3 Emphasized Motion */}
            <div
                className={`
                    absolute bottom-full left-4 right-4 mb-2
                    flex flex-col gap-3 p-4 rounded-2xl 
                    transition-all duration-500 ease-[cubic-bezier(0.2,0,0,1)]
                    transform origin-bottom
                    bg-primary/10 border-primary/20 backdrop-blur-md z-20 shadow-xl
                    ${isVisible
                        ? 'opacity-100 translate-y-0 scale-100'
                        : 'opacity-0 translate-y-8 scale-90 pointer-events-none'
                    }
                `}
            >
                <div className="flex items-center gap-2 text-primary">
                    <div className={`w-2 h-2 rounded-full bg-primary animate-pulse shadow-sm transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`} />
                    <span className="text-xs font-black uppercase tracking-widest">Unsaved Changes</span>
                </div>
                <div className="flex gap-2.5">
                    <Button
                        onPress={handleDiscard}
                        isDisabled={isDiscarding || isSaving}
                        className="flex-1 h-11 rounded-xl bg-base-100/50 hover:bg-red-500/10 hover:text-red-500 text-base-content/60 text-xs font-bold transition-colors flex items-center justify-center outline-none focus-visible:ring-2 ring-red-500/50 disabled:opacity-50"
                    >
                        {isDiscarding ? <Loader2 size={16} className="animate-spin" /> : "Discard"}
                    </Button>
                    <Button
                        onPress={handleSave}
                        isDisabled={isSaving || isDiscarding}
                        className="flex-[2] h-11 rounded-xl bg-primary hover:brightness-110 text-primary-content text-sm font-bold transition-all shadow-md hover:shadow-lg active:scale-95 flex items-center justify-center gap-2 outline-none focus-visible:ring-2 ring-primary/50 disabled:opacity-50"
                    >
                        {isSaving ? (
                            <Loader2 size={18} className="animate-spin" />
                        ) : (
                            <>
                                <Save size={18} strokeWidth={2.5} />
                                Save
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* Bottom System Bar */}
            <div className="flex items-center justify-between px-2 pb-1 relative z-30">

                {/* Lock Status - Solid Colors Only, No Glow/Ping */}
                <div
                    ref={lockRef}
                    className={`
                        flex items-center gap-3 px-4 py-2.5 rounded-full border transition-all duration-500 select-none relative overflow-hidden
                        ${isLocked ? 'bg-orange-500/10 border-orange-500/30 text-orange-500' : ''}
                        ${isSuccess ? 'bg-green-500/10 border-green-500/30 text-green-500' : ''}
                        ${isReady ? 'bg-base-100/40 border-white/5 text-base-content' : ''}
                    `}
                >
                    {/* Icon Switching */}
                    <div className="relative w-[18px] h-[18px] flex items-center justify-center">
                        {/* Locked Icon */}
                        <div className={`absolute transition-all duration-500 ${isLocked ? 'opacity-100 scale-100' : 'opacity-0 scale-50 rotate-90'}`}>
                            <Lock size={18} />
                        </div>

                        {/* Success Icon */}
                        <div className={`absolute transition-all duration-500 ${isSuccess ? 'opacity-100 scale-100' : 'opacity-0 scale-150'}`}>
                            <CheckCircle2 size={18} />
                        </div>

                        {/* Ready Icon */}
                        <div className={`absolute transition-all duration-500 ${isReady ? 'opacity-100 scale-100' : 'opacity-0 scale-50 -rotate-90'}`}>
                            <Unlock size={18} />
                        </div>
                    </div>

                    <span className={`text-[13px] font-bold uppercase tracking-wider transition-all duration-300`}>
                        {isLocked && "Locked"}
                        {isSuccess && "Unlocked"}
                        {isReady && "Ready"}
                    </span>
                </div>

                {/* Unlock Help Bubble - Layout Fixed & Reduced Icons */}
                <Popover
                    triggerRef={lockRef}
                    isOpen={locked}
                    placement="top start"
                    offset={20}
                    crossOffset={-10}
                    className="w-[260px] bg-base-200/95 backdrop-blur-xl rounded-2xl p-0 shadow-2xl border border-white/10 animate-in fade-in slide-in-from-bottom-2 duration-300"
                >
                    <OverlayArrow>
                        <svg width={12} height={12} viewBox="0 0 12 12" className="fill-base-200/95 text-white/5 translate-y-[1px]">
                            <path d="M0 0 L6 6 L12 0" />
                        </svg>
                    </OverlayArrow>
                    <Dialog className="outline-none p-5 text-base-content relative overflow-hidden">
                        <div className="flex flex-col gap-1">
                            {/* Header Row: Title + Icon */}
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-sm font-bold flex items-center gap-2 text-warning">
                                    {t("unlock.title", "Unlock Required")}
                                </h3>

                                <a
                                    href="https://zmk.dev/docs/keymaps/behaviors/studio-unlock"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center transition-colors text-base-content/40 hover:text-primary"
                                    title={t("unlock.docs", "Read Documentation")}
                                >
                                    <BookOpen size={16} />
                                </a>
                            </div>

                            <p className="text-sm opacity-90 leading-relaxed font-medium pr-2">
                                {t("unlock.body1", "Press the unlock key combination on your full physical device.")}
                            </p>
                        </div>
                    </Dialog>
                </Popover>


                {/* Settings / Language */}
                <MenuTrigger>
                    <Button className="w-11 h-11 rounded-full hover:bg-base-100/50 text-base-content/70 hover:text-base-content flex items-center justify-center transition-all outline-none active:scale-90">
                        <Settings size={24} />
                    </Button>
                    <Popover placement="top end" offset={8}>
                        <Menu className="p-1.5 rounded-2xl bg-base-100 border border-base-300 shadow-2xl min-w-[160px] animate-in fade-in zoom-in-95 duration-200">
                            <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-base-content/40">
                                Language
                            </div>
                            <MenuItem onAction={() => i18n.changeLanguage("en")} className="p-2.5 rounded-xl hover:bg-base-200 flex items-center justify-between cursor-pointer outline-none transition-colors text-xs font-bold">
                                <span>English</span>
                                {i18n.language === 'en' && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                            </MenuItem>
                            <MenuItem onAction={() => i18n.changeLanguage("zh")} className="p-2.5 rounded-xl hover:bg-base-200 flex items-center justify-between cursor-pointer outline-none transition-colors text-xs font-bold">
                                <span>中文 (Chinese)</span>
                                {i18n.language === 'zh' && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                            </MenuItem>
                        </Menu>
                    </Popover>
                </MenuTrigger>
            </div>
        </div>
    );
};
