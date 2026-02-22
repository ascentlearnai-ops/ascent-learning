import React, { useState, useEffect } from 'react';
import { X, RefreshCw } from 'lucide-react';

type Color = 'red' | 'blue' | 'green' | 'yellow' | 'wild';
type Value = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'skip' | 'reverse' | '+2' | 'wild' | '+4';

interface Card {
    id: string;
    color: Color;
    value: Value;
}

const COLORS: Color[] = ['red', 'blue', 'green', 'yellow'];
const VALUES: Value[] = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'skip', 'reverse', '+2'];

const generateDeck = (): Card[] => {
    let deck: Card[] = [];
    let id = 0;
    COLORS.forEach(color => {
        deck.push({ id: `card_${id++}`, color, value: '0' });
        for (let i = 0; i < 2; i++) {
            VALUES.slice(1).forEach(value => {
                deck.push({ id: `card_${id++}`, color, value });
            });
        }
    });
    for (let i = 0; i < 4; i++) {
        deck.push({ id: `card_${id++}`, color: 'wild', value: 'wild' });
        deck.push({ id: `card_${id++}`, color: 'wild', value: '+4' });
    }
    return deck.sort(() => Math.random() - 0.5);
};

export const MiniUnoGame: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [deck, setDeck] = useState<Card[]>([]);
    const [playerHand, setPlayerHand] = useState<Card[]>([]);
    const [botHand, setBotHand] = useState<Card[]>([]);
    const [discardPile, setDiscardPile] = useState<Card[]>([]);
    const [currentColor, setCurrentColor] = useState<Color>('red');
    const [turn, setTurn] = useState<'player' | 'bot'>('player');
    const [message, setMessage] = useState('Your Turn!');
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [pendingWildCard, setPendingWildCard] = useState<Card | null>(null);

    useEffect(() => {
        startNewGame();
    }, []);

    useEffect(() => {
        if (turn === 'bot') {
            const timer = setTimeout(() => {
                const playableCards = botHand.filter(isValidPlay);
                if (playableCards.length > 0) {
                    playCard(playableCards[0], false);
                } else {
                    drawCard(false);
                }
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [turn, botHand, discardPile, currentColor, deck]);

    const startNewGame = () => {
        const newDeck = generateDeck();
        let initialDiscard = newDeck.pop()!;
        while (initialDiscard.color === 'wild') {
            newDeck.unshift(initialDiscard);
            initialDiscard = newDeck.pop()!;
        }

        setPlayerHand(newDeck.splice(0, 7));
        setBotHand(newDeck.splice(0, 7));
        setDiscardPile([initialDiscard]);
        setCurrentColor(initialDiscard.color);
        setDeck(newDeck);
        setTurn('player');
        setMessage('Your Turn!');
        setShowColorPicker(false);
    };

    const drawCard = (isPlayer: boolean) => {
        if (deck.length === 0) {
            if (discardPile.length <= 1) return; // No cards left
            const newDeck = [...discardPile];
            const topCard = newDeck.pop()!;
            setDiscardPile([topCard]);
            setDeck(newDeck.sort(() => Math.random() - 0.5));
            return;
        }
        const card = deck[deck.length - 1];
        setDeck(deck.slice(0, deck.length - 1));
        if (isPlayer) {
            setPlayerHand([...playerHand, card]);
            setTurn('bot');
            setMessage('Bot is thinking...');
        } else {
            setBotHand([...botHand, card]);
            setTurn('player');
            setMessage('Your Turn!');
        }
    };

    const isValidPlay = (card: Card) => {
        const topCard = discardPile[discardPile.length - 1];
        if (card.color === 'wild') return true;
        return card.color === currentColor || card.value === topCard.value;
    };

    const playCard = (card: Card, isPlayer: boolean) => {
        if (card.color === 'wild' && isPlayer) {
            setPendingWildCard(card);
            setShowColorPicker(true);
            return;
        }

        finalizePlayCard(card, isPlayer, card.color === 'wild' ? COLORS[Math.floor(Math.random() * COLORS.length)] : card.color);
    };

    const finalizePlayCard = (card: Card, isPlayer: boolean, chosenColor: Color) => {
        setDiscardPile([...discardPile, card]);
        setCurrentColor(chosenColor);

        if (isPlayer) {
            setPlayerHand(playerHand.filter(c => c.id !== card.id));
            setShowColorPicker(false);
            setPendingWildCard(null);
        } else {
            setBotHand(botHand.filter(c => c.id !== card.id));
        }

        // Effect logic
        let nextTurn = isPlayer ? 'bot' : 'player';
        let extraDraw = 0;

        if (card.value === 'skip' || card.value === 'reverse') {
            nextTurn = isPlayer ? 'player' : 'bot';
        } else if (card.value === '+2') {
            extraDraw = 2;
            nextTurn = isPlayer ? 'player' : 'bot';
        } else if (card.value === '+4') {
            extraDraw = 4;
            nextTurn = isPlayer ? 'player' : 'bot';
        }

        if (extraDraw > 0) {
            const drawnCards = deck.slice(-extraDraw);
            setDeck(deck.slice(0, deck.length - extraDraw));
            if (isPlayer) {
                setBotHand([...botHand, ...drawnCards]);
            } else {
                setPlayerHand([...playerHand, ...drawnCards]);
            }
        }

        if (isPlayer && playerHand.length === 1) { // They just played their last
            setMessage('You won!');
            return;
        }
        if (!isPlayer && botHand.length === 1) {
            setMessage('Bot won!');
            return;
        }

        // Update Turn
        setTurn(nextTurn as any);
        if (nextTurn === 'player') {
            setMessage('Your Turn!');
        } else {
            setMessage('Bot is thinking...');
        }
    };

    const getColorClass = (color: Color, forceGradient: boolean = false) => {
        if (color === 'red') return 'bg-gradient-to-br from-red-500 to-red-600 text-white border-red-400';
        if (color === 'blue') return 'bg-gradient-to-br from-blue-500 to-blue-600 text-white border-blue-400';
        if (color === 'green') return 'bg-gradient-to-br from-green-500 to-green-600 text-white border-green-400';
        if (color === 'yellow') return 'bg-gradient-to-br from-yellow-400 to-amber-500 text-black border-yellow-200';
        return 'bg-gradient-to-br from-zinc-800 to-black text-white border-zinc-600';
    };

    return (
        <div className="fixed inset-0 z-[500] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in font-sans overflow-y-auto min-h-screen">
            <div className="absolute top-6 right-6 flex gap-4 pr-4">
                <button onClick={startNewGame} className="p-2 text-zinc-400 hover:text-white transition-colors bg-white/5 rounded-full"><RefreshCw size={24} /></button>
                <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white transition-colors bg-white/5 rounded-full"><X size={24} /></button>
            </div>

            <div className="text-center mb-8">
                <h2 className="text-3xl font-black text-white italic tracking-tighter mb-2">ASCENT UNO</h2>
                <div className="inline-block px-4 py-1.5 bg-white/10 rounded-full text-xs font-mono text-zinc-300 font-bold uppercase tracking-widest">{message}</div>
            </div>

            <div className="flex-1 w-full max-w-4xl flex flex-col items-center justify-center min-h-[500px] mt-16 mb-8">

                {/* Bot Hand Area */}
                <div className="w-full flex justify-center items-center gap-1 sm:gap-2 mb-8 h-28 relative pt-4">
                    <div className="absolute -top-4 text-[10px] text-zinc-500 font-mono tracking-widest uppercase font-bold">Neural Opponent - {botHand.length} Cards</div>
                    {botHand.map((c, i) => (
                        <div key={i} className="-ml-6 w-14 h-20 sm:w-16 sm:h-24 rounded-lg bg-gradient-to-br from-zinc-800 to-black border-2 border-white/10 flex items-center justify-center shadow-lg relative overflow-hidden first:ml-0 shrink-0">
                            <div className="absolute inset-1.5 border border-white/5 rounded-md flex items-center justify-center bg-[#050505] shadow-inner">
                                <span className="text-white/20 font-black italic -rotate-12 text-sm opacity-50">UNO</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Center Play Area */}
                <div className="flex gap-16 items-center my-10 relative">
                    {/* Deck */}
                    <div className="flex flex-col items-center">
                        <div className="text-[10px] text-zinc-500 font-mono mb-4 tracking-widest uppercase h-4"></div>
                        <div
                            onClick={() => turn === 'player' && !showColorPicker && drawCard(true)}
                            className={`w-32 h-48 rounded-2xl bg-gradient-to-br from-zinc-800 to-black border-[3px] ${turn === 'player' ? 'border-primary-500 cursor-pointer shadow-[0_0_30px_rgba(59,130,246,0.3)] hover:-translate-y-2' : 'border-zinc-700 opacity-70'} transition-all flex items-center justify-center relative shadow-2xl overflow-hidden group`}
                        >
                            <div className="absolute inset-2 border-[3px] border-white/10 rounded-xl flex items-center justify-center bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                            <div className="absolute inset-3 border-2 border-white/10 rounded-lg flex items-center justify-center bg-zinc-900 shadow-inner group-hover:bg-zinc-800 transition-colors">
                                <div className="text-white/80 font-black italic -rotate-12 text-2xl tracking-widest">DRAW</div>
                            </div>
                        </div>
                    </div>

                    {/* Discard Pile */}
                    <div className="flex flex-col items-center">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-[10px] text-zinc-400 font-mono tracking-widest uppercase">Current Color:</span>
                            <div className={`w-4 h-4 rounded-full shadow-[0_0_15px_rgba(255,255,255,0.3)] border border-white/30 ${getColorClass(currentColor)}`}></div>
                        </div>

                        {discardPile.length > 0 && (() => {
                            const topCard = discardPile[discardPile.length - 1];
                            const displayNumber = topCard.value;
                            // Make wildcard reflect chosen color!
                            const displayColorClass = topCard.color === 'wild' ? getColorClass(currentColor) : getColorClass(topCard.color);
                            const textColor = currentColor === 'yellow' ? '#b45309' : currentColor === 'red' ? '#b91c1c' : currentColor === 'blue' ? '#1d4ed8' : currentColor === 'green' ? '#15803d' : '#000';

                            return (
                                <div key={discardPile.length} className={`w-32 h-48 rounded-2xl border-[3px] border-white/40 flex flex-col items-center justify-center shadow-2xl relative overflow-hidden text-white font-black text-4xl shadow-[0_0_40px_rgba(0,0,0,0.6)] animate-in zoom-in duration-300 ${displayColorClass}`}>
                                    <div className="absolute top-2 left-3 text-lg drop-shadow-md">{displayNumber}</div>
                                    <div className="absolute bottom-2 right-3 text-lg rotate-180 drop-shadow-md">{displayNumber}</div>

                                    <div className="bg-white/95 px-2 py-4 w-20 h-28 flex items-center justify-center rounded-[40%] text-center text-4xl shadow-inner border border-black/10 text-clip overflow-hidden">
                                        <div style={{ color: textColor }} className="drop-shadow-sm font-black text-[2.5rem] tracking-tighter">
                                            {displayNumber}
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>

                {/* Player Hand Area */}
                <div className="w-full flex justify-center items-end gap-1 sm:gap-2 mt-4 sm:mt-8 h-48 py-4 relative overflow-x-auto custom-scrollbar">
                    <div className="absolute top-0 text-[10px] text-zinc-400 font-mono tracking-widest uppercase font-bold">Your Hand</div>
                    {playerHand.map((card, i) => {
                        const valid = isValidPlay(card);
                        const textColor = card.color === 'yellow' ? '#b45309' : card.color === 'red' ? '#b91c1c' : card.color === 'blue' ? '#1d4ed8' : card.color === 'green' ? '#15803d' : '#000';

                        return (
                            <div
                                key={card.id}
                                onClick={() => turn === 'player' && valid && !showColorPicker && playCard(card, true)}
                                className={`-ml-6 sm:-ml-4 w-24 h-36 sm:w-28 sm:h-40 rounded-xl border-2 flex flex-col items-center justify-center shadow-xl relative overflow-hidden transition-all duration-300 first:ml-0 hover:z-50 shrink-0
                  ${getColorClass(card.color)}
                  ${valid && turn === 'player' && !showColorPicker ? 'hover:-translate-y-8 cursor-pointer shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:border-white' : 'opacity-[0.85] brightness-75 border-black/40 cursor-not-allowed'}
                 `}
                            >
                                <div className="absolute top-2 left-2 text-sm sm:text-base text-white font-black max-w-[1.5rem] leading-none drop-shadow-md">{card.value}</div>
                                <div className="absolute bottom-2 right-2 text-sm sm:text-base text-white font-black rotate-180 max-w-[1.5rem] leading-none drop-shadow-md">{card.value}</div>

                                <div className="bg-white/95 w-14 h-20 sm:w-16 sm:h-24 flex items-center justify-center rounded-[40%] text-center text-2xl sm:text-3xl font-black shadow-inner border border-black/10">
                                    <div style={{ color: textColor }} className="drop-shadow-sm tracking-tighter">
                                        {card.value}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>

            </div>

            {showColorPicker && pendingWildCard && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[200]">
                    <div className="bg-[#0A0A0A] border border-white/10 p-10 rounded-3xl text-center shadow-2xl animate-scale-in">
                        <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-widest">Select Color</h3>
                        <p className="text-zinc-500 mb-8 text-sm">Choose the color for your wild card.</p>
                        <div className="grid grid-cols-2 gap-4">
                            {COLORS.map(c => (
                                <button
                                    key={c}
                                    onClick={() => finalizePlayCard(pendingWildCard, true, c)}
                                    className={`w-24 h-24 rounded-2xl ${getColorClass(c, true)} border-4 border-transparent hover:border-white transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-95`}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            )}

        </div>
    )
}
