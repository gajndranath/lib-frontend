import { create } from "zustand";

interface UIState {
  sidebarOpen: boolean;
  notificationsOpen: boolean;
  mobileView: boolean;
  theme: "light" | "dark";
  activePage: string;
}

interface UIActions {
  toggleSidebar: () => void;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleNotifications: () => void;
  setMobileView: (isMobile: boolean) => void;
  toggleTheme: () => void;
  setActivePage: (page: string) => void;
  resetUI: () => void;
}

const initialState: UIState = {
  sidebarOpen: false,
  notificationsOpen: false,
  mobileView: false,
  theme: "light",
  activePage: "dashboard",
};

export const useUIStore = create<UIState & UIActions>((set) => ({
  ...initialState,

  toggleSidebar: () => {
    set((state) => ({ sidebarOpen: !state.sidebarOpen }));
  },

  openSidebar: () => {
    set({ sidebarOpen: true });
  },

  closeSidebar: () => {
    set({ sidebarOpen: false });
  },

  toggleNotifications: () => {
    set((state) => ({ notificationsOpen: !state.notificationsOpen }));
  },

  setMobileView: (isMobile) => {
    set({ mobileView: isMobile });
  },

  toggleTheme: () => {
    set((state) => ({
      theme: state.theme === "light" ? "dark" : "light",
    }));
  },

  setActivePage: (page) => {
    set({ activePage: page });
  },

  resetUI: () => {
    set(initialState);
  },
}));
