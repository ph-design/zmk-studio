import { useEffect, useRef, useState } from "react";
import { Button } from "react-aria-components";
import { useTranslation } from "react-i18next";
import { MdCable, MdKeyboard, MdBluetooth, MdUsb, MdArrowForward, MdMenuBook, MdLanguage } from "react-icons/md";
import { FaGithub, FaDiscord } from "react-icons/fa";
import type { TransportFactory } from "../ConnectModal";
import type { RpcTransport } from "@zmkfirmware/zmk-studio-ts-client/transport/index";

interface ConnectCardProps {
    onConnectCommon: () => void;
    transports: TransportFactory[];
    onTransportCreated: (t: RpcTransport) => void;
}

export const ConnectCard = ({ onConnectCommon, transports, onTransportCreated }: ConnectCardProps) => {
    const { t, i18n } = useTranslation();
    const [langOpen, setLangOpen] = useState(false);
    const langRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const handleClick = (event: MouseEvent) => {
            if (langRef.current && !langRef.current.contains(event.target as Node)) {
                setLangOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    const handleConnect = async (factory: TransportFactory) => {
        try {
            if (factory.connect) {
                const transport = await factory.connect();
                if (transport) {
                    onTransportCreated(transport);
                }
            } else {
                onConnectCommon();
            }
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="relative flex flex-col items-center justify-center min-h-[600px] w-full p-6 animate-in fade-in zoom-in-95 duration-500">

            {/* Main Surface Card - MD3 Surface Container High */}
            <div className="relative bg-base-200/80 backdrop-blur-xl border border-base-content/5 rounded-[32px] p-12 flex flex-col items-center text-center max-w-lg w-full shadow-xl">

                {/* Language Switcher - Card Top Right */}
                <div className="absolute top-5 right-5 z-10" ref={langRef}>
                    <Button
                        className="p-2 rounded-xl hover:bg-base-content/5 text-base-content/40 hover:text-base-content transition-all outline-none"
                        onPress={() => setLangOpen((open) => !open)}
                    >
                        <MdLanguage className="w-5 h-5" />
                    </Button>
                    {langOpen && (
                        <div className="absolute right-0 mt-2 shadow-2xl rounded-2xl bg-base-300 overflow-hidden z-50 min-w-[140px] p-1.5">
                            <button
                                className={`w-full text-left px-4 py-2.5 text-sm transition-all font-medium rounded-xl outline-none ${i18n.language === 'en'
                                    ? 'bg-primary/15 text-primary'
                                    : 'hover:bg-base-100/50 text-base-content/70 hover:text-base-content'
                                    }`}
                                onClick={() => {
                                    i18n.changeLanguage("en");
                                    setLangOpen(false);
                                }}
                            >
                                English
                            </button>
                            <button
                                className={`w-full text-left px-4 py-2.5 text-sm transition-all font-medium rounded-xl outline-none ${i18n.language === 'zh'
                                    ? 'bg-primary/15 text-primary'
                                    : 'hover:bg-base-100/50 text-base-content/70 hover:text-base-content'
                                    }`}
                                onClick={() => {
                                    i18n.changeLanguage("zh");
                                    setLangOpen(false);
                                }}
                            >
                                中文
                            </button>
                        </div>
                    )}
                </div>

                {/* Hero Icon - MD3 Secondary Container style */}
                <div className="mb-8 relative">
                    <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full scale-150 opacity-40" />
                    <div className="relative w-24 h-24 rounded-[28px] bg-primary/10 text-primary flex items-center justify-center mb-6 shadow-inner ring-1 ring-white/10">
                        <MdKeyboard size={40} />
                    </div>
                </div>

                {/* Typography - MD3 Headline Large & Body Large */}
                <div className="space-y-3 mb-10">
                    <h1 className="text-4xl font-bold text-base-content tracking-tight">
                        ZMK Studio
                    </h1>
                    <p className="text-lg text-base-content/60 font-medium leading-relaxed max-w-sm mx-auto">
                        {t("welcome.subtitle")}
                    </p>
                </div>

                {/* Actions - MD3 Filled Buttons */}
                <div className="flex flex-col gap-3 w-full max-w-xs transition-all">
                    {transports.map((transport, idx) => (
                        <Button
                            key={idx}
                            className="group relative h-14 w-full rounded-full bg-primary text-primary-content hover:bg-primary/90 hover:shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-3 font-bold text-base outline-none ring-offset-2 focus-visible:ring-2 ring-primary"
                            onPress={() => handleConnect(transport)}
                        >
                            {/* Icon Logic */}
                            {transport.label === "BLE" ? (
                                <MdBluetooth size={20} className="opacity-80" />
                            ) : (transport.label === "USB" ? (
                                <MdUsb size={20} className="opacity-80" />
                            ) : <MdCable size={20} className="opacity-80" />)}

                            <span>{t("welcome.connectVia", { type: transport.label })}</span>
                            <MdArrowForward size={18} className="opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                        </Button>
                    ))}

                    {transports.length === 0 && (
                        <Button
                            className="group relative h-14 w-full rounded-full bg-primary text-primary-content hover:bg-primary/90 hover:shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-3 font-bold text-base outline-none ring-offset-2 focus-visible:ring-2 ring-primary"
                            onPress={onConnectCommon}
                        >
                            <MdCable size={20} className="opacity-80" />
                            <span>{t("welcome.connect", "Connect Device")}</span>
                            <MdArrowForward size={18} className="opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Footer Links - Icon Only */}
            <div className="flex items-center gap-8 mt-12">
                {[
                    { label: "Docs", icon: MdMenuBook, href: "https://zmk.dev/docs" },
                    { label: "GitHub", icon: FaGithub, href: "https://github.com/zmkfirmware/zmk" },
                    { label: "Discord", icon: FaDiscord, href: "https://discord.gg/zmk" }
                ].map(link => (
                    <a
                        key={link.label}
                        href={link.href}
                        target="_blank"
                        rel="noreferrer"
                        className="text-base-content/30 hover:text-base-content hover:scale-110 transition-all duration-300 p-2"
                        title={link.label}
                    >
                        <link.icon size={24} />
                    </a>
                ))}
            </div>
        </div>
    );
};
