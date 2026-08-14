import { create } from "zustand";
import { Session, User } from "@supabase/supabase-js";
import { Profile } from "@/lib/profile";

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  initialized: boolean;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setInitialized: (initialized: boolean) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  profile: null,
  initialized: false,
  setSession: (session) => set({ session, user: session?.user ?? null }),
  setProfile: (profile) => set({ profile }),
  setInitialized: (initialized) => set({ initialized }),
  clearAuth: () => set({ session: null, user: null, profile: null }),
}));
