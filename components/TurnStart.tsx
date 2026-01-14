
import React from 'react';
import { RoundType, Team } from '../types';
import { ROUND_META } from '../constants';
import Button from './Button';

interface Props {
  roundType: RoundType;
  team: Team;
  playerName: string;
  onReady: () => void;
}

const TurnStart: React.FC<Props> = ({ roundType, team, playerName, onReady }) => {
  const meta = ROUND_META[roundType];

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 max-w-4xl mx-auto animate-fade-in relative overflow-hidden pt-safe pb-safe w-full">
      
      {/* Background decoration */}
      <div className={`absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent ${team.color.split(' ')[0].replace('text-', 'via-')}-400 to-transparent opacity-50`}></div>

      <div className="w-full bg-white rounded-2xl p-6 border border-gray-100 shadow-xl relative z-10 flex flex-col h-full md:h-auto md:flex-row md:gap-8">
          
          {/* Left Side: Player Info */}
          <div className="flex-shrink-0 flex flex-col md:w-1/3 md:border-r md:border-gray-100 md:pr-6 md:justify-center">
              <div className="text-center md:text-left space-y-4">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Ход команды</div>
                    <div className={`text-3xl md:text-4xl font-black ${team.color.split(' ')[0]} break-words`}>{team.name}</div>
                  </div>

                  <div className="py-4 border-t border-b border-gray-100">
                    <span className="text-gray-400 text-xs block mb-1">У телефона:</span>
                    <div className="text-2xl font-black text-gray-900 leading-tight">{playerName || "Игрок"}</div>
                  </div>
                  
                  <p className="text-gray-400 text-[10px] italic">Передайте устройство этому игроку</p>
              </div>
          </div>

          {/* Right Side: Task Info */}
          <div className="flex-1 flex flex-col mt-4 md:mt-0 min-h-0">
             <div className="flex-1 flex flex-col justify-center space-y-3 bg-gray-50 rounded-xl p-5 mb-4 overflow-hidden">
                 <div className="flex items-center gap-2 mb-1 flex-shrink-0">
                     <div className="p-1.5 bg-white rounded-lg shadow-sm">
                        <span className="text-lg">🎯</span>
                     </div>
                     <div>
                         <div className="text-[10px] text-gray-400 font-bold uppercase">Задание</div>
                         <div className="font-bold text-gray-900 text-base leading-tight">{meta.title}</div>
                     </div>
                 </div>
                 
                 <div className="flex-1 overflow-y-auto custom-scrollbar">
                     <p className="text-sm text-gray-600 leading-relaxed">
                         {meta.description}
                     </p>
                 </div>

                 {/* Stats Grid */}
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[10px] font-medium text-gray-500 pt-3 border-t border-gray-200/50 flex-shrink-0">
                     <div className="flex justify-between items-center bg-white px-2 py-2 rounded border border-gray-100">
                        <span className="flex items-center gap-1">⏱️ Время</span>
                        <span className="text-gray-900 font-bold">60 сек</span>
                     </div>
                     <div className="flex justify-between items-center bg-white px-2 py-2 rounded border border-gray-100">
                        <span className="flex items-center gap-1">💡 Подсказка</span>
                        <span className="text-gray-900 font-bold">-3 балла</span>
                     </div>
                     <div className="flex justify-between items-center bg-white px-2 py-2 rounded border border-gray-100 text-red-500">
                        <span className="flex items-center gap-1">⚠️ Неудача</span>
                        <span className="font-bold">x0.5</span>
                     </div>
                 </div>
             </div>

             <div className="flex-shrink-0">
                <Button onClick={onReady} className="w-full py-4 text-lg shadow-lg shadow-blue-100 hover:shadow-xl transition-all">
                    Я готов!
                </Button>
             </div>
          </div>
      </div>
    </div>
  );
};

export default TurnStart;
