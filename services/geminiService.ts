
import { ExplanationResult, PromptBattleResult, RoundType, GameSettings, NegotiationResult } from "../types";

// Helper to bridge to the backend serverless function
// This hides the API Key because the request goes to YOUR server (/api/gemini), 
// and your server talks to Google using the key stored in env variables.
const apiCall = async (action: string, params: any) => {
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
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("API Call Failed:", error);
    throw error;
  }
};

// --- Dispatcher (Now just calls the backend) ---
export const generateTaskForRound = async (
  roundType: RoundType, 
  settings: GameSettings, 
  usedContent: string[]
): Promise<any> => {
  return apiCall('generateTask', { roundType, settings, usedContent });
};

// --- Evaluations (Now managed by backend) ---

export const evaluateExplanation = async (targetWord: string, userExplanation: string): Promise<ExplanationResult> => {
  return apiCall('evaluateExplanation', { targetWord, userExplanation });
};

export const evaluatePromptBattle = async (targetImageUrl: string, userPrompt: string): Promise<PromptBattleResult> => {
    return apiCall('evaluatePromptBattle', { targetImageUrl, userPrompt });
}

export const judgeAnswer = async (correctAnswer: string, userAnswer: string): Promise<{ score: number, feedback: string }> => {
    return apiCall('judgeAnswer', { correctAnswer, userAnswer });
}

export const evaluateNegotiation = async (target: string, userAnswer: string, argument: string, maxAddablePoints: number): Promise<NegotiationResult> => {
    return apiCall('evaluateNegotiation', { target, userAnswer, argument, maxAddablePoints });
};
