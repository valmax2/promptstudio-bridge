import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { loadJSON, saveJSON, removeKey } from '../../storage/storage';
import { Profile } from './types';

const PROFILE_KEY = 'profile';

interface ProfileContextValue {
  profile: Profile | null;
  saveProfile: (next: Profile) => Promise<void>;
  signOut: () => Promise<void>;
  isLoaded: boolean;
}

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

/**
 * Local-only profile store, shared across the app via context so every screen
 * sees the same live value (e.g. an event's RSVP list should reflect the name
 * just saved on the profile form, not a stale per-component copy). There is
 * no backend/auth service wired up yet, so "registration" just means filling
 * in a phone number and saving it on this device — it does not send an OTP,
 * verify the number, or sync anywhere.
 */
export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadJSON<Profile | null>(PROFILE_KEY, null).then((stored) => {
      setProfile(stored);
      setIsLoaded(true);
    });
  }, []);

  const saveProfile = useCallback(async (next: Profile) => {
    setProfile(next);
    await saveJSON(PROFILE_KEY, next);
  }, []);

  const signOut = useCallback(async () => {
    setProfile(null);
    await removeKey(PROFILE_KEY);
  }, []);

  const value = useMemo(() => ({ profile, saveProfile, signOut, isLoaded }), [profile, isLoaded, saveProfile, signOut]);

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used within a ProfileProvider');
  return ctx;
}
