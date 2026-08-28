import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { getme, OwnProfile } from '../../api/authApi';

interface ProfileValue {
  user: OwnProfile | null;
  setUser: (user: OwnProfile | null) => void;
  loading: boolean;
  loadProfile: () => Promise<void>;
}

const ProfileContext = createContext<ProfileValue>({
  user: null,
  setUser: () => {},
  loading: true,
  loadProfile: async () => {},
});

// Holds the logged in user so ProfileScreen and EditProfile show the same data.
export const ProfileProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<OwnProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async () => {
    const token = await AsyncStorage.getItem('accessToken');

    // Not logged in yet, so there is nothing to load.
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await getme();
      setUser(response);
    } catch (error) {
      console.log('Load profile failed', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  return (
    <ProfileContext.Provider value={{ user, setUser, loading, loadProfile }}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => useContext(ProfileContext);
