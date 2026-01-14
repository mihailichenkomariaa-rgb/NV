
import { GoogleGenAI, Type } from "@google/genai";
import { ExplanationResult, ImageTaskData, SongTaskData, PromptBattleData, PromptBattleResult, Difficulty, RoundType, GameSettings, NegotiationResult } from "../types";

const getAIClient = () => {
  // Comprehensive check for keys in various environments (Vite, Next, Standard)
  let apiKey = '';
  
  if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
    apiKey = process.env.API_KEY;
  }

  if (!apiKey && typeof import.meta !== 'undefined' && (import.meta as any).env) {
      apiKey = (import.meta as any).env.VITE_API_KEY || (import.meta as any).env.NEXT_PUBLIC_API_KEY || (import.meta as any).env.API_KEY || '';
  }
  
  if (!apiKey && typeof process !== 'undefined' && process.env) {
      apiKey = process.env.VITE_API_KEY || process.env.REACT_APP_API_KEY || process.env.API_KEY || '';
  }

  if (!apiKey) {
    throw new Error("API Key is missing. Please ensure VITE_API_KEY is set in your Vercel Environment Variables.");
  }
  return new GoogleGenAI({ apiKey });
};

// Helper: Extract JSON from potentially chatty response
const cleanAndParseJSON = (text: string | undefined): any => {
    if (!text) return {};
    try {
        // 1. Try direct parse first (fastest)
        return JSON.parse(text);
    } catch (e) {
        // 2. Remove Markdown code blocks if present
        let clean = text.replace(/```json/g, '').replace(/```/g, '');
        
        // 3. Find the first '{' and last '}' to strip preamble/postscript
        const firstOpen = clean.indexOf('{');
        const lastClose = clean.lastIndexOf('}');
        
        if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
            clean = clean.substring(firstOpen, lastClose + 1);
            try {
                return JSON.parse(clean);
            } catch (e2) {
                console.error("Failed to parse extracted JSON block:", clean);
            }
        }
        
        console.error("Failed to parse JSON response completely:", text);
        return {};
    }
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
      
      ВЕРНИ ТОЛЬКО JSON. NO EXTRA TEXT.
      {
          "target": "Сама фраза/название",
          "visual_prompt": "Промпт для генерации картинки на английском. Опиши БУКВАЛЬНОЕ изображение метафоры. High quality, 8k render.",
          "hint": "Короткая текстовая подсказка (не называя ответ)"
      }
    `,
    config: {
      responseMimeType: "application/json",
    },
  });

  const brainData = cleanAndParseJSON(brainResponse.text);
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
      
      ЗАДАЧА №2: ПЕРЕПИСАТЬ ТЕКСТ (ТЕРМИНЫ ТЕМЫ + КАНЦЕЛЯРИТ)
      Перепиши припев песни, используя:
      1. ПРОФЕССИОНАЛЬНУЮ ЛЕКСИКУ из темы "${theme}".
      2. СТИЛЬ: "Полицейский протокол / Акт приемки / Научная статья".
      
      КРИТИЧЕСКИ ВАЖНО:
      - МАКСИМУМ 25 СЛОВ. Текст должен быть очень коротким!
      - Никаких рифм.
      - Максимально душно.
      
      ВЕРНИ ТОЛЬКО JSON. БЕЗ ВСТУПЛЕНИЙ.
      {
        "targetSong": "Исполнитель - Название",
        "rewrittenLyrics": "Текст (короткий, до 25 слов)",
        "hint": "Подсказка (не называя название)",
        "styleUsed": "Протокол в сеттинге ${theme}"
      }
    `,
    config: {
      responseMimeType: "application/json",
    },
  });

  const data = cleanAndParseJSON(response.text);
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
        
        Верни ТОЛЬКО слово/фразу. Без кавычек, без точек.
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
      
      ВЕРНИ ТОЛЬКО JSON.
      { 
          "isCorrect": boolean (угадал ли ты именно загаданное слово), 
          "aiGuess": string (твоя догадка), 
          "points": number (0-10, насколько хорошо объяснили), 
          "reasoning": string (почему ты так решил), 
          "definition": string (краткое определение секретного слова для справки) 
      }
    `,
    config: { responseMimeType: "application/json" },
  });

  const data = cleanAndParseJSON(response.text);
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
  
  const brainResponse = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `
        ТЕМА: "${themeString}".
        Придумай описание для картинки, которая ИДЕАЛЬНО отражает эту тему.
        Это должно быть что-то забавное, эпичное или странное, но СТРОГО В РАМКАХ ТЕМЫ.
        
        ВЕРНИ ТОЛЬКО JSON.
        { "prompt": "english visual prompt", "keywords": ["russian key object 1"] }
        Random seed: ${Math.random()}`,
    config: { responseMimeType: "application/json" }
  });
  
  const brainData = cleanAndParseJSON(brainResponse.text);
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
                { text: "Сравни изображения. Оцени визуальное сходство (0-100). Верни ТОЛЬКО JSON: { score: number, feedback: string }." }
            ]
        },
        config: { responseMimeType: "application/json" }
    });

    const result = cleanAndParseJSON(compareResponse.text);

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
            10 - Идеально.
            0-4 - Неверно.
            
            ВЕРНИ ТОЛЬКО JSON.
            { "score": number, "feedback": "Short comment" }
        `,
        config: {
            responseMimeType: "application/json",
        }
    });

    const result = cleanAndParseJSON(response.text);
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
            Ты - ИИ-Судья.
            Задание: "${target}".
            Ответ: "${userAnswer}".
            Аргумент: "${argument}".
            Макс. добавить: ${maxAddablePoints}.
            
            ВЕРНИ ТОЛЬКО JSON.
            { "approved": boolean, "pointsAwarded": number, "reply": "Short verdict" }
        `,
        config: { responseMimeType: "application/json" }
    });
    
    const result = cleanAndParseJSON(response.text);
    return {
        approved: result.approved || false,
        pointsAwarded: Math.min(result.pointsAwarded || 0, maxAddablePoints),
        reply: result.reply || "Решение окончательное."
    };
};
