import React, { useEffect } from 'react';
import { X } from 'lucide-react';

// Hook to lock background scrolling of the main scroll container
const useBodyScrollLock = (isOpen: boolean) => {
  useEffect(() => {
    if (!isOpen) return;

    // Find the main scrollable content container
    const scrollContainer = document.querySelector('.overflow-y-auto');
    const originalOverflow = scrollContainer 
      ? (scrollContainer as HTMLElement).style.overflowY 
      : document.body.style.overflow;

    if (scrollContainer) {
      (scrollContainer as HTMLElement).style.overflowY = 'hidden';
    } else {
      document.body.style.overflow = 'hidden';
    }

    return () => {
      if (scrollContainer) {
        (scrollContainer as HTMLElement).style.overflowY = originalOverflow;
      } else {
        document.body.style.overflow = originalOverflow;
      }
    };
  }, [isOpen]);
};

// Hook to handle ESC key to close
const useKeyPress = (targetKey: string, handler: () => void, isOpen: boolean) => {
  useEffect(() => {
    if (!isOpen) return;
    const listener = (event: KeyboardEvent) => {
      if (event.key === targetKey) {
        handler();
      }
    };
    window.addEventListener('keydown', listener);
    return () => {
      window.removeEventListener('keydown', listener);
    };
  }, [isOpen, targetKey, handler]);
};

interface EnterpriseDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export const EnterpriseDrawer: React.FC<EnterpriseDrawerProps> = ({
  isOpen,
  onClose,
  title,
  icon,
  children,
}) => {
  useBodyScrollLock(isOpen);
  useKeyPress('Escape', onClose, isOpen);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop: Fade animation, z-index 45 */}
      <div
        className="fixed inset-0 z-[45] bg-slate-950/80 backdrop-blur-sm transition-opacity duration-300 animate-fade-in"
        onClick={onClose}
      />
      {/* Drawer Container: Slide from right, z-index 50 */}
      <div
        className="fixed right-0 z-50 bg-[#090d16] border-l border-slate-800/80 shadow-2xl transition-all duration-300 ease-in-out flex flex-col 
                   top-16 
                   w-full sm:w-[80%] md:w-[560px] 
                   bottom-0 sm:bottom-[73px]
                   h-[calc(100vh-64px)] sm:h-[calc(100vh-64px-73px)]
                   pb-safe animate-slide-in-right"
      >
        {/* Sticky Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-[#090d16]/95 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-2">
            {icon}
            <h3 className="text-sm font-black text-slate-100 uppercase tracking-widest">
              {title}
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Content Section: Scrollable */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {children}
        </div>
      </div>
    </>
  );
};

interface EnterpriseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: React.ReactNode;
  maxWidthClass?: string;
  children: React.ReactNode;
}

export const EnterpriseModal: React.FC<EnterpriseModalProps> = ({
  isOpen,
  onClose,
  title,
  icon,
  maxWidthClass = 'max-w-lg',
  children,
}) => {
  useBodyScrollLock(isOpen);
  useKeyPress('Escape', onClose, isOpen);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop: Fade animation, z-index 45 */}
      <div
        className="fixed inset-0 z-[45] bg-slate-950/80 backdrop-blur-sm transition-opacity duration-300 animate-fade-in"
        onClick={onClose}
      />
      {/* Modal Layout Container: Centers modal, bounds inside top-16 / bottom-[73px], z-index 50 */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none top-16 bottom-[73px]">
        <div 
          className={`w-full ${maxWidthClass} bg-[#090d16] border border-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-full pointer-events-auto overflow-hidden animate-scale-up`}
        >
          {/* Sticky Header */}
          <div className="sticky top-0 z-20 flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-[#090d16]/95 backdrop-blur-md shrink-0">
            <div className="flex items-center gap-2">
              {icon}
              <h3 className="text-sm font-black text-slate-100 uppercase tracking-widest">
                {title}
              </h3>
            </div>
            <button 
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>

          {/* Content & Scrollable Body */}
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
        </div>
      </div>
    </>
  );
};
