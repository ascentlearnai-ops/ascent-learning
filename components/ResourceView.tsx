import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Book, Layers, MessageSquare, CheckCircle, RotateCw, Send, Sparkles, User, AlertTriangle, Lock, Copy, Download, Check, Trophy, ChevronRight, ChevronLeft, HelpCircle } from 'lucide-react';
import { Resource, Flashcard, QuizQuestion } from '../types';
import { getResourceById } from '../services/mockDb';
import { chatWithResource } from '../services/aiService';
import { validateInput, dailyChatLimiter, getTierLimits } from '../utils/security';

interface ResourceViewProps {
  resourceId: string;
  onBack: () => void;
  darkMode: boolean;
}

// Utility to clean residual LaTeX like \( \), \hat{}, etc. if the AI sends them
const cleanMathText = (text: string) => {
  if (!text) return "";
  return text
    .replace(/\\\(/g, '') // Remove \(
    .replace(/\\\)/g, '') // Remove \)
    .replace(/\\\[/g, '') // Remove \[
    .replace(/\\\]/g, '') // Remove \]
    .replace(/\\hat\{(\w+)\}/g, '$1-hat') // \hat{y} -> y-hat
    .replace(/\\hat\s+(\w+)/g, '$1-hat')
    .replace(/\\bar\{(\w+)\}/g, '$1-bar') // \bar{x} -> x-bar
    .replace(/\\approx/g, '≈')
    .replace(/\\neq/g, '≠')
    .replace(/\\leq/g, '≤')
    .replace(/\\geq/g, '≥')
    .replace(/\\times/g, '×')
    .replace(/\\pm/g, '±')
    .replace(/\\/g, ''); // Remove stray backslashes
};

const ResourceView: React.FC<ResourceViewProps> = ({ resourceId, onBack, darkMode }) => {
  const [resource, setResource] = useState<Resource | undefined>();
  const [activeTab, setActiveTab] = useState<'summary' | 'flashcards' | 'quiz' | 'chat'>('summary');
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    getResourceById(resourceId).then(data => {
      setResource(data);
      if (data && data.tags.includes('Exam Mode')) {
        setActiveTab('quiz');
      }
    });
  }, [resourceId]);

  const handleTabChange = (tab: typeof activeTab) => {
    if (tab === activeTab) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setActiveTab(tab);
      setIsTransitioning(false);
    }, 200); // Wait for exit animation
  };

  if (!resource) {
    return <div className="p-20 text-center text-zinc-500 animate-pulse font-mono tracking-wider text-xs">ESTABLISHING SECURE CONNECTION...</div>;
  }

  const isExam = resource.tags.includes('Exam Mode');

  const tabClass = (tab: string) => `
    relative flex items-center gap-2 px-6 py-4 text-sm font-bold transition-all duration-300 z-10 whitespace-nowrap flex-shrink-0
    ${activeTab === tab 
      ? 'text-white' 
      : 'text-zinc-500 hover:text-zinc-300'}
  `;

  return (
    <div className={`mx-auto min-h-full flex flex-col animate-enter ${isExam ? 'max-w-5xl px-4' : 'max-w-6xl'}`}>
      
      {/* Conditional Header */}
      {isExam ? (
        <div className="mb-8 pt-6 flex items-center justify-between animate-enter">
            <button onClick={onBack} className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-white transition-colors group px-4 py-2 rounded-full hover:bg-zinc-900 border border-transparent hover:border-zinc-800">
                <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Exit Examination Protocol
            </button>
            <div className="flex items-center gap-3">
              <span className="text-zinc-500 text-sm font-medium hidden sm:block">{resource.title}</span>
              <div className="px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 animate-pulse-slow">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                  Live Assessment
              </div>
            </div>
        </div>
      ) : (
        <div className="mb-4">
          <button onClick={onBack} className="mb-8 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-white transition-colors group w-fit">
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Return to Command Center
          </button>
          
          <div className="flex flex-col md:flex-row md:items-start justify-between mb-8 gap-4">
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-white animate-enter stagger-1 leading-tight">{resource.title}</h1>
            <div className="flex items-center gap-3 animate-enter stagger-2 shrink-0">
              <span className="px-3 py-1 rounded-full text-[10px] font-bold border border-zinc-800 bg-zinc-900 text-zinc-400 uppercase tracking-wide">
                {resource.type}
              </span>
              <span className="px-3 py-1 rounded-full text-[10px] font-bold border border-green-500/20 bg-green-500/10 text-green-400 flex items-center gap-1 uppercase tracking-wide">
                <Lock size={10} /> ENCRYPTED
              </span>
            </div>
          </div>
          
          {/* Sticky Tab Bar */}
          <div className="sticky top-0 z-50 bg-[#030303]/90 backdrop-blur-xl border-b border-white/5 animate-enter stagger-3 shadow-xl overflow-x-auto no-scrollbar -mx-4 md:mx-0 px-4 md:px-0">
             <div className="flex min-w-full md:min-w-0">
                {/* Active Tab Indicator Slide */}
                <div 
                  className="absolute bottom-0 h-0.5 bg-primary-500 transition-all duration-300 ease-out shadow-[0_-2px_10px_rgba(37,99,235,0.5)] hidden md:block"
                  style={{
                    width: '140px', // Approx width, ideally measured dynamically
                    transform: `translateX(${
                        activeTab === 'summary' ? '0%' :
                        activeTab === 'flashcards' ? '100%' :
                        activeTab === 'quiz' ? '200%' : '300%'
                    })`
                  }}
                />

                <button onClick={() => handleTabChange('summary')} className={tabClass('summary') + " md:w-[140px] justify-center"}>
                  <Book size={16} className={activeTab === 'summary' ? 'text-primary-400' : ''} /> Summary
                </button>
                <button onClick={() => handleTabChange('flashcards')} className={tabClass('flashcards') + " md:w-[140px] justify-center"}>
                  <Layers size={16} className={activeTab === 'flashcards' ? 'text-primary-400' : ''} /> Flashcards
                </button>
                <button onClick={() => handleTabChange('quiz')} className={tabClass('quiz') + " md:w-[140px] justify-center"}>
                  <CheckCircle size={16} className={activeTab === 'quiz' ? 'text-primary-400' : ''} /> Quiz
                </button>
                <button onClick={() => handleTabChange('chat')} className={tabClass('chat') + " md:w-[140px] justify-center"}>
                  <MessageSquare size={16} className={activeTab === 'chat' ? 'text-primary-400' : ''} /> Ascent Chat
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Content Area with Fade Transition */}
      <div className={`flex-1 pb-20 mt-6 transition-all duration-300 ease-out-expo ${isTransitioning ? 'opacity-0 transform translate-y-4 blur-sm' : 'opacity-100 transform translate-y-0 blur-0'}`}>
        {activeTab === 'summary' && !isExam && <SummaryTab content={resource.summary} />}
        {activeTab === 'flashcards' && !isExam && <FlashcardsTab cards={resource.flashcards} />}
        {activeTab === 'quiz' && <QuizTab questions={resource.quiz} isExam={isExam} />}
        {activeTab === 'chat' && !isExam && <ChatTab context={resource.originalContent} />}
      </div>
    </div>
  );
};

// --- Sub Components ---

const SummaryTab = ({ content }: { content: string }) => {
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Interactive Definition State
  const [definition, setDefinition] = useState<{term: string, def: string, x: number, y: number} | null>(null);

  useEffect(() => {
    // Add event listener for interactive terms
    const handleTermClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('interactive-term')) {
        const rect = target.getBoundingClientRect();
        const def = target.getAttribute('data-def');
        const term = target.textContent || "";
        
        if (def) {
          setDefinition({
            term,
            def,
            x: rect.left + (rect.width / 2),
            y: rect.top
          });
          e.stopPropagation();
        }
      } else {
        setDefinition(null);
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('click', handleTermClick);
    }
    
    // Close on scroll or outside click
    const handleOutside = () => setDefinition(null);
    window.addEventListener('scroll', handleOutside, true);
    window.addEventListener('click', handleOutside);

    return () => {
      if (container) container.removeEventListener('click', handleTermClick);
      window.removeEventListener('scroll', handleOutside, true);
      window.removeEventListener('click', handleOutside);
    };
  }, []);

  // Styling the HTML output from the AI
  const styledContent = content
    .replace(/<h2>/g, '<h2 class="text-xl md:text-2xl font-bold mb-6 mt-10 text-white flex items-center gap-3"><span class="w-1 h-6 bg-primary-500 rounded-full"></span>')
    .replace(/<\/h2>/g, '</h2>')
    .replace(/<p>/g, '<p class="text-zinc-300 leading-7 md:leading-8 mb-6 text-base md:text-lg font-light tracking-wide">')
    .replace(/<ul>/g, '<ul class="space-y-3 mb-8 text-zinc-300 bg-zinc-900/30 p-4 md:p-6 rounded-2xl border border-white/5">')
    .replace(/<li>/g, '<li class="flex items-start gap-3"><span class="mt-2 w-1.5 h-1.5 rounded-full bg-primary-500 flex-shrink-0"></span><span>')
    .replace(/<\/li>/g, '</span></li>')
    .replace(/<strong>/g, '<strong class="text-primary-300 font-bold border-b border-primary-500/30 pb-0.5">')
    ;

  const handleCopy = () => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    navigator.clipboard.writeText(tempDiv.textContent || tempDiv.innerText || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
        {/* CSS for interactive terms */}
        <style>{`
            .interactive-term {
                color: #60a5fa; /* blue-400 */
                border-bottom: 1px dashed rgba(96, 165, 250, 0.5);
                cursor: help;
                transition: all 0.2s;
                border-radius: 4px;
                padding: 0 4px;
            }
            .interactive-term:hover {
                background-color: rgba(37, 99, 235, 0.1);
                color: #93c5fd;
            }
        `}</style>

        <div className="relative bg-[#0A0A0A] border border-white/5 p-6 md:p-16 rounded-3xl shadow-2xl animate-enter" ref={containerRef}>
        {/* Decorative Noise Background */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 rounded-3xl pointer-events-none"></div>

        <div className="absolute top-4 right-4 md:top-8 md:right-8 flex gap-2 z-10">
            <button onClick={handleCopy} className="p-2 md:p-2.5 rounded-xl bg-black border border-white/10 text-zinc-400 hover:text-white hover:border-primary-500 hover:bg-primary-900/10 transition-colors">
                {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
            </button>
        </div>
        
        <article className="max-w-3xl mx-auto relative z-10">
            <div dangerouslySetInnerHTML={{ __html: styledContent }} />
        </article>
        
        <div className="mt-16 pt-8 border-t border-white/5 flex justify-center text-zinc-600 text-[10px] font-mono uppercase tracking-[0.2em] relative z-10">
            End of Protocol
        </div>
        </div>

        {/* Definition Tooltip */}
        {definition && (
            <div 
                className="fixed z-[100] w-64 p-4 bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in-95 duration-200"
                style={{ 
                    left: definition.x, 
                    top: definition.y - 10, 
                    transform: 'translate(-50%, -100%)' 
                }}
            >
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/10">
                    <HelpCircle size={14} className="text-primary-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">{definition.term}</span>
                </div>
                <p className="text-sm text-zinc-300 leading-relaxed font-medium">
                    {definition.def}
                </p>
                {/* Little triangle arrow at bottom */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-3 h-3 bg-zinc-900 border-r border-b border-white/10 transform rotate-45"></div>
            </div>
        )}
    </>
  );
};

const FlashcardsTab = ({ cards }: { cards: Flashcard[] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const handleNext = () => {
    setIsFlipped(false);
    setTimeout(() => setCurrentIndex((prev) => (prev + 1) % cards.length), 300);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setTimeout(() => setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length), 300);
  };

  if (cards.length === 0) return <div className="text-center py-20 opacity-50 font-mono text-xs uppercase tracking-widest">No flashcards generated.</div>;

  return (
    <div className="flex flex-col items-center justify-center py-4 md:py-10 animate-enter">
      <div className="w-full max-w-2xl flex justify-between items-center mb-8 px-4 md:px-0">
         <div className="text-xs font-bold font-mono px-3 py-1.5 rounded-lg border border-white/5 bg-zinc-900 text-zinc-400 tracking-wider">
          CARD {String(currentIndex + 1).padStart(2, '0')} / {String(cards.length).padStart(2, '0')}
        </div>
        <div className="flex gap-1.5">
          {cards.map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === currentIndex ? 'w-8 bg-primary-500 shadow-[0_0_10px_rgba(37,99,235,0.5)]' : 'w-2 bg-zinc-800'}`}></div>
          ))}
        </div>
      </div>
      
      <div 
        className="relative w-full max-w-2xl h-[350px] md:h-[420px] perspective-1000 cursor-pointer group px-4 md:px-0"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div className={`relative w-full h-full transition-all duration-500 ease-out-expo preserve-3d transform ${isFlipped ? 'rotate-y-180' : ''}`}
             style={{ transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>
          
          {/* Front */}
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 md:p-16 rounded-[2rem] shadow-2xl backface-hidden border border-white/5 bg-[#0A0A0A] hover:bg-[#0F0F0F] transition-colors" style={{ backfaceVisibility: 'hidden' }}>
            <div className="absolute top-0 right-0 p-8 opacity-20"><Sparkles size={100} className="text-white" /></div>
            
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary-500 mb-8 flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 border border-primary-500/20">
              Question
            </span>
            <p className="text-2xl md:text-3xl text-center font-bold leading-tight text-white relative z-10">{cards[currentIndex].front}</p>
            <div className="absolute bottom-8 text-[10px] font-bold tracking-widest text-zinc-600 opacity-60 group-hover:opacity-100 transition-opacity">TAP TO FLIP</div>
          </div>

          {/* Back */}
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 md:p-16 rounded-[2rem] shadow-2xl backface-hidden border border-primary-500/20 bg-zinc-900/50 backdrop-blur-xl" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
             <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50 mb-8 px-3 py-1 rounded-full border border-white/10">Answer</span>
             <p className="text-lg md:text-xl text-center leading-8 text-zinc-100 font-medium">{cards[currentIndex].back}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-4 mt-8 md:mt-12">
        <button onClick={handlePrev} className="w-14 h-14 rounded-full border border-zinc-800 bg-black text-zinc-400 hover:text-white hover:border-zinc-600 flex items-center justify-center transition-all hover:scale-110 active:scale-95">
          <ChevronLeft size={24} />
        </button>
        <button onClick={handleNext} className="h-14 px-8 rounded-full bg-white text-black font-bold text-sm shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all hover:scale-105 active:scale-95 hover:shadow-[0_0_30px_rgba(255,255,255,0.4)] flex items-center gap-2">
          Next Concept <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

const QuizTab = ({ questions, isExam = false }: { questions: QuizQuestion[], isExam?: boolean }) => {
  const [selectedAnswers, setSelectedAnswers] = useState<{[key: string]: number}>({});
  const [showResults, setShowResults] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const handleSelect = (qId: string, optIndex: number) => {
    if (showResults) return;
    setSelectedAnswers(prev => ({...prev, [qId]: optIndex}));
  };

  const score = questions.reduce((acc, q) => {
    return acc + (selectedAnswers[q.id] === q.correctAnswer ? 1 : 0);
  }, 0);

  const progress = (Object.keys(selectedAnswers).length / questions.length) * 100;

  if (questions.length === 0) return <div className="text-center py-20 opacity-50 text-xs font-mono uppercase">No quiz questions generated.</div>;

  // Single Question View for Exams
  if (isExam && !showResults) {
    const q = questions[currentQuestionIndex];

    return (
      <div className="max-w-4xl mx-auto py-10 flex flex-col items-center min-h-[600px] justify-center animate-enter">
        {/* Exam Header */}
        <div className="w-full mb-16 flex justify-between items-end border-b border-white/5 pb-6">
           <div>
             <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest block mb-2">Question Node</span>
             <span className="text-4xl font-bold text-white font-sans">{String(currentQuestionIndex + 1).padStart(2, '0')} <span className="text-zinc-700 text-xl font-light">/ {String(questions.length).padStart(2, '0')}</span></span>
           </div>
           <div className="flex flex-col items-end">
              <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest block mb-2">Completion Status</span>
              <div className="w-64 h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                 <div className="h-full bg-red-500 transition-all duration-700 ease-out" style={{ width: `${progress}%` }}></div>
              </div>
           </div>
        </div>

        {/* Question Card */}
        <div className="w-full space-y-10 animate-enter key={currentQuestionIndex}">
           <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold leading-tight text-white mb-8 tracking-tight">
             {cleanMathText(q.question)}
           </h3>
           
           <div className="grid grid-cols-1 gap-4">
             {q.options.map((opt, optIdx) => {
               const isSelected = selectedAnswers[q.id] === optIdx;
               return (
                 <button
                   key={optIdx}
                   onClick={() => handleSelect(q.id, optIdx)}
                   className={`w-full text-left p-6 rounded-2xl border transition-all duration-300 flex items-center group relative overflow-hidden ${
                     isSelected 
                       ? 'bg-primary-600 border-primary-500 text-white shadow-[0_0_30px_rgba(37,99,235,0.3)] scale-[1.02]' 
                       : 'bg-[#0A0A0A] border-white/5 hover:border-white/20 text-zinc-400 hover:bg-[#101010] hover:text-white'
                   }`}
                 >
                   <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-6 transition-colors flex-shrink-0 ${
                      isSelected ? 'border-white bg-white' : 'border-zinc-700 group-hover:border-zinc-500'
                   }`}>
                      {isSelected && <div className="w-2 h-2 bg-primary-600 rounded-full"></div>}
                   </div>
                   <span className="text-lg font-medium tracking-wide">{cleanMathText(opt)}</span>
                 </button>
               );
             })}
           </div>
        </div>

        {/* Navigation Footer */}
        <div className="w-full mt-20 flex justify-between items-center">
            <button 
              onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
              disabled={currentQuestionIndex === 0}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-zinc-500 hover:text-white disabled:opacity-0 transition-all"
            >
              <ChevronLeft size={20} /> Previous
            </button>

            {currentQuestionIndex < questions.length - 1 ? (
               <button 
                 onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                 className="flex items-center gap-3 px-10 py-4 bg-white text-black rounded-full font-bold hover:bg-zinc-200 transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.2)]"
               >
                 Next Node <ChevronRight size={18} />
               </button>
            ) : (
              <button 
                onClick={() => setShowResults(true)}
                className="flex items-center gap-3 px-12 py-4 bg-red-600 text-white rounded-full font-bold hover:bg-red-500 transition-all hover:shadow-[0_0_40px_rgba(220,38,38,0.5)] hover:scale-105"
              >
                Finalize Assessment
              </button>
            )}
        </div>
      </div>
    );
  }

  // Standard List View (or Results View for both modes)
  return (
    <div className={`mx-auto space-y-8 py-4 animate-enter ${isExam ? 'max-w-4xl' : 'max-w-3xl'}`}>
      
      {/* Progress Bar (Only for non-exam mode view or results) */}
      {!showResults && !isExam && (
        <div className="mb-10 p-6 rounded-2xl bg-zinc-900/30 border border-white/5 flex items-center justify-between">
           <div className="flex flex-col gap-1">
             <span className="text-xs font-bold text-white uppercase tracking-widest">Exam Progress</span>
             <span className="text-[10px] text-zinc-500 font-mono">Completed: {Object.keys(selectedAnswers).length}/{questions.length}</span>
           </div>
           <div className="w-32 md:w-64 h-2 bg-black rounded-full overflow-hidden border border-white/5">
              <div className="h-full bg-primary-500 transition-all duration-700 ease-out shadow-[0_0_10px_rgba(37,99,235,0.5)]" style={{ width: `${progress}%` }}></div>
           </div>
        </div>
      )}

      {showResults && (
        <div className="p-8 md:p-16 rounded-[2rem] border border-white/10 bg-[#0A0A0A] text-center animate-scale relative overflow-hidden my-10 shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-600 via-white to-primary-600"></div>
          
          <div className="inline-flex items-center justify-center p-6 bg-primary-500/10 rounded-full mb-8 border border-primary-500/20 shadow-[0_0_30px_rgba(37,99,235,0.2)]">
             <Trophy size={48} className="text-primary-400" />
          </div>
          
          <h3 className="text-3xl md:text-4xl font-bold mb-2 text-white tracking-tight">Assessment Complete</h3>
          <p className="text-zinc-500 mb-12 text-sm uppercase tracking-widest font-mono">Performance Analysis</p>
          
          <div className="text-7xl md:text-9xl font-black text-white mb-12 tracking-tighter flex justify-center items-start gap-2">
            {Math.round((score / questions.length) * 100)}<span className="text-3xl md:text-4xl text-primary-500 mt-4">%</span>
          </div>
          
          <button 
             onClick={() => { 
               setShowResults(false); 
               setSelectedAnswers({});
               setCurrentQuestionIndex(0);
             }}
             className="px-10 py-4 bg-white text-black rounded-full text-sm font-bold hover:bg-zinc-200 transition-all hover:scale-105 shadow-[0_0_20px_rgba(255,255,255,0.2)]"
          >
            Retake Protocol
          </button>
        </div>
      )}

      {/* List of Questions (Shown for results review or non-exam mode) */}
      {(!isExam || showResults) && questions.map((q, idx) => {
        const isAnswered = selectedAnswers[q.id] !== undefined;
        const isCorrect = selectedAnswers[q.id] === q.correctAnswer;
        
        return (
          <div key={q.id} className="p-6 md:p-8 rounded-3xl border border-white/5 bg-[#0A0A0A] transition-all hover:border-white/10 animate-enter group" style={{ animationDelay: `${idx * 100}ms` }}>
            <div className="flex items-start justify-between mb-8">
               <h3 className="font-bold text-lg md:text-xl leading-relaxed text-white">
                 <span className="text-zinc-600 mr-4 text-sm font-mono align-middle bg-zinc-900 px-2 py-1 rounded">Q{String(idx + 1).padStart(2, '0')}</span>
                 {cleanMathText(q.question)}
               </h3>
            </div>

            <div className="space-y-3">
              {q.options.map((opt, optIdx) => {
                let btnClass = 'bg-[#050505] border-white/5 hover:border-white/10 text-zinc-400';
                let icon = <div className="w-4 h-4 rounded-full border border-zinc-600 mr-3"></div>;
                
                if (showResults) {
                  if (optIdx === q.correctAnswer) {
                      btnClass = 'bg-green-500/10 border-green-500/50 text-green-400';
                      icon = <CheckCircle size={16} className="mr-3 text-green-500" />;
                  }
                  else if (selectedAnswers[q.id] === optIdx) {
                      btnClass = 'bg-red-500/10 border-red-500/50 text-red-400';
                      icon = <AlertTriangle size={16} className="mr-3 text-red-500" />;
                  }
                } else if (selectedAnswers[q.id] === optIdx) {
                   btnClass = 'bg-primary-600 border-primary-500 text-white shadow-[0_0_15px_rgba(41,98,255,0.4)]';
                   icon = <div className="w-4 h-4 rounded-full bg-white mr-3"></div>;
                }

                return (
                  <button
                    key={optIdx}
                    onClick={() => handleSelect(q.id, optIdx)}
                    className={`w-full text-left p-5 rounded-xl border font-medium transition-all duration-200 flex items-center ${btnClass} hover:translate-x-1`}
                    disabled={showResults}
                  >
                    {icon}
                    {cleanMathText(opt)}
                  </button>
                );
              })}
            </div>

            {showResults && !isCorrect && (
               <div className="mt-6 text-sm p-6 rounded-2xl flex gap-4 bg-green-500/5 text-green-400 border border-green-500/20 animate-enter">
                 <div className="p-2 bg-green-500/10 rounded-lg h-fit"><CheckCircle size={16} /></div>
                 <div>
                    <span className="font-bold block mb-1 uppercase tracking-wide text-xs opacity-70">Correct Answer: {cleanMathText(q.options[q.correctAnswer])}</span>
                    <span className="font-bold block mb-1 uppercase tracking-wide text-xs opacity-70 mt-2">Explanation</span>
                    <p className="leading-relaxed opacity-90">{cleanMathText(q.explanation)}</p>
                 </div>
               </div>
            )}
          </div>
        );
      })}

      {!showResults && !isExam && (
        <div className="flex justify-end pt-8 pb-12">
          <button 
            onClick={() => setShowResults(true)}
            disabled={Object.keys(selectedAnswers).length < questions.length}
            className="px-12 py-5 bg-primary-600 text-white rounded-full font-bold hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_30px_rgba(37,99,235,0.4)] transition-all transform hover:scale-105"
          >
            Submit Examination
          </button>
        </div>
      )}
    </div>
  );
};

const ChatTab = ({ context }: { context: string }) => {
  const [messages, setMessages] = useState<{role: 'user'|'model', content: string}[]>([
    { role: 'model', content: 'Neural link established. I have processed the material. Query me.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const limits = getTierLimits();
  const [remainingChats, setRemainingChats] = useState(dailyChatLimiter.getRemaining(limits.dailyChats));
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    setError(null);
    if (isLoading) return;
    
    // Validate Input
    const validation = validateInput(input, 'chat');
    if (!validation.valid) {
      setError(validation.error || 'Invalid message');
      return;
    }

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      const stream = await chatWithResource(userMsg, context, messages);
      setRemainingChats(dailyChatLimiter.getRemaining(limits.dailyChats)); // Update UI
      
      let fullResponse = "";
      setMessages(prev => [...prev, { role: 'model', content: "" }]);

      for await (const chunk of stream) {
         const chunkText = chunk.text;
         if (chunkText) {
            fullResponse += chunkText;
            setMessages(prev => {
                const newArr = [...prev];
                newArr[newArr.length - 1].content = fullResponse;
                return newArr;
            });
         }
      }
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'model', content: e.message || "Connection error." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
     if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
     }
  }

  return (
    <div className="flex flex-col h-[600px] md:h-[750px] rounded-[2rem] border border-white/5 bg-[#0A0A0A] shadow-2xl overflow-hidden relative animate-enter">
      {/* Decorative Header */}
      <div className="absolute top-0 w-full h-24 bg-gradient-to-b from-primary-900/10 to-transparent pointer-events-none z-0"></div>
      
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 scrollbar-thin scrollbar-thumb-zinc-800 relative z-10">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-3 md:gap-5 ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-enter`}>
             <div className={`w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg transition-transform hover:scale-110 ${
               msg.role === 'model' 
                 ? 'bg-gradient-to-br from-primary-600 to-primary-800 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' 
                 : 'bg-zinc-800 border border-zinc-700'
             }`}>
               {msg.role === 'model' ? <Sparkles size={16} /> : <User size={16} className="text-zinc-400" />}
             </div>
             <div className={`max-w-[85%] md:max-w-[70%] p-4 md:p-5 rounded-2xl text-sm leading-6 md:leading-7 shadow-sm ${
               msg.role === 'user' 
                 ? 'bg-primary-600 text-white rounded-tr-none shadow-[0_5px_20px_rgba(37,99,235,0.2)]' 
                 : 'bg-zinc-900/50 border border-white/5 text-zinc-300 rounded-tl-none'
             }`}>
               {msg.content}
             </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-4 animate-pulse">
             <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center">
               <Sparkles className="animate-spin text-white" size={18} />
             </div>
             <div className="px-6 py-4 rounded-2xl rounded-tl-none text-sm bg-zinc-900/50 border border-white/5 text-zinc-500 font-mono flex items-center gap-3">
               <span className="w-2 h-2 bg-primary-500 rounded-full animate-pulse"></span>
               PROCESSING QUERY...
             </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-4 md:p-6 border-t border-white/5 bg-[#050505]">
        {error && (
           <div className="mb-4 text-xs text-red-400 flex items-center gap-2 bg-red-900/10 p-3 rounded-xl border border-red-900/30 w-fit animate-enter">
             <AlertTriangle size={14} /> {error}
           </div>
        )}
        <div className="flex items-center gap-3 p-2 rounded-2xl border border-white/10 bg-[#0A0A0A] focus-within:border-primary-500 focus-within:shadow-[0_0_20px_rgba(37,99,235,0.1)] transition-all duration-300">
          <input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Ascent anything about this material..."
            className="flex-1 bg-transparent px-3 md:px-5 py-3 outline-none text-sm text-white placeholder:text-zinc-600"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="p-3.5 bg-primary-600 rounded-xl text-white hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(37,99,235,0.4)]"
          >
            <Send size={18} />
          </button>
        </div>
        <div className="flex justify-between mt-4 px-2 text-[10px] text-zinc-600 font-mono tracking-wide">
           <span>ASCENT AI v2.5 SECURE</span>
           <span className={remainingChats < 5 ? "text-red-500 font-bold" : "text-primary-500 font-bold"}>
              DAILY INFERENCE: {remainingChats}/{limits.dailyChats}
           </span>
        </div>
      </div>
    </div>
  );
};

export default ResourceView;