
import React, { useState, useEffect } from 'react';
import { evaluateExplanation } from '../../services/geminiService';
import { RoundType, RoundContext } from '../../types';
import { ROUND_META } from '../../constants';
import Button from '../Button';
import VoiceInput from '../VoiceInput';
import Timer from '../Timer';

interface Props {
  onComplete: (points: number, message: string, contentId: string | undefined, context: RoundContext) => void;
  taskPromise: Promise<string>; 
  onRetry: () => void;
}

const ExplainRound: React.FC<Props> = ({ onComplete, taskPromise, onRetry }) => {
  const [secretWord, setSecretWord] = useState('');
  const [explanation, setExplanation] = useState('');
  const [step, setStep] = useState<'EXPLAIN' | 'JUDGING'>('EXPLAIN');
  const [isLoading, setIsLoading] = useState(true);
  const [isOvertime, setIsOvertime] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const [error, setError] = useState('');
  
  const meta = ROUND_META[RoundType.EXPLAIN_TO_AI];

  useEffect(() => {
    setIsLoading(true);
    taskPromise.then(w => {
        setSecretWord(w);
        setIsLoading(false);
    }).catch(e => {
        console.error(e);
        setError("Ошибка загрузки задания.");
        setIsLoading(false);
    });
  }, [taskPromise]);

  const handleSubmit = async () => {
    if (!explanation.trim()) return;
    setStep('JUDGING');
    setIsLoading(true);
    try {
      const result = await evaluateExplanation(secretWord, explanation);
      setIsLoading(false);
      
      let finalPoints = result.points;
      let penaltyText = "";

      if (isOvertime) {
          finalPoints = Math.floor(finalPoints / 2);
          penaltyText = " (/2 за время)";
      }

      const message = result.isCorrect 
        ? `Успех! (${secretWord}) Gemini угадал: "${result.aiGuess}"${penaltyText}.\n\nЗначение: ${result.definition}`
        : `Провал! (${secretWord}) Gemini подумал, что это "${result.aiGuess}".\n\nЗначение: ${result.definition}`;
      
      onComplete(finalPoints, message, undefined, {
          userAnswer: explanation,
          target: secretWord,
          isOvertime: isOvertime
      });

    } catch (e) {
      setIsLoading(false);
      onComplete(0, "Ошибка связи с Gemini.", undefined, { userAnswer: explanation, target: secretWord, isOvertime });
    }
  };

  if (error) {
      return (
        <div className="text-center p-8">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={onRetry}>Попробовать снова</Button>
        </div>
      );
  }

  if (isLoading && step === 'EXPLAIN') {
    return (
      <div className="text-center p-12">
        <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-emerald-700 font-bold">Выбираю слово...</p>
      </div>
    );
  }

  if (step === 'JUDGING') {
     return (
        <div className="flex flex-col items-center justify-center h-full space-y-6">
            <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <h2 className="text-2xl font-bold text-gray-900">Анализирую ответ...</h2>
            <p className="text-gray-500 text-center max-w-md text-sm">Ваше объяснение: "{explanation}"</p>
        </div>
     )
  }

  return (
    <div className="grid grid-cols-1 grid-rows-[auto_1fr_auto] md:grid-rows-[auto_1fr] md:grid-cols-[1fr_24rem] gap-4 h-full w-full">
      
      {/* Header Area */}
      <div className="w-full pb-2 flex flex-col flex-shrink-0 md:col-start-2 md:row-start-1">
         <div className="flex items-center gap-2 mb-3">
             <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight leading-none">
                 {meta.title}
             </h2>
             <button 
                onClick={() => setShowDescription(!showDescription)}
                className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-xs font-bold hover:bg-gray-200"
             >
                ?
             </button>
         </div>

         {showDescription && (
             <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-600 mb-3 animate-fade-in">
                 {meta.description}
             </div>
         )}
         
         <Timer 
            duration={60} 
            isRunning={step === 'EXPLAIN'} 
            onTimeUp={() => setIsOvertime(true)} 
         />
      </div>

      {/* Secret Word Display */}
      <div className="flex-1 flex flex-col items-center justify-center bg-emerald-50 p-6 rounded-2xl border border-emerald-100 relative overflow-hidden md:col-start-1 md:row-start-1 md:row-span-2">
         <span className="text-emerald-600 text-xs uppercase tracking-widest mb-2 font-bold">Ваша цель</span>
         <span className="font-black text-4xl md:text-6xl text-gray-900 text-center break-words max-w-full">{secretWord}</span>
         <p className="text-emerald-800/50 text-sm mt-4 text-center max-w-xs">Объясните это слово, не используя однокоренных.</p>
      </div>

      {/* Input Area */}
      <div className="space-y-3 flex-shrink-0 md:col-start-2 md:row-start-2 md:self-end">
        <textarea
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            placeholder="Объясните слово, не называя его..."
            className="w-full h-32 md:h-48 bg-white border border-gray-200 rounded-xl p-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-base resize-none shadow-inner"
        />
        
        <div className="flex gap-2">
            <VoiceInput onTranscript={(text) => setExplanation(prev => prev ? `${prev} ${text}` : text)} />
            <Button onClick={handleSubmit} className="flex-1" disabled={!explanation.trim()}>
                Отправить {isOvertime && '(x0.5)'}
            </Button>
        </div>
      </div>
    </div>
  );
};

export default ExplainRound;
