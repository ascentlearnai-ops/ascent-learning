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
            setTimeout(botTurn, 1000);
        }
    };

    const botTurn = () => {
        // Check if bot can play
        const playableCards = botHand.filter(isValidPlay);
        if (playableCards.length > 0) {
            playCard(playableCards[0], false);
        } else {
            drawCard(false);
        }
    };

    const getColorClass = (color: Color) => {
        if (color === 'red') return 'bg-red-500';
        if (color === 'blue') return 'bg-blue-500';
        if (color === 'green') return 'bg-green-500';
        if (color === 'yellow') return 'bg-amber-400 text-black';
        return 'bg-zinc-800 border-2 border-white/20';
    };

    return (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in font-sans">
            <div className="absolute top-6 right-6 flex gap-4">
                <button onClick={startNewGame} className="p-2 text-zinc-400 hover:text-white transition-colors bg-white/5 rounded-full"><RefreshCw size={24} /></button>
                <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white transition-colors bg-white/5 rounded-full"><X size={24} /></button>
            </div>

            <div className="text-center mb-8">
                <h2 className="text-3xl font-black text-white italic tracking-tighter mb-2">ASCENT UNO</h2>
                <div className="inline-block px-4 py-1.5 bg-white/10 rounded-full text-xs font-mono text-zinc-300 font-bold uppercase tracking-widest">{message}</div>
            </div>

            <div className="flex-1 w-full max-w-4xl flex flex-col items-center justify-between">

                {/* Bot Hand Area */}
                <div className="w-full flex justify-center items-center gap-2 mb-8 h-32 relative">
                    <div className="absolute -top-6 text-[10px] text-zinc-500 font-mono tracking-widest uppercase mb-4">Neural Opponent - {botHand.length} Cards</div>
                    {botHand.map((c, i) => (
                        <div key={i} className="-ml-8 w-16 h-24 rounded-lg bg-zinc-800 border-2 border-white/10 flex items-center justify-center shadow-lg relative overflow-hidden first:ml-0">
                            <div className="absolute inset-2 border-2 border-white/5 rounded-md flex items-center justify-center bg-[#050505]">
                                <div className="text-white/20 font-black rotate-45 text-xl opacity-30">A</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Center Play Area */}
                <div className="flex gap-12 items-center my-8">
                    {/* Deck */}
                    <div
                        onClick={() => turn === 'player' && !showColorPicker && drawCard(true)}
                        className={`w-28 h-40 rounded-2xl bg-zinc-900 border-4 ${turn === 'player' ? 'border-primary-500 cursor-pointer shadow-[0_0_20px_rgba(59,130,246,0.5)] hover:-translate-y-2' : 'border-zinc-700 opacity-50'} transition-all flex items-center justify-center relative shadow-2xl overflow-hidden`}
                    >
                        <div className="absolute inset-4 border-4 border-white/10 rounded-xl flex items-center justify-center bg-black">
                            <div className="text-white/50 font-black italic -rotate-12 text-3xl">DRAW</div>
                        </div>
                    </div>

                    {/* Discard Pile */}
                    <div className="flex flex-col items-center">
                        <div className="text-[10px] text-zinc-500 font-mono mb-3 tracking-widest uppercase">Current Color</div>
                        <div className={`w-3 h-3 rounded-full mb-3 shadow-[0_0_10px_rgba(255,255,255,0.2)] ${getColorClass(currentColor)}`}></div>

                        {discardPile.length > 0 && (
                            <div className={`w-32 h-44 rounded-2xl border-4 border-white/20 flex flex-col items-center justify-center shadow-2xl relative overflow-hidden text-white font-black text-4xl shadow-[0_0_30px_rgba(0,0,0,0.5)] ${getColorClass(discardPile[discardPile.length - 1].color)}`}>
                                <div className="absolute top-2 left-3 text-lg">{discardPile[discardPile.length - 1].value}</div>
                                <div className="absolute bottom-2 right-3 text-lg rotate-180">{discardPile[discardPile.length - 1].value}</div>

                                <div className="bg-white px-2 py-4 rounded-[40%] text-center text-4xl shadow-inner border border-black/10 text-clip overflow-hidden">
                                    <div style={{ color: discardPile[discardPile.length - 1].color === 'yellow' ? '#000' : discardPile[discardPile.length - 1].color === 'wild' ? '#000' : 'inherit' }} className={`drop-shadow-sm ${discardPile[discardPile.length - 1].color !== 'wild' && discardPile[discardPile.length - 1].color !== 'yellow' ? 'text-current' : ''}`}>
                                        {discardPile[discardPile.length - 1].value === '+2' || discardPile[discardPile.length - 1].value === '+4' ? discardPile[discardPile.length - 1].value : discardPile[discardPile.length - 1].value}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Player Hand Area */}
                <div className="w-full flex justify-center items-end gap-2 mt-8 h-48 relative overflow-x-auto pb-4 custom-scrollbar">
                    <div className="absolute -top-4 text-[10px] text-zinc-500 font-mono tracking-widest uppercase">Your Hand</div>
                    {playerHand.map((card, i) => {
                        const valid = isValidPlay(card);
                        return (
                            <div
                                key={card.id}
                                onClick={() => turn === 'player' && valid && !showColorPicker && playCard(card, true)}
                                className={`-ml-4 w-24 h-36 rounded-xl border-2 flex flex-col items-center justify-center shadow-lg relative overflow-hidden transition-all duration-300 first:ml-0
                  ${getColorClass(card.color)}
                  ${valid && turn === 'player' && !showColorPicker ? 'hover:-translate-y-6 cursor-pointer hover:shadow-2xl border-white hover:z-50' : 'opacity-60 border-black/20 cursor-not-allowed hover:z-50'}
                 `}
                            >
                                <div className="absolute top-1.5 left-2 text-sm text-white font-bold max-w-[1.5rem] leading-none drop-shadow-md">{card.value}</div>
                                <div className="absolute bottom-1.5 right-2 text-sm text-white font-bold rotate-180 max-w-[1.5rem] leading-none drop-shadow-md">{card.value}</div>

                                <div className="bg-white/95 px-2 py-3 w-16 h-20 flex items-center justify-center rounded-[40%] text-center text-2xl font-black shadow-inner">
                                    <div style={{ color: card.color === 'yellow' ? '#ca8a04' : card.color === 'red' ? '#ef4444' : card.color === 'blue' ? '#3b82f6' : card.color === 'green' ? '#22c55e' : '#000' }}>
                                        {card.value}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>

            </div>

            {showColorPicker && pendingWildCard && (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
                    <div className="bg-zinc-900 border border-white/10 p-8 rounded-3xl text-center">
                        <h3 className="text-xl font-bold text-white mb-6">Choose Color</h3>
                        <div className="flex gap-4">
                            {COLORS.map(c => (
                                <button
                                    key={c}
                                    onClick={() => finalizePlayCard(pendingWildCard, true, c)}
                                    className={`w-16 h-16 rounded-2xl ${getColorClass(c)} border-4 border-transparent hover:border-white transition-all shadow-xl hover:scale-110`}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            )}

        </div>
    )
}
