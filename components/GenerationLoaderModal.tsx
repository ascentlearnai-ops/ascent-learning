import React, { useState } from 'react';
import { Brain } from 'lucide-react';
import { MiniUnoGame } from './MiniUnoGame';

interface GenerationLoaderModalProps {
    isOpen: boolean;
    title?: string;
    subtitle?: string;
}

export const GenerationLoaderModal: React.FC<GenerationLoaderModalProps> = ({
    isOpen,
    title = "Synthesizing Protocol",
    subtitle = "Calibrating Neural Pathways"
}) => {
    const [isGameOpen, setIsGameOpen] = useState(false);

    if (!isOpen) return null;

    return (
        <>
            {isGameOpen && <MiniUnoGame onClose={() => setIsGameOpen(false)} />}
            <div className={`fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-in ${isGameOpen ? 'hidden' : ''}`}>
                <div className="w-full max-w-xl rounded-2xl border border-white/10 shadow-2xl bg-zinc-950 p-12 flex flex-col items-center relative overflow-hidden animate-scale-in">
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

                    <button
                        onClick={() => setIsGameOpen(true)}
                        className="px-8 py-4 rounded-full bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-600/30 transition-all font-mono text-sm tracking-widest font-bold uppercase shadow-lg hover:scale-105 active:scale-95"
                    >
                        Play Card Game While You Wait
                    </button>
                </div>
            </div>
        </>
    );
};
