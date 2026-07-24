import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { houseAPI } from '../services/api';
import { useAuth } from './AuthContext';

const HouseContext = createContext(null);

export function HouseProvider({ children }) {
  const { user } = useAuth();
  const [allHouses, setAllHouses] = useState([]);
  const [house, setHouse] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeHouseId, setActiveHouseId] = useState(() => localStorage.getItem('splitroom_active_house') || null);

  const refreshHouse = useCallback(async () => {
    if (!user) {
      setAllHouses([]);
      setHouse(null);
      setMembers([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await houseAPI.getMyHouse();
      const houses = res.data.houses || [];
      setAllHouses(houses);

      let currentHouse = null;
      if (activeHouseId) {
        currentHouse = houses.find(h => h._id.toString() === activeHouseId.toString());
      }
      if (!currentHouse && houses.length > 0) {
        currentHouse = houses[0];
      }

      if (currentHouse) {
        currentHouse.user_role = 'roommate';
        setHouse(currentHouse);

        const houseId = currentHouse._id;
        try {
          const membersRes = await houseAPI.getMembers(houseId);
          setMembers(membersRes.data.members || []);
        } catch {
          if (currentHouse.members && currentHouse.members.length > 0) {
            setMembers(currentHouse.members.map(m => ({
              ...m,
              role: 'roommate',
            })));
          } else {
            setMembers([]);
          }
        }
      } else {
        setHouse(null);
        setMembers([]);
      }
    } catch {
      setAllHouses([]);
      setHouse(null);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [user, activeHouseId]);

  useEffect(() => {
    refreshHouse();
  }, [refreshHouse]);

  const switchHouse = (houseId) => {
    setActiveHouseId(houseId);
    localStorage.setItem('splitroom_active_house', houseId);
  };

  return (
    <HouseContext.Provider value={{ house, allHouses, switchHouse, members, loading, refreshHouse, setHouse, setMembers }}>
      {children}
    </HouseContext.Provider>
  );
}

export const useHouse = () => useContext(HouseContext);
