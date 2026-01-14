
import { GoogleGenAI, Type } from "@google/genai";
import { ExplanationResult, ImageTaskData, SongTaskData, PromptBattleData, PromptBattleResult, Difficulty, RoundType, GameSettings, NegotiationResult } from "../types";

const getAIClient = () => {
  // Try to get key from Vite env (standard) or process.env (legacy/fallback)
  // @ts-ignore
  const apiKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_KEY) || process.env.API_KEY;

  if (!apiKey) {
    throw new Error("API Key is missing. Please set VITE_API_KEY in Vercel settings.");
  }
  return new GoogleGenAI({ apiKey });
};

// --- UNIVERSAL THEME ENFORCEMENT ---
const getContextPrompt = (age: number, difficulty: Difficulty, usedContent: string[], themes: string[]) => {
  let diffPrompt = "";
  if (difficulty === Difficulty.EASY) {
      diffPrompt = "СЛОЖНОСТЬ: ЛЕГКАЯ. Используй только самые известные, попсовые, очевидные ассоциации. То, что знает каждый ребенок.";
  }
  if (difficulty === Difficulty.MEDIUM) {
      diffPrompt = "СЛОЖНОСТЬ: СРЕДНЯЯ. Баланс между общеизвестным и немного специфичным.";
  }
  if (difficulty === Difficulty.HARD) {
      diffPrompt = "СЛОЖНОСТЬ: ВЫСОКАЯ. Используй редкие факты, глубокий лор, сложные метафоры.";
  }

  const exclusion = usedContent.length > 0 ? `ЗАПРЕЩЕНО ИСПОЛЬЗОВАТЬ (уже было в этой игре): ${usedContent.join(", ")}.` : "";
  
  const themeString = themes.length > 0 ? themes.join(", ") : "Общая эрудиция";
  
  // Logic to force Gemini to stick to ANY theme provided
  const themeEnforcement = `
    🛡️ PROTOCOL: STRICT THEME ADHERENCE
    ТЕКУЩАЯ ТЕМА ИГРЫ: "${themeString}".
    
    Ты ОБЯЗАН генерировать контент, опираясь на эту тему.
  `;

  const randomFactor = `Random seed: ${Math.random().toString(36).substring(7)}`;

  return `
    Целевая аудитория: Русскоязычные игроки, возраст ${age} лет.
    ${diffPrompt}
    ${themeEnforcement}
    ${exclusion}
    ${randomFactor}
  `;
};

// --- Dispatcher ---
export const generateTaskForRound = async (
  roundType: RoundType, 
  settings: GameSettings, 
  usedContent: string[]
): Promise<any> => {
  switch (roundType) {
    case RoundType.IMAGE_GUESS:
      return generateImageTask(settings.averageAge, settings.difficulty, usedContent, settings.themes);
    case RoundType.SCIENTIFIC_SONGS:
      return generateSongTask(settings.averageAge, settings.difficulty, usedContent, settings.themes);
    case RoundType.EXPLAIN_TO_AI:
      return getSecretWord(settings.averageAge, settings.difficulty, usedContent, settings.themes);
    case RoundType.PROMPT_BATTLE:
      return generatePromptBattleTask(settings.averageAge, settings.difficulty, settings.themes);
    default:
      throw new Error("Unknown round type");
  }
};

// --- Round 1: Image Generation ---

export const generateImageTask = async (age: number, difficulty: Difficulty, usedContent: string[], themes: string[]): Promise<ImageTaskData> => {
  const ai = getAIClient();
  const context = getContextPrompt(age, difficulty, usedContent, themes);

  const stylePrompt = difficulty === Difficulty.HARD 
    ? "Сделай изображение СЮРРЕАЛИСТИЧНЫМ, но чтобы ключевые элементы темы были узнаваемы." 
    : "Сделай изображение БУКВАЛЬНОЙ иллюстрацией фразы. Яркое, четкое, без текста.";

  // Step 1: Brainstorm a phrase fitting the theme
  const brainResponse = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `
      ${context}
      ЗАДАЧА:
      Придумай идиому, пословицу, название фильма, цитату или мем, которые ЖЕЛЕЗНО относятся к теме "${themes.join(", ")}".
      
      Примеры логики:
      - Тема "Гарри Поттер" -> "Мальчик, который выжил" (ОК), "Сесть в лужу" (НЕТ, это общее).
      - Тема "Еда" -> "Каша в голове" (ОК), "Голодные игры" (НЕТ, это кино).
      - Тема "IT" -> "Синий экран смерти" (ОК).
      
      Верни JSON:
      {
          "target": "Сама фраза/название",
          "visual_prompt": "Промпт для генерации картинки на английском. Опиши БУКВАЛЬНОЕ изображение метафоры. High quality, 8k render.",
          "hint": "Короткая текстовая подсказка (не называя ответ)"
      }
    `,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          target: { type: Type.STRING },
          visual_prompt: { type: Type.STRING },
          hint: { type: Type.STRING },
        },
      },
    },
  });

  const brainData = JSON.parse(brainResponse.text || "{}");
  const target = brainData.target || "Ошибка генерации";
  const prompt = brainData.visual_prompt || "Error prompt";
  const hint = brainData.hint || "Подсказка недоступна";

  // Step 2: Generate Image
  const imageResponse = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts: [{ text: prompt }] },
    config: { imageConfig: { aspectRatio: '1:1' } }
  });

  let base64Data: string | undefined;
  if (imageResponse.candidates?.[0]?.content?.parts) {
      for (const part of imageResponse.candidates[0].content.parts) {
          if (part.inlineData) {
              base64Data = part.inlineData.data;
              break;
          }
      }
  }

  if (!base64Data) throw new Error("Failed to generate image");

  return {
    imageUrl: `data:image/png;base64,${base64Data}`,
    targetWord: target,
    hint: hint
  };
};

// --- Round 2: Scientific Songs (Bureaucratic Remix) ---

export const generateSongTask = async (age: number, difficulty: Difficulty, usedContent: string[], themes: string[]): Promise<SongTaskData> => {
  const ai = getAIClient();
  // Select a random theme from the active themes to color the bureaucracy
  const theme = themes.length > 0 ? themes[Math.floor(Math.random() * themes.length)] : "Бюрократия";
  const exclusion = usedContent.length > 0 ? `ЗАПРЕЩЕНО ИСПОЛЬЗОВАТЬ: ${usedContent.join(", ")}.` : "";
  const randomFactor = `Seed: ${Math.random()}`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `
      РОЛЬ: Душный бюрократ, который фанатеет от темы "${theme}".
      ${exclusion}
      ${randomFactor}
      
      ЗАДАЧА №1: ВЫБОР ПЕСНИ (ОБЩЕИЗВЕСТНАЯ)
      Выбери СУПЕР-ПОПУЛЯРНЫЙ русскоязычный хит (попса, рок, детская, народная).
      ВАЖНО: Песня НЕ обязательно должна быть по теме "${theme}". Бери "Миллион алых роз", "Батарейка", "Рюмка водки", "В лесу родилась елочка".

      ЗАДАЧА №2: ПЕРЕПИСАТЬ ТЕКСТ (ТЕРМИНЫ ТЕМЫ + КАНЦЕЛЯРИТ)
      Перепиши припев песни, используя:
      1. ПРОФЕССИОНАЛЬНУЮ ЛЕКСИКУ из темы "${theme}".
      2. СТИЛЬ: "Полицейский протокол / Акт приемки / Научная статья".
      
      ПРИМЕРЫ:
      - Тема "Медицина" + Песня "Миллион алых роз".
        Результат: "Субъект произвел отчуждение недвижимости с целью закупки 10^6 биологических образцов семейства Розовые..."
      - Тема "IT" + Песня "В лесу родилась елочка".
        Результат: "В корневой директории 'Лес' был инициализирован объект 'Хвойное'. Процесс роста в зимний период выполнен корректно."
      - Тема "Гарри Поттер" + Песня "Я свободен".
        Результат: "Узник Азкабана получил официальное помилование Министерства Магии и забыл заклинание страха..."
      
      КРИТИЧЕСКИ ВАЖНО:
      - МАКСИМУМ 25 СЛОВ. Текст должен быть очень коротким!
      - Никаких рифм.
      - Максимально душно.

      ВЕРНИ JSON:
      {
        "targetSong": "Исполнитель - Название",
        "rewrittenLyrics": "Текст (короткий, до 25 слов)",
        "hint": "Подсказка (не называя название)",
        "styleUsed": "Протокол в сеттинге ${theme}"
      }
    `,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          targetSong: { type: Type.STRING },
          rewrittenLyrics: { type: Type.STRING },
          hint: { type: Type.STRING },
          styleUsed: { type: Type.STRING },
        },
      },
    },
  });

  const data = JSON.parse(response.text || "{}");
  return {
    targetSong: data.targetSong || "Неизвестная песня",
    rewrittenLyrics: data.rewrittenLyrics || "Данные засекречены.",
    hint: data.hint || "Нет подсказки",
    style: theme
  };
};

// --- Round 3: Explain to AI ---

export const getSecretWord = async (age: number, difficulty: Difficulty, usedContent: string[], themes: string[]): Promise<string> => {
  const ai = getAIClient();
  const context = getContextPrompt(age, difficulty, usedContent, themes);
  
  const typePrompt = difficulty === Difficulty.HARD 
    ? "Выбери СЛОЖНЫЙ, но узнаваемый термин/артефакт/явление из этой темы." 
    : "Выбери САМЫЙ ИЗВЕСТНЫЙ предмет или персонажа из этой темы.";

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `
        ${context}
        ЗАДАЧА: Назови одно слово или короткую фразу (существительное), которое игроки должны будут тебе объяснить.
        Слово должно быть КЛЮЧЕВЫМ для темы "${themes.join(", ")}".
        
        Пример: Тема "Гарри Поттер" -> "Волшебная палочка" (или "Снич", "Метла"). Не "Стол".
        ${typePrompt}
        
        Верни ТОЛЬКО слово/фразу. Без кавычек.
    `,
  });
  return response.text?.trim() || "Ошибка";
};

export const evaluateExplanation = async (targetWord: string, userExplanation: string): Promise<ExplanationResult> => {
  const ai = getAIClient();
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `
      Секретное слово: "${targetWord}".
      Объяснение пользователя: "${userExplanation}".
      
      Твоя задача: Попытаться угадать слово ТОЛЬКО по объяснению пользователя.
      НЕ подглядывай в секретное слово, будь честным игроком.
      Если объяснение плохое или неточное, назови другое слово, которое подходит под описание.
      
      Верни JSON: 
      { 
          "isCorrect": boolean (угадал ли ты именно загаданное слово), 
          "aiGuess": string (твоя догадка), 
          "points": number (0-10, насколько хорошо объяснили), 
          "reasoning": string (почему ты так решил), 
          "definition": string (краткое определение секретного слова для справки) 
      }.
    `,
    config: { responseMimeType: "application/json" },
  });

  const data = JSON.parse(response.text || "{}");
  return {
    isCorrect: data.isCorrect ?? false,
    aiGuess: data.aiGuess || "Не понял",
    points: data.points ?? 0,
    reasoning: data.reasoning || "",
    confidence: data.confidence ?? 0,
    definition: data.definition || "Определение отсутствует"
  };
};

// --- Round 4: Prompt Battle ---

export const generatePromptBattleTask = async (age: number, difficulty: Difficulty, themes: string[]): Promise<PromptBattleData> => {
  const ai = getAIClient();
  const themeString = themes.join(", ");
  
  // 1. Brainstorm visual concept strictly within theme
  const brainResponse = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `
        ТЕМА: "${themeString}".
        Придумай описание для картинки, которая ИДЕАЛЬНО отражает эту тему.
        Это должно быть что-то забавное, эпичное или странное, но СТРОГО В РАМКАХ ТЕМЫ.
        
        Пример ГП: "Волдеморт танцует диско в Хогвартсе".
        Пример Космос: "Кот в скафандре играет на гитаре на Луне".
        
        Верни JSON: { prompt: string (english visual prompt), keywords: string[] (russian key objects) }
        Random seed: ${Math.random()}`,
    config: { responseMimeType: "application/json" }
  });
  
  const brainData = JSON.parse(brainResponse.text || "{}");
  const prompt = brainData.prompt || "A futuristic cyberpunk cat in neon city";
  const keywords = brainData.keywords || ["Киберпанк", "Неон"];

  // 2. Generate Target Image
  const imageResponse = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts: [{ text: prompt }] },
    config: { imageConfig: { aspectRatio: '1:1' } }
  });

  let base64Data: string | undefined;
  if (imageResponse.candidates?.[0]?.content?.parts) {
      for (const part of imageResponse.candidates[0].content.parts) {
          if (part.inlineData) {
              base64Data = part.inlineData.data;
              break;
          }
      }
  }

  if (!base64Data) throw new Error("Failed to generate battle image");

  return {
    targetImageUrl: `data:image/png;base64,${base64Data}`,
    keywords: keywords
  };
}

export const evaluatePromptBattle = async (targetImageUrl: string, userPrompt: string): Promise<PromptBattleResult> => {
    const ai = getAIClient();

    // 1. Generate User Image
    const imageResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: userPrompt }] },
        config: { imageConfig: { aspectRatio: '1:1' } }
    });

    let userBase64: string | undefined;
    if (imageResponse.candidates?.[0]?.content?.parts) {
        for (const part of imageResponse.candidates[0].content.parts) {
            if (part.inlineData) {
                userBase64 = part.inlineData.data;
                break;
            }
        }
    }
    if (!userBase64) throw new Error("Failed to generate your image");
    const userImageUrl = `data:image/png;base64,${userBase64}`;

    // 2. Compare Images
    const targetBase64 = targetImageUrl.split(',')[1];
    
    const compareResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
            parts: [
                { inlineData: { mimeType: 'image/png', data: targetBase64 } },
                { inlineData: { mimeType: 'image/png', data: userBase64 } },
                { text: "Сравни изображения. Оцени визуальное сходство (0-100). Насколько пользователь смог воспроизвести сюжет оригинала своим промптом? Верни JSON: { score: number, feedback: string }." }
            ]
        },
        config: { responseMimeType: "application/json" }
    });

    const result = JSON.parse(compareResponse.text || "{}");

    return {
        userImageUrl,
        similarityScore: result.score || 0,
        feedback: result.feedback || "Сравнение не удалось."
    };
}

// Judge Answer
export const judgeAnswer = async (correctAnswer: string, userAnswer: string): Promise<{ score: number, feedback: string }> => {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `
            Задание/Правильный ответ: "${correctAnswer}".
            Ответ пользователя: "${userAnswer}".
            
            Оцени точность по шкале 0-10.
            Учитывай опечатки, синонимы и смысловое сходство.
            10 - Идеально.
            8-9 - Почти идеально (мелкая опечатка).
            5-7 - Смысл передан верно, но другими словами.
            0-4 - Неверно.
            
            Верни JSON: { score: number, feedback: string }
        `,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    score: { type: Type.NUMBER },
                    feedback: { type: Type.STRING }
                }
            }
        }
    });

    const result = JSON.parse(response.text || "{}");
    return {
        score: result.score || 0,
        feedback: result.feedback || "..."
    };
}

// Negotiation
export const evaluateNegotiation = async (target: string, userAnswer: string, argument: string, maxAddablePoints: number): Promise<NegotiationResult> => {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `
            Ты - ИИ-Судья в игре.
            Задание было: "${target}".
            Игрок ответил: "${userAnswer}".
            Ему не засчитали (или дали мало баллов).
            
            Его аргумент: "${argument}".
            Макс. можно добавить баллов: ${maxAddablePoints}.
            
            Если аргумент смешной, дерзкий или логичный (даже если ответ технически неверный, но креативный) — дай баллы.
            Если игрок просто ноет — не давай.
            
            Верни JSON: { approved: boolean, pointsAwarded: number, reply: string (короткий едкий или похвальный ответ) }
        `,
        config: { responseMimeType: "application/json" }
    });
    
    const result = JSON.parse(response.text || "{}");
    return {
        approved: result.approved || false,
        pointsAwarded: Math.min(result.pointsAwarded || 0, maxAddablePoints),
        reply: result.reply || "Решение окончательное."
    };
};
