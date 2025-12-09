export type Language = 'pt' | 'en';

export interface CountryData {
  name: string;
  name_en: string; // English name
  hdi: number; // Human Development Index (0-1)
  population: number; // Raw number
  homicideRate: number; // Per 100k inhabitants
  continent: string;
  continent_en: string; // English continent
  flagEmoji: string;
  language: string;
  language_en: string; // English language name
  famousPlayer: string; // Football player or famous athlete
  independenceYear: string; // String to handle "Antiquity", "BC", etc.
  independenceYear_en?: string; // Optional English override if notes differ (e.g. "a.C." vs "BC")
}

export interface GameState {
  status: 'menu' | 'playing' | 'success' | 'gameover' | 'leaderboard';
  score: number;
  lives: number;
  maxLives: number;
  currentCountry: CountryData | null;
  history: string[];
  roundErrors: number;
  autoHints: string[];
  language: Language; // Added language to state
}

export enum StatType {
  HDI = 'HDI',
  POPULATION = 'POPULATION',
  HOMICIDE = 'HOMICIDE',
  INDEPENDENCE = 'INDEPENDENCE'
}

export interface HighScore {
  name: string;
  score: number;
  isUser?: boolean;
  date: string;
}