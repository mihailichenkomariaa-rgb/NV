
// Add Telegram WebApp types
declare global {
  interface Window {
    Telegram: {
      WebApp: {
        ready: () => void;
        expand: () => void;
        close: () => void;
        setHeaderColor: (color: string) => void;
        setBackgroundColor: (color: string) => void;
        MainButton: {
          text: string;
          color: string;
          textColor: string;
          isVisible: boolean;
          isActive: boolean;
          show: () => void;
          hide: () => void;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
          showProgress: (leaveActive: boolean) => void;
          hideProgress: () => void;
        };
        initDataUnsafe: any;
        colorScheme: 'light' | 'dark';
        viewportHeight: number;
        viewportStableHeight: number;
        disableVerticalSwipes: () => void;
        isVersionAtLeast: (version: string) => boolean;
        version: string;
      };
    };
  }
}

export enum Difficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
}

export enum RoundType {
  IMAGE_GUESS = 'IMAGE_GUESS', 
  SCIENTIFIC_SONGS = 'SCIENTIFIC_SONGS', 
  EXPLAIN_TO_AI = 'EXPLAIN_TO_AI',
  PROMPT_BATTLE = 'PROMPT_BATTLE',
}

export const GAME_THEMES = [
  "Новый год и Праздники",
  "Природа и Животные",
  "Космос и Наука",
  "Кино и Сериалы",
  "Музыка и Хиты",
  "Еда и Кулинария",
  "Путешествия и Страны",
  "Технологии и Гаджеты",
  "Литература и Искусство",
  "Спорт и ЗОЖ",
  "Мистика и Ужасы",
  "Школа и Универ",
  "Офис и Карьера",
  "90-е и Ностальгия",
  "Супергерои и Комиксы",
  "Мода и Стиль",
  "Игры и Киберспорт",
  "История и Личности",
  "Психология и Отношения",
  "Аниме и Манга",
  "Философия и Мудрость",
  "Гарри Поттер и Магия",
  "Властелин Колец и Фэнтези",
  "Рок и Метал",
  "Советское Кино",
  "Криминал и Детективы",
  "Медицина и Биология",
  "Бизнес и Финансы",
  "Зомби и Постапокалипсис",
  "Древняя Русь и Сказки"
] as const;

export type GameTheme = typeof GAME_THEMES[number];

export interface Team {
  id: string;
  name: string;
  players: string[];
  score: number;
  color: string;
  nextPlayerIndex: number; // Tracks whose turn it is within the team
}

export interface GameSettings {
  difficulty: Difficulty;
  averageAge: number;
  themes: string[]; // List of active themes
  ttsEnabled: boolean; // Auto Text-to-Speech
}

export interface RoundContext {
  userAnswer: string;
  target: string;
  isOvertime: boolean;
}

export interface GameState {
  settings: GameSettings;
  teams: Team[];
  
  // Progression tracking
  currentRoundTypeIndex: number;
  currentTeamIndex: number;
  
  gameStatus: 'WELCOME' | 'SETUP' | 'ROUND_INTRO' | 'TURN_START' | 'PLAYING' | 'ROUND_RESULT' | 'GAME_OVER';
  history: RoundResult[];
  
  usedContent: string[]; 
}

export interface RoundResult {
  roundType: RoundType;
  teamId: string;
  pointsEarned: number;
  aiMessage: string;
  definition?: string;
  correctAnswer?: string;
  userAnswer?: string;
}

export interface ImageTaskData {
  imageUrl: string;
  targetWord: string;
  hint: string;
}

export interface SongTaskData {
  rewrittenLyrics: string;
  targetSong: string;
  style: string;
  hint: string;
}

export interface ExplanationResult {
  isCorrect: boolean;
  confidence: number;
  aiGuess: string;
  points: number;
  reasoning: string;
  definition: string;
}

export interface PromptBattleData {
  targetImageUrl: string;
  keywords: string[];
}

export interface PromptBattleResult {
  userImageUrl: string;
  similarityScore: number;
  feedback: string;
}

export interface NegotiationResult {
    approved: boolean;
    pointsAwarded: number;
    reply: string;
}

export interface RoundMeta {
    title: string;
    description: string;
    example: {
        q: string;
        a: string;
    }
}
