import { Button } from "react-aria-components";
import { useTranslation } from "react-i18next";
import { Cable, KeyRound, Bluetooth, Usb, ArrowRight } from "lucide-react";
import type { TransportFactory } from "../ConnectModal";
import type { RpcTransport } from "@zmkfirmware/zmk-studio-ts-client/transport/index";

interface ConnectCardProps {
    onConnectCommon: () => void;
    transports: TransportFactory[];
    onTransportCreated: (t: RpcTransport) => void;
}

export const ConnectCard = ({ onConnectCommon, transports, onTransportCreated }: ConnectCardProps) => {
    const { t } = useTranslation();

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
        <div className="relative flex flex-col items-center justify-center min-h-[500px] gap-8 p-12 max-w-2xl w-full mx-6 text-center animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* Background Decoration */}
            <div className="absolute inset-0 z-[-1] overflow-hidden rounded-[80px] opacity-20 bg-gradient-to-tr from-primary/30 to-secondary/30 blur-3xl" />

            {/* Icon/Logo Area */}
            <div className="relative group">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full group-hover:bg-primary/30 transition-all duration-500" />
                <div className="relative w-28 h-28 bg-base-100/50 backdrop-blur-md border border-white/20 rounded-[32px] flex items-center justify-center text-primary shadow-2xl hover:scale-105 transition-transform duration-500">
                    <KeyRound size={48} strokeWidth={1.5} />
                </div>
            </div>

            {/* Text Content */}
            <div className="space-y-4 max-w-lg">
                <h1 className="text-5xl font-black text-base-content tracking-tighter">
                    ZMK Studio
                </h1>
                <p className="text-lg text-base-content/60 leading-relaxed font-medium">
                    The ultimate tool for customizing your ZMK-powered keyboard. <br />
                    Remap keys, adjust settings, and more.
                </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 w-full justify-center mt-4">
                {transports.map((transport, idx) => (
                    <Button
                        key={idx}
                        className="group relative h-16 px-8 rounded-full bg-base-content text-base-100 font-bold text-lg hover:scale-105 active:scale-100 transition-all flex items-center justify-center gap-3 shadow-xl hover:shadow-2xl"
                        onPress={() => handleConnect(transport)}
                    >
                        {transport.label === "BLE" ? (
                            <Bluetooth size={24} className="group-hover:text-blue-400 transition-colors" />
                        ) : (transport.label === "USB" ? (
                            <Usb size={24} className="group-hover:text-amber-400 transition-colors" />
                        ) : <Cable size={24} />)}

                        <span>Connect via {transport.label}</span>
                        <ArrowRight size={20} className="opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300" />
                    </Button>
                ))}

                {transports.length === 0 && (
                    <Button
                        className="group relative h-16 px-8 rounded-full bg-base-content text-base-100 font-bold text-lg hover:scale-105 active:scale-100 transition-all flex items-center justify-center gap-3 shadow-xl hover:shadow-2xl"
                        onPress={onConnectCommon}
                    >
                        <Cable size={24} />
                        <span>{t("welcome.connect", "Connect Device")}</span>
                        <ArrowRight size={20} className="opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300" />
                    </Button>
                )}
            </div>

            <div className="flex gap-6 mt-8 opacity-40 hover:opacity-100 transition-opacity duration-300">
                <a href="https://zmk.dev/docs" target="_blank" rel="noreferrer" className="text-sm font-semibold hover:underline decoration-2 underline-offset-4">Documentation</a>
                <a href="https://github.com/zmkfirmware/zmk" target="_blank" rel="noreferrer" className="text-sm font-semibold hover:underline decoration-2 underline-offset-4">GitHub</a>
                <a href="https://discord.gg/zmk" target="_blank" rel="noreferrer" className="text-sm font-semibold hover:underline decoration-2 underline-offset-4">Discord</a>
            </div>
        </div>
    );
};
