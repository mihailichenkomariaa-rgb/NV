
import React, { useState, useEffect } from 'react';
import { judgeAnswer } from '../../services/geminiService';
import { SongTaskData, RoundType, RoundContext } from '../../types';
import { ROUND_META } from '../../constants';
import Button from '../Button';
import VoiceInput from '../VoiceInput';
import Timer from '../Timer';

interface Props {
  onComplete: (points: number, message: string, contentId: string | undefined, context: RoundContext) => void;
  taskPromise: Promise<SongTaskData>;
  onRetry: () => void;
}

const SongRound: React.FC<Props> = ({ onComplete, taskPromise, onRetry }) => {
  const [task, setTask] = useState<SongTaskData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [guess, setGuess] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const [isOvertime, setIsOvertime] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const [error, setError] = useState('');

  const meta = ROUND_META[RoundType.SCIENTIFIC_SONGS];

  useEffect(() => {
    setIsLoading(true);
    taskPromise.then(data => {
        setTask(data);
        setIsLoading(false);
    }).catch(e => {
        console.error(e);
        setError("Ошибка загрузки задания.");
        setIsLoading(false);
    });
  }, [taskPromise]);

  const completeRound = (points: number, message: string) => {
      if (!task) return;
      onComplete(points, message, task.targetSong, {
          userAnswer: guess,
          target: task.targetSong,
          isOvertime: isOvertime
      });
  };

  const handleSubmit = async () => {
    if (!task) return;
    setIsChecking(true);
    const result = await judgeAnswer(task.targetSong, guess);
    setIsChecking(false);

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
      completeRound(points, `Оценка ИИ: ${result.score}/10${penaltyText}.\n${result.feedback}\nЭто действительно "${task.targetSong}".`);
    } else {
      setShowAnswer(true);
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

  if (!task) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-indigo-600 font-bold text-sm">Составляю протокол...</p>
      </div>
    );
  }

  if (isChecking) {
      return (
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-indigo-600 font-bold text-sm">Сверяю с базой данных...</p>
        </div>
      );
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
            duration={90} 
            isRunning={!showAnswer && !isChecking} 
            onTimeUp={() => setIsOvertime(true)} 
         />
      </div>

      {/* Content Area (Lyrics) */}
      <div className="flex-1 bg-white p-4 rounded-2xl border border-gray-200 w-full relative overflow-hidden shadow-lg flex flex-col justify-center md:col-start-1 md:row-start-1 md:row-span-2">
        <div className="absolute top-0 left-0 w-2 h-full bg-indigo-500"></div>
        
        <div className="flex justify-between items-center mb-2 absolute top-4 left-6 right-4">
             <h3 className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">
                ТЕМА: {task.style}
             </h3>
             <div className="text-[10px] bg-gray-100 px-2 py-0.5 rounded text-gray-400 font-mono">
                 REF-{(Math.random()*10000).toFixed(0)}
             </div>
        </div>

        {/* Text Area - No Scroll, Flex Centered */}
        <div className="flex-1 flex items-center justify-center px-4">
            <p className="text-base sm:text-lg md:text-2xl leading-snug text-gray-800 font-medium font-serif italic border-l-2 border-gray-100 pl-4 py-2 text-balance">
            "{task.rewrittenLyrics}"
            </p>
        </div>

        {hintUsed && (
            <div className="absolute bottom-4 left-6 right-4 p-2 bg-indigo-50 rounded-lg border border-indigo-100 text-indigo-800 text-xs animate-fade-in flex items-center gap-2">
                <span className="text-lg">💡</span>
                <div>{task.hint}</div>
            </div>
        )}
      </div>

      {/* Input Area */}
      <div className="w-full flex-shrink-0 md:col-start-2 md:row-start-2 md:self-end">
        {!showAnswer ? (
          <div className="space-y-3">
            <input
                  type="text"
                  value={guess}
                  onChange={(e) => setGuess(e.target.value)}
                  placeholder="Название песни или исполнитель..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-base shadow-sm"
              />
            
            <div className="flex gap-2">
              <VoiceInput onTranscript={(text) => setGuess(prev => prev ? `${prev} ${text}` : text)} />
              <Button onClick={handleSubmit} className="flex-1 text-lg" variant="primary" disabled={!guess.trim()}>
                Ответить {isOvertime && '(x0.5)'}
              </Button>
            </div>
             <div className="flex justify-center">
                 <Button variant="ghost" onClick={() => completeRound(0, `Песня называлась "${task.targetSong}".`)} className="px-3 text-xs">
                    Сдаться
                 </Button>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-4 animate-fade-in w-full">
             <div className="grid grid-cols-1 gap-2">
                 <div className="bg-red-50 p-3 rounded-xl border border-red-200">
                     <p className="text-xs uppercase text-red-400 mb-1 font-bold">Ваш ответ</p>
                     <p className="text-base text-red-800 line-through decoration-2 decoration-red-500">{guess}</p>
                 </div>
                 <div className="bg-green-50 p-3 rounded-xl border border-green-200">
                     <p className="text-xs uppercase text-green-600 mb-1 font-bold">Правильный ответ</p>
                     <p className="text-base text-green-800 font-bold">{task.targetSong}</p>
                 </div>
             </div>
             
             <Button onClick={() => completeRound(0, `Вы не угадали "${task.targetSong}".`)} className="w-full py-4 text-lg">
               Продолжить игру
             </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SongRound;
