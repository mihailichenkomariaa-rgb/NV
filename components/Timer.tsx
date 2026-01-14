
import React, { useEffect, useState } from 'react';

interface Props {
  duration: number; // seconds
  onTimeUp: () => void;
  isRunning: boolean;
}

const Timer: React.FC<Props> = ({ duration, onTimeUp, isRunning }) => {
  const [timeLeft, setTimeLeft] = useState(duration);

  useEffect(() => {
    setTimeLeft(duration);
  }, [duration]);

  useEffect(() => {
    if (!isRunning || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, timeLeft, onTimeUp]);

  // Color logic
  let colorClass = 'bg-green-500 shadow-green-500/50';
  if (timeLeft < duration * 0.5) colorClass = 'bg-yellow-500 shadow-yellow-500/50';
  if (timeLeft < duration * 0.2) colorClass = 'bg-red-500 shadow-red-500/50';
  if (timeLeft === 0) colorClass = 'bg-slate-600';

  const widthPercent = (timeLeft / duration) * 100;

  return (
    <div className="w-full max-w-md mx-auto mb-6">
       <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">
          <span>Таймер</span>
          <span className={timeLeft === 0 ? 'text-red-500 animate-pulse' : 'text-white'}>
             {timeLeft === 0 ? 'Время вышло (x0.5 баллов)' : `${timeLeft} сек`}
          </span>
       </div>
       <div className="h-4 bg-slate-800 rounded-full overflow-hidden border border-slate-700 relative">
          <div 
             className={`h-full transition-all duration-1000 ease-linear ${colorClass} shadow-[0_0_15px_rgba(0,0,0,0.3)]`}
             style={{ width: `${widthPercent}%` }}
          />
       </div>
    </div>
  );
};

export default Timer;
