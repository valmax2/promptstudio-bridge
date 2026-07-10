import { useCallback, useEffect, useState } from 'react';
import { loadJSON, saveJSON } from '../../storage/storage';
import { generateId } from '../../utils/id';
import { Circle } from './types';

const CIRCLES_KEY = 'circles';

/**
 * Local-only circle store — one device's view of its own circles, no
 * multi-user sync. Members are plain names (there's no user directory to
 * pick real accounts from yet), which is enough to organize matches now and
 * maps cleanly onto real member records once a backend exists.
 */
export function useCircles() {
  const [circles, setCircles] = useState<Circle[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadJSON<Circle[]>(CIRCLES_KEY, []).then((stored) => {
      setCircles(stored);
      setIsLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (isLoaded) saveJSON(CIRCLES_KEY, circles);
  }, [circles, isLoaded]);

  const createCircle = useCallback((name: string, memberNames: string[] = []) => {
    const circle: Circle = { id: generateId(), name, memberNames, createdAt: new Date().toISOString() };
    setCircles((prev) => [...prev, circle]);
    return circle.id;
  }, []);

  const deleteCircle = useCallback((id: string) => {
    setCircles((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const addMember = useCallback((circleId: string, memberName: string) => {
    setCircles((prev) =>
      prev.map((c) => (c.id === circleId ? { ...c, memberNames: [...c.memberNames, memberName] } : c))
    );
  }, []);

  return { circles, createCircle, deleteCircle, addMember, isLoaded };
}
