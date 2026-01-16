/**
 * UI state management with Zustand
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import i18n from '../i18n/index.js';

export type DatabaseType = 'mysql' | 'postgresql' | 'sqlite' | 'sqlserver';
export type Language = 'en' | 'ja' | 'vi';

interface UiStore {
  // State
  darkMode: boolean;
  sidebarCollapsed: boolean;
  previewPanelOpen: boolean;
  databaseType: DatabaseType;
  language: Language;
  customTypes: string[];

  // Actions
  toggleDarkMode: () => void;
  toggleSidebar: () => void;
  togglePreviewPanel: () => void;
  setDarkMode: (value: boolean) => void;
  setSidebarCollapsed: (value: boolean) => void;
  setPreviewPanelOpen: (value: boolean) => void;
  setDatabaseType: (value: DatabaseType) => void;
  setLanguage: (value: Language) => void;
  setCustomTypes: (value: string[]) => void;
}

export const useUiStore = create<UiStore>()(
  persist(
    (set) => ({
      // Initial state
      darkMode: false,
      sidebarCollapsed: false,
      previewPanelOpen: true,
      databaseType: 'mysql',
      language: (i18n.language as Language) || 'en',
      customTypes: [],

      // Actions
      toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      togglePreviewPanel: () => set((state) => ({ previewPanelOpen: !state.previewPanelOpen })),
      setDarkMode: (value: boolean) => set({ darkMode: value }),
      setSidebarCollapsed: (value: boolean) => set({ sidebarCollapsed: value }),
      setPreviewPanelOpen: (value: boolean) => set({ previewPanelOpen: value }),
      setDatabaseType: (value: DatabaseType) => set({ databaseType: value }),
      setLanguage: (value: Language) => {
        void i18n.changeLanguage(value);
        localStorage.setItem('omnify-gui-lang', value);
        set({ language: value });
      },
      setCustomTypes: (value: string[]) => set({ customTypes: value }),
    }),
    {
      name: 'omnify-gui-ui',
    }
  )
);

// Index types per database
export const INDEX_TYPES_BY_DB: Record<DatabaseType, string[]> = {
  mysql: ['btree', 'hash', 'fulltext', 'spatial'],
  postgresql: ['btree', 'hash', 'gin', 'gist'],
  sqlite: [], // SQLite only supports implicit btree
  sqlserver: ['clustered', 'nonclustered', 'fulltext'],
};
