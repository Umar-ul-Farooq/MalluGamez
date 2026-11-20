import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  EMOJI_MOVIES,
  validateMovieAnswer,
  type EmojiMovieItem,
  type EmojiDifficulty,
} from '@chitram/shared';

type QuestionCountOption = 10 | 20 | 'unlimited';

export default function EmojiSinglePlayerScreen() {
  const navigate = useNavigate();

  // Setup state
  const [inGame, setInGame] = useState(false);
  const [difficulty, setDifficulty] = useState<EmojiDifficulty>('mixed');
  const [questionCount, setQuestionCount] = useState<QuestionCountOption>(10);

  // Active game state
  const [questions, setQuestions] = useState<EmojiMovieItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [attemptsLeft, setAttemptsLeft] = useState(2);
  const [showHint, setShowHint] = useState(false);
  const [userGuess, setUserGuess] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'wrong' | 'reveal' | null; message: string }>({
    type: null,
    message: '',
  });
  const [isAnswered, setIsAnswered] = useState(false);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [shake, setShake] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize questions on game start
  function startGame() {
    let pool = [...EMOJI_MOVIES];
    if (difficulty !== 'mixed') {
      pool = pool.filter(m => m.difficulty === difficulty);
    }
    const shuffled = pool.sort(() => Math.random() - 0.5);
    const selected = questionCount === 'unlimited' ? shuffled : shuffled.slice(0, questionCount);

    setQuestions(selected);
    setCurrentIndex(0);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setTotalCorrect(0);
    setAttemptsLeft(2);
    setShowHint(false);
    setUserGuess('');
    setFeedback({ type: null, message: '' });
    setIsAnswered(false);
    setGameOver(false);
    setInGame(true);
  }

  const currentMovie = questions[currentIndex];

  useEffect(() => {
    if (inGame && !isAnswered && !gameOver) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [currentIndex, inGame, isAnswered, gameOver]);

  function handleGuess(e: React.FormEvent) {
    e.preventDefault();
    if (!userGuess.trim() || isAnswered || !currentMovie) return;

    const isMatch = validateMovieAnswer(userGuess, currentMovie);

    if (isMatch) {
      // Correct!
      const newStreak = streak + 1;
      const streakBonus = newStreak >= 3 ? 2 : 0;
      const pointsWon = 10 + streakBonus;

      setScore(s => s + pointsWon);
      setStreak(newStreak);
      if (newStreak > bestStreak) setBestStreak(newStreak);
      setTotalCorrect(c => c + 1);
      setIsAnswered(true);
      setFeedback({
        type: 'correct',
        message: streakBonus > 0
          ? `🎉 ശരിയുത്തരം! +10 പോയിന്റ് (🔥 +${streakBonus} സ്ട്രീക്ക് ബോണസ്!)`
          : '🎉 ശരിയുത്തരം! +10 പോയിന്റ്സ്!',
      });
    } else {
      // Wrong
      const remaining = attemptsLeft - 1;
      setAttemptsLeft(remaining);
      setStreak(0);
      setShake(true);
      setTimeout(() => setShake(false), 500);

      if (remaining > 0) {
        setFeedback({
          type: 'wrong',
          message: '❌ തെറ്റായ ഉത്തരം! ഒരു അവസരം കൂടി ബാക്കിയുണ്ട് (1 attempt left)',
        });
      } else {
        // Revealed after 2 attempts
        setIsAnswered(true);
        setFeedback({
          type: 'reveal',
          message: 'അവസരങ്ങൾ കഴിഞ്ഞു! ശരിയുത്തരം താഴെ നൽകുന്നു.',
        });
      }
    }
  }

  function handleGiveUp() {
    if (isAnswered || !currentMovie) return;
    setIsAnswered(true);
    setStreak(0);
    setFeedback({
      type: 'reveal',
      message: 'ശരിയുത്തരം താഴെ കാണാം.',
    });
  }

  function nextQuestion() {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(i => i + 1);
      setAttemptsLeft(2);
      setShowHint(false);
      setUserGuess('');
      setFeedback({ type: null, message: '' });
      setIsAnswered(false);
    } else {
      setGameOver(true);
    }
  }

  // ─── Setup View ─────────────────────────────────────────────────────────────
  if (!inGame) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center p-6 bg-gradient-to-br from-gray-950 via-purple-950/40 to-gray-950 select-none">
        <div className="w-full max-w-md card border-2 border-purple-500/40 shadow-2xl p-6 sm:p-8 animate-fade-in">
          <div className="text-center mb-6">
            <span className="text-6xl mb-2 inline-block">🎬🍿</span>
            <h1 className="text-3xl font-black text-white mt-1">Emoji Movie Challenge</h1>
            <p className="ml-text text-amber-300 font-extrabold text-lg mt-0.5">
              സിനിമ കണ്ടുപിടിക്കാമോ?
            </p>
            <p className="text-white/50 text-xs mt-1">
              Single Player Mode • ഇമോജികളിലൂടെ മലയാള സിനിമ കണ്ടെത്തൂ!
            </p>
          </div>

          <div className="flex flex-col gap-5">
            {/* Difficulty selector */}
            <div>
              <label className="text-white/60 text-xs uppercase font-bold tracking-wider mb-2 block">
                Difficulty / കാഠിന്യം
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['easy', 'medium', 'hard', 'mixed'] as EmojiDifficulty[]).map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDifficulty(d)}
                    className={`py-2 px-1 text-xs font-bold rounded-xl transition-all capitalize
                      ${difficulty === d
                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/50 scale-105'
                        : 'bg-white/10 text-white/60 hover:text-white'}`}
                  >
                    {d === 'easy' ? '🟢 Easy' : d === 'medium' ? '🟡 Medium' : d === 'hard' ? '🔴 Hard' : '🎲 Mixed'}
                  </button>
                ))}
              </div>
            </div>

            {/* Questions count */}
            <div>
              <label className="text-white/60 text-xs uppercase font-bold tracking-wider mb-2 block">
                Number of Questions / ചോദ്യങ്ങൾ
              </label>
              <div className="grid grid-cols-3 gap-2">
                {([10, 20, 'unlimited'] as QuestionCountOption[]).map(cnt => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setQuestionCount(cnt)}
                    className={`py-2.5 text-xs font-bold rounded-xl transition-all capitalize
                      ${questionCount === cnt
                        ? 'bg-amber-500 text-gray-950 shadow-lg shadow-amber-950/50 scale-105 font-black'
                        : 'bg-white/10 text-white/60 hover:text-white'}`}
                  >
                    {cnt === 'unlimited' ? '♾️ Unlimited' : `${cnt} Questions`}
                  </button>
                ))}
              </div>
            </div>

            {/* Rules quick pill */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 text-xs text-white/60 space-y-1.5">
              <p className="flex items-center gap-2">
                <span>🎯</span> <span>ഒരു ചോദ്യത്തിന് <strong>2 അവസരങ്ങൾ</strong> (2 attempts)</span>
              </p>
              <p className="flex items-center gap-2">
                <span>⭐</span> <span>ശരിയുത്തരത്തിന് <strong>10 പോയിന്റ്സ്</strong></span>
              </p>
              <p className="flex items-center gap-2">
                <span>🔥</span> <span>തുടർച്ചയായ വിജയങ്ങൾക്ക് <strong>സ്ട്രീക്ക് ബോണസ്</strong></span>
              </p>
              <p className="flex items-center gap-2">
                <span>🔡</span> <span>മലയാളത്തിലോ മംഗ്ലീഷിലോ (Manglish) ടൈപ്പ് ചെയ്യാം</span>
              </p>
            </div>

            {/* Start Button */}
            <button
              onClick={startGame}
              className="btn-primary py-4 text-lg font-black bg-purple-600 hover:bg-purple-500 text-white rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-purple-950/50 mt-1"
            >
              <span>🚀</span> <span>കളി തുടങ്ങാം / Start Game</span>
            </button>

            <button
              onClick={() => navigate('/')}
              className="text-white/40 text-xs hover:text-white text-center py-1 transition-colors"
            >
              ← Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Game Over / Summary View ───────────────────────────────────────────────
  if (gameOver) {
    const totalAttempted = currentIndex + (isAnswered ? 1 : 0);
    const accuracy = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;

    let badge = 'സിനിമ പ്രേമി 🎬';
    if (accuracy >= 80) badge = 'സിനിമ മാസ്റ്റർ 👑';
    else if (accuracy >= 60) badge = 'സിനിമ പ്രാന്തൻ ⭐';
    else if (accuracy >= 40) badge = 'താര ആരാധകൻ 🌟';

    return (
      <div className="min-h-full flex flex-col items-center justify-center p-6 bg-gradient-to-br from-gray-950 via-purple-950/40 to-gray-950 select-none">
        <div className="w-full max-w-md card border-2 border-amber-500/40 shadow-2xl p-6 sm:p-8 text-center animate-fade-in">
          <span className="text-6xl mb-2 inline-block">🏆</span>
          <h2 className="text-3xl font-black text-white">കളി പൂർത്തിയായി!</h2>
          <p className="text-amber-400 font-bold text-sm mt-1">Challenge Completed</p>

          <div className="my-6 inline-block bg-purple-950/60 border border-purple-500/30 rounded-2xl px-5 py-2">
            <span className="text-xs uppercase tracking-widest text-white/50 block font-bold">Your Title</span>
            <span className="text-xl font-black text-amber-300">{badge}</span>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="card p-3 bg-white/5 border border-white/10 rounded-2xl">
              <span className="text-white/40 text-[10px] uppercase font-bold tracking-wider block">Score</span>
              <span className="text-2xl font-black text-amber-400">{score}</span>
            </div>
            <div className="card p-3 bg-white/5 border border-white/10 rounded-2xl">
              <span className="text-white/40 text-[10px] uppercase font-bold tracking-wider block">Accuracy</span>
              <span className="text-2xl font-black text-green-400">{accuracy}%</span>
            </div>
            <div className="card p-3 bg-white/5 border border-white/10 rounded-2xl">
              <span className="text-white/40 text-[10px] uppercase font-bold tracking-wider block">Best Streak</span>
              <span className="text-2xl font-black text-red-400">🔥 {bestStreak}</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={startGame}
              className="btn-primary py-3.5 text-base font-black bg-amber-500 hover:bg-amber-400 text-gray-950 rounded-2xl shadow-xl shadow-amber-950/50"
            >
              🔄 വീണ്ടും കളിക്കാം / Play Again
            </button>
            <button
              onClick={() => setInGame(false)}
              className="btn-secondary py-3 text-sm text-white/80 rounded-2xl"
            >
              ⚙️ Change Settings
            </button>
            <button
              onClick={() => navigate('/')}
              className="text-white/40 text-xs hover:text-white py-1 transition-colors"
            >
              ← Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Active Question View ───────────────────────────────────────────────────
  return (
    <div className="min-h-full flex flex-col justify-between p-4 sm:p-6 bg-gradient-to-br from-gray-950 via-purple-950/40 to-gray-950 select-none">
      {/* Top Bar */}
      <div className="w-full max-w-lg mx-auto flex items-center justify-between gap-3">
        <button
          onClick={() => {
            if (window.confirm('Leave current game?')) navigate('/');
          }}
          className="text-white/40 text-xs hover:text-white px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
        >
          ← Home
        </button>

        <div className="flex items-center gap-3">
          {streak >= 2 && (
            <div className="bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-black px-2.5 py-1 rounded-full flex items-center gap-1 animate-bounce">
              <span>🔥</span> <span>{streak} Streak</span>
            </div>
          )}

          <div className="bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black px-3 py-1 rounded-full">
            🏆 {score} pts
          </div>
        </div>
      </div>

      {/* Main Puzzle Card */}
      <div className="w-full max-w-lg mx-auto my-auto">
        <div className={`card border-2 border-purple-500/30 p-6 sm:p-8 shadow-2xl relative transition-transform ${shake ? 'animate-shake' : ''}`}>
          {/* Question Counter & Meta */}
          <div className="flex items-center justify-between text-xs text-white/50 mb-4">
            <span className="font-bold uppercase tracking-wider">
              Question {currentIndex + 1} {questions.length > 0 ? `of ${questions.length}` : ''}
            </span>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-white/10 text-white/70 font-semibold">
                {currentMovie?.category}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-white/10 text-white/70 capitalize font-semibold">
                {currentMovie?.difficulty}
              </span>
            </div>
          </div>

          {/* Big Emoji Puzzle Box */}
          <div className="bg-gradient-to-b from-purple-900/30 to-black/40 border border-purple-500/20 rounded-3xl p-6 sm:p-8 text-center my-2 shadow-inner">
            <span className="text-5xl sm:text-6xl tracking-wider select-all animate-fade-in inline-block py-2">
              {currentMovie?.emojis}
            </span>
          </div>

          {/* Hint Section */}
          <div className="mt-3 text-center">
            {!showHint ? (
              <button
                type="button"
                onClick={() => setShowHint(true)}
                className="text-xs text-purple-300/80 hover:text-purple-200 underline underline-offset-4 decoration-purple-500/50"
              >
                💡 സൂചന കാണുക (Show Hint)
              </button>
            ) : (
              <div className="bg-purple-950/40 border border-purple-500/30 rounded-xl p-3 text-xs text-purple-200 animate-fade-in text-left">
                <span className="font-bold text-amber-300 block mb-0.5">💡 Hint:</span>
                {currentMovie?.hint}
              </div>
            )}
          </div>

          {/* Answer State or Input Field */}
          {!isAnswered ? (
            <form onSubmit={handleGuess} className="mt-5 flex flex-col gap-3">
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={userGuess}
                  onChange={e => setUserGuess(e.target.value)}
                  placeholder="സിനിമയുടെ പേര് ടൈപ്പ് ചെയ്യൂ (e.g. Premam)..."
                  autoComplete="off"
                  className="input-field text-base sm:text-lg pr-20 py-3.5 bg-black/40 border-purple-500/40 focus:border-amber-400"
                />
                <button
                  type="submit"
                  disabled={!userGuess.trim()}
                  className="absolute right-2 top-2 bottom-2 px-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-30 disabled:hover:bg-purple-600 text-white text-xs font-black rounded-lg transition-all"
                >
                  Guess
                </button>
              </div>

              {/* Attempts counter & Give up */}
              <div className="flex items-center justify-between text-xs text-white/50 px-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold">Attempts:</span>
                  <span className={`w-2 h-2 rounded-full ${attemptsLeft >= 1 ? 'bg-green-400' : 'bg-red-500'}`} />
                  <span className={`w-2 h-2 rounded-full ${attemptsLeft >= 2 ? 'bg-green-400' : 'bg-white/20'}`} />
                </div>
                <button
                  type="button"
                  onClick={handleGiveUp}
                  className="text-white/40 hover:text-white/70 transition-colors"
                >
                  അറിയില്ല / Skip
                </button>
              </div>
            </form>
          ) : (
            /* Reveal Card */
            <div className="mt-5 bg-gradient-to-b from-purple-950/60 to-black/60 border-2 border-amber-500/50 rounded-2xl p-5 text-center animate-bounce-in">
              <span className="text-white/40 text-[10px] uppercase font-bold tracking-widest block mb-1">
                The Movie is / സിനിമ
              </span>
              <h3 className="text-2xl font-black text-white ml-text">
                {currentMovie?.title}
              </h3>
              <p className="text-amber-400 text-base font-bold">
                {currentMovie?.manglish} ({currentMovie?.year})
              </p>

              <button
                onClick={nextQuestion}
                autoFocus
                className="btn-primary w-full py-3.5 mt-4 text-base font-black bg-amber-500 hover:bg-amber-400 text-gray-950 rounded-xl shadow-lg shadow-amber-950/50 flex items-center justify-center gap-2"
              >
                <span>അടുത്ത ചോദ്യം / Next</span>
                <span>→</span>
              </button>
            </div>
          )}

          {/* Feedback message */}
          {feedback.message && !isAnswered && (
            <div className={`mt-3 p-2.5 rounded-xl text-xs text-center font-bold animate-fade-in
              ${feedback.type === 'wrong' ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-purple-500/20 text-purple-200'}`}>
              {feedback.message}
            </div>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="text-center text-white/30 text-[11px] py-2">
        Malayalam Unicode & English Transliteration supported
      </div>
    </div>
  );
}
