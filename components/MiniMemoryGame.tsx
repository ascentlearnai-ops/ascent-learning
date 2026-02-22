import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Layers, Sparkles, Brain, Cpu, Database, Zap, Rocket, Activity, Globe, Monitor } from 'lucide-react';

const ICONS = [Brain, Cpu, Database, Zap, Rocket, Activity, Globe, Monitor];
const PAIRS = [...ICONS, ...ICONS];

interface Card {
    id: number;
    icon: React.ElementType;
    isFlipped: boolean;
    isMatched: boolean;
}

export const MiniMemoryGame: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [cards, setCards] = useState<Card[]>([]);
    const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
    const [matches, setMatches] = useState(0);
    const [moves, setMoves] = useState(0);
    const [isWon, setIsWon] = useState(false);

    useEffect(() => {
        initializeGame();
    }, []);

    const initializeGame = () => {
        const shuffled = [...PAIRS].sort(() => Math.random() - 0.5).map((icon, idx) => ({
            id: idx,
            icon,
            isFlipped: false,
            isMatched: false
        }));
        setCards(shuffled);
        setFlippedIndices([]);
        setMatches(0);
        setMoves(0);
        setIsWon(false);
    };

    const handleCardClick = (index: number) => {
        if (flippedIndices.length === 2) return;
        if (cards[index].isFlipped || cards[index].isMatched) return;

        const newFlipped = [...flippedIndices, index];
        setFlippedIndices(newFlipped);

        const newCards = [...cards];
        newCards[index].isFlipped = true;
        setCards(newCards);

        if (newFlipped.length === 2) {
            setMoves(m => m + 1);
            const [firstIndex, secondIndex] = newFlipped;
            if (cards[firstIndex].icon === cards[secondIndex].icon) {
                // Match
                setTimeout(() => {
                    const matchedCards = [...cards];
                    matchedCards[firstIndex].isMatched = true;
                    matchedCards[secondIndex].isMatched = true;
                    setCards(matchedCards);
                    setFlippedIndices([]);
                    setMatches(m => m + 1);
                    if (matches + 1 === ICONS.length) {
                        setIsWon(true);
                    }
                }, 500);
            } else {
                // No match
                setTimeout(() => {
                    const resetCards = [...cards];
                    resetCards[firstIndex].isFlipped = false;
                    resetCards[secondIndex].isFlipped = false;
                    setCards(resetCards);
                    setFlippedIndices([]);
                }, 1000);
            }
        }
    };

    return (
        <div className="fixed inset-0 z-[500] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in font-sans">
            <div className="absolute top-6 right-6 flex gap-4 pr-4">
                <button onClick={initializeGame} className="p-2 text-zinc-400 hover:text-white transition-colors bg-white/5 rounded-full"><RefreshCw size={24} /></button>
                <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white transition-colors bg-white/5 rounded-full"><X size={24} /></button>
            </div>

            <div className="text-center mb-8">
                <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-500 italic tracking-tighter mb-2 drop-shadow-md">ASCENT MEMORY</h2>
                <div className="inline-block px-4 py-1.5 bg-white/10 rounded-full text-xs font-mono text-zinc-300 font-bold uppercase tracking-widest">
                    Moves: {moves} | Matches: {matches}/{ICONS.length}
                </div>
            </div>

            <div className="grid grid-cols-4 gap-4 w-full max-w-lg mx-auto">
                {cards.map((card, idx) => {
                    const Icon = card.icon;
                    return (
                        <div
                            key={card.id}
                            onClick={() => handleCardClick(idx)}
                            className="w-20 h-24 sm:w-24 sm:h-28 aspect-auto relative cursor-pointer"
                            style={{ perspective: '1000px' }}
                        >
                            <div className="w-full h-full transition-transform duration-500" style={{ transformStyle: 'preserve-3d', transform: (card.isFlipped || card.isMatched) ? 'rotateY(180deg)' : '' }}>
                                {/* Front (Hidden side) */}
                                <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-zinc-800 to-black rounded-2xl border-2 border-white/5 shadow-xl flex items-center justify-center" style={{ backfaceVisibility: 'hidden' }}>
                                    <Layers size={32} className="text-white/20" />
                                </div>
                                {/* Back (Revealed side) */}
                                <div className={`absolute inset-0 w-full h-full rounded-2xl border-2 ${card.isMatched ? 'bg-gradient-to-br from-green-500/20 to-green-900/40 border-green-500/50' : 'bg-gradient-to-br from-blue-500/20 to-indigo-900/40 border-blue-500/50'} shadow-[0_0_20px_rgba(59,130,246,0.2)] flex items-center justify-center rotate-y-180`} style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                                    <Icon size={40} className={card.isMatched ? 'text-green-400' : 'text-blue-400'} />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {isWon && (
                <div className="mt-12 text-center animate-in zoom-in duration-500">
                    <div className="w-16 h-16 mx-auto rounded-full bg-green-500/20 flex items-center justify-center mb-4 border border-green-500/50 shadow-[0_0_30px_rgba(34,197,94,0.3)]">
                        <Sparkles size={32} className="text-green-400" />
                    </div>
                    <h3 className="text-3xl font-black text-white mb-2">SEQUENCE COMPLETE</h3>
                    <p className="text-zinc-400 font-mono">Total Moves: {moves}</p>
                </div>
            )}
        </div>
    );
};
