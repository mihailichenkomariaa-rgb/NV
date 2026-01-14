
const { GoogleGenAI, Type } = require("@google/genai");

// Helper: Clean JSON response
const cleanAndParseJSON = (text) => {
    if (!text) return {};
    try {
        return JSON.parse(text);
    } catch (e) {
        let clean = text.replace(/```json/g, '').replace(/```/g, '');
        const firstOpen = clean.indexOf('{');
        const lastClose = clean.lastIndexOf('}');
        if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
            clean = clean.substring(firstOpen, lastClose + 1);
            try {
                return JSON.parse(clean);
            } catch (e2) {
                console.error("JSON Parse failed", clean);
            }
        }
        return {};
    }
};

module.exports = async (req, res) => {
    // 1. Setup Client with Server-Side Key
    const apiKey = process.env.API_KEY || process.env.VITE_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: "Server misconfiguration: API_KEY missing" });
    }
    const ai = new GoogleGenAI({ apiKey });

    // 2. Parse Request
    const { action, ...params } = req.body || {};

    try {
        let result;

        switch (action) {
            case 'generateTask':
                result = await handleGenerateTask(ai, params);
                break;
            case 'evaluateExplanation':
                result = await handleEvaluateExplanation(ai, params);
                break;
            case 'evaluatePromptBattle':
                result = await handleEvaluatePromptBattle(ai, params);
                break;
            case 'judgeAnswer':
                result = await handleJudgeAnswer(ai, params);
                break;
            case 'evaluateNegotiation':
                result = await handleEvaluateNegotiation(ai, params);
                break;
            default:
                return res.status(400).json({ error: "Unknown action" });
        }

        res.status(200).json(result);

    } catch (error) {
        console.error("Gemini API Error:", error);
        res.status(500).json({ error: "AI Generation Failed", details: error.message });
    }
};

// --- HANDLERS ---

async function handleGenerateTask(ai, { roundType, settings, usedContent }) {
    const { averageAge: age, difficulty, themes } = settings;
    
    // IMAGE_GUESS logic
    if (roundType === 'IMAGE_GUESS') {
        const context = getContextPrompt(age, difficulty, usedContent, themes);
        
        const brainResponse = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `
                ${context}
                ЗАДАЧА: Придумай идиому, пословицу, название фильма или мем, которые ЖЕЛЕЗНО относятся к теме "${themes.join(", ")}".
                ВЕРНИ ТОЛЬКО JSON.
                {
                    "target": "Сама фраза/название",
                    "visual_prompt": "Промпт для генерации картинки на английском. Опиши БУКВАЛЬНОЕ изображение метафоры. High quality, 8k render.",
                    "hint": "Короткая текстовая подсказка"
                }
            `,
            config: { responseMimeType: "application/json" }
        });
        const brainData = cleanAndParseJSON(brainResponse.text);

        const imageResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: brainData.visual_prompt || "Error" }] },
            config: { imageConfig: { aspectRatio: '1:1' } }
        });

        let base64Data;
        if (imageResponse.candidates?.[0]?.content?.parts) {
            for (const part of imageResponse.candidates[0].content.parts) {
                if (part.inlineData) {
                    base64Data = part.inlineData.data;
                    break;
                }
            }
        }
        
        return {
            imageUrl: base64Data ? `data:image/png;base64,${base64Data}` : "",
            targetWord: brainData.target || "Ошибка",
            hint: brainData.hint || ""
        };
    }

    // SCIENTIFIC_SONGS logic
    if (roundType === 'SCIENTIFIC_SONGS') {
        const theme = themes.length > 0 ? themes[Math.floor(Math.random() * themes.length)] : "Бюрократия";
        const exclusion = usedContent.length > 0 ? `ЗАПРЕЩЕНО ИСПОЛЬЗОВАТЬ: ${usedContent.join(", ")}.` : "";
        
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `
                РОЛЬ: Душный бюрократ, фанат темы "${theme}".
                ${exclusion}
                Seed: ${Math.random()}
                ЗАДАЧА: Перепиши припев СУПЕР-ХИТА используя термины темы "${theme}" и канцелярит.
                МАКСИМУМ 25 СЛОВ. Без рифм.
                ВЕРНИ ТОЛЬКО JSON.
                {
                    "targetSong": "Исполнитель - Название",
                    "rewrittenLyrics": "Текст (до 25 слов)",
                    "hint": "Подсказка",
                    "styleUsed": "Протокол в сеттинге ${theme}"
                }
            `,
            config: { responseMimeType: "application/json" }
        });
        const data = cleanAndParseJSON(response.text);
        return {
            targetSong: data.targetSong || "Ошибка",
            rewrittenLyrics: data.rewrittenLyrics || "Ошибка",
            hint: data.hint || "",
            style: theme
        };
    }

    // EXPLAIN_TO_AI logic
    if (roundType === 'EXPLAIN_TO_AI') {
        const context = getContextPrompt(age, difficulty, usedContent, themes);
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `
                ${context}
                ЗАДАЧА: Назови одно слово или короткую фразу (существительное), ключевое для темы "${themes.join(", ")}".
                Верни ТОЛЬКО слово/фразу. Без кавычек.
            `
        });
        return response.text?.trim() || "Ошибка";
    }

    // PROMPT_BATTLE logic
    if (roundType === 'PROMPT_BATTLE') {
        const themeString = themes.join(", ");
        const brainResponse = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `
                ТЕМА: "${themeString}". Придумай описание картинки.
                ВЕРНИ ТОЛЬКО JSON.
                { "prompt": "english visual prompt", "keywords": ["russian key object"] }
                Seed: ${Math.random()}
            `,
            config: { responseMimeType: "application/json" }
        });
        const brainData = cleanAndParseJSON(brainResponse.text);

        const imageResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: brainData.prompt || "Error" }] },
            config: { imageConfig: { aspectRatio: '1:1' } }
        });
        
        let base64Data;
        if (imageResponse.candidates?.[0]?.content?.parts) {
            for (const part of imageResponse.candidates[0].content.parts) {
                if (part.inlineData) base64Data = part.inlineData.data;
            }
        }

        return {
            targetImageUrl: base64Data ? `data:image/png;base64,${base64Data}` : "",
            keywords: brainData.keywords || []
        };
    }
}

async function handleEvaluateExplanation(ai, { targetWord, userExplanation }) {
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `
            Секретное слово: "${targetWord}".
            Объяснение: "${userExplanation}".
            Попробуй угадать слово по объяснению.
            ВЕРНИ ТОЛЬКО JSON.
            { 
                "isCorrect": boolean, 
                "aiGuess": string, 
                "points": number (0-10), 
                "reasoning": string, 
                "definition": string 
            }
        `,
        config: { responseMimeType: "application/json" }
    });
    return cleanAndParseJSON(response.text);
}

async function handleEvaluatePromptBattle(ai, { targetImageUrl, userPrompt }) {
    // 1. Generate User Image
    const imageResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: userPrompt }] },
        config: { imageConfig: { aspectRatio: '1:1' } }
    });
    
    let userBase64;
    if (imageResponse.candidates?.[0]?.content?.parts) {
        for (const part of imageResponse.candidates[0].content.parts) {
            if (part.inlineData) userBase64 = part.inlineData.data;
        }
    }
    
    if (!userBase64) throw new Error("Failed to generate user image");
    const userImageUrl = `data:image/png;base64,${userBase64}`;

    // 2. Compare
    const targetBase64 = targetImageUrl.split(',')[1];
    const compareResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
            parts: [
                { inlineData: { mimeType: 'image/png', data: targetBase64 } },
                { inlineData: { mimeType: 'image/png', data: userBase64 } },
                { text: "Сравни изображения (0-100). ВЕРНИ JSON: { score: number, feedback: string }" }
            ]
        },
        config: { responseMimeType: "application/json" }
    });
    
    const result = cleanAndParseJSON(compareResponse.text);
    return {
        userImageUrl,
        similarityScore: result.score || 0,
        feedback: result.feedback || "..."
    };
}

async function handleJudgeAnswer(ai, { correctAnswer, userAnswer }) {
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `
            Ответ: "${correctAnswer}". Игрок: "${userAnswer}".
            Оцени 0-10.
            ВЕРНИ ТОЛЬКО JSON: { "score": number, "feedback": "string" }
        `,
        config: { responseMimeType: "application/json" }
    });
    return cleanAndParseJSON(response.text);
}

async function handleEvaluateNegotiation(ai, { target, userAnswer, argument, maxAddablePoints }) {
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `
            Судья. Вопрос: "${target}". Ответ: "${userAnswer}".
            Аргумент: "${argument}". Макс баллов: ${maxAddablePoints}.
            ВЕРНИ ТОЛЬКО JSON: { "approved": boolean, "pointsAwarded": number, "reply": "string" }
        `,
        config: { responseMimeType: "application/json" }
    });
    return cleanAndParseJSON(response.text);
}

// --- SHARED HELPERS ---

const getContextPrompt = (age, difficulty, usedContent, themes) => {
  let diffPrompt = difficulty === 'EASY' ? "СЛОЖНОСТЬ: ЛЕГКАЯ. Только хиты." 
                 : difficulty === 'HARD' ? "СЛОЖНОСТЬ: ВЫСОКАЯ. Редкие факты." 
                 : "СЛОЖНОСТЬ: СРЕДНЯЯ.";

  const exclusion = usedContent.length > 0 ? `ЗАПРЕЩЕНО: ${usedContent.join(", ")}.` : "";
  const themeString = themes.length > 0 ? themes.join(", ") : "Общая эрудиция";
  
  return `
    Аудитория: ${age} лет.
    ${diffPrompt}
    ТЕКУЩАЯ ТЕМА: "${themeString}".
    ${exclusion}
    Seed: ${Math.random().toString(36)}
  `;
};
