import { ReactNode } from "react";
import { Button } from "react-aria-components";
import { MdClose } from "react-icons/md";

interface BehaviorDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    hideHeader?: boolean;
    sidebarOpen?: boolean;
}

export const BehaviorDrawer = ({ isOpen, onClose, title, children, hideHeader }: BehaviorDrawerProps) => {
    return (
        <div
            className={`
                fixed bottom-0 right-0 z-40
                left-0 lg:left-72 xl:left-80 2xl:left-80
                h-[240px] md:h-[280px] lg:h-[320px] xl:h-[360px]
                bg-base-100 border-t border-base-300
                transition-all duration-500 ease-[cubic-bezier(0.2,0,0,1)]
                flex flex-col origin-bottom
                ${isOpen ? 'translate-y-0' : 'translate-y-full pointer-events-none'}
            `}
        >
            {/* Header - Compact Row */}
            {!hideHeader && (
                <div className="flex items-center justify-between px-4 md:px-6 py-2 md:py-3 border-b border-base-content/5 bg-base-100 backdrop-blur-sm z-10 relative">
                    <div className="flex items-center gap-2 md:gap-4">
                        <h2 className="text-xs md:text-sm font-bold text-base-content uppercase tracking-wider">{title}</h2>
                        <div className="h-4 w-[1px] bg-base-content/10 hidden md:block" />
                        <span className="text-[10px] font-bold text-base-content/40 hidden md:block">BEHAVIOR CONFIGURATION</span>
                    </div>
                    <Button onPress={onClose} className="p-1 rounded-full hover:bg-base-200 text-base-content/50 hover:text-base-content transition-colors outline-none">
                        <MdClose size={20} />
                    </Button>
                </div>
            )}

            {/* Content - Horizontal Layout Optimized */}
            <div className="flex-1 overflow-hidden relative flex flex-col">
                {children}
            </div>
        </div>
    );
};
