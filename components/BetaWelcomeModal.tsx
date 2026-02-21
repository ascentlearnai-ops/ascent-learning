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
                    <div className="w-16 h-16 mx-auto rounded-full bg-indigo-500/10 border border-indigo-500/20 flex flex-col items-center justify-center mb-6 relative">
                        <Sparkles size={28} className="text-indigo-400" />
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex flex-col items-center justify-center border-2 border-[#0A0A0A]">
                            <span className="text-[10px] font-bold text-white">B</span>
                        </div>
                    </div>

                    <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">Welcome to Ascent Beta</h2>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full text-xs font-mono font-bold uppercase tracking-widest mb-6">
                        <AlertTriangle size={12} /> Early Access Build
                    </div>

                    <p className="text-zinc-400 text-sm leading-relaxed mb-8 px-4">
                        Ascent is actively utilizing the bleeding-edge DeepSeek R1 AI model for unparalleled tutoring logic and accuracy. <strong className="text-zinc-200 font-medium">Because of this extremely high reasoning depth, generating content takes a little bit of time.</strong>
                        <br /><br />
                        Despite the short waits, it is an exceptionally powerful study tool. Thank you for helping us test this early beta!
                    </p>

                    <button
                        onClick={onClose}
                        className="w-full py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:scale-105"
                    >
                        I Understand, Enter Nexus
                    </button>
                </div>
            </div>
        </div>
    );
};
