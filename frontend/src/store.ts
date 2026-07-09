import { create } from "zustand";
import type { MediaInfo } from "./lib/api";

interface AppState {
  url: string;
  result: MediaInfo | null;
  setUrl: (url: string) => void;
  setResult: (result: MediaInfo | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  url: "",
  result: null,
  setUrl: (url) => set({ url }),
  setResult: (result) => set({ result }),
}));
