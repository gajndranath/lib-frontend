import { create } from "zustand";

interface UIState {
  sidebarOpen: boolean;
  mobileSidebarOpen: boolean;
  theme: "light" | "dark";
  activeTab: string;
  isLoading: boolean;
}

interface UIActions {
  toggleSidebar: () => void;
  toggleMobileSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setMobileSidebarOpen: (open: boolean) => void;
  setTheme: (theme: "light" | "dark") => void;
  setActiveTab: (tab: string) => void;
  setLoading: (loading: boolean) => void;
}

const initialState: UIState = {
  sidebarOpen: true,
  mobileSidebarOpen: false,
  theme: "light",
  activeTab: "dashboard",
  isLoading: false,
};

export const useUIStore = create<UIState & UIActions>()((set) => ({
  ...initialState,

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  toggleMobileSidebar: () =>
    set((state) => ({ mobileSidebarOpen: !state.mobileSidebarOpen })),

  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),

  setTheme: (theme) => set({ theme }),

  setActiveTab: (tab) => set({ activeTab: tab }),

  setLoading: (loading) => set({ isLoading: loading }),
}));
