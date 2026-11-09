import React from 'react';
import { Outlet } from 'react-router-dom';
import LeftRail from './LeftRail';
import RightRail from './RightRail';
import MobileTabBar from './MobileTabBar';
import MobileBottomSheet from './MobileBottomSheet';
import ToastContainer from '../common/ToastContainer';
import CommandPalette from '../common/CommandPalette';

export default function AppLayout() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-paper-base text-field-dark">
      {/* 1. Left Rail (Desktop) */}
      <div className="hidden md:flex shrink-0">
        <LeftRail />
      </div>

      {/* 2. Center Canvas (Main Page View) */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto pb-14 md:pb-0">
        <Outlet />
      </main>

      {/* 3. Right Rail (Desktop Scorecard) */}
      <div className="hidden lg:flex shrink-0">
        <RightRail />
      </div>

      {/* Mobile navigation & bottom sheet */}
      <MobileTabBar />
      <MobileBottomSheet />

      {/* Overlays */}
      <ToastContainer />
      <CommandPalette />
    </div>
  );
}
