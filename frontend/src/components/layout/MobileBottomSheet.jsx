import React from 'react';
import { useGramStore } from '../../store/useGramStore';
import { X, ChevronDown } from 'lucide-react';
import RightRail from './RightRail';

export default function MobileBottomSheet() {
  const isOpen = useGramStore((state) => state.mobileSheetOpen);
  const setOpen = useGramStore((state) => state.setMobileSheetOpen);
  const selectedVillage = useGramStore((state) => state.selectedVillage);

  if (!isOpen || !selectedVillage) return null;

  return (
    <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/50 backdrop-blur-xs">
      <div
        className="w-full bg-paper-base dark:bg-field-panel border-t border-border-subtle rounded-t-lg shadow-2xl max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-250"
      >
        {/* Drag handle & close header */}
        <div className="flex items-center justify-between p-3 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <div className="w-8 h-1 bg-border-subtle rounded-full mx-auto" />
            <span className="text-xs font-mono font-medium text-field-dark">Village Scorecard</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-1 rounded-sm text-field-dark/60 hover:text-field-dark"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <RightRail />
        </div>
      </div>
    </div>
  );
}
