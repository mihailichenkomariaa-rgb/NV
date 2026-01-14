
import React, { useState, useEffect } from 'react';
import { GameSettings, Team, Difficulty, GAME_THEMES } from '../types';
import { COLORS, COOL_TEAM_NAMES } from '../constants';
import Button from './Button';
import VoiceInput from './VoiceInput';

interface Props {
  onStart: (settings: GameSettings, teams: Team[]) => void;
  onPreloadStart: (count: number, settings: GameSettings) => void;
  onBack: () => void;
}

interface TeamSetup {
  name: string;
  players: string[];
}

const STORAGE_KEY = 'neurovoki_onboarding_draft';

const Onboarding: React.FC<Props> = ({ onStart, onPreloadStart, onBack }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.MEDIUM);
  const [age, setAge] = useState<number>(25);
  const [selectedThemes, setSelectedThemes] = useState<string[]>([...GAME_THEMES]);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState<boolean>(true);

  const [teamCount, setTeamCount] = useState<number>(2);
  const [teams, setTeams] = useState<TeamSetup[]>([]);
  const [editingTeamIndex, setEditingTeamIndex] = useState<number>(0);

  // LOAD DRAFT
  useEffect(() => {
      try {
          const saved = localStorage.getItem(STORAGE_KEY);
          if (saved) {
              const data = JSON.parse(saved);
              if (data.difficulty) setDifficulty(data.difficulty);
              if (data.age) setAge(data.age);
              if (data.selectedThemes) setSelectedThemes(data.selectedThemes);
              if (data.teams && data.teams.length > 0) setTeams(data.teams);
              if (data.teamCount) setTeamCount(data.teamCount);
              // Note: we don't restore 'step' to allow user to flow naturally, 
              // or we could restore it if we wanted strict return.
              // For "Back" button functionality, state is preserved in memory mostly, 
              // but this handles refresh.
          }
      } catch (e) {
          console.error("Failed to load onboarding draft");
      }
  }, []);

  // SAVE DRAFT
  useEffect(() => {
      const draft = {
          difficulty,
          age,
          selectedThemes,
          teams,
          teamCount
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  }, [difficulty, age, selectedThemes, teams, teamCount]);

  const toggleTheme = (theme: string) => {
    setSelectedThemes(prev => 
      prev.includes(theme) ? prev.filter(t => t !== theme) : [...prev, theme]
    );
  };

  const handleTeamCountSelect = (count: number) => {
    if (selectedThemes.length === 0) {
       alert("Выберите хотя бы одну тему!");
       return;
    }
    setTeamCount(count);
    
    // Only re-initialize if count changed significantly or teams empty
    if (teams.length !== count) {
        const initialTeams: TeamSetup[] = Array.from({ length: count }, (_, i) => ({
            name: teams[i]?.name || `Команда ${i + 1}`, 
            players: teams[i]?.players || ['Игрок 1', 'Игрок 2']
        }));
        setTeams(initialTeams);
    }
    
    setEditingTeamIndex(0);

    const settings: GameSettings = { difficulty, averageAge: age, themes: selectedThemes, ttsEnabled };
    onPreloadStart(count, settings);

    setStep(3);
  };

  const currentEditingTeam = teams[editingTeamIndex];

  // Helper to update team name
  const updateTeamName = (val: string) => {
    const newTeams = [...teams];
    if (newTeams[editingTeamIndex]) {
        newTeams[editingTeamIndex].name = val;
        setTeams(newTeams);
    }
  };
  
  const randomizeTeamName = () => {
      const randomName = COOL_TEAM_NAMES[Math.floor(Math.random() * COOL_TEAM_NAMES.length)];
      updateTeamName(randomName);
  };

  const updatePlayerName = (pIndex: number, val: string) => {
    const newTeams = [...teams];
    if (newTeams[editingTeamIndex]) {
        newTeams[editingTeamIndex].players[pIndex] = val;
        setTeams(newTeams);
    }
  };

  const nextTeamOrFinish = () => {
      const current = teams[editingTeamIndex];
      // Filter out empty players if any, but ensure at least 1
      const validPlayers = current.players.filter(p => p.trim().length > 0);
      
      if (!current.name.trim()) {
          alert("Введите название команды!");
          return;
      }
      
      // If user cleared all players, restore defaults
      let finalPlayers = validPlayers;
      if (finalPlayers.length === 0) {
          finalPlayers = ["Игрок 1", "Игрок 2"];
      }

      const newTeams = [...teams];
      newTeams[editingTeamIndex].players = finalPlayers;
      setTeams(newTeams);

      if (editingTeamIndex < teamCount - 1) {
          setEditingTeamIndex(prev => prev + 1);
      } else {
          // Clear draft on successful start
          localStorage.removeItem(STORAGE_KEY);

          const finalTeamsData: Team[] = teams.map((t, i) => {
             const p = t.players.filter(x => x.trim().length > 0);
             return {
                id: `team-${i}`,
                name: t.name,
                players: p.length > 0 ? p : ["Игрок 1", "Игрок 2"],
                score: 0,
                color: COLORS[i % COLORS.length],
                nextPlayerIndex: 0
             }
          });

          onStart(
              { difficulty, averageAge: age, themes: selectedThemes, ttsEnabled },
              finalTeamsData
          );
      }
  };

  const handleVoiceInput = (text: string) => {
     const names = text.replace(/[.,]/g, ' ').split(/\s+/).filter(Boolean);
     if (names.length > 0) {
         const newTeams = [...teams];
         newTeams[editingTeamIndex].players = names;
         setTeams(newTeams);
     }
  };

  // STEP 1: SETTINGS
  if (step === 1) {
    return (
      <div className="flex flex-col h-full bg-gray-50 pt-safe pb-safe overflow-hidden relative">
         <header className="flex items-center justify-between px-4 py-3">
             <button onClick={onBack} className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-gray-200">←</button>
             <h2 className="font-bold text-gray-900">Настройки</h2>
             <div className="w-8"></div>
         </header>

         <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-2 space-y-4">
            
            {/* Difficulty */}
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
                <label className="text-xs uppercase text-gray-400 font-bold tracking-wider mb-3 block">Сложность</label>
                <div className="flex bg-gray-100 p-1 rounded-xl">
                    {[Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD].map((d) => (
                        <button 
                           key={d}
                           onClick={() => setDifficulty(d)}
                           className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${difficulty === d ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            {d === Difficulty.EASY ? 'Легко' : d === Difficulty.MEDIUM ? 'Средне' : 'Сложно'}
                        </button>
                    ))}
                </div>
                <p className="text-xs text-gray-500 mt-2 leading-snug">
                    {difficulty === Difficulty.EASY && "Только хиты и общеизвестные факты."}
                    {difficulty === Difficulty.MEDIUM && "Баланс между попсой и эрудицией."}
                    {difficulty === Difficulty.HARD && "Хардкор, наука и сложные метафоры."}
                </p>
            </div>

            {/* Age */}
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex justify-between mb-2">
                    <label className="text-xs uppercase text-gray-400 font-bold tracking-wider">Возраст: {age}</label>
                </div>
                <input 
                   type="range" min="10" max="80" step="5"
                   value={age}
                   onChange={(e) => setAge(Number(e.target.value))}
                   className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
            </div>

            {/* Themes */}
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
                <div>
                    <label className="text-xs uppercase text-gray-400 font-bold tracking-wider block mb-1">Темы</label>
                    <div className="text-sm font-bold text-gray-900">Выбрано: {selectedThemes.length}</div>
                </div>
                <Button variant="secondary" onClick={() => setIsThemeModalOpen(true)} className="py-2 px-4 text-xs h-auto">
                    Изменить
                </Button>
            </div>

            {/* TTS */}
             <label className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
                 <div>
                    <span className="text-xs uppercase text-gray-400 font-bold tracking-wider block mb-1">Озвучка ИИ</span>
                    <span className="text-[10px] text-gray-500 block">Читает результаты голосом</span>
                 </div>
                 <div className={`w-10 h-6 rounded-full relative transition-colors ${ttsEnabled ? 'bg-blue-500' : 'bg-gray-200'}`}>
                      <input type="checkbox" className="sr-only" checked={ttsEnabled} onChange={(e) => setTtsEnabled(e.target.checked)} />
                      <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${ttsEnabled ? 'translate-x-4' : 'translate-x-0'}`}></div>
                 </div>
             </label>
         </div>

         <div className="p-4 bg-white border-t border-gray-100 z-10">
             <Button onClick={() => setStep(2)} className="w-full py-3 text-lg">
                Далее
             </Button>
         </div>

         {/* Themes Modal */}
         {isThemeModalOpen && (
             <div className="absolute inset-0 z-50 bg-white flex flex-col animate-fade-in">
                 <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                     <h3 className="font-bold text-gray-900">Выберите темы</h3>
                     <button onClick={() => setIsThemeModalOpen(false)} className="text-blue-600 font-bold text-sm">Готово</button>
                 </div>
                 <div className="flex-1 overflow-y-auto p-4">
                     <div className="flex flex-wrap gap-2">
                         <button 
                            onClick={() => setSelectedThemes(selectedThemes.length === GAME_THEMES.length ? [] : [...GAME_THEMES])}
                            className="w-full mb-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider border border-dashed border-gray-300 rounded-lg"
                         >
                            {selectedThemes.length === GAME_THEMES.length ? "Снять все" : "Выбрать все"}
                         </button>
                         {GAME_THEMES.map(theme => (
                             <button
                                key={theme}
                                onClick={() => toggleTheme(theme)}
                                className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${selectedThemes.includes(theme) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'}`}
                             >
                                 {theme}
                             </button>
                         ))}
                     </div>
                 </div>
             </div>
         )}
      </div>
    );
  }

  // STEP 2: TEAM COUNT
  if (step === 2) {
      return (
        <div className="flex flex-col h-full bg-white pt-safe pb-safe relative">
            <header className="px-4 py-3">
                 <button onClick={() => setStep(1)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100">←</button>
            </header>
            <div className="flex-1 flex flex-col items-center justify-center px-4 space-y-8">
                 <div className="text-center">
                    <h2 className="text-3xl font-black text-gray-900 mb-2">Сколько команд?</h2>
                    <p className="text-gray-500 text-sm">Задания сгенерируются сразу</p>
                 </div>
                 <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
                    {[1, 2, 3, 4].map(num => (
                        <button 
                            key={num}
                            onClick={() => handleTeamCountSelect(num)}
                            className="aspect-square bg-gray-50 hover:bg-blue-50 border-2 border-gray-100 hover:border-blue-400 rounded-2xl flex flex-col items-center justify-center transition-all"
                        >
                            <span className="text-4xl font-black text-gray-300 hover:text-blue-600 mb-1">{num}</span>
                            <span className="text-[10px] uppercase font-bold text-gray-400">
                                {num === 1 ? 'Команда' : 'Команды'}
                            </span>
                        </button>
                    ))}
                 </div>
            </div>
        </div>
      );
  }

  // STEP 3: TEAM NAMES
  if (step === 3 && currentEditingTeam) {
      return (
        <div className="flex flex-col h-full bg-gray-50 pt-safe pb-safe">
            <header className="px-4 py-3 flex justify-between items-center">
                <button onClick={() => setStep(2)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-gray-200">←</button>
                <div className="flex gap-1">
                    {Array.from({length: teamCount}).map((_, i) => (
                        <div key={i} className={`h-1.5 w-6 rounded-full ${i <= editingTeamIndex ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                    ))}
                </div>
                <div className="w-8"></div>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-5">
                    <div>
                        <label className="block text-xs uppercase text-gray-400 font-bold mb-2">Название</label>
                        <div className="flex gap-2">
                            <input 
                                value={currentEditingTeam.name}
                                onChange={(e) => updateTeamName(e.target.value)}
                                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl p-3 font-bold text-gray-900 focus:border-blue-500 focus:outline-none"
                                placeholder={`Команда ${editingTeamIndex + 1}`}
                                autoFocus
                            />
                            <button 
                                onClick={randomizeTeamName}
                                className="w-12 flex items-center justify-center bg-blue-50 text-blue-600 rounded-xl border border-blue-100 text-xl"
                            >
                                🎲
                            </button>
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-2">
                             <label className="block text-xs uppercase text-gray-400 font-bold">Игроки</label>
                             <div className="scale-75 origin-right">
                                <VoiceInput onTranscript={handleVoiceInput} />
                             </div>
                        </div>
                        
                        <div className="space-y-2">
                            {currentEditingTeam.players.map((player, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                     <span className="text-gray-300 text-xs font-mono w-4">{idx + 1}</span>
                                     <input 
                                        value={player}
                                        onChange={(e) => updatePlayerName(idx, e.target.value)}
                                        placeholder={`Игрок ${idx + 1}`}
                                        className="flex-1 bg-white border-b border-gray-200 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
                                     />
                                </div>
                            ))}
                            <button 
                                onClick={() => {
                                    const newTeams = [...teams];
                                    // Add next player with default name
                                    const nextNum = newTeams[editingTeamIndex].players.length + 1;
                                    newTeams[editingTeamIndex].players.push(`Игрок ${nextNum}`);
                                    setTeams(newTeams);
                                }}
                                className="text-xs text-blue-500 font-bold mt-2 hover:underline ml-6"
                            >
                                + Добавить игрока
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-4 bg-white border-t border-gray-100">
                <Button onClick={nextTeamOrFinish} className="w-full py-3 text-lg">
                    {editingTeamIndex < teamCount - 1 ? 'Следующая команда' : 'Начать игру!'}
                </Button>
            </div>
        </div>
      );
  }

  return null;
};

export default Onboarding;
