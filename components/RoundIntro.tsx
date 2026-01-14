
import React from 'react';
import { RoundType } from '../types';
import { ROUND_META } from '../constants';
import Button from './Button';

interface Props {
  roundType: RoundType;
  onStart: () => void;
}

const RoundIntro: React.FC<Props> = ({ roundType, onStart }) => {
  const meta = ROUND_META[roundType];

  const renderVisual = () => {
    switch(roundType) {
        case RoundType.IMAGE_GUESS:
            // Embedded SVG for "Сесть в лужу" (Sit in a puddle)
            const puddleImage = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="none"><rect width="200" height="200" fill="%23EFF6FF"/><ellipse cx="100" cy="160" rx="80" ry="25" fill="%2360A5FA" opacity="0.6"/><circle cx="100" cy="90" r="30" fill="%23FCD34D"/><path d="M90 85C90 85 95 95 100 95C105 95 110 85 110 85" stroke="%23B45309" stroke-width="3" stroke-linecap="round"/><circle cx="85" cy="80" r="3" fill="%23B45309"/><circle cx="115" cy="80" r="3" fill="%23B45309"/><path d="M100 120L100 150" stroke="%231F2937" stroke-width="8" stroke-linecap="round"/><path d="M100 150L80 170" stroke="%231F2937" stroke-width="8" stroke-linecap="round"/><path d="M100 150L120 170" stroke="%231F2937" stroke-width="8" stroke-linecap="round"/><text x="100" y="40" text-anchor="middle" font-family="sans-serif" font-size="14" fill="%233B82F6" font-weight="bold">AI ART</text></svg>`;
            
            return (
                <div className="flex items-center gap-3 bg-white p-4 rounded-xl border border-gray-200 w-full max-w-sm justify-center shadow-sm mx-auto h-full">
                    <div className="w-20 h-20 bg-blue-50 rounded-lg flex items-center justify-center border border-blue-100 relative overflow-hidden shrink-0">
                        <img 
                            src={puddleImage}
                            alt="Сапоги в луже" 
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-white/90 text-[8px] text-center text-gray-500 p-0.5 border-t border-gray-100">
                           В луже
                        </div>
                    </div>
                    <div className="text-xl text-gray-300">➜</div>
                    <div className="bg-gray-50 border border-gray-200 px-3 py-2 rounded-lg">
                        <div className="text-[8px] text-gray-400 uppercase font-bold mb-0.5 tracking-wider">Ответ</div>
                        <div className="text-base font-bold text-gray-900">"Сесть в лужу"</div>
                    </div>
                </div>
            );
        case RoundType.SCIENTIFIC_SONGS:
             return (
                <div className="flex items-center gap-3 bg-white p-4 rounded-xl border border-gray-200 w-full max-w-sm justify-center shadow-sm mx-auto h-full">
                    <div className="w-16 h-20 bg-gray-50 border border-gray-200 text-gray-400 rounded-lg p-2 text-[6px] font-serif leading-tight flex flex-col gap-1.5">
                        <div className="w-full h-0.5 bg-gray-300 rounded"></div>
                        <div className="w-3/4 h-0.5 bg-gray-300 rounded"></div>
                        <div className="w-full h-0.5 bg-gray-300 rounded"></div>
                        <div className="w-1/2 h-0.5 bg-gray-300 rounded"></div>
                    </div>
                    <div className="text-xl text-gray-300">➜</div>
                    <div className="bg-indigo-50 border border-indigo-100 px-3 py-2 rounded-lg flex items-center gap-2">
                        <svg className="w-5 h-5 text-indigo-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3V13.55C11.41 13.21 10.73 13 10 13C7.79 13 6 14.79 6 17C6 19.21 7.79 21 10 21C12.21 21 14 19.21 14 17V7H18V3H12Z"/></svg>
                        <div className="text-left">
                            <div className="text-[8px] text-indigo-400 uppercase font-bold tracking-wider">Оригинал</div>
                            <div className="text-sm font-bold text-indigo-900">"Ясный мой свет"</div>
                        </div>
                    </div>
                </div>
            );
        case RoundType.EXPLAIN_TO_AI:
            return (
                <div className="flex items-center gap-3 bg-white p-4 rounded-xl border border-gray-200 w-full max-w-sm justify-center shadow-sm mx-auto h-full">
                    <div className="text-center">
                        <svg className="w-8 h-8 text-gray-400 mx-auto mb-1" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 6C13.66 6 15 7.34 15 9C15 10.66 13.66 12 12 12C10.34 12 9 10.66 9 9C9 7.34 10.34 6 12 6ZM12 20.2C9.5 20.2 7.29 18.92 6 16.98C6.03 14.99 10 13.9 12 13.9C13.99 13.9 17.97 14.99 18 16.98C16.71 18.92 14.5 20.2 12 20.2Z"/></svg>
                        <div className="bg-gray-50 text-[8px] p-1 rounded-md max-w-[80px] border border-gray-200 text-gray-600 truncate">
                           "Защита от дождя"
                        </div>
                    </div>
                    <div className="flex-1 h-0.5 bg-gray-200 mx-1 relative min-w-[20px]">
                         <div className="absolute -top-1 right-0 w-2 h-2 bg-emerald-400 rounded-full"></div>
                    </div>
                    <div className="text-center">
                         <svg className="w-8 h-8 text-emerald-400 mx-auto mb-1" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM18 14H6V12H18V14ZM18 10H6V6H18V10Z"/></svg>
                        <div className="bg-emerald-50 text-emerald-700 text-[10px] font-bold p-1 rounded-md border border-emerald-100">
                           Это зонт!
                        </div>
                    </div>
                </div>
            );
        case RoundType.PROMPT_BATTLE:
             return (
                <div className="flex items-center gap-2 bg-white p-4 rounded-xl border border-gray-200 w-full max-w-sm justify-center relative overflow-hidden shadow-sm mx-auto h-full">
                    <div className="text-center relative z-10">
                        <div className="w-14 h-14 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center text-2xl">🐱</div>
                        <div className="text-[8px] text-gray-400 mt-0.5 uppercase font-bold tracking-wider">Цель</div>
                    </div>
                    
                    <div className="flex flex-col items-center z-10">
                        <div className="bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded text-[8px] text-amber-700 font-mono mb-0.5">
                            "Cat in space"
                        </div>
                        <div className="text-xl text-gray-300">➜</div>
                    </div>

                    <div className="text-center relative z-10">
                        <div className="w-14 h-14 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-center text-2xl">🐱</div>
                        <div className="text-[8px] text-amber-600 mt-0.5 font-bold">95%</div>
                    </div>
                </div>
            );
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-4 max-w-5xl mx-auto animate-fade-in pt-safe pb-safe w-full">
       <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-xl w-full relative overflow-hidden flex flex-col md:flex-row gap-8 items-center h-full md:h-auto">
          
          {/* Background Decorative Blobs */}
          <div className="absolute -top-16 -left-16 w-40 h-40 bg-blue-50 rounded-full blur-2xl pointer-events-none opacity-60"></div>
          <div className="absolute -bottom-16 -right-16 w-40 h-40 bg-indigo-50 rounded-full blur-2xl pointer-events-none opacity-60"></div>

          {/* Left Side: Text Info */}
          <div className="relative z-10 flex flex-col h-full md:h-auto md:w-1/2 justify-center text-center md:text-left">
             <div className="mb-4">
                <div className="inline-block px-3 py-1 rounded-full bg-gray-100 text-gray-500 text-[8px] font-bold uppercase tracking-[0.2em] mb-3">
                    Новый раунд
                </div>
                <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4 tracking-tight leading-none">
                  {meta.title}
                </h2>
                <div className="overflow-y-auto custom-scrollbar max-h-[150px] md:max-h-none">
                    <p className="text-base text-gray-600 leading-relaxed">
                        {meta.description}
                    </p>
                </div>
             </div>

             <div className="mt-auto md:mt-6 hidden md:block">
                 <Button onClick={onStart} className="w-full px-8 py-4 text-lg shadow-lg shadow-blue-100 hover:scale-105 active:scale-95 transition-transform">
                    Понятно, поехали!
                 </Button>
             </div>
          </div>

          {/* Right Side: Visual Example */}
          <div className="relative z-10 w-full md:w-1/2 flex flex-col gap-4">
             <div className="flex justify-center flex-1 min-h-0 bg-gray-50/50 rounded-xl border border-gray-100 p-4">
                {renderVisual()}
             </div>
             
             {/* Mobile Button */}
             <div className="md:hidden mt-auto pt-2">
                 <Button onClick={onStart} className="w-full px-8 py-3 text-lg shadow-lg shadow-blue-100 hover:scale-105 active:scale-95 transition-transform">
                    Понятно, поехали!
                 </Button>
             </div>
          </div>

       </div>
    </div>
  );
};

export default RoundIntro;
