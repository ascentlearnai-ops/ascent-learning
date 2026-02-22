import React, { useState, useEffect } from 'react';
import { X, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';

const WORDS = [
    'ALGORITHM', 'NETWORK', 'SYSTEM', 'DATABASE', 'PROTOCOL',
    'SERVER', 'CLIENT', 'KERNEL', 'SYNTAX', 'COMPILE',
    'MEMORY', 'PROCESS', 'THREAD', 'ROUTER', 'DOMAIN'
];

export const MiniWordGame: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [targetWord, setTargetWord] = useState('');
    const [scrambledWord, setScrambledWord] = useState('');
    const [guess, setGuess] = useState('');
    const [message, setMessage] = useState('');
    const [score, setScore] = useState(0);

    const initializeGame = () => {
        const word = WORDS[Math.floor(Math.random() * WORDS.length)];
        setTargetWord(word);

        let scrambled = word;
        while (scrambled === word) {
            scrambled = word.split('').sort(() => Math.random() - 0.5).join('');
        }
        setScrambledWord(scrambled);
        setGuess('');
        setMessage('');
    };

    useEffect(() => {
        initializeGame();
    }, []);

    const handleGuess = () => {
        if (!guess.trim()) return;
        const currentGuess = guess.toUpperCase().trim();
        if (currentGuess === targetWord) {
            setMessage('CORRECT');
            setScore(s => s + 100);
            setTimeout(initializeGame, 1500);
        } else {
            setMessage('INCORRECT');
            setScore(s => Math.max(0, s - 20));
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleGuess();
        }
    };

    return (
        <div className="fixed inset-0 z-[500] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in font-sans">
            <div className="absolute top-6 right-6 flex gap-4 pr-4">
                <button onClick={initializeGame} className="p-2 text-zinc-400 hover:text-white transition-colors bg-white/5 rounded-full"><RefreshCw size={24} /></button>
                <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white transition-colors bg-white/5 rounded-full"><X size={24} /></button>
            </div>

            <div className="text-center mb-12">
                <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500 italic tracking-tighter mb-2 drop-shadow-md">ASCENT CIPHER</h2>
                <div className="inline-block px-4 py-1.5 bg-white/10 rounded-full text-xs font-mono text-zinc-300 font-bold uppercase tracking-widest">
                    Score: {score}
                </div>
            </div>

            <div className="w-full max-w-md mx-auto flex flex-col items-center">
                <div className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase font-bold mb-4">Decrypt the sequence</div>

                <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mb-10 w-full min-h-[64px]">
                    {scrambledWord.split('').map((char, i) => (
                        <div key={i} className="w-12 h-16 sm:w-14 sm:h-20 bg-gradient-to-br from-zinc-800 to-black border-2 border-white/10 rounded-xl flex items-center justify-center text-3xl font-black text-white shadow-xl">
                            {char}
                        </div>
                    ))}
                </div>

                <div className="w-full relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl opacity-20 blur group-hover:opacity-40 transition-opacity"></div>
                    <div className="relative flex items-center bg-[#0a0a0a] border-2 border-zinc-800 rounded-xl overflow-hidden focus-within:border-orange-500/50 transition-colors">
                        <input
                            type="text"
                            className="w-full bg-transparent px-6 py-4 text-2xl font-black text-orange-400 uppercase tracking-[0.2em] outline-none placeholder:text-zinc-700"
                            placeholder="ENTER CYPHER..."
                            value={guess}
                            onChange={(e) => setGuess(e.target.value)}
                            onKeyDown={handleKeyDown}
                            maxLength={targetWord.length}
                        />
                        <button
                            onClick={handleGuess}
                            className="bg-zinc-800 hover:bg-zinc-700 px-6 py-5 text-white font-bold tracking-widest uppercase transition-colors"
                        >
                            VERIFY
                        </button>
                    </div>
                </div>

                {message === 'CORRECT' && (
                    <div className="mt-8 flex items-center gap-3 text-green-400 font-bold text-xl uppercase tracking-widest animate-in slide-in-from-bottom-4">
                        <CheckCircle /> SEQUENCE DECRYPTED
                    </div>
                )}
                {message === 'INCORRECT' && (
                    <div className="mt-8 flex items-center gap-3 text-red-500 font-bold text-xl uppercase tracking-widest animate-in slide-in-from-bottom-4">
                        <AlertTriangle /> INVALID SEQUENCE
                    </div>
                )}
            </div>
        </div>
    );
};
