import React, { useState } from 'react';
import { Brain, X } from 'lucide-react';
import { MiniUnoGame } from './MiniUnoGame';
import { MiniMemoryGame } from './MiniMemoryGame';

interface GenerationLoaderModalProps {
    isOpen: boolean;
    title?: string;
    subtitle?: string;
    onClose?: () => void;
}

export const GenerationLoaderModal: React.FC<GenerationLoaderModalProps> = ({
    isOpen,
    title = "Synthesizing Protocol",
    subtitle = "Calibrating Neural Pathways",
    onClose
}) => {
    const [isGameOpen, setIsGameOpen] = useState(false);
    const [activeGame, setActiveGame] = useState<'cards' | 'memory'>('cards');

    if (!isOpen) return null;

    return (
        <>
            {isGameOpen && activeGame === 'cards' && <MiniUnoGame onClose={() => setIsGameOpen(false)} />}
            {isGameOpen && activeGame === 'memory' && <MiniMemoryGame onClose={() => setIsGameOpen(false)} />}
            <div className={`fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-in ${isGameOpen ? 'hidden' : ''}`}>
                <div className="w-full max-w-xl rounded-2xl border border-white/10 shadow-2xl bg-zinc-950 p-12 flex flex-col items-center relative overflow-hidden animate-scale-in">
                    {onClose && (
                        <button onClick={onClose} className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-red-400 transition-colors bg-white/5 rounded-full z-50">
                            <X size={20} />
                        </button>
                    )}
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none mix-blend-overlay"></div>

                    <div className="relative flex justify-center items-center w-24 h-24 mb-8">
                        <div className="absolute inset-0 rounded-full border-t-2 border-r-2 border-primary-500/80 animate-spin" style={{ animationDuration: '2s' }}></div>
                        <div className="absolute inset-2 rounded-full border-b-2 border-l-2 border-zinc-500/50 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
                        <Brain size={36} className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)] animate-pulse" />
                    </div>

                    <h4 className="text-2xl font-black text-white uppercase tracking-widest mb-3 font-mono drop-shadow-md text-center">
                        {title}
                    </h4>
                    <p className="text-zinc-500 animate-pulse font-mono text-sm uppercase tracking-widest text-center mb-10">
                        {subtitle}
                    </p>

                    <div className="mt-4 flex flex-col items-center gap-4 w-full">
                        <span className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest font-bold">Select Neural Minigame</span>
                        <div className="flex flex-wrap justify-center gap-3">
                            <button
                                onClick={() => { setActiveGame('cards'); setIsGameOpen(true); }}
                                className="px-5 py-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 transition-all font-mono text-xs tracking-widest font-bold uppercase shadow-lg hover:scale-105 active:scale-95"
                            >
                                Cards
                            </button>
                            <button
                                onClick={() => { setActiveGame('memory'); setIsGameOpen(true); }}
                                className="px-5 py-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 transition-all font-mono text-xs tracking-widest font-bold uppercase shadow-lg hover:scale-105 active:scale-95"
                            >
                                Memory
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};
