
import React, { useState, useEffect } from 'react';
import { judgeAnswer } from '../../services/geminiService';
import { ImageTaskData, RoundType, RoundContext } from '../../types';
import { ROUND_META } from '../../constants';
import Button from '../Button';
import VoiceInput from '../VoiceInput';
import Timer from '../Timer';

interface Props {
  onComplete: (points: number, message: string, contentId: string | undefined, context: RoundContext) => void;
  taskPromise: Promise<ImageTaskData>;
  onRetry: () => void;
}

const ImageRound: React.FC<Props> = ({ onComplete, taskPromise, onRetry }) => {
  const [task, setTask] = useState<ImageTaskData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [guess, setGuess] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);
  const [error, setError] = useState('');
  const [hintUsed, setHintUsed] = useState(false);
  const [isOvertime, setIsOvertime] = useState(false);
  const [showDescription, setShowDescription] = useState(false);

  const meta = ROUND_META[RoundType.IMAGE_GUESS];

  useEffect(() => {
    setIsLoading(true);
    taskPromise
        .then(data => {
            setTask(data);
            setIsLoading(false);
        })
        .catch(err => {
            console.error(err);
            setError("Ошибка загрузки задания.");
            setIsLoading(false);
        });
  }, [taskPromise]);

  const completeRound = (points: number, message: string) => {
      if (!task) return;
      onComplete(points, message, task.targetWord, {
          userAnswer: guess,
          target: task.targetWord,
          isOvertime: isOvertime
      });
  };

  const handleSubmit = async () => {
    if (!task) return;
    setIsChecking(true);
    try {
      const result = await judgeAnswer(task.targetWord, guess);
      
      let points = result.score;
      let penaltyText = "";

      if (hintUsed && points > 0) {
          points = Math.max(0, points - 3);
          penaltyText += " (-3 за подсказку)";
      }
      
      if (isOvertime) {
          points = Math.floor(points / 2);
          penaltyText += " (/2 за время)";
      }

      if (points >= 3 || result.score >= 5) {
        completeRound(points, `Оценка ИИ: ${result.score}/10${penaltyText}.\n${result.feedback}\nПравильный ответ: "${task.targetWord}".`);
      } else {
        setShowAnswer(true);
      }
    } catch (e) {
      setError("Ошибка проверки.");
    } finally {
      setIsChecking(false);
    }
  };

  const handleGiveUp = () => {
     if(!task) return;
     completeRound(0, `Не повезло! На картинке было: "${task.targetWord}".`);
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={onRetry}>Попробовать снова</Button>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-blue-600 animate-pulse font-bold text-sm">Генерируем картину...</p>
      </div>
    );
  }

  if (isChecking) {
      return (
        <div className="flex flex-col items-center justify-center h-full space-y-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-blue-600 animate-pulse font-bold text-sm">Анализирую ответ...</p>
        </div>
      );
  }

  return (
    <div className="grid grid-cols-1 grid-rows-[auto_1fr_auto] md:grid-rows-[auto_1fr] md:grid-cols-[1fr_24rem] gap-4 h-full w-full">
      
      {/* Header Area: Row 1 (Mobile), Col 2 Row 1 (Desktop) */}
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
         
         {/* Hint Button */}
         {!showAnswer && !hintUsed && (
             <button 
                onClick={() => setHintUsed(true)} 
                className="w-full py-2 bg-amber-100 text-amber-800 rounded-lg text-sm font-bold border border-amber-200 hover:bg-amber-200 transition-colors mb-3 flex items-center justify-center gap-2"
             >
                 💡 Подсказка (-3 балла)
             </button>
         )}
         
         <Timer 
            duration={60} 
            isRunning={!showAnswer && !isChecking && !error} 
            onTimeUp={() => setIsOvertime(true)} 
         />
      </div>

      {/* Image Area: Row 2 (Mobile), Col 1 Row 1-2 (Desktop) */}
      <div className="flex-1 min-h-0 bg-gray-100 rounded-xl relative overflow-hidden flex items-center justify-center md:col-start-1 md:row-start-1 md:row-span-2 shadow-inner">
        <img 
          src={task.imageUrl} 
          alt="Puzzle" 
          className="max-w-full max-h-full object-contain rounded-lg shadow-sm"
        />
        {hintUsed && (
            <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur text-gray-800 p-3 rounded-xl text-sm text-center shadow-lg border border-gray-200 animate-fade-in z-10">
                <span className="font-bold block text-amber-600 text-xs uppercase mb-1">Подсказка</span>
                {task.hint}
            </div>
        )}
      </div>

      {/* Input Area: Row 3 (Mobile), Col 2 Row 2 (Desktop) */}
      <div className="w-full flex-shrink-0 md:col-start-2 md:row-start-2 md:self-end">
        {!showAnswer ? (
          <div className="space-y-3">
            <input
              type="text"
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              placeholder="Что это за фраза?"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base shadow-sm"
            />

            <div className="flex gap-2">
              <VoiceInput onTranscript={(text) => setGuess(prev => prev ? `${prev} ${text}` : text)} />
              <Button onClick={handleSubmit} className="flex-1" disabled={!guess.trim()}>
                Ответить {isOvertime && '(x0.5)'}
              </Button>
            </div>
            <div className="flex justify-center">
                 <Button variant="ghost" onClick={handleGiveUp} className="text-gray-400 px-3 text-xs">
                    Сдаться
                 </Button>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <h3 className="text-2xl font-bold text-red-500">Неверно</h3>
            <p className="text-sm text-gray-700">Правильный ответ: <span className="text-blue-600 font-bold">{task.targetWord}</span></p>
            <Button onClick={() => completeRound(0, `Мимо! Это было "${task.targetWord}".`)} className="w-full">
              Продолжить
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageRound;
