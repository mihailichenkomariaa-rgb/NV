
import React, { useState } from 'react';
import Button from './Button';
import { ROUND_META } from '../constants';
import { RoundType } from '../types';

interface Props {
  onStartSetup: () => void;
}

const WelcomeScreen: React.FC<Props> = ({ onStartSetup }) => {
  const [view, setView] = useState<'HERO' | 'RULES'>('HERO');

  const RoundIcon = ({ type }: { type: RoundType }) => {
     if (type === RoundType.IMAGE_GUESS) return <span className="text-2xl">🖼️</span>;
     if (type === RoundType.SCIENTIFIC_SONGS) return <span className="text-2xl">🎼</span>;
     if (type === RoundType.EXPLAIN_TO_AI) return <span className="text-2xl">🗣️</span>;
     if (type === RoundType.PROMPT_BATTLE) return <span className="text-2xl">🎨</span>;
     return null;
  };

  if (view === 'HERO') {
      return (
        <div className="flex flex-col h-full bg-gray-50 pt-safe pb-safe px-6 overflow-hidden relative justify-between">
             <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 z-10">
                 <div className="animate-fade-in space-y-4">
                     <div className="inline-block px-4 py-1.5 rounded-full bg-blue-100 text-blue-600 text-[10px] font-bold tracking-widest uppercase">
                        AI Party Game
                     </div>
                     <h1 className="text-5xl font-black text-gray-900 tracking-tighter leading-none">
                        Neuro<br/><span className="text-blue-600">Voki</span>
                     </h1>
                     <p className="text-base text-gray-600 font-light leading-snug max-w-xs mx-auto">
                        Битва вашего интеллекта против искусственного разума.
                     </p>
                 </div>
             </div>

             <div className="space-y-3 z-10 pb-6 w-full max-w-sm mx-auto">
                 <Button onClick={onStartSetup} className="w-full py-3 text-lg shadow-xl shadow-blue-100">
                    Начать играть
                 </Button>
                 <Button variant="secondary" onClick={() => setView('RULES')} className="w-full py-3 text-gray-500">
                    Узнать правила
                 </Button>
             </div>
             
             {/* Decorative Background */}
             <div className="absolute top-[-10%] left-[-20%] w-[60%] h-[40%] bg-blue-200/20 rounded-full blur-3xl pointer-events-none"></div>
             <div className="absolute bottom-[-10%] right-[-20%] w-[60%] h-[40%] bg-purple-200/20 rounded-full blur-3xl pointer-events-none"></div>
        </div>
      );
  }

  // RULES VIEW
  return (
    <div className="flex flex-col h-full bg-white pt-safe pb-safe overflow-hidden">
         {/* Header */}
         <div className="px-6 py-3 flex items-center justify-between border-b border-gray-100 flex-shrink-0">
             <button 
                onClick={() => setView('HERO')} 
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-600"
             >
                ←
             </button>
             <h2 className="text-base font-bold text-gray-900">Как это работает?</h2>
             <div className="w-8"></div>
         </div>

         <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
             {/* Carousel */}
             <div className="pt-4 pb-2 px-6 flex-shrink-0">
                 <p className="text-gray-500 text-xs mb-3">
                    4 типа раундов (скролльте влево):
                 </p>
                 <div className="flex overflow-x-auto gap-4 pb-4 snap-x snap-mandatory hide-scrollbar">
                    {[RoundType.IMAGE_GUESS, RoundType.SCIENTIFIC_SONGS, RoundType.EXPLAIN_TO_AI, RoundType.PROMPT_BATTLE].map((type) => {
                        const meta = ROUND_META[type];
                        return (
                            <div key={type} className="snap-center flex-shrink-0 w-[80%] bg-gray-50 p-4 rounded-2xl border border-gray-100 flex flex-col gap-2">
                                <div className="w-10 h-10 bg-white rounded-lg shadow-sm flex items-center justify-center">
                                   <RoundIcon type={type} />
                                </div>
                                <h3 className="text-base font-bold text-gray-900 leading-tight">{meta.title}</h3>
                                <p className="text-xs text-gray-600 leading-relaxed">{meta.description}</p>
                            </div>
                        );
                    })}
                 </div>
             </div>

             {/* Details Section */}
             <div className="px-6 space-y-4 pb-6">
                 <div className="space-y-3">
                     <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50/50 border border-blue-100">
                         <span className="text-xl">👥</span>
                         <div>
                             <h4 className="font-bold text-gray-900 text-xs">Команды</h4>
                             <p className="text-[10px] text-gray-600 mt-0.5">1-4 команды. Называйте имена игроков, чтобы ИИ обращался лично.</p>
                         </div>
                     </div>
                     <div className="flex items-start gap-3 p-3 rounded-xl bg-purple-50/50 border border-purple-100">
                         <span className="text-xl">🤖</span>
                         <div>
                             <h4 className="font-bold text-gray-900 text-xs">Арбитр Gemini</h4>
                             <p className="text-[10px] text-gray-600 mt-0.5">ИИ оценивает ответы, начисляет баллы и может подсуживать (или нет).</p>
                         </div>
                     </div>
                 </div>
             </div>
         </div>
         
         {/* Footer Action */}
         <div className="p-4 border-t border-gray-100 bg-white z-20 flex-shrink-0">
             <div className="flex justify-between items-center mb-3">
                  <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Далее</div>
                  <div className="text-xs font-bold text-gray-900">Настройка команд</div>
             </div>
             <Button onClick={onStartSetup} className="w-full py-3 text-base">
                Перейти к настройкам
             </Button>
         </div>
    </div>
  );
};

export default WelcomeScreen;
