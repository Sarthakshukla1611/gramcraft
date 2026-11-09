import { create } from 'zustand';

export const useGramStore = create((set, get) => ({
  // Theme state
  theme: localStorage.getItem('gramcraft_theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
  toggleTheme: () => {
    const nextTheme = get().theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('gramcraft_theme', nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    set({ theme: nextTheme });
  },

  // Auth state
  user: JSON.parse(localStorage.getItem('gramcraft_user') || 'null'),
  token: localStorage.getItem('gramcraft_token') || null,
  setAuth: (user, token) => {
    if (user && token) {
      localStorage.setItem('gramcraft_user', JSON.stringify(user));
      localStorage.setItem('gramcraft_token', token);
      set({ user, token });
    } else {
      localStorage.removeItem('gramcraft_user');
      localStorage.removeItem('gramcraft_token');
      set({ user: null, token: null });
    }
  },
  logout: () => {
    localStorage.removeItem('gramcraft_user');
    localStorage.removeItem('gramcraft_token');
    set({ user: null, token: null });
  },

  // Selected Village State - selecting a village anywhere updates every panel and flies map to it
  selectedVillageId: null,
  selectedVillage: null,
  mapTargetCoords: null, // [lng, lat]
  setSelectedVillage: (village) => {
    if (!village) {
      set({ selectedVillageId: null, selectedVillage: null });
      return;
    }
    const coords = village.location?.coordinates || null;
    set({
      selectedVillageId: village._id || village.id,
      selectedVillage: village,
      mapTargetCoords: coords,
    });
  },

  // Planning Filters
  activeDistrict: 'Sehore',
  activeBlock: 'All',
  activeSector: 'all',
  activeQuarter: '2026-Q3',
  setActiveDistrict: (district) => set({ activeDistrict: district }),
  setActiveBlock: (block) => set({ activeBlock: block }),
  setActiveSector: (sector) => set({ activeSector: sector }),
  setActiveQuarter: (quarter) => set({ activeQuarter: quarter }),

  // Mobile Bottom Sheet open state
  mobileSheetOpen: false,
  setMobileSheetOpen: (open) => set({ mobileSheetOpen: open }),

  // Command Palette (Ctrl+K)
  commandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

  // Toast notifications queue
  toasts: [],
  addToast: (message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }],
    }));
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, duration);
  },
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
}));
