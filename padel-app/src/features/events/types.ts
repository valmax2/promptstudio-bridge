export interface PadelEvent {
  id: string;
  title: string;
  /** ISO datetime for the match. */
  dateTime: string;
  circleId?: string;
  neededPlayers: number;
  confirmed: string[];
  declined: string[];
  createdAt: string;
}
