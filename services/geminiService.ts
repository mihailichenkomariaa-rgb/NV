
import { ExplanationResult, ImageTaskData, SongTaskData, PromptBattleData, PromptBattleResult, RoundType, GameSettings, NegotiationResult } from "../types";

// Generic fetch wrapper for our Vercel API
const callApi = async (action: string, params: any) => {
    try {
        const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action, ...params }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.details || errorData.error || 'API Request Failed');
        }

        return await response.json();
    } catch (error) {
        console.error(`API Call (${action}) failed:`, error);
        throw error;
    }
};

// --- Dispatcher ---
export const generateTaskForRound = async (
  roundType: RoundType, 
  settings: GameSettings, 
  usedContent: string[]
): Promise<any> => {
    return callApi('generateTask', { roundType, settings, usedContent });
};

// --- Round 3: Explain to AI ---
// Note: This was handled inside generateTaskForRound in the backend for simplicity,
// but if called directly:
export const getSecretWord = async (age: number, difficulty: any, usedContent: string[], themes: string[]): Promise<string> => {
     // This logic is now part of 'generateTask' on the backend when roundType is EXPLAIN_TO_AI
     // But if we need a standalone call:
     return callApi('generateTask', { 
         roundType: 'EXPLAIN_TO_AI', 
         settings: { averageAge: age, difficulty, themes }, 
         usedContent 
     });
};

export const evaluateExplanation = async (targetWord: string, userExplanation: string): Promise<ExplanationResult> => {
    return callApi('evaluateExplanation', { targetWord, userExplanation });
};

// --- Round 4: Prompt Battle ---

export const evaluatePromptBattle = async (targetImageUrl: string, userPrompt: string): Promise<PromptBattleResult> => {
    return callApi('evaluatePromptBattle', { targetImageUrl, userPrompt });
};

// Judge Answer
export const judgeAnswer = async (correctAnswer: string, userAnswer: string): Promise<{ score: number, feedback: string }> => {
    return callApi('judgeAnswer', { correctAnswer, userAnswer });
};

// Negotiation
export const evaluateNegotiation = async (target: string, userAnswer: string, argument: string, maxAddablePoints: number): Promise<NegotiationResult> => {
    return callApi('evaluateNegotiation', { target, userAnswer, argument, maxAddablePoints });
};
