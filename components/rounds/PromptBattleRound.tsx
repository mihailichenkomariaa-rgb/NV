
import React, { useState, useEffect } from 'react';
import { evaluatePromptBattle } from '../../services/geminiService';
import { PromptBattleData, RoundType, RoundContext } from '../../types';
import { ROUND_META } from '../../constants';
import Button from '../Button';
import VoiceInput from '../VoiceInput';
import Timer from '../Timer';

interface Props {
  onComplete: (points: number, message: string, contentId: string | undefined, context: RoundContext) => void;
  taskPromise: Promise<PromptBattleData>;
  onRetry: () => void;
}

const PromptBattleRound: React.FC<Props> = ({ onComplete, taskPromise, onRetry }) => {
  const [task, setTask] = useState<PromptBattleData | null>(null);
  const [userPrompt, setUserPrompt] = useState('');
  const [step, setStep] = useState<'LOADING' | 'INPUT' | 'PROCESSING' | 'RESULT'>('LOADING');
  const [result, setResult] = useState<{score: number, feedback: string, userUrl: string} | null>(null);
  const [hintUsed, setHintUsed] = useState(false);
  const [isOvertime, setIsOvertime] = useState(false);
  const [showDescription, setShowDescription] = useState(false);

  const meta = ROUND_META[RoundType.PROMPT_BATTLE];

  useEffect(() => {
    setStep('LOADING');
    taskPromise.then(data => {
        setTask(data);
        setStep('INPUT');
    }).catch(console.error);
  }, [taskPromise]);

  const handleSubmit = async () => {
    if(!task || !userPrompt.trim()) return;
    setStep('PROCESSING');
    try {
        const evalResult = await evaluatePromptBattle(task.targetImageUrl, userPrompt);
        setResult({
            score: evalResult.similarityScore,
            feedback: evalResult.feedback,
            userUrl: evalResult.userImageUrl
        });
        setStep('RESULT');
    } catch (e) {
        onComplete(0, "Ошибка при оценке.", undefined, { userAnswer: userPrompt, target: "Image Battle", isOvertime });
    }
  };

  if (step === 'LOADING' || !task) {
    return (
        <div className="flex flex-col items-center justify-center h-full">
           <div className="animate-spin w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full mb-4"></div>
           <p className="text-amber-600 font-bold text-sm">ИИ генерирует загадку...</p>
           <div className="mt-8">
              <Button variant="ghost" className="text-xs text-gray-400" onClick={onRetry}>Долго грузится? Сбросить</Button>
           </div>
        </div>
    )
  }

  if (step === 'PROCESSING') {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center">
           <div className="animate-spin w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full mb-4"></div>
           <p className="text-amber-600 mb-2 font-bold">Анализирую промпт...</p>
           <p className="text-gray-500 text-xs">Рисую вашу картинку и сравниваю</p>
        </div>
    )
  }

  if (step === 'RESULT' && result && task) {
      let points = Math.max(0, Math.round(result.score / 10));
      let penaltyText = "";
      
      if (hintUsed && points > 0) {
          points = Math.max(0, points - 3);
          penaltyText += " (штраф -3)";
      }

      if (isOvertime) {
          points = Math.floor(points / 2);
          penaltyText += " (/2 время)";
      }

      return (
          <div className="space-y-4 text-center h-full flex flex-col pt-safe overflow-y-auto w-full max-w-4xl mx-auto">
              <div className="flex justify-center gap-4 flex-shrink-0 flex-wrap">
                  <div className="space-y-1">
                      <span className="text-[10px] uppercase text-gray-400 font-bold">Цель</span>
                      <img src={task.targetImageUrl} className="w-32 h-32 md:w-64 md:h-64 object-contain rounded-lg border border-gray-300 shadow-sm bg-gray-100" alt="Target" />
                  </div>
                  <div className="space-y-1">
                      <span className="text-[10px] uppercase text-gray-400 font-bold">Вы</span>
                      <img src={result.userUrl} className="w-32 h-32 md:w-64 md:h-64 object-contain rounded-lg border-2 border-amber-400 shadow-md bg-gray-100" alt="User" />
                  </div>
              </div>
              
              <div className="bg-white p-4 rounded-xl border border-gray-200 flex-1 overflow-y-auto max-w-2xl mx-auto w-full">
                  <div className="text-4xl font-black text-amber-500 mb-2">{result.score}%</div>
                  <p className="text-gray-600 italic text-base">"{result.feedback}"</p>
                  {isOvertime && <p className="text-red-500 text-xs mt-2 uppercase font-bold">Штраф за время (x0.5)</p>}
              </div>

              <div className="flex-shrink-0">
                  <Button onClick={() => onComplete(points, `Сходство ${result.score}%${penaltyText}.`, undefined, {
                      userAnswer: userPrompt,
                      target: "Target vs Generated Image",
                      isOvertime: isOvertime
                  })}>
                      Завершить ход
                  </Button>
              </div>
          </div>
      )
  }

  return (
    <div className="grid grid-cols-1 grid-rows-[auto_1fr_auto] md:grid-rows-[auto_1fr] md:grid-cols-[1fr_24rem] gap-4 h-full w-full">
       
      {/* Header Area */}
      <div className="w-full pb-2 flex flex-col flex-shrink-0 md:col-start-2 md:row-start-1">
         {/* Title Row */}
         <div className="flex items-center gap-2 mb-3">
             <h2 className="text-xl md:text-2xl font-black text-gray-900 uppercase tracking-tight leading-none">
                 {meta.title}
             </h2>
             <button 
                onClick={() => setShowDescription(!showDescription)}
                className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-xs font-bold hover:bg-gray-200"
             >
                ?
             </button>
         </div>

         {/* Description */}
         {showDescription && (
             <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-600 mb-3 animate-fade-in">
                 {meta.description}
             </div>
         )}
         
         {/* Hint Button Row */}
         {!hintUsed && (
             <button 
                onClick={() => setHintUsed(true)} 
                className="w-full py-2 bg-amber-100 text-amber-800 rounded-lg text-sm font-bold border border-amber-200 hover:bg-amber-200 transition-colors mb-3 flex items-center justify-center gap-2"
             >
                 💡 Подсказка (-3 балла)
             </button>
         )}
         
         <Timer 
            duration={60} 
            isRunning={step === 'INPUT'} 
            onTimeUp={() => setIsOvertime(true)} 
         />
      </div>

       {/* Target Image Area */}
       <div className="flex-1 min-h-0 bg-gray-100 p-2 rounded-lg relative shadow-inner flex items-center justify-center md:col-start-1 md:row-start-1 md:row-span-2">
         <img src={task.targetImageUrl} alt="Target" className="max-w-full max-h-full object-contain rounded-lg" />
         {hintUsed && (
            <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur text-gray-800 p-3 text-sm rounded-xl text-center border border-gray-200 z-10 shadow-sm">
                <span className="font-bold">Ключевые слова:</span> {task.keywords.join(', ')}
            </div>
         )}
       </div>
       
       {/* Input Area */}
       <div className="w-full space-y-3 flex-shrink-0 md:col-start-2 md:row-start-2 md:self-end">
            <textarea 
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                placeholder="Опишите картинку на английском (например, A cat in space)..."
                className="w-full h-32 md:h-48 bg-white border border-gray-200 rounded-lg p-3 text-gray-900 resize-none focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm text-sm"
            />
            
            <div className="flex gap-2">
                <VoiceInput onTranscript={(text) => setUserPrompt(prev => prev ? `${prev} ${text}` : text)} />
                <Button onClick={handleSubmit} disabled={!userPrompt.trim()} className="flex-1">
                    Сгенерировать {isOvertime && '(x0.5)'}
                </Button>
            </div>
       </div>
    </div>
  );
};

export default PromptBattleRound;
