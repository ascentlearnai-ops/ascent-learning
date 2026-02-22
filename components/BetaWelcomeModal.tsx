import React from 'react';
import { Sparkles, AlertTriangle, X } from 'lucide-react';

interface BetaWelcomeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const BetaWelcomeModal: React.FC<BetaWelcomeModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
            <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#0A0A0A] overflow-hidden shadow-2xl relative animate-scale-in">
                <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>

                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-white rounded-full bg-white/5 transition-colors z-10"
                >
                    <X size={20} />
                </button>

                <div className="px-8 pt-10 pb-8 text-center relative z-0">
                    <div className="w-20 h-20 mx-auto rounded-[2rem] bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 border border-white/10 flex flex-col items-center justify-center mb-8 relative shadow-[0_0_30px_rgba(99,102,241,0.15)]">
                        <Sparkles size={32} className="text-cyan-400" />
                        <div className="absolute -bottom-2 -right-2 px-2 py-0.5 bg-cyan-500 rounded-md flex items-center justify-center border-2 border-[#0A0A0A] shadow-lg">
                            <span className="text-[10px] font-black text-black tracking-widest uppercase">Beta</span>
                        </div>
                    </div>

                    <h2 className="text-3xl font-black text-white mb-3 tracking-tight font-serif">Ascent Beta Phase</h2>
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-full text-xs font-mono font-bold uppercase tracking-widest mb-8">
                        <AlertTriangle size={14} className="text-indigo-400" /> Early Access Build
                    </div>

                    <p className="text-zinc-400 text-sm leading-relaxed mb-10 px-2">
                        Ascent is utilizing the bleeding-edge <strong className="text-cyan-400 font-bold">Llama 3.3 70B Instruct AI</strong> model for unmatched speed and tutor-level logic.
                        Despite the short waits, the accuracy and quality of the generated materials are exceptionally high. Thank you for testing this early build!
                    </p>

                    <button
                        onClick={onClose}
                        className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold transition-all shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:scale-[1.02] active:scale-[0.98] uppercase tracking-wider text-sm"
                    >
                        Enter Ascent Nexus
                    </button>
                </div>
            </div>
        </div>
    );
};
