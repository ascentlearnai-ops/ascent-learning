import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Zap, Coffee, Brain, Edit3 } from 'lucide-react';

const NeuralTimer = () => {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [totalTime, setTotalTime] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<'focus' | 'short' | 'long'>('focus');
  const [isEditing, setIsEditing] = useState(false);
  const [customMinutes, setCustomMinutes] = useState('25');
  const [isShaking, setIsShaking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const timerKey = 'ascent_timer_target';
  const stateKey = 'ascent_timer_state';

  const playNotification = () => {
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.volume = 0.5;
      audio.play().catch(e => console.log("Audio play failed interaction required", e));
    } catch (e) {
      console.log("Audio not supported");
    }
  };

  // 1. Recover state on mount
  useEffect(() => {
    const savedTarget = localStorage.getItem(timerKey);
    const savedState = localStorage.getItem(stateKey);
    
    if (savedTarget && savedState === 'active') {
       const targetTime = parseInt(savedTarget, 10);
       const now = Date.now();
       const remaining = Math.max(0, Math.ceil((targetTime - now) / 1000));
       
       if (remaining > 0) {
         setTimeLeft(remaining);
         setIsActive(true);
       } else {
         setTimeLeft(0);
         setIsActive(false);
         localStorage.removeItem(timerKey);
         localStorage.removeItem(stateKey);
       }
    }
  }, []);

  // 2. Timer Loop & Stats Tracking
  useEffect(() => {
    let interval: any = null;
    
    if (isActive) {
      if (!localStorage.getItem(timerKey)) {
          const target = Date.now() + timeLeft * 1000;
          localStorage.setItem(timerKey, target.toString());
          localStorage.setItem(stateKey, 'active');
      }

      interval = setInterval(() => {
         const targetStr = localStorage.getItem(timerKey);
         if (!targetStr) return;
         
         const target = parseInt(targetStr, 10);
         const now = Date.now();
         const remaining = Math.max(0, Math.ceil((target - now) / 1000));
         
         setTimeLeft(remaining);

         // Track Focus Time (1 second added per tick)
         const currentFocus = parseInt(localStorage.getItem('ascent_focus_seconds') || '0');
         localStorage.setItem('ascent_focus_seconds', (currentFocus + 1).toString());

         if (remaining === 0) {
           setIsActive(false);
           playNotification();
           setIsShaking(true);
           setTimeout(() => setIsShaking(false), 800);
           localStorage.removeItem(timerKey);
           localStorage.setItem(stateKey, 'idle');
           clearInterval(interval);
         }
      }, 1000);
    } else {
       localStorage.removeItem(timerKey);
       localStorage.setItem(stateKey, 'paused');
    }
    
    return () => clearInterval(interval);
  }, [isActive]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const toggleTimer = () => {
     setIsActive(!isActive);
  };
  
  const setTimerMode = (newMode: 'focus' | 'short' | 'long') => {
    setIsActive(false);
    setIsEditing(false);
    setMode(newMode);
    
    localStorage.removeItem(timerKey);
    localStorage.removeItem(stateKey);

    let time = 25 * 60;
    if (newMode === 'focus') time = parseInt(customMinutes) * 60 || 25 * 60;
    if (newMode === 'short') time = 5 * 60;
    if (newMode === 'long') time = 15 * 60;
    setTimeLeft(time);
    setTotalTime(time);
  };

  const handleCustomTimeSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const mins = Math.min(Math.max(parseInt(customMinutes) || 25, 1), 180);
    setCustomMinutes(mins.toString());
    const seconds = mins * 60;
    
    setTimeLeft(seconds);
    setTotalTime(seconds);
    localStorage.removeItem(timerKey); 
    setIsEditing(false);
  };

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(totalTime);
    localStorage.removeItem(timerKey);
    localStorage.setItem(stateKey, 'idle');
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Circular Progress Calculation (Responsive SVG)
  // ViewBox 0 0 100 100
  const radius = 45; 
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (timeLeft / totalTime) * circumference;

  return (
    <div className={`flex flex-col items-center justify-center min-h-[calc(100vh-140px)] animate-enter relative overflow-hidden ${isShaking ? 'animate-shake' : ''}`}>
      
      {/* Ambient Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vmin] h-[80vmin] bg-primary-900/5 rounded-full blur-[100px] transition-all duration-1000 ${isActive ? 'opacity-100 scale-110' : 'opacity-20 scale-90'}`}></div>
      </div>

      {/* Mode Selectors */}
      <div className="flex items-center gap-2 mb-8 md:mb-16 relative z-10 bg-black/40 p-1.5 rounded-full border border-white/5 backdrop-blur-sm transform translate-y-4 scale-90 md:scale-100">
        <ModeButton 
          label="Deep Focus" 
          icon={<Zap size={14} />} 
          active={mode === 'focus'} 
          onClick={() => setTimerMode('focus')} 
        />
        <ModeButton 
          label="Refresh" 
          icon={<Coffee size={14} />} 
          active={mode === 'short'} 
          onClick={() => setTimerMode('short')} 
        />
        <ModeButton 
          label="Recharge" 
          icon={<Brain size={14} />} 
          active={mode === 'long'} 
          onClick={() => setTimerMode('long')} 
        />
      </div>

      {/* Responsive Timer Display with Gradient Ring */}
      {/* Wrapper dimensions ensure it fits within any screen size (landscape mobile or desktop) */}
      <div className="relative mb-12 md:mb-20 group select-none flex items-center justify-center w-[60vmin] h-[60vmin] max-w-[500px] max-h-[500px]">
         {/* SVG Ring */}
         <div className="absolute inset-0 w-full h-full pointer-events-none">
           <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
             <defs>
               <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                 <stop offset="0%" stopColor="#3b82f6" />
                 <stop offset="100%" stopColor="#06b6d4" />
               </linearGradient>
               <filter id="glow">
                 <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
                 <feMerge>
                   <feMergeNode in="coloredBlur"/>
                   <feMergeNode in="SourceGraphic"/>
                 </feMerge>
               </filter>
             </defs>
             {/* Background Track */}
             <circle 
               cx="50" cy="50" r={radius} 
               stroke="#18181b" 
               strokeWidth="0.5" 
               fill="none" 
             />
             {/* Active Progress */}
             <circle 
               cx="50" cy="50" r={radius} 
               stroke="url(#timerGradient)" 
               strokeWidth="1.5" 
               fill="none" 
               strokeDasharray={circumference} 
               strokeDashoffset={strokeDashoffset} 
               strokeLinecap="round"
               filter="url(#glow)"
               className="transition-all duration-1000 ease-linear"
               style={{ opacity: isActive || timeLeft !== totalTime ? 1 : 0.3 }}
             />
           </svg>
         </div>

         {/* Time Text */}
         <div className="relative z-10 flex flex-col items-center">
            {isEditing ? (
              <form onSubmit={handleCustomTimeSubmit} className="flex flex-col items-center">
                <input
                  ref={inputRef}
                  type="number"
                  value={customMinutes}
                  onChange={(e) => setCustomMinutes(e.target.value)}
                  onBlur={() => handleCustomTimeSubmit()}
                  className="text-[12vmin] font-thin bg-transparent text-white text-center outline-none w-[30vmin] leading-none"
                  autoFocus
                />
                <span className="text-[1.5vmin] text-zinc-500 font-mono tracking-widest uppercase mt-4">Set Duration</span>
              </form>
            ) : (
              <div 
                onClick={() => !isActive && mode === 'focus' && setIsEditing(true)}
                className={`text-[15vmin] leading-none font-thin tracking-tighter tabular-nums font-sans transition-all duration-300 relative ${!isActive && mode === 'focus' ? 'cursor-pointer hover:text-zinc-300' : 'text-white'}`}
              >
                {formatTime(timeLeft)}
                {/* Subtle visual cue for editing */}
                {!isActive && mode === 'focus' && (
                  <div className="absolute top-0 -right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-zinc-800 p-1.5 rounded-full"><Edit3 size={14} /></div>
                  </div>
                )}
              </div>
            )}
         </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-10 relative z-10 scale-90 md:scale-100">
         <button 
           onClick={toggleTimer}
           className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 border backdrop-blur-md ${
             isActive 
              ? 'bg-red-500/10 border-red-500/50 text-red-500 hover:bg-red-500/20' 
              : 'bg-white text-black border-white hover:scale-110 hover:shadow-[0_0_40px_rgba(255,255,255,0.3)]'
           }`}
         >
           {isActive ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
         </button>
         
         <button 
           onClick={resetTimer}
           className="w-14 h-14 rounded-full border border-zinc-800 bg-black/50 text-zinc-500 flex items-center justify-center hover:text-white hover:border-zinc-600 transition-all hover:rotate-180 duration-500 backdrop-blur-sm"
         >
           <RotateCcw size={18} />
         </button>
      </div>
    </div>
  );
};

const ModeButton = ({ label, icon, active, onClick }: any) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wide transition-all duration-300 ${
      active 
        ? 'bg-zinc-800 text-white shadow-lg' 
        : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
    }`}
  >
    <span className={active ? 'text-cyan-400' : ''}>{icon}</span>
    {label}
  </button>
);

export default NeuralTimer;