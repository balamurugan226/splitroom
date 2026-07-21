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
      const houses = res.data.houses;
      const currentHouse = houses && houses.length > 0 ? houses[0] : null;

      if (currentHouse) {
        // Compute user_role by comparing createdBy with logged-in user
        const createdById = currentHouse.createdBy?._id || currentHouse.createdBy;
        const userId = user.id || user._id;
        currentHouse.user_role = (createdById && createdById.toString() === userId.toString()) ? 'owner' : 'member';

        setHouse(currentHouse);

        // Use _id (MongoDB) for the API call
        const houseId = currentHouse._id;
        try {
          const membersRes = await houseAPI.getMembers(houseId);
          setMembers(membersRes.data.members || []);
        } catch {
          // If getMembers fails, use the populated members from getMyHouse
          if (currentHouse.members && currentHouse.members.length > 0) {
            setMembers(currentHouse.members.map(m => ({
              ...m,
              role: (m._id && m._id.toString() === (createdById && createdById.toString())) ? 'owner' : 'member',
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
