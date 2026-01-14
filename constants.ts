
import { RoundType, RoundMeta } from './types';

export const ROUND_ORDER_DEFAULT = [
  RoundType.IMAGE_GUESS,       // Раунд 1: Картинки
  RoundType.SCIENTIFIC_SONGS,  // Раунд 2: Песни (Бюрократия + Тематика)
  RoundType.EXPLAIN_TO_AI,     // Раунд 3: Объясни слово
  RoundType.PROMPT_BATTLE,     // Раунд 4: Битва промптов
  RoundType.IMAGE_GUESS        // Раунд 5: Финал с картинками
];

export const ROUND_DESCRIPTIONS: Record<RoundType, string> = {
  [RoundType.IMAGE_GUESS]: "Нейрогалерея: ИИ создает буквальное изображение фразы. Угадайте, что это?",
  [RoundType.SCIENTIFIC_SONGS]: "Нейроремикс: Популярный хит переписан канцелярским языком с использованием терминов вашей темы.",
  [RoundType.EXPLAIN_TO_AI]: "Тест Тьюринга: объясните секретное слово ИИ (голосом или текстом), не называя его.",
  [RoundType.PROMPT_BATTLE]: "Промпт-битва: вы видите картинку. Напишите промпт, чтобы сгенерировать похожую!",
};

export const ROUND_META: Record<RoundType, RoundMeta> = {
    [RoundType.IMAGE_GUESS]: {
        title: "Нейрогалерея",
        description: "ИИ нарисовал известную фразу или идиому буквально. Ваша задача — понять логику машины и угадать исходное выражение.",
        example: {
            q: "Человек сидит в луже посреди офиса",
            a: "Сесть в лужу"
        }
    },
    [RoundType.SCIENTIFIC_SONGS]: {
        title: "Нейроремикс",
        description: "Известный хит переписан языком протокола, используя термины текущей темы игры. Угадайте песню.",
        example: {
            q: "(Тема: Медицина) Субъект произвел отчуждение недвижимости ради 10^6 образцов Розоцветных...",
            a: "Миллион алых роз"
        }
    },
    [RoundType.EXPLAIN_TO_AI]: {
        title: "Тест Тьюринга",
        description: "Объясните слово нейросети так, чтобы она поняла. Запрещено использовать однокоренные слова.",
        example: {
            q: "Предмет для защиты от дождя над головой",
            a: "Зонт"
        }
    },
    [RoundType.PROMPT_BATTLE]: {
        title: "Промпт-битва",
        description: "Вы видите картинку. Опишите её словами (промптом) так точно, чтобы ИИ смог нарисовать её идеальную копию.",
        example: {
            q: "Кот в скафандре на Марсе",
            a: "Prompt: Cat astronaut on Mars"
        }
    }
};

// Colors updated for Light Mode (High contrast text, pastel backgrounds)
export const COLORS = [
  'text-blue-700 border-blue-200 bg-blue-50',
  'text-indigo-700 border-indigo-200 bg-indigo-50',
  'text-emerald-700 border-emerald-200 bg-emerald-50',
  'text-amber-700 border-amber-200 bg-amber-50',
  'text-rose-700 border-rose-200 bg-rose-50',
  'text-violet-700 border-violet-200 bg-violet-50',
];

export const COOL_TEAM_NAMES = [
  "Нейронные Сети", "Кибер-Котлеты", "Повелители Промптов", "Скайнет", "Ошибка 404",
  "Цифровые Кочевники", "Алгоритмический Сбой", "Кремниевые Долины", "ЧатЖПТшники",
  "Бит и Байт", "Квантовый Скачок", "Виртуальные Гении", "Матрица", "Ctrl+Alt+Del",
  "Сингулярность", "Глюк Системы", "Пиксельные Монстры", "Дата-Сатанисты"
];
