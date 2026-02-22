import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Sparkles } from 'lucide-react';

const WORDS = ["STUDY", "SMART", "BRAIN", "LOGIC", "MATHS", "CHAMP", "FOCUS", "ESSAY", "NOTES", "QUIZZ", "PAPER", "SCORE", "LEARN", "TEACH"];

export const MiniWordGame: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [targetWord, setTargetWord] = useState('');
    const [guesses, setGuesses] = useState<string[]>([]);
    const [currentGuess, setCurrentGuess] = useState('');
    const [isWon, setIsWon] = useState(false);
    const [isLost, setIsLost] = useState(false);

    useEffect(() => {
        initializeGame();

        const handleKeyDown = (e: KeyboardEvent) => {
            if (isWon || isLost) return;
            if (e.key === 'Enter') {
                submitGuess();
            } else if (e.key === 'Backspace') {
                setCurrentGuess(prev => prev.slice(0, -1));
            } else if (/^[a-zA-Z]$/.test(e.key) && currentGuess.length < 5) {
                setCurrentGuess(prev => prev + e.key.toUpperCase());
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentGuess, isWon, isLost]); // need dependencies here to ensure latest state is captured

    const initializeGame = () => {
        setTargetWord(WORDS[Math.floor(Math.random() * WORDS.length)]);
        setGuesses([]);
        setCurrentGuess('');
        setIsWon(false);
        setIsLost(false);
    };

    const submitGuess = () => {
        let activeGuess = currentGuess; // Use state variable directly from the effect's render closure, but it might be stale if effect deps are missing. Wait, the effect deps has currentGuess.
        if (activeGuess.length !== 5) return;

        const newGuesses = [...guesses, activeGuess];
        setGuesses(newGuesses);
        setCurrentGuess('');

        if (activeGuess === targetWord) {
            setIsWon(true);
        } else if (newGuesses.length >= 6) {
            setIsLost(true);
        }
    };

    const handleKeyClick = (key: string) => {
        if (isWon || isLost) return;
        if (key === 'ENTER') {
            submitGuess();
        } else if (key === 'DEL') {
            setCurrentGuess(prev => prev.slice(0, -1));
        } else if (currentGuess.length < 5) {
            setCurrentGuess(prev => prev + key);
        }
    };

    const getKeyStatus = (key: string) => {
        let status = 'bg-zinc-800 text-white';
        for (const guess of guesses) {
            for (let i = 0; i < 5; i++) {
                if (guess[i] === key) {
                    if (targetWord[i] === key) return 'bg-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.3)]';
                    if (targetWord.includes(key) && status !== 'bg-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.3)]') {
                        status = 'bg-yellow-500 text-white';
                    } else if (status === 'bg-zinc-800 text-white') {
                        status = 'bg-zinc-900 border-zinc-700 text-zinc-600';
                    }
                }
            }
        }
        return status;
    };

    const keys = [
        ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
        ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
        ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'DEL']
    ];

    return (
        <div className="fixed inset-0 z-[500] flex flex-col items-center justify-center bg-black/95 backdrop-blur-sm p-4 animate-fade-in font-sans">
            <div className="absolute top-6 right-6 flex gap-4 pr-4 z-50">
                <button onClick={initializeGame} className="p-2 text-zinc-400 hover:text-white transition-colors bg-white/5 rounded-full"><RefreshCw size={24} /></button>
                <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white transition-colors bg-white/5 rounded-full"><X size={24} /></button>
            </div>

            <div className="text-center mb-8">
                <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-500 italic tracking-tighter mb-2 drop-shadow-md">ASCENT WORDLE</h2>
                <div className="inline-block px-4 py-1.5 bg-white/10 rounded-full text-xs font-mono text-zinc-300 font-bold uppercase tracking-widest">
                    Attempts: {guesses.length} / 6
                </div>
            </div>

            <div className="flex flex-col gap-2 mb-8">
                {Array(6).fill(null).map((_, rowIdx) => {
                    const guess = guesses[rowIdx];
                    const isActive = rowIdx === guesses.length;

                    return (
                        <div key={rowIdx} className="flex gap-2">
                            {Array(5).fill(null).map((_, colIdx) => {
                                const char = guess ? guess[colIdx] : isActive ? currentGuess[colIdx] : '';
                                let colorClass = 'bg-black border-zinc-800 text-zinc-400';

                                if (guess) {
                                    if (guess[colIdx] === targetWord[colIdx]) {
                                        colorClass = 'bg-green-500 border-green-400 shadow-[0_0_15px_rgba(34,197,94,0.3)] text-white';
                                    } else if (targetWord.includes(guess[colIdx])) {
                                        colorClass = 'bg-yellow-500 border-yellow-400 text-white';
                                    } else {
                                        colorClass = 'bg-zinc-900 border-zinc-800 text-zinc-600';
                                    }
                                } else if (isActive && currentGuess[colIdx]) {
                                    colorClass = 'bg-zinc-800 border-zinc-600 text-white';
                                }

                                return (
                                    <div key={colIdx} className={`w-14 h-14 sm:w-16 sm:h-16 border-2 flex items-center justify-center text-3xl font-black transition-colors rounded-xl ${colorClass}`}>
                                        {char}
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </div>

            {(isWon || isLost) && (
                <div className="mt-4 mb-8 text-center animate-in zoom-in duration-500 absolute z-10 bg-black/80 backdrop-blur-md p-8 rounded-3xl border border-white/20 shadow-2xl">
                    <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(255,255,255,0.2)] ${isWon ? 'bg-green-500/20 border border-green-500/50' : 'bg-red-500/20 border border-red-500/50'}`}>
                        {isWon ? <Sparkles size={32} className="text-green-400" /> : <X size={32} className="text-red-400" />}
                    </div>
                    <h3 className={`text-3xl font-black mb-2 ${isWon ? 'text-green-400' : 'text-red-400'}`}>
                        {isWon ? 'NICE WORK' : 'SYSTEM FAILURE'}
                    </h3>
                    <p className="text-white text-lg font-mono">Word was: <span className="font-bold text-amber-400">{targetWord}</span></p>
                    <button onClick={initializeGame} className="mt-6 px-6 py-2 bg-white text-black font-bold uppercase rounded-full hover:scale-105 transition-transform">
                        Try Again
                    </button>
                </div>
            )}

            <div className="flex flex-col gap-2 w-full max-w-lg mt-auto pb-10">
                {keys.map((row, rowIdx) => (
                    <div key={rowIdx} className="flex justify-center gap-1.5 sm:gap-2">
                        {row.map(key => (
                            <button
                                key={key}
                                onClick={() => handleKeyClick(key)}
                                className={`px-2 py-3 sm:px-4 sm:py-4 rounded-lg font-bold flex-1 text-sm sm:text-base min-w-[30px] sm:min-w-[40px] focus:outline-none focus:ring-2 active:scale-95 transition-all text-center border-b-4 border-black/30 ${getKeyStatus(key)}`}
                            >
                                {key}
                            </button>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
};
