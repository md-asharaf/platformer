import { useState } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { fetchQuestions } from './services/api';
import type { QuizQuestion } from './types/api';

let audioCtx: AudioContext | null = null;

type GameState = 'menu' | 'playing' | 'paused' | 'gameover';

function App() {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [gameState, setGameState] = useState<GameState>('menu');
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [totalRight, setTotalRight] = useState(0);
  const [removedOptions, setRemovedOptions] = useState<string[]>([]);
  const [showHint, setShowHint] = useState(false);
  const [showRestartModal, setShowRestartModal] = useState(false);

  const [apiError, setApiError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const startGame = async () => {
    setApiError(null);
    setIsLoading(true);
    try {
      const data = await fetchQuestions();
      setQuestions(data);
      setScore(0);
      setStreak(0);
      setTotalRight(0);
      setCurrentQuestionIndex(0);
      setRemovedOptions([]);
      setGameState('playing');
    } catch (e: any) {
      setApiError(e.message || 'Failed to load questions.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswer = (isCorrect: boolean) => {
    // Play Sound
    if (isCorrect) {
      playSound('correct');
      setScore(s => s + 100);
      setStreak(s => s + 1);
      setTotalRight(t => t + 1);
    } else {
      playSound('wrong');
      setScore(s => s - 10);
      setStreak(0);
    }

    setRemovedOptions([]);
    setShowHint(false);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(i => i + 1);
    } else {
      setGameState('gameover');
    }
  };

  const playSound = (type: 'correct' | 'wrong' | 'jump' | 'eat') => {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    if (type === 'correct') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(600, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    } else if (type === 'wrong') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.3);
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    } else if (type === 'jump') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(300, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
    }

    osc.start();
    osc.stop(audioCtx.currentTime + (type === 'wrong' ? 0.3 : 0.1));
  };

  const handleFiftyFifty = () => {
    const currentQ = questions[currentQuestionIndex];
    if (!currentQ || removedOptions.length > 0) return;

    const incorrectOptions = currentQ.options.filter(o => o !== currentQ.answer.value);
    const toRemove = incorrectOptions.sort(() => 0.5 - Math.random()).slice(0, 2);
    setRemovedOptions(toRemove);
  };

  const currentQ = questions[currentQuestionIndex];

  return (
    <div className="app-container" style={{ position: 'relative', width: '100vw', height: '100dvh', overflow: 'hidden', backgroundColor: '#b48a47' }}>

      {/* Background / Canvas */}
      <div className="canvas-container" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        <GameCanvas
          question={currentQ}
          gameState={gameState}
          removedOptions={removedOptions}
          onAnswer={handleAnswer}
          playSound={playSound}
        />
      </div>

      {/* Desktop HUD */}
      <div className="desktop-ui" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', zIndex: 1 }}>
        {gameState === 'playing' || gameState === 'paused' ? (
          <div className="game-panel hud-container" style={{ margin: '20px', padding: '15px', pointerEvents: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="hud-left" style={{ display: 'flex', gap: '10px' }}>
              <button className="retro-btn" onClick={() => setGameState(gameState === 'playing' ? 'paused' : 'playing')}>
                {gameState === 'playing' ? 'II' : '►'}
              </button>
              <button className="retro-btn" onClick={() => setShowRestartModal(true)}>
                ↻
              </button>
            </div>

            <div className="hud-center" style={{ textAlign: 'center', flex: 1, margin: '0 20px', minWidth: 0 }}>
              <h2 style={{ fontSize: '1.2rem', marginBottom: '15px', wordBreak: 'break-word', maxWidth: '800px', margin: '0 auto 15px auto' }}>{currentQ?.prompt.value}</h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '15px', width: '100%', maxWidth: '900px', margin: '0 auto' }}>
                {currentQ?.options.map((opt, idx) => {
                  const letters = ['A', 'B', 'C', 'D'];
                  const colors = ['#c0392b', '#2980b9', '#27ae60', '#f39c12'];
                  const isRemoved = removedOptions.includes(opt);
                  return (
                    <div key={idx} style={{
                      padding: '12px 20px',
                      minWidth: '250px',
                      maxWidth: '400px',
                      flex: '1 1 auto',
                      backgroundColor: isRemoved ? '#555' : colors[idx],
                      color: isRemoved ? '#aaa' : '#fff',
                      textDecoration: isRemoved ? 'line-through' : 'none',
                      borderRadius: '4px',
                      border: '3px solid #000',
                      boxShadow: '3px 3px 0px #000',
                      fontWeight: 'bold',
                      fontSize: '1rem',
                      textAlign: 'center',
                      wordBreak: 'break-word',
                      lineHeight: '1.4',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <span style={{ fontSize: '1.2rem', marginRight: '8px' }}>{letters[idx]}:</span> {opt}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="hud-right" style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
              <div style={{ textAlign: 'right' }}>
                <div>Score: <strong style={{ color: 'var(--primary)' }}>{score}</strong></div>
                <div>Streak: {streak}</div>
              </div>
              <button className="retro-btn" onClick={handleFiftyFifty} disabled={removedOptions.length > 0}>50/50</button>
              <button className="retro-btn" onClick={() => setShowHint(true)} disabled={!currentQ?.hint}>Hint</button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Mobile HUD */}
      <div className="mobile-ui" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', zIndex: 1 }}>
        {gameState === 'playing' || gameState === 'paused' ? (
          <>
            {/* TOP BLOCK: Question & Options */}
            <div style={{ padding: '15px', margin: '0 10px', pointerEvents: 'auto', background: '#8b5a2b', border: '4px solid #5c3614', borderRadius: '8px', boxShadow: '0px 4px 0px rgba(0,0,0,0.4)' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
                <div style={{ fontSize: '0.9rem', textAlign: 'center', fontWeight: 'bold' }}>
                  Score: <strong style={{ color: 'var(--primary)' }}>{score}</strong> &nbsp;|&nbsp; Streak: {streak}
                </div>
              </div>
              <h2 style={{ fontSize: '1rem', marginBottom: '10px', wordBreak: 'break-word', textAlign: 'center', fontWeight: 'bold', color: '#fff' }}>{currentQ?.prompt.value}</h2>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {currentQ?.options.map((opt, idx) => {
                  const letters = ['A', 'B', 'C', 'D'];
                  const colors = ['#c0392b', '#2980b9', '#27ae60', '#f39c12'];
                  const isRemoved = removedOptions.includes(opt);
                  return (
                    <div key={idx} style={{
                      padding: '8px',
                      backgroundColor: isRemoved ? '#555' : colors[idx],
                      color: isRemoved ? '#aaa' : '#fff',
                      textDecoration: isRemoved ? 'line-through' : 'none',
                      borderRadius: '4px',
                      border: '2px solid #000',
                      boxShadow: '2px 2px 0px #000',
                      fontWeight: 'bold',
                      fontSize: '0.8rem',
                      textAlign: 'center',
                      wordBreak: 'break-word',
                      lineHeight: '1.2'
                    }}>
                      <span style={{ fontSize: '0.9rem', marginRight: '4px' }}>{letters[idx]}:</span> {opt}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* BOTTOM BLOCK: Utilities & Controls */}
            <div style={{ padding: '15px', margin: '0 10px', pointerEvents: 'auto', display: 'flex', flexDirection: 'column', gap: '15px', background: '#8b5a2b', border: '4px solid #5c3614', borderRadius: '8px', boxShadow: '0px 4px 0px rgba(0,0,0,0.4)' }}>

              {/* Utilities Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button className="retro-btn" style={{ padding: '6px 15px', fontSize: '1rem' }} onClick={() => setGameState(gameState === 'playing' ? 'paused' : 'playing')}>
                  {gameState === 'playing' ? 'II' : '►'}
                </button>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="retro-btn" style={{ padding: '6px 15px', fontSize: '0.9rem' }} onClick={handleFiftyFifty} disabled={removedOptions.length > 0}>50/50</button>
                  <button className="retro-btn" style={{ padding: '6px 15px', fontSize: '0.9rem' }} onClick={() => setShowHint(true)} disabled={!currentQ?.hint}>Hint</button>
                </div>
              </div>

              {/* Directional Controls Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: '15px' }}>
                  <button className="retro-btn" style={{ width: '65px', height: '65px', fontSize: '1.8rem', opacity: 0.9, padding: 0 }} onTouchStart={(e) => { e.preventDefault(); window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' })); }} onTouchEnd={(e) => { e.preventDefault(); window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowLeft' })); }}>←</button>
                  <button className="retro-btn" style={{ width: '65px', height: '65px', fontSize: '1.8rem', opacity: 0.9, padding: 0 }} onTouchStart={(e) => { e.preventDefault(); window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' })); }} onTouchEnd={(e) => { e.preventDefault(); window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowRight' })); }}>→</button>
                </div>
                <button className="retro-btn" style={{ width: '65px', height: '65px', fontSize: '1.8rem', opacity: 0.9, padding: 0 }} onTouchStart={(e) => { e.preventDefault(); window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' })); }} onTouchEnd={(e) => { e.preventDefault(); window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowUp' })); }}>↑</button>
              </div>

            </div>
          </>
        ) : null}
      </div>

      {/* Modals & Screens */}
      <div className="modals-container" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', pointerEvents: 'none', zIndex: 100 }}>

        {gameState === 'menu' && (
          <div className="game-panel animate-fade-in" style={{ padding: '40px', textAlign: 'center', pointerEvents: 'auto' }}>
            <h1 style={{ fontSize: '3rem', marginBottom: '20px', color: 'var(--primary)' }}>Quiz Platformer</h1>
            <p style={{ marginBottom: '30px', textShadow: '2px 2px 0px #000' }}>Jump over the wrong answers and land in the right one!</p>
            {apiError && <div style={{ color: 'var(--danger)', marginBottom: '20px', fontWeight: 'bold' }}>{apiError}</div>}
            <button className="retro-btn" style={{ fontSize: '1.5rem', padding: '15px 40px' }} onClick={startGame} disabled={isLoading}>
              {isLoading ? 'Loading...' : 'Play Game'}
            </button>
          </div>
        )}

        {gameState === 'gameover' && (
          <div className="game-panel animate-fade-in" style={{ padding: '40px', textAlign: 'center', pointerEvents: 'auto' }}>
            <h1 style={{ fontSize: '3rem', marginBottom: '20px' }}>Game Over!</h1>
            <div style={{ fontSize: '1.5rem', marginBottom: '10px' }}>Total Points: <strong style={{ color: 'var(--primary)' }}>{score}</strong></div>
            <div style={{ fontSize: '1.2rem', marginBottom: '10px' }}>Total Right: {totalRight}</div>
            <div style={{ fontSize: '1.2rem', marginBottom: '30px' }}>Max Streak: {streak}</div>
            {apiError && <div style={{ color: 'var(--danger)', marginBottom: '20px', fontWeight: 'bold' }}>{apiError}</div>}
            <button className="retro-btn" style={{ fontSize: '1.5rem', padding: '15px 40px' }} onClick={startGame} disabled={isLoading}>
              {isLoading ? 'Loading...' : 'Play Again'}
            </button>
          </div>
        )}

        {showHint && (
          <div className="game-panel animate-fade-in" style={{ padding: '30px', position: 'absolute', zIndex: 10, pointerEvents: 'auto' }}>
            <h3 style={{ marginBottom: '15px' }}>Hint</h3>
            <p>{currentQ?.hint?.value}</p>
            <button className="retro-btn" style={{ marginTop: '20px' }} onClick={() => setShowHint(false)}>Close</button>
          </div>
        )}

        {showRestartModal && (
          <div className="game-panel animate-fade-in" style={{ padding: '30px', position: 'absolute', zIndex: 10, textAlign: 'center', pointerEvents: 'auto' }}>
            <h3 style={{ marginBottom: '15px' }}>Restart Game?</h3>
            <p style={{ marginBottom: '20px' }}>Are you sure you want to restart? All progress will be lost.</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button className="retro-btn" onClick={() => setShowRestartModal(false)}>Cancel</button>
              <button className="retro-btn" onClick={() => { setShowRestartModal(false); startGame(); }}>Restart</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;
