import { useRef, useState, useEffect } from "react";
import { MdSave, MdSettings, MdLock, MdLockOpen, MdCheckCircle, MdMenuBook, MdRefresh, MdDarkMode, MdLightMode, MdInfo, MdRestore, MdBrightnessAuto, MdWarning } from "react-icons/md";
import { Button, Menu, MenuItem, MenuTrigger, Popover, Dialog, OverlayArrow, Section, Header, Separator } from "react-aria-components";
import { useTranslation } from "react-i18next";

interface SystemPanelProps {
    unsaved?: boolean;
    locked?: boolean;
    onSave?: () => Promise<void> | void;
    onDiscard?: () => Promise<void> | void;
    onResetSettings?: () => void;
    onShowAbout?: () => void;
}

export const SystemPanel = ({
    unsaved = false,
    locked = false,
    onSave,
    onDiscard,
    onResetSettings,
    onShowAbout,
}: SystemPanelProps) => {
    const { t, i18n } = useTranslation();
    const lockRef = useRef(null);

    // Reset Confirmation State
    const [resetConfirm, setResetConfirm] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const ignoreNextClose = useRef(false);

    // Track unlock transition for Green -> White animation
    const [justUnlocked, setJustUnlocked] = useState(false);
    const prevLocked = useRef(locked);

    // Theme Management
    const [theme, setTheme] = useState<'dark' | 'light' | 'system'>(
        (localStorage.getItem('zmk-studio-theme') as 'dark' | 'light' | 'system') || 'system'
    );

    useEffect(() => {
        const applyTheme = () => {
            let effectiveTheme = theme;
            if (theme === 'system') {
                effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            }
            document.documentElement.setAttribute('data-theme', effectiveTheme);
        };

        applyTheme();

        if (theme === 'system') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const handleChange = () => applyTheme();
            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
        }
    }, [theme]);

    useEffect(() => {
        localStorage.setItem('zmk-studio-theme', theme);
    }, [theme]);

    useEffect(() => {
        if (prevLocked.current === true && locked === false) {
            // Transitioned from Locked to Unlocked
            setJustUnlocked(true);
            const timer = setTimeout(() => setJustUnlocked(false), 2000); // Green flash duration
            return () => clearTimeout(timer);
        }
        prevLocked.current = locked;
    }, [locked]);

    // Determine current visual state
    const isLocked = locked;
    const isSuccess = !locked && justUnlocked;
    const isReady = !locked && !justUnlocked;

    return (
        <div className="p-4 pt-2 mt-auto relative">
            {/* Bottom System Bar */}
            <div className="flex items-center justify-between px-2 pb-1 relative z-30">

                {/* Lock Status - Solid Colors Only, No Glow/Ping */}
                <div
                    ref={lockRef}
                    className={`
                        flex items-center gap-3 px-4 py-2.5 rounded-full border transition-all duration-500 select-none relative overflow-hidden
                        ${isLocked ? 'bg-orange-500/10 border-orange-500/30 text-orange-500 animate-[pulse_3s_ease-in-out_infinite]' : ''}
                        ${isSuccess ? 'bg-green-500/10 border-green-500/30 text-green-500' : ''}
                        ${isReady ? 'bg-base-100 border-base-content/10 text-base-content shadow-sm' : ''}
                    `}
                >
                    {/* Icon Switching */}
                    <div className="relative w-[18px] h-[18px] flex items-center justify-center">
                        {/* Locked Icon */}
                        <div className={`absolute transition-all duration-500 ${isLocked ? 'opacity-100 scale-100' : 'opacity-0 scale-50 rotate-90'}`}>
                            <MdLock size={18} />
                        </div>

                        {/* Success Icon */}
                        <div className={`absolute transition-all duration-500 ${isSuccess ? 'opacity-100 scale-100' : 'opacity-0 scale-150'}`}>
                            <MdCheckCircle size={18} />
                        </div>

                        {/* Ready Icon */}
                        <div className={`absolute transition-all duration-500 ${isReady ? 'opacity-100 scale-100' : 'opacity-0 scale-50 -rotate-90'}`}>
                            <MdLockOpen size={18} />
                        </div>
                    </div>

                    <span className={`text-[13px] font-bold uppercase tracking-wider transition-all duration-300`}>
                        {isLocked && t("status.locked")}
                        {isSuccess && t("status.unlocked")}
                        {isReady && t("status.ready")}
                    </span>
                </div>

                {/* Unlock Help Bubble - Layout Fixed & Reduced Icons */}
                <Popover
                    triggerRef={lockRef}
                    isOpen={locked}
                    placement="top start"
                    offset={20}
                    crossOffset={-10}
                    // High contrast solid background, no blur, ensuring readability
                    className="w-[260px] bg-base-300 text-base-content rounded-2xl p-0 shadow-2xl border border-base-content/10 animate-in fade-in slide-in-from-bottom-2 duration-300"
                >
                    <OverlayArrow>
                        <svg width={12} height={12} viewBox="0 0 12 12" className="block fill-base-300 stroke-base-content/10 stroke-[0.5px]">
                            <path d="M0 0 L6 6 L12 0" />
                        </svg>
                    </OverlayArrow>
                    <Dialog className="outline-none p-5 relative overflow-hidden">
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
                                    className="w-8 h-8 rounded-lg hover:bg-base-content/10 flex items-center justify-center transition-colors text-base-content/40 hover:text-primary"
                                    title={t("unlock.docs", "Read Documentation")}
                                >
                                    <MdMenuBook size={16} />
                                </a>
                            </div>

                            <p className="text-sm leading-relaxed font-medium pr-2 opacity-90">
                                {t("unlock.body1", "Press the unlock key combination on your full physical device.")}
                            </p>
                        </div>
                    </Dialog>
                </Popover>


                {/* Settings / Language / Theme */}
                {/* Settings / Language / Theme */}
                <MenuTrigger isOpen={isOpen} onOpenChange={(open) => {
                    if (!open && ignoreNextClose.current) {
                        ignoreNextClose.current = false;
                        return;
                    }
                    setIsOpen(open);
                    if (!open) setResetConfirm(false);
                }}>
                    <Button className="w-11 h-11 rounded-full hover:bg-base-100/50 text-base-content/70 hover:text-base-content flex items-center justify-center transition-all outline-none active:scale-90">
                        <MdSettings size={24} />
                    </Button>
                    <Popover placement="top end" offset={8} className="z-50 outline-none">
                        <Menu className="p-1.5 rounded-2xl bg-base-100 border border-base-300 shadow-2xl min-w-[200px] animate-in fade-in zoom-in-95 duration-200 outline-none">
                            <Section>
                                <Header className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-base-content/40">
                                    {t("settings.theme")}
                                </Header>
                                <MenuItem onAction={() => setTheme('system')} className="p-2.5 rounded-xl hover:bg-base-200 flex items-center justify-between cursor-pointer outline-none transition-colors text-xs font-bold">
                                    <div className="flex items-center gap-2 text-base-content/80">
                                        <MdBrightnessAuto size={16} />
                                        <span>{t("settings.systemMode")}</span>
                                    </div>
                                    {theme === 'system' && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                                </MenuItem>
                                <MenuItem onAction={() => setTheme('dark')} className="p-2.5 rounded-xl hover:bg-base-200 flex items-center justify-between cursor-pointer outline-none transition-colors text-xs font-bold">
                                    <div className="flex items-center gap-2 text-base-content/80">
                                        <MdDarkMode size={16} />
                                        <span>{t("settings.darkMode")}</span>
                                    </div>
                                    {theme === 'dark' && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                                </MenuItem>
                                <MenuItem onAction={() => setTheme('light')} className="p-2.5 rounded-xl hover:bg-base-200 flex items-center justify-between cursor-pointer outline-none transition-colors text-xs font-bold">
                                    <div className="flex items-center gap-2 text-base-content/80">
                                        <MdLightMode size={16} />
                                        <span>{t("settings.lightMode")}</span>
                                    </div>
                                    {theme === 'light' && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                                </MenuItem>
                            </Section>

                            <Separator className="mx-2 my-1 border-t border-base-content/5" />

                            <Section>
                                <Header className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-base-content/40">
                                    {t("common.language")}
                                </Header>
                                <MenuItem onAction={() => i18n.changeLanguage("en")} className="p-2.5 rounded-xl hover:bg-base-200 flex items-center justify-between cursor-pointer outline-none transition-colors text-xs font-bold">
                                    <span>English</span>
                                    {i18n.language === 'en' && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                                </MenuItem>
                                <MenuItem onAction={() => i18n.changeLanguage("zh")} className="p-2.5 rounded-xl hover:bg-base-200 flex items-center justify-between cursor-pointer outline-none transition-colors text-xs font-bold">
                                    <span>中文 (Chinese)</span>
                                    {i18n.language === 'zh' && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                                </MenuItem>
                            </Section>

                            <Separator className="mx-2 my-1 border-t border-base-content/5" />

                            <Section>
                                <MenuItem onAction={onShowAbout} className="p-2.5 rounded-xl hover:bg-base-200 flex items-center gap-2 cursor-pointer outline-none transition-colors text-xs font-bold text-base-content/80">
                                    <MdInfo size={16} />
                                    <span>{t("settings.about")}</span>
                                </MenuItem>
                                {resetConfirm ? (
                                    <MenuItem
                                        onAction={() => { onResetSettings?.(); setIsOpen(false); }}
                                        className="p-2.5 rounded-xl bg-red-500 text-white hover:bg-red-600 flex items-center gap-2 cursor-pointer outline-none transition-colors text-xs font-bold"
                                    >
                                        <MdWarning size={16} />
                                        <span>{t("settings.confirmReset", "Are you sure?")}</span>
                                    </MenuItem>
                                ) : (
                                    <MenuItem
                                        onAction={() => { ignoreNextClose.current = true; setResetConfirm(true); }}
                                        className="p-2.5 rounded-xl hover:bg-red-500/10 text-red-500 hover:text-red-500 flex items-center gap-2 cursor-pointer outline-none transition-colors text-xs font-bold"
                                    >
                                        <MdRestore size={16} />
                                        <span>{t("settings.reset")}</span>
                                    </MenuItem>
                                )}
                            </Section>
                        </Menu>
                    </Popover>
                </MenuTrigger>
            </div>
        </div>
    );
};
