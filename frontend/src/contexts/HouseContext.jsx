import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { houseAPI } from '../services/api';
import { useAuth } from './AuthContext';

const HouseContext = createContext(null);

export function HouseProvider({ children }) {
  const { user } = useAuth();
  const [house, setHouse] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const refreshHouse = useCallback(async () => {
    if (!user) {
      setHouse(null);
      setMembers([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await houseAPI.getMyHouse();
      const currentHouse = res.data.houses && res.data.houses.length > 0 ? res.data.houses[0] : null;
      setHouse(currentHouse);
      if (currentHouse) {
        try {
          const membersRes = await houseAPI.getMembers(currentHouse.id);
          setMembers(membersRes.data.members || []);
        } catch {
          setMembers([]);
        }
      }
    } catch {
      setHouse(null);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshHouse();
  }, [refreshHouse]);

  return (
    <HouseContext.Provider value={{ house, members, loading, refreshHouse, setHouse, setMembers }}>
      {children}
    </HouseContext.Provider>
  );
}

export const useHouse = () => useContext(HouseContext);
