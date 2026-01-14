
import React, { useState, useEffect } from 'react';
import { GameState, GameSettings, Team, RoundType, Difficulty, GAME_THEMES, RoundContext, NegotiationResult } from './types';
import { ROUND_ORDER_DEFAULT, ROUND_DESCRIPTIONS } from './constants';
import { generateTaskForRound, evaluateNegotiation } from './services/geminiService';
import Button from './components/Button';
import VoiceInput from './components/VoiceInput';
import Onboarding from './components/Onboarding';
import RoundIntro from './components/RoundIntro';
import TurnStart from './components/TurnStart';
import WelcomeScreen from './components/WelcomeScreen';
import ImageRound from './components/rounds/ImageRound';
import SongRound from './components/rounds/SongRound';
import ExplainRound from './components/rounds/ExplainRound';
import PromptBattleRound from './components/rounds/PromptBattleRound';

const STORAGE_KEY = 'neurovoki_gamestate_v2';

const App: React.FC = () => {
  // Initialize state from LocalStorage if available
  const [gameState, setGameState] = useState<GameState>(() => {
      try {
          const saved = localStorage.getItem(STORAGE_KEY);
          if (saved) {
              return JSON.parse(saved);
          }
      } catch (e) {
          console.error("Failed to load save", e);
      }
      return {
        settings: {
          difficulty: Difficulty.MEDIUM,
          averageAge: 25,
          themes: [...GAME_THEMES],
          ttsEnabled: true
        },
        teams: [],
        currentRoundTypeIndex: 0,
        currentTeamIndex: 0,
        gameStatus: 'WELCOME',
        history: [],
        usedContent: []
      };
  });

  const [taskPromises, setTaskPromises] = useState<Record<string, Promise<any>>>({});
  const [retryCount, setRetryCount] = useState(0); // Force re-generation trigger
  
  const [lastRoundMessage, setLastRoundMessage] = useState<string>('');
  const [lastRoundDefinition, setLastRoundDefinition] = useState<string | undefined>(undefined);
  const [pointsJustEarned, setPointsJustEarned] = useState<number>(0);

  // Negotiation State
  const [lastRoundContext, setLastRoundContext] = useState<RoundContext | null>(null);
  const [negotiationState, setNegotiationState] = useState<'AVAILABLE' | 'INPUT' | 'PROCESSING' | 'COMPLETED' | 'UNAVAILABLE'>('UNAVAILABLE');
  const [negotiationArgument, setNegotiationArgument] = useState('');
  const [negotiationResult, setNegotiationResult] = useState<NegotiationResult | null>(null);

  // Global UI State
  const [isRestartModalOpen, setIsRestartModalOpen] = useState(false);

  // PERSISTENCE: Save game state whenever it changes
  useEffect(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState));
  }, [gameState]);

  // SMART PRELOADING: Recover tasks if missing during gameplay
  useEffect(() => {
      if (gameState.gameStatus === 'PLAYING' || gameState.gameStatus === 'TURN_START' || gameState.gameStatus === 'ROUND_INTRO') {
          const currentRoundIdx = gameState.currentRoundTypeIndex;
          
          // 1. Recovery: Ensure CURRENT round tasks exist
          let needsLoad = false;
          for (let i = 0; i < gameState.teams.length; i++) {
               const currentKey = `${currentRoundIdx}-${i}`;
               if (!taskPromises[currentKey]) {
                   needsLoad = true;
                   break;
               }
          }

          // 2. Load Next Round (Standard lookahead)
          const nextRoundIdx = currentRoundIdx + 1;
          if (nextRoundIdx < ROUND_ORDER_DEFAULT.length) {
              const nextKeyCheck = `${nextRoundIdx}-0`;
              if (!taskPromises[nextKeyCheck]) {
                  needsLoad = true;
              }
          }
          
          // 3. SPECIAL: Trigger Final Round (4) after Round 0 finishes
          if (currentRoundIdx === 1) { 
               const finalRoundIdx = 4;
               const finalKeyCheck = `${finalRoundIdx}-0`;
               if (!taskPromises[finalKeyCheck]) {
                   console.log("🔄 Round 0 finished. Preloading Final Round (4)...");
                   preloadSpecificRound(finalRoundIdx, gameState.teams.length, gameState.settings, gameState.usedContent);
               }
          }

          if (needsLoad) {
               // Trigger generic preload for current + next
               preloadSpecificRound(currentRoundIdx, gameState.teams.length, gameState.settings, gameState.usedContent);
               if (nextRoundIdx < ROUND_ORDER_DEFAULT.length) {
                   preloadSpecificRound(nextRoundIdx, gameState.teams.length, gameState.settings, gameState.usedContent);
               }
          }
      }
  }, [gameState.currentRoundTypeIndex, gameState.gameStatus, gameState.usedContent, retryCount]);


  const currentRoundType = ROUND_ORDER_DEFAULT[gameState.currentRoundTypeIndex];
  const currentTeam = gameState.teams[gameState.currentTeamIndex];
  const responsiblePlayer = currentTeam ? currentTeam.players[currentTeam.nextPlayerIndex % currentTeam.players.length] : '';

  const speak = (text: string) => {
    if (!text) return;
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ru-RU';
    utterance.rate = 1.1;
    utterance.pitch = 1.0;
    
    const voices = window.speechSynthesis.getVoices();
    const russianVoice = voices.find(v => v.lang.includes('ru') && v.name.includes('Google'));
    if (russianVoice) utterance.voice = russianVoice;

    window.speechSynthesis.speak(utterance);
  };

  const toggleTts = () => {
    window.speechSynthesis.cancel();
    setGameState(prev => ({
      ...prev,
      settings: { ...prev.settings, ttsEnabled: !prev.settings.ttsEnabled }
    }));
  };

  // --- PRELOADING LOGIC ---

  const preloadSpecificRound = (roundIndex: number, teamCount: number, settings: GameSettings, usedContent: string[]) => {
      const roundType = ROUND_ORDER_DEFAULT[roundIndex];
      if (!roundType) return;
      
      const newPromises: Record<string, Promise<any>> = {};
      let hasNew = false;
  
      for (let teamIdx = 0; teamIdx < teamCount; teamIdx++) {
          const key = `${roundIndex}-${teamIdx}`;
          if (taskPromises[key]) continue;
  
          hasNew = true;
          let taskSettings = { ...settings };
          if (settings.themes.length > 0) {
              const themeIndex = (teamIdx + roundIndex) % settings.themes.length;
              taskSettings = { ...settings, themes: [settings.themes[themeIndex]] };
          }
          newPromises[key] = generateTaskForRound(roundType, taskSettings, usedContent);
      }
  
      if (hasNew) {
          setTaskPromises(prev => ({ ...prev, ...newPromises }));
      }
  };

  const handlePreloadStart = (count: number, settings: GameSettings) => {
      console.log(`🚀 BATCH PRELOAD: Generating tasks for ${count} teams...`);
      
      const newPromises: Record<string, Promise<any>> = {};
      const roundsToPreload = [0, 1, 2, 3]; // Preload first 4 rounds immediately

      roundsToPreload.forEach(roundIdx => {
          const roundType = ROUND_ORDER_DEFAULT[roundIdx];
          for (let teamIdx = 0; teamIdx < count; teamIdx++) {
              const key = `${roundIdx}-${teamIdx}`;
              
              // Only generate if not already exists (and not in current local batch)
              if (!taskPromises[key] && !newPromises[key]) {
                   let taskSettings = { ...settings };
                   if (settings.themes.length > 0) {
                       const themeIndex = (teamIdx + roundIdx) % settings.themes.length;
                       taskSettings = { ...settings, themes: [settings.themes[themeIndex]] };
                   }
                   // We pass empty usedContent during initial preload
                   newPromises[key] = generateTaskForRound(roundType, taskSettings, []);
              }
          }
      });

      if (Object.keys(newPromises).length > 0) {
          console.log(`✅ Queued ${Object.keys(newPromises).length} tasks.`);
          setTaskPromises(prev => ({ ...prev, ...newPromises }));
      }
  };

  const handleStartGame = (settings: GameSettings, teams: Team[]) => {
    setGameState(prev => ({ 
      ...prev, 
      settings, 
      teams, 
      gameStatus: 'ROUND_INTRO', 
      currentRoundTypeIndex: 0,
      currentTeamIndex: 0,
      usedContent: []
    }));
  };

  const handleRetryRound = () => {
    const currentKey = `${gameState.currentRoundTypeIndex}-${gameState.currentTeamIndex}`;
    setTaskPromises(prev => {
        const next = { ...prev };
        delete next[currentKey];
        return next;
    });
    setRetryCount(prev => prev + 1);
  };

  const handleRoundIntroDone = () => {
     setGameState(prev => ({ ...prev, gameStatus: 'TURN_START' }));
  };

  const handleTurnReady = () => {
    setGameState(prev => ({ ...prev, gameStatus: 'PLAYING' }));
  };

  const handleRoundComplete = (points: number, message: string, contentId: string | undefined, context: RoundContext) => {
    setPointsJustEarned(points);
    const definitionMatch = message.match(/Значение:\s*(.*)/s);
    const cleanMessage = message.replace(/Значение:.*$/s, '').trim();
    const definition = definitionMatch ? definitionMatch[1] : undefined;

    setLastRoundMessage(cleanMessage);
    setLastRoundDefinition(definition);

    setLastRoundContext(context);
    setNegotiationArgument('');
    setNegotiationResult(null);

    const canNegotiate = !context.isOvertime && points < 10;
    setNegotiationState(canNegotiate ? 'AVAILABLE' : 'UNAVAILABLE');
    
    const updatedTeams = gameState.teams.map((t, i) => {
      if (i === gameState.currentTeamIndex) {
        return { 
          ...t, 
          score: t.score + points,
          nextPlayerIndex: t.nextPlayerIndex + 1 
        };
      }
      return t;
    });

    const newUsedContent = contentId 
        ? [...gameState.usedContent, contentId] 
        : gameState.usedContent;

    setGameState(prev => ({
      ...prev,
      teams: updatedTeams,
      gameStatus: 'ROUND_RESULT',
      usedContent: newUsedContent
    }));
  };

  const handleNegotiationSubmit = async () => {
      if (!lastRoundContext || !negotiationArgument.trim()) return;
      
      const maxAddablePoints = 10 - pointsJustEarned;
      if (maxAddablePoints <= 0) return;

      setNegotiationState('PROCESSING');
      try {
          const result = await evaluateNegotiation(
              lastRoundContext.target, 
              lastRoundContext.userAnswer, 
              negotiationArgument,
              maxAddablePoints
          );
          
          setNegotiationResult(result);
          
          if (result.approved && result.pointsAwarded > 0) {
              setPointsJustEarned(prev => prev + result.pointsAwarded);
              setGameState(prev => {
                  const updatedTeams = prev.teams.map((t, i) => {
                      if (i === prev.currentTeamIndex) {
                          return { ...t, score: t.score + result.pointsAwarded };
                      }
                      return t;
                  });
                  return { ...prev, teams: updatedTeams };
              });
          }
          setNegotiationState('COMPLETED');
          
          if (gameState.settings.ttsEnabled) {
              speak(result.reply);
          }

      } catch (e) {
          console.error(e);
          setNegotiationState('COMPLETED'); 
      }
  };

  const handleForceGiveUp = () => {
      handleRoundComplete(0, "Команда сдалась.", undefined, { userAnswer: "Сдались", target: "—", isOvertime: false });
  };

  const nextTurn = () => {
    window.speechSynthesis.cancel(); 
    setNegotiationState('UNAVAILABLE');
    setGameState(prev => {
      let nextTeamIndex = prev.currentTeamIndex + 1;
      let nextRoundTypeIndex = prev.currentRoundTypeIndex;
      let gameStatus = 'TURN_START'; 
      let isNewRoundType = false;

      if (nextTeamIndex >= prev.teams.length) {
        nextTeamIndex = 0;
        nextRoundTypeIndex = prev.currentRoundTypeIndex + 1;
        isNewRoundType = true;
      }

      if (nextRoundTypeIndex >= ROUND_ORDER_DEFAULT.length) {
        gameStatus = 'GAME_OVER';
      } else if (isNewRoundType) {
        gameStatus = 'ROUND_INTRO';
      } else {
        gameStatus = 'TURN_START'; 
      }

      return {
        ...prev,
        currentRoundTypeIndex: nextRoundTypeIndex,
        currentTeamIndex: nextTeamIndex,
        gameStatus: gameStatus as any
      };
    });
  };

  const handleNewGame = () => {
      localStorage.removeItem(STORAGE_KEY);
      window.location.reload();
  };

  const renderRoundResult = () => (
    <div className="flex flex-col h-full pt-safe pb-safe px-6 overflow-hidden max-w-5xl mx-auto w-full">
       <div className="flex-1 w-full flex flex-col justify-center py-4 min-h-0">
            <div className="text-center mb-6 flex-shrink-0">
                <h2 className="text-2xl font-bold text-gray-900">Раунд завершен!</h2>
                <p className="text-gray-500 text-sm">Результаты: {gameState.teams[gameState.currentTeamIndex].name}</p>
            </div>
            
            <div className="flex-1 flex flex-col md:flex-row gap-6 items-center min-h-0">
                {/* Left Side: Score & Status */}
                <div className={`w-full md:w-1/3 p-6 rounded-3xl border flex flex-col items-center justify-center transition-all duration-300 ${pointsJustEarned > 0 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                    <div className="text-center">
                        <div className="text-6xl md:text-7xl font-black text-gray-900 leading-none">
                            {pointsJustEarned}
                        </div>
                        <div className="text-xs uppercase tracking-widest font-bold text-gray-400 mt-2">баллов</div>
                    </div>
                </div>

                {/* Right Side: Feedback & Negotiation */}
                <div className="w-full md:w-2/3 flex flex-col gap-4 h-full min-h-0">
                    <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex-1 flex flex-col overflow-hidden">
                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col justify-center">
                            <p className="text-base md:text-lg leading-relaxed whitespace-pre-line text-gray-800 font-medium text-center">
                                {lastRoundMessage}
                            </p>
                            
                            {lastRoundDefinition && (
                                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 mt-3 text-center">
                                    <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Оригинал</span>
                                    <p className="text-sm text-gray-800 italic font-serif">"{lastRoundDefinition}"</p>
                                </div>
                            )}
                        </div>
                        
                        <div className="pt-3 mt-3 border-t border-gray-100 flex flex-wrap justify-center items-center gap-2 flex-shrink-0">
                            <Button variant="ghost" className="text-xs py-1 h-8 gap-2" onClick={() => speak(lastRoundMessage + (lastRoundDefinition || ''))}>
                                🔊 Прочитать
                            </Button>
                            
                            <div className="w-px h-4 bg-gray-200"></div>

                            <Button 
                                variant="ghost" 
                                className={`text-xs py-1 h-8 gap-2 ${gameState.settings.ttsEnabled ? 'text-gray-400 hover:text-red-500' : 'text-gray-400 hover:text-green-600'}`} 
                                onClick={toggleTts}
                                title={gameState.settings.ttsEnabled ? "Отключить авто-озвучку" : "Включить авто-озвучку"}
                            >
                                {gameState.settings.ttsEnabled ? (
                                    <>🔇 Выкл. звук</>
                                ) : (
                                    <>🔈 Вкл. звук</>
                                )}
                            </Button>
                        </div>
                    </div>

                    {/* Negotiation Block (Conditional) */}
                    {negotiationState !== 'UNAVAILABLE' && (
                        <div className="bg-yellow-50 p-3 rounded-xl border border-yellow-200 flex-shrink-0">
                            {negotiationState === 'AVAILABLE' && (
                                <div className="flex items-center justify-between">
                                    <p className="text-yellow-700 font-bold text-xs pl-2">Не согласны?</p>
                                    <Button onClick={() => setNegotiationState('INPUT')} variant="secondary" className="h-8 text-xs border-yellow-200 text-yellow-700 hover:bg-yellow-100">
                                        👨‍⚖️ Оспорить
                                    </Button>
                                </div>
                            )}
                            
                            {negotiationState === 'INPUT' && (
                                <div className="space-y-2">
                                    <div className="relative">
                                        <textarea 
                                            value={negotiationArgument}
                                            onChange={(e) => setNegotiationArgument(e.target.value)}
                                            className="w-full h-16 bg-white border border-yellow-200 rounded-lg p-2 focus:border-yellow-400 focus:outline-none text-gray-900 text-sm resize-none"
                                            placeholder="Аргумент..."
                                        />
                                        <div className="absolute bottom-2 right-2 scale-75">
                                            <VoiceInput onTranscript={(t) => setNegotiationArgument(prev => prev ? `${prev} ${t}` : t)} />
                                        </div>
                                    </div>
                                    <Button onClick={handleNegotiationSubmit} disabled={!negotiationArgument.trim()} className="w-full h-8 text-xs bg-yellow-500 hover:bg-yellow-600 text-white border-none">
                                        Убедить ИИ
                                    </Button>
                                </div>
                            )}
                             {negotiationState === 'PROCESSING' && (
                                <div className="flex justify-center py-2">
                                    <div className="animate-spin w-5 h-5 border-2 border-yellow-600 border-t-transparent rounded-full"></div>
                                </div>
                            )}
                             {negotiationState === 'COMPLETED' && negotiationResult && (
                                <div className="text-center">
                                    <span className={`font-bold text-xs ${negotiationResult.approved ? 'text-green-600' : 'text-red-600'}`}>
                                        {negotiationResult.approved ? `+${negotiationResult.pointsAwarded} баллов!` : 'Отказано.'}
                                    </span>
                                    <p className="text-[10px] text-gray-600 italic truncate">{negotiationResult.reply}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
       </div>

       <div className="mt-auto pt-4 pb-6 border-t border-gray-100 bg-white/50 backdrop-blur-sm w-full flex-shrink-0 z-10">
           <div className="flex justify-around gap-2 mb-4 overflow-x-auto hide-scrollbar pb-1">
              {gameState.teams.map(t => (
                <div key={t.id} className="text-center min-w-[60px] flex flex-col items-center justify-start">
                   <div className="text-[10px] text-gray-400 mb-0.5 leading-tight break-words whitespace-normal w-20 flex items-center justify-center min-h-[1.5em]">{t.name}</div>
                   <div className={`text-xl font-bold ${t.color.split(' ')[0]}`}>{t.score}</div>
                </div>
              ))}
           </div>

           <Button onClick={nextTurn} className="w-full h-12 text-lg">
             Следующий ход
           </Button>
       </div>
    </div>
  );

  const renderGameOver = () => {
    const sortedTeams = [...gameState.teams].sort((a, b) => b.score - a.score);
    const winner = sortedTeams[0];

    return (
      <div className="flex flex-col h-full w-full bg-white relative overflow-hidden">
        {/* Festive Top Gradient */}
        <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-blue-50/80 to-transparent pointer-events-none" />

        <div className="flex-1 flex flex-col items-center pt-safe pb-safe px-6 z-10 overflow-y-auto custom-scrollbar w-full">
            
            {/* Header */}
            <div className="mt-8 mb-6 text-center">
                <h1 className="text-5xl font-black text-gray-900 tracking-tight mb-2">Финал!</h1>
                <p className="text-gray-500 font-medium text-lg">Игра окончена</p>
            </div>

            {/* Winner Showcase */}
            {winner && (
                <div className="w-full max-w-sm mb-8 relative flex-shrink-0">
                    {/* Glowing background effect */}
                    <div className="absolute -inset-4 bg-yellow-200/50 rounded-full blur-2xl animate-pulse"></div>
                    
                    <div className="relative bg-gradient-to-b from-yellow-50 to-white border border-yellow-200 p-6 rounded-3xl shadow-xl flex flex-col items-center text-center">
                        <div className="text-6xl mb-3 drop-shadow-sm filter">🏆</div>
                        <div className="text-[10px] font-bold text-yellow-600 uppercase tracking-[0.2em] mb-2 bg-yellow-100 px-3 py-1 rounded-full">
                            Чемпионы
                        </div>
                        <h2 className="text-2xl md:text-3xl font-black text-gray-900 leading-tight mb-2 break-words w-full">
                            {winner.name}
                        </h2>
                        <div className="text-4xl font-black text-yellow-500 font-mono">
                            {winner.score}
                        </div>
                    </div>
                </div>
            )}

            {/* Leaderboard Table */}
            <div className="w-full max-w-md flex-1 min-h-0 mb-4">
                <h3 className="text-center text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
                    Турнирная таблица
                </h3>
                <div className="space-y-3 pb-4">
                    {sortedTeams.map((team, index) => {
                        const rank = index + 1;
                        
                        let rankStyle = "bg-white border-gray-100 text-gray-500 shadow-sm";
                        let rankIcon = <span className="text-sm font-bold opacity-40">#{rank}</span>;

                        if (rank === 1) {
                            rankStyle = "bg-yellow-50 border-yellow-200 text-yellow-800 shadow-md transform scale-105 z-10";
                            rankIcon = <span className="text-xl">🥇</span>;
                        } else if (rank === 2) {
                            rankStyle = "bg-slate-50 border-slate-200 text-slate-600";
                            rankIcon = <span className="text-xl">🥈</span>;
                        } else if (rank === 3) {
                            rankStyle = "bg-orange-50 border-orange-200 text-orange-800";
                            rankIcon = <span className="text-xl">🥉</span>;
                        }

                        return (
                            <div key={team.id} className={`flex items-center justify-between p-4 rounded-2xl border ${rankStyle} transition-all`}>
                                <div className="flex items-center gap-4 min-w-0">
                                    <div className="w-8 flex justify-center flex-shrink-0">{rankIcon}</div>
                                    <div className="font-bold text-base md:text-lg leading-tight truncate">{team.name}</div>
                                </div>
                                <div className="font-mono font-bold text-lg md:text-xl ml-4">{team.score}</div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>

        {/* Footer Action */}
        <div className="p-6 bg-white border-t border-gray-100 w-full flex-shrink-0 z-20">
            <div className="max-w-md mx-auto">
                <Button onClick={handleNewGame} className="w-full py-4 text-lg shadow-lg shadow-blue-100 hover:shadow-xl transition-all">
                    Новая игра
                </Button>
            </div>
        </div>
      </div>
    );
  };

  const renderGameContent = () => {
    if (!currentRoundType) return null;
    const currentPromiseKey = `${gameState.currentRoundTypeIndex}-${gameState.currentTeamIndex}`;
    const currentTaskPromise = taskPromises[currentPromiseKey];

    // GUARD: If promise isn't ready (loading or API key missing), show loading state
    if (!currentTaskPromise) {
         return (
             <div className="h-full flex flex-col items-center justify-center bg-gray-50 space-y-4">
                 <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                 <p className="text-gray-500 font-bold animate-pulse">Загрузка задания...</p>
                 <div className="mt-4">
                     <Button variant="ghost" className="text-xs text-gray-400" onClick={() => setRetryCount(c => c + 1)}>
                        Долго грузится? Попробовать снова
                     </Button>
                 </div>
             </div>
         );
    }

    return (
      <div className="h-full flex flex-col bg-gray-50 overflow-hidden">
        {/* Compact Header */}
        <header className="bg-white/90 backdrop-blur border-b border-gray-200 px-3 py-2 pt-safe z-50 flex-shrink-0 pr-12">
          <div className="flex justify-between items-center h-10">
            <div className="px-2.5 py-1 rounded-lg bg-gray-100 border border-gray-200 text-[10px] text-gray-600 font-bold uppercase tracking-wider">
               Р {Math.floor(gameState.currentRoundTypeIndex) + 1}
            </div>
            <div className="flex items-center justify-center flex-1 mx-2 min-w-0">
                <div className="px-3 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-100 text-xs font-bold break-words whitespace-normal text-center leading-tight max-w-[200px]">
                    {responsiblePlayer || currentTeam.name}
                </div>
            </div>
            <Button 
                variant="ghost" 
                onClick={handleForceGiveUp}
                className="text-[10px] px-2 py-1 h-7 rounded-md border border-red-100 text-red-500 hover:bg-red-50 hover:border-red-200 font-bold flex-shrink-0"
            >
                Сдаться
            </Button>
          </div>
        </header>

        <main className="flex-1 p-3 flex flex-col items-center w-full overflow-hidden relative">
          <div className="w-full bg-white rounded-2xl p-4 border border-gray-200 shadow-lg h-full overflow-y-auto custom-scrollbar flex flex-col md:p-6">
            {currentRoundType === RoundType.IMAGE_GUESS && (
              <ImageRound 
                key={currentPromiseKey + retryCount} 
                taskPromise={currentTaskPromise} 
                onComplete={handleRoundComplete}
                onRetry={handleRetryRound}
              />
            )}
            {currentRoundType === RoundType.SCIENTIFIC_SONGS && (
              <SongRound 
                key={currentPromiseKey + retryCount} 
                taskPromise={currentTaskPromise} 
                onComplete={handleRoundComplete}
                onRetry={handleRetryRound}
              />
            )}
            {currentRoundType === RoundType.EXPLAIN_TO_AI && (
              <ExplainRound 
                key={currentPromiseKey + retryCount} 
                taskPromise={currentTaskPromise} 
                onComplete={handleRoundComplete}
                onRetry={handleRetryRound}
              />
            )}
            {currentRoundType === RoundType.PROMPT_BATTLE && (
              <PromptBattleRound 
                key={currentPromiseKey + retryCount} 
                taskPromise={currentTaskPromise} 
                onComplete={handleRoundComplete}
                onRetry={handleRetryRound}
              />
            )}
          </div>
        </main>
      </div>
    );
  };

  const getActiveComponent = () => {
    if (gameState.gameStatus === 'WELCOME') return <WelcomeScreen onStartSetup={() => setGameState(prev => ({ ...prev, gameStatus: 'SETUP' }))} />;
    
    if (gameState.gameStatus === 'SETUP') return (
      <Onboarding 
          onStart={handleStartGame} 
          onPreloadStart={handlePreloadStart} 
          onBack={() => setGameState(prev => ({ ...prev, gameStatus: 'WELCOME' }))}
      />
    );
    
    if (gameState.gameStatus === 'ROUND_INTRO') return <RoundIntro roundType={currentRoundType} onStart={handleRoundIntroDone} />;
    
    if (gameState.gameStatus === 'TURN_START') return (
        <TurnStart 
          roundType={currentRoundType} 
          team={currentTeam} 
          playerName={responsiblePlayer} 
          onReady={handleTurnReady} 
        />
    );
    
    if (gameState.gameStatus === 'ROUND_RESULT') return renderRoundResult();
    if (gameState.gameStatus === 'GAME_OVER') return renderGameOver();
    return renderGameContent();
  };

  return (
    // Outer container: Full width/height, handles background on desktop
    <div className="w-full h-full flex items-center justify-center md:p-6 lg:p-10 transition-all duration-500 ease-in-out">
        {/* Inner container: Full on mobile, Responsive wide rectangle on desktop */}
        <div className={`
            w-full h-full 
            md:w-full md:max-w-6xl md:h-[85vh] md:max-h-[900px]
            md:bg-white md:rounded-[2.5rem] md:shadow-2xl md:overflow-hidden md:border-[1px] md:border-gray-200
            relative flex flex-col transition-all duration-300
        `}>
            {getActiveComponent()}

            {/* Global Restart Button - Visible on all screens except Welcome */}
            {gameState.gameStatus !== 'WELCOME' && (
                <div 
                    className="absolute top-0 right-0 p-3 pt-safe z-[60]"
                    style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0.75rem))' }}
                >
                    <button 
                        onClick={() => setIsRestartModalOpen(true)}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-white/90 backdrop-blur text-gray-400 border border-gray-200 hover:text-red-500 hover:border-red-200 shadow-sm transition-all hover:shadow-md"
                        title="Начать заново"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                        </svg>
                    </button>
                </div>
            )}

            {/* Restart Confirmation Modal */}
            {isRestartModalOpen && (
                <div className="absolute inset-0 z-[70] bg-black/20 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
                    <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full border border-gray-100 transform scale-100 transition-all">
                        <div className="flex justify-center mb-4">
                            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center text-red-500 text-2xl">
                                ↺
                            </div>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2 text-center">Начать заново?</h3>
                        <p className="text-gray-500 text-sm mb-6 text-center">Текущая игра будет сброшена, и весь прогресс потерян.</p>
                        <div className="flex gap-3">
                            <Button variant="secondary" onClick={() => setIsRestartModalOpen(false)} className="flex-1">
                                Отмена
                            </Button>
                            <Button variant="danger" onClick={handleNewGame} className="flex-1">
                                Да, сбросить
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};

export default App;
