import React, { useState, useEffect, useCallback } from 'react';
import { COUNTRIES } from './constants';
import { CountryData, GameState, StatType, HighScore, Language } from './types';
import StatCard from './components/StatCard';
import GuessInput from './components/GuessInput';
import { getFunFact } from './services/geminiService';
import { TRANSLATIONS } from './translations';

// Icons
const UsersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const ChartIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const ShieldIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const CalendarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const LightBulbIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
);

// New type for feedback status
type FeedbackStatus = 'idle' | 'success' | 'error';

// Fake global data to populate leaderboard
const FAKE_GLOBAL_SCORES: HighScore[] = [
  { name: "GeoMaster_99", score: 2500, date: "2024-05-10" },
  { name: "AtlasHunter", score: 1800, date: "2024-05-11" },
  { name: "MapaMundi", score: 1200, date: "2024-05-12" },
  { name: "ExplorerBR", score: 900, date: "2024-05-09" },
  { name: "VascoDaGama", score: 600, date: "2024-05-08" },
];

function App() {
  const [gameState, setGameState] = useState<GameState>({
    status: 'menu',
    score: 0,
    lives: 5,
    maxLives: 5,
    currentCountry: null,
    history: [],
    roundErrors: 0,
    autoHints: [],
    language: 'pt',
  });
  
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [feedbackStatus, setFeedbackStatus] = useState<FeedbackStatus>('idle');
  const [funFact, setFunFact] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<HighScore[]>([]);

  const t = TRANSLATIONS[gameState.language];

  // Helper: Format numbers
  const formatPopulation = (num: number) => {
    const isEn = gameState.language === 'en';
    const billion = isEn ? 'Billion' : 'Bilhões';
    const million = isEn ? 'Million' : 'Milhões';

    if (num >= 1000000000) return `${(num / 1000000000).toFixed(2)} ${billion}`;
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)} ${million}`;
    return num.toLocaleString();
  };

  // Load Leaderboard on mount
  useEffect(() => {
    const savedScore = localStorage.getItem('geoStatsHighScore');
    let userHighScores: HighScore[] = [];
    if (savedScore) {
      userHighScores = [{
        name: t.you,
        score: parseInt(savedScore, 10),
        isUser: true,
        date: new Date().toISOString().split('T')[0]
      }];
    }
    
    // Merge and sort
    const allScores = [...FAKE_GLOBAL_SCORES, ...userHighScores].sort((a, b) => b.score - a.score);
    setLeaderboard(allScores.slice(0, 10)); // Top 10
  }, [gameState.status, t.you]);

  const saveHighScore = (score: number) => {
    const currentHigh = localStorage.getItem('geoStatsHighScore');
    if (!currentHigh || score > parseInt(currentHigh, 10)) {
      localStorage.setItem('geoStatsHighScore', score.toString());
    }
  };

  const getCountryName = useCallback((c: CountryData) => {
    return gameState.language === 'en' ? c.name_en : c.name;
  }, [gameState.language]);

  const getRandomCountry = (history: string[]): CountryData | null => {
    const available = COUNTRIES.filter(c => !history.includes(c.name));
    if (available.length === 0) return null;
    return available[Math.floor(Math.random() * available.length)];
  };

  const startGame = (lives: number) => {
    const firstCountry = getRandomCountry([]);
    setGameState(prev => ({
      ...prev,
      status: 'playing',
      score: 0,
      lives: lives,
      maxLives: lives,
      currentCountry: firstCountry,
      history: firstCountry ? [firstCountry.name] : [],
      roundErrors: 0,
      autoHints: [],
    }));
    setFeedbackMessage(null);
    setFeedbackStatus('idle');
    setFunFact(null);
  };

  const restartGame = () => {
    startGame(gameState.maxLives);
  };

  const nextRound = useCallback(async () => {
    const nextCountry = getRandomCountry(gameState.history);
    
    if (!nextCountry) {
        saveHighScore(gameState.score);
        setGameState(prev => ({ ...prev, status: 'gameover' }));
        return;
    }

    setGameState(prev => ({
      ...prev,
      status: 'playing',
      currentCountry: nextCountry,
      history: [...prev.history, nextCountry.name],
      roundErrors: 0,
      autoHints: [],
    }));
    setFeedbackMessage(null);
    setFeedbackStatus('idle');
    setFunFact(null);
  }, [gameState.history, gameState.score]);

  // Global key listener for game flow
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        if (gameState.status === 'success') {
          nextRound();
        } else if (gameState.status === 'gameover') {
          restartGame();
        } else if (gameState.status === 'leaderboard') {
          setGameState(prev => ({ ...prev, status: 'menu' }));
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [gameState.status, nextRound, gameState.maxLives]);

  const handleGuess = (guess: string) => {
    if (!gameState.currentCountry || gameState.status !== 'playing') return;

    const correctName = getCountryName(gameState.currentCountry);

    if (guess.toLowerCase() === correctName.toLowerCase()) {
      // SUCCESS - UPDATE STATE IMMEDIATELY FOR PERFORMANCE
      setFeedbackStatus('success');
      
      // Update state first
      setGameState(prev => ({
        ...prev,
        status: 'success',
        score: prev.score + 100,
      }));

      // Fetch fact in background with language
      getFunFact(gameState.currentCountry, gameState.language).then(fact => {
        setFunFact(fact);
      });

    } else {
      // ERROR
      setFeedbackStatus('error');
      
      const newLives = gameState.lives - 1;
      
      if (newLives <= 0) {
        // Game Over
        saveHighScore(gameState.score);
        setGameState(prev => ({ ...prev, lives: 0, status: 'gameover' }));
      } else {
        // Continue playing with penalty
        setGameState(prev => ({ ...prev, lives: newLives }));
        
        // Reset feedback animation after 800ms so user can type again comfortably
        setTimeout(() => {
          setFeedbackStatus('idle');
        }, 800);
      }
    }
  };

  const handleRequestHint = () => {
    if (!gameState.currentCountry || gameState.status !== 'playing') return;
    
    if (gameState.lives <= 1) return;

    const country = gameState.currentCountry;
    const isEn = gameState.language === 'en';

    const possibleHints = [
       { key: 'continent', text: `${t.hints.continent}: ${isEn ? country.continent_en : country.continent}` },
       { key: 'language', text: `${t.hints.language}: ${isEn ? country.language_en : country.language}` },
       { key: 'player', text: `${t.hints.celebrity}: ${country.famousPlayer}` }
    ];

    const currentHints = gameState.autoHints;
    const available = possibleHints.filter(h => !currentHints.includes(h.text));

    if (available.length === 0) return; 

    const randomHint = available[Math.floor(Math.random() * available.length)];
    
    setGameState(prev => ({
       ...prev,
       lives: prev.lives - 1,
       autoHints: [...prev.autoHints, randomHint.text]
    }));
  };

  const toggleLanguage = () => {
    setGameState(prev => ({
      ...prev,
      language: prev.language === 'pt' ? 'en' : 'pt'
    }));
  };

  // --- Renders ---

  const LangButton = () => (
    <button 
      onClick={toggleLanguage}
      className="absolute top-6 right-6 z-50 flex items-center gap-2 bg-neutral-900/80 border border-gray-700 px-3 py-1.5 rounded-full hover:border-white transition-all group"
    >
      <span className="text-xl">{gameState.language === 'pt' ? '🇧🇷' : '🇺🇸'}</span>
      <span className="text-xs font-mono font-bold text-gray-400 group-hover:text-white">
        {gameState.language === 'pt' ? 'PT' : 'EN'}
      </span>
    </button>
  );

  if (gameState.status === 'menu') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <LangButton />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-red-600/10 rounded-full blur-[100px]"></div>

        <div className="max-w-4xl w-full text-center space-y-12 animate-fade-in relative z-10">
          <div className="space-y-4">
            <h1 className="text-6xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 tracking-tighter uppercase drop-shadow-sm">
              Geo<span className="text-red-600">Stats</span>
            </h1>
            <p className="text-red-100 text-xl md:text-2xl font-light tracking-wide">
              {t.subtitle}
            </p>
          </div>
          
          <div className="flex flex-col md:flex-row gap-6 justify-center w-full">
            <button
              onClick={() => startGame(10)}
              className="flex-1 p-8 bg-neutral-900 border-2 border-green-700 hover:bg-green-700/20 hover:border-green-500 transition-all group rounded-sm"
            >
              <h3 className="text-2xl font-black text-green-500 group-hover:text-green-400 uppercase tracking-widest mb-2">{t.easy}</h3>
              <p className="text-gray-400 font-mono">10 {t.lives}</p>
            </button>

            <button
              onClick={() => startGame(5)}
              className="flex-1 p-8 bg-neutral-900 border-2 border-yellow-700 hover:bg-yellow-700/20 hover:border-yellow-500 transition-all group rounded-sm transform scale-105 shadow-2xl z-10"
            >
              <h3 className="text-2xl font-black text-yellow-500 group-hover:text-yellow-400 uppercase tracking-widest mb-2">{t.medium}</h3>
              <p className="text-gray-400 font-mono">5 {t.lives}</p>
            </button>

            <button
              onClick={() => startGame(3)}
              className="flex-1 p-8 bg-neutral-900 border-2 border-red-700 hover:bg-red-700/20 hover:border-red-500 transition-all group rounded-sm"
            >
              <h3 className="text-2xl font-black text-red-500 group-hover:text-red-400 uppercase tracking-widest mb-2">{t.hard}</h3>
              <p className="text-gray-400 font-mono">3 {t.lives}</p>
            </button>
          </div>
          
          <div className="flex flex-col items-center gap-4">
             <div className="text-gray-500 text-xs uppercase tracking-widest">
               {t.chooseDifficulty}
             </div>
             <button 
                onClick={() => setGameState(prev => ({...prev, status: 'leaderboard'}))}
                className="text-gray-500 hover:text-white uppercase tracking-widest text-sm font-bold border-b border-transparent hover:border-red-600 transition-all pb-1"
             >
                {t.leaderboardButton}
             </button>
          </div>
        </div>
      </div>
    );
  }

  if (gameState.status === 'leaderboard') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 relative bg-black">
         <div className="max-w-2xl w-full bg-neutral-900 border-2 border-gray-800 p-8 relative">
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-8 text-center flex items-center justify-center gap-3">
               <span className="text-yellow-500">🏆</span> {t.leaderboardTitle}
            </h2>
            
            <div className="space-y-2 mb-8">
               <div className="grid grid-cols-12 text-gray-500 text-xs uppercase tracking-widest pb-2 border-b border-gray-800">
                  <div className="col-span-2">{t.pos}</div>
                  <div className="col-span-7">{t.agent}</div>
                  <div className="col-span-3 text-right">{t.points}</div>
               </div>
               {leaderboard.map((entry, index) => (
                  <div key={index} className={`grid grid-cols-12 py-3 border-b border-gray-800 items-center ${entry.isUser ? 'bg-red-900/20 text-white' : 'text-gray-400'}`}>
                     <div className="col-span-2 font-mono font-bold text-lg">
                        {index === 0 && '🥇'}
                        {index === 1 && '🥈'}
                        {index === 2 && '🥉'}
                        {index > 2 && `#${index + 1}`}
                     </div>
                     <div className="col-span-7 font-bold uppercase truncate">
                        {entry.name} {entry.isUser && <span className="text-[10px] bg-red-600 px-1 rounded ml-2">{t.you}</span>}
                     </div>
                     <div className="col-span-3 text-right font-mono text-yellow-500 font-bold">
                        {entry.score}
                     </div>
                  </div>
               ))}
            </div>

            <button
               onClick={() => setGameState(prev => ({ ...prev, status: 'menu' }))}
               className="w-full py-4 bg-white text-black font-black uppercase tracking-widest hover:bg-gray-200 transition-colors"
            >
               {t.back}
            </button>
         </div>
      </div>
    );
  }

  if (gameState.status === 'gameover') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-white relative">
        <div className="absolute inset-0 bg-red-950/20 pointer-events-none"></div>
        <div className="text-center space-y-8 animate-fade-in relative z-10 max-w-lg w-full bg-neutral-900/80 p-10 border border-red-900">
          <h2 className="text-5xl font-black text-white uppercase tracking-tighter">{t.gameOver}</h2>
          
          <div className="flex flex-col items-center gap-2">
            <p className="text-gray-400 uppercase tracking-widest text-sm">{t.finalScore}</p>
            <p className="text-7xl font-mono font-bold text-red-500 text-shadow-red">{gameState.score}</p>
          </div>
          
          {gameState.currentCountry && (
            <div className="p-6 bg-black/40 border-l-4 border-red-600">
              <p className="text-gray-500 text-sm mb-2 uppercase">{t.countryWas}</p>
              <div className="text-4xl font-bold flex items-center justify-center gap-4">
                <span className="text-5xl shadow-xl">{gameState.currentCountry.flagEmoji}</span>
                <span className="uppercase">{getCountryName(gameState.currentCountry)}</span>
              </div>
            </div>
          )}

          <div className="pt-4">
             <button
               onClick={restartGame}
               className="w-full py-4 bg-white hover:bg-gray-200 text-black font-black uppercase tracking-widest transition-all text-lg mb-3"
             >
               {t.tryAgain}
             </button>
             <div className="flex gap-2">
                <button
                  onClick={() => setGameState(prev => ({ ...prev, status: 'leaderboard' }))}
                  className="flex-1 py-3 border border-gray-700 hover:border-yellow-500 text-gray-400 hover:text-yellow-500 font-mono uppercase text-xs tracking-widest transition-all"
                >
                  {t.viewRanking}
                </button>
                <button
                  onClick={() => setGameState(prev => ({ ...prev, status: 'menu' }))}
                  className="flex-1 py-3 border border-gray-700 hover:border-white text-gray-500 hover:text-white font-mono uppercase text-xs tracking-widest transition-all"
                >
                  {t.backMenu}
                </button>
             </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col text-white overflow-x-hidden selection:bg-red-600 selection:text-white">
      {/* Header */}
      <header className="w-full p-6 flex justify-between items-center bg-black/50 backdrop-blur-md sticky top-0 z-40 border-b border-white/5">
        <div className="flex items-center gap-4">
          <div className="text-2xl font-black tracking-tighter text-white uppercase">
            Geo<span className="text-red-600">Stats</span>
          </div>
          <button 
             onClick={toggleLanguage}
             className="text-lg bg-white/10 w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/20 transition-all"
             title="Switch Language"
          >
             {gameState.language === 'pt' ? '🇧🇷' : '🇺🇸'}
          </button>
        </div>
        <div className="flex gap-6 font-mono text-sm md:text-lg font-bold">
           <div className="flex items-center gap-3 text-red-500">
            <span className="animate-pulse">❤️</span> {gameState.lives}
          </div>
          <div className="flex items-center gap-3 text-white">
            <span className="text-yellow-500">★</span> {gameState.score}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center max-w-6xl mx-auto w-full p-6 md:p-12 gap-12 relative">
        
        {/* Success Overlay - Optimized for Instant Feedback */}
        {gameState.status === 'success' && gameState.currentCountry && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-green-950/90 backdrop-blur-md p-4 animate-fade-in">
             <div className="bg-neutral-900 p-10 border-4 border-green-500 shadow-[0_0_50px_rgba(34,197,94,0.2)] max-w-xl w-full text-center space-y-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-600 via-white to-green-600"></div>
                
                <div className="text-8xl animate-bounce-short drop-shadow-2xl scale-150 py-4">{gameState.currentCountry.flagEmoji}</div>
                
                <div>
                  <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-2">{t.success}</h2>
                  <p className="text-green-500 text-2xl font-mono uppercase">{getCountryName(gameState.currentCountry)}</p>
                </div>
                
                <div className="min-h-[60px] flex items-center justify-center">
                    {funFact ? (
                      <div className="bg-black/50 p-6 text-gray-300 italic border-l-2 border-green-600 text-left animate-fade-in">
                        "{funFact}"
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-gray-500 text-sm animate-pulse">
                         <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                         {t.loadingFact}
                      </div>
                    )}
                </div>

                <button 
                  onClick={nextRound}
                  className="w-full py-5 bg-white hover:bg-gray-200 text-black font-black uppercase tracking-widest text-lg transition-all"
                >
                  {t.nextChallenge}
                </button>
             </div>
          </div>
        )}

        {/* Game Area */}
        {gameState.currentCountry && (
          <div className="w-full space-y-10">
            
            <div className="text-center space-y-2">
              <h2 className="text-xl text-red-500 uppercase font-black tracking-[0.2em]">{t.missionTitle}</h2>
              <p className="text-gray-400 font-light">{t.missionText}</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard 
                label={t.stats.POPULATION}
                value={formatPopulation(gameState.currentCountry.population)}
                colorClass=""
                icon={<UsersIcon />}
              />
              <StatCard 
                label={t.stats.HDI}
                value={gameState.currentCountry.hdi.toFixed(3)}
                colorClass=""
                icon={<ChartIcon />}
              />
              <StatCard 
                label={t.stats.HOMICIDE}
                value={gameState.currentCountry.homicideRate}
                colorClass=""
                icon={<ShieldIcon />}
              />
               <StatCard 
                label={t.stats.INDEPENDENCE}
                value={gameState.language === 'en' && gameState.currentCountry.independenceYear_en ? gameState.currentCountry.independenceYear_en : gameState.currentCountry.independenceYear}
                colorClass=""
                icon={<CalendarIcon />}
              />
            </div>

            {/* Hint Section */}
            <div className="flex flex-col items-center justify-center gap-4 min-h-[80px] w-full max-w-3xl mx-auto">
               
               {/* Unlocked Hints Display */}
               {gameState.autoHints.length > 0 && (
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full mb-4 animate-fade-in">
                       {gameState.autoHints.map((hint, idx) => (
                           <div key={idx} className="bg-blue-950/40 border border-blue-500/30 p-3 text-blue-200 text-xs font-mono uppercase tracking-wider text-center shadow-lg">
                               <span className="text-blue-500 mr-2">ℹ️</span>
                               {hint}
                           </div>
                       ))}
                   </div>
               )}

               {/* Hint Buttons Area */}
               <div className="flex flex-wrap items-center justify-center gap-4">
                   <button 
                      onClick={handleRequestHint}
                      disabled={gameState.autoHints.length >= 3 || gameState.lives <= 1}
                      className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-gray-800 px-6 py-3 rounded-full hover:border-red-600 hover:bg-red-600/10"
                   >
                       <LightBulbIcon />
                       {t.hintButton}
                   </button>
               </div>
            </div>

            {/* Input Area */}
            <div className="space-y-6">
               <GuessInput 
                 key={gameState.currentCountry.name} 
                 onGuess={handleGuess} 
                 disabled={gameState.status !== 'playing'}
                 feedback={feedbackStatus}
                 language={gameState.language}
                 placeholder={t.placeholder}
                 selectText={t.select}
                 waitText={t.wait}
               />
               
               {feedbackMessage && (
                 <div className="flex justify-center">
                    <p className="text-center text-white bg-red-600 px-6 py-2 font-black uppercase tracking-widest animate-pulse inline-block skew-x-[-12deg]">
                      {feedbackMessage}
                    </p>
                 </div>
               )}
            </div>
            
            {/* Legend */}
            <div className="pt-10 grid grid-cols-1 gap-4 text-[10px] text-gray-600 uppercase tracking-wider text-center">
               <p>{t.source}</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;