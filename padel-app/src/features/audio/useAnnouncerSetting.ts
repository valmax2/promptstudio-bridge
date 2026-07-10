import { useEffect, useState } from 'react';
import { loadJSON, saveJSON } from '../../storage/storage';

const KEY = 'announcer-enabled';

export function useAnnouncerSetting() {
  const [enabled, setEnabled] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadJSON(KEY, true).then((value) => {
      setEnabled(value);
      setIsLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (isLoaded) saveJSON(KEY, enabled);
  }, [enabled, isLoaded]);

  return { enabled, setEnabled, isLoaded };
}
