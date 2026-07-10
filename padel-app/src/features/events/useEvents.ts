import { useCallback, useEffect, useState } from 'react';
import { loadJSON, saveJSON } from '../../storage/storage';
import { generateId } from '../../utils/id';
import { PadelEvent } from './types';
import { scheduleEventReminder } from '../notifications/localNotifications';

const EVENTS_KEY = 'events';
const REMINDER_LEAD_MS = 60 * 60 * 1000; // 1 hour before

export function useEvents() {
  const [events, setEvents] = useState<PadelEvent[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadJSON<PadelEvent[]>(EVENTS_KEY, []).then((stored) => {
      setEvents(stored);
      setIsLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (isLoaded) saveJSON(EVENTS_KEY, events);
  }, [events, isLoaded]);

  const createEvent = useCallback(
    (title: string, dateTime: string, circleId?: string, neededPlayers = 4) => {
      const event: PadelEvent = {
        id: generateId(),
        title,
        dateTime,
        circleId,
        neededPlayers,
        confirmed: [],
        declined: [],
        createdAt: new Date().toISOString(),
      };
      setEvents((prev) => [...prev, event]);

      const matchDate = new Date(dateTime);
      const reminderDate = new Date(matchDate.getTime() - REMINDER_LEAD_MS);
      scheduleEventReminder(
        'Promemoria partita',
        `${title} tra un'ora`,
        reminderDate
      );

      return event.id;
    },
    []
  );

  const respond = useCallback((eventId: string, name: string, response: 'confirmed' | 'declined') => {
    setEvents((prev) =>
      prev.map((e) => {
        if (e.id !== eventId) return e;
        const confirmed = e.confirmed.filter((n) => n !== name);
        const declined = e.declined.filter((n) => n !== name);
        if (response === 'confirmed') confirmed.push(name);
        else declined.push(name);
        return { ...e, confirmed, declined };
      })
    );
  }, []);

  const deleteEvent = useCallback((eventId: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
  }, []);

  return { events, createEvent, respond, deleteEvent, isLoaded };
}
