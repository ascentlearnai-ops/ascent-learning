import React, { useState, useEffect } from 'react';
import { Brain, RotateCcw, Play, ChevronRight, Clock, AlertTriangle, Target, Calculator, PenTool, Layout, X, Lock, Keyboard, Trophy } from 'lucide-react';
import { SAT_MATH_DOMAINS, SAT_READING_DOMAINS, SATDomain, SATSkill } from '../data/satData';
import { generateSATQuestions, generateSATLesson } from '../services/aiService';
import { QuizQuestion } from '../types';
import { getUserTier } from '../utils/security';
import { GenerationLoaderModal } from './GenerationLoaderModal';

const SATPrep: React.FC<{ userTier: string }> = ({ userTier }) => {
  const [activeTab, setActiveTab] = useState<'practice' | 'topics' | 'full-exam'>('practice');
  const [isAllowed, setIsAllowed] = useState(true);

  // Practice Session State
  const [activePracticeSession, setActivePracticeSession] = useState<{ type: 'MATH' | 'READING_WRITING', questions: QuizQuestion[] } | null>(null);

  useEffect(() => {
    // Block SAT Prep for 'Initiate' tier entirely
    if (userTier === 'Initiate') {
      setIsAllowed(false);
    } else {
      setIsAllowed(true);
    }
  }, [userTier]);

  if (!isAllowed) {
    return (
      <div className="max-w-4xl mx-auto py-20 px-4 text-center animate-enter flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-24 h-24 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-8 shadow-2xl">
          <Lock size={40} className="text-zinc-600" />
        </div>
        <h1 className="text-4xl font-bold text-white mb-4">Restricted Protocol</h1>
        <p className="text-zinc-400 max-w-md mx-auto mb-8 leading-relaxed">
          The SAT Mastery Engine requires Scholar Clearance. Upgrade your account to access adaptive generation and full-length simulations.
        </p>
        <div className="p-4 bg-red-900/10 border border-red-900/30 rounded-full px-8">
          <span className="text-xs font-mono text-red-400 uppercase tracking-widest">Clearance: Initiate (Denied)</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 animate-enter px-4">
      {/* Header */}
      <div className="mb-16 space-y-4 border-b border-white/5 pb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-bold uppercase tracking-widest">
          <Target size={12} /> SAT Protocol
        </div>
        <h1 className="text-5xl md:text-6xl font-medium text-white tracking-tight">Mastery Engine</h1>
        <p className="text-zinc-400 max-w-xl text-lg">Adaptive generation engine calibrated to Official College Board standards.</p>
      </div>

      {/* Tabs */}
      <div className="flex justify-center md:justify-start gap-2 mb-12 bg-zinc-900/30 p-1.5 rounded-full w-fit border border-white/5 backdrop-blur-sm">
        <TabButton active={activeTab === 'practice'} onClick={() => setActiveTab('practice')} label="Practice Generators" icon={<Brain size={14} />} />
        <TabButton active={activeTab === 'topics'} onClick={() => setActiveTab('topics')} label="Topics & Skills" icon={<Layout size={14} />} />
        <TabButton active={activeTab === 'full-exam'} onClick={() => setActiveTab('full-exam')} label="Full Simulation" icon={<Clock size={14} />} />
      </div>

      <div className="min-h-[600px]">
        {activeTab === 'practice' && <PracticeGenerators onStartSession={(type, qs) => setActivePracticeSession({ type, questions: qs })} />}
        {activeTab === 'topics' && <TopicsSection />}
        {activeTab === 'full-exam' && <FullExamInterface />}
      </div>

      {activePracticeSession && (
        <PracticeSessionOverlay
          questions={activePracticeSession.questions}
          type={activePracticeSession.type}
          onClose={() => setActivePracticeSession(null)}
          onRegenerate={async () => {
            // Quick regen handler passed to overlay
            const newQs = await generateSATQuestions(10, activePracticeSession.type);
            if (newQs && newQs.length > 0) {
              setActivePracticeSession({ type: activePracticeSession.type, questions: newQs });
            } else {
              alert("Generation failed to produce valid questions. Please try again.");
            }
          }}
        />
      )}
    </div>
  );
};

const TabButton = ({ active, onClick, label, icon }: any) => (
  <button
    onClick={onClick}
    className={`px-6 py-2.5 rounded-full font-bold text-xs uppercase tracking-wide flex items-center gap-2 transition-all duration-300 ${active
      ? 'bg-zinc-800 text-white shadow-lg border border-zinc-700'
      : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
      }`}
  >
    {icon} {label}
  </button>
);

// --- 1. Practice Generators ---

const PracticeGenerators = ({ onStartSession }: { onStartSession: (type: 'MATH' | 'READING_WRITING', qs: QuizQuestion[]) => void }) => {
  return (
    <div className="grid md:grid-cols-2 gap-8">
      <GeneratorCard
        type="MATH"
        title="SAT Math"
        desc="Algebra, Advanced Math, Geometry, Data. Includes Grid-in questions."
        icon={<Calculator size={32} />}
        onGenerate={onStartSession}
      />
      <GeneratorCard
        type="READING_WRITING"
        title="Reading & Writing"
        desc="Craft, Structure, Standard English Conventions."
        icon={<PenTool size={32} />}
        onGenerate={onStartSession}
      />
    </div>
  );
};

const GeneratorCard = ({ type, title, desc, icon, onGenerate }: { type: 'MATH' | 'READING_WRITING', title: string, desc: string, icon: any, onGenerate: (type: any, qs: any) => void }) => {
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const qs = await generateSATQuestions(10, type);
      if (!qs || qs.length === 0) {
        throw new Error("Generation produced empty response");
      }
      onGenerate(type, qs);
    } catch (e) {
      console.error(e);
      alert("Generation failed to produce valid questions. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <GenerationLoaderModal isOpen={loading} title="Synthesizing Exam" subtitle="Compiling Question Bank" />
      <div className="bg-[#0A0A0A] border border-white/5 rounded-3xl p-10 relative overflow-hidden flex flex-col h-full min-h-[400px] group hover:border-white/10 transition-colors">
        <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${type === 'MATH' ? 'from-blue-600 to-cyan-400' : 'from-purple-600 to-pink-400'}`}></div>

        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8 py-12">
          <div className={`w-24 h-24 rounded-3xl flex items-center justify-center ${type === 'MATH' ? 'bg-blue-900/10 text-blue-400 shadow-2xl' : 'bg-purple-900/10 text-purple-400 shadow-2xl'}`}>
            {icon}
          </div>
          <div>
            <h3 className="text-3xl font-bold text-white mb-4">{title}</h3>
            <p className="text-zinc-400 max-w-sm mx-auto leading-relaxed">{desc}</p>
          </div>
          <button
            onClick={generate}
            className="px-8 py-4 bg-white text-black font-bold rounded-full shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:scale-105 transition-all flex items-center gap-3 text-sm tracking-wide group"
          >
            <Play size={16} fill="currentColor" /> GENERATE SET
          </button>
        </div>
      </div>
    </>
  );
};

// --- PRACTICE SESSION MODAL ---
const PracticeSessionOverlay = ({ questions, type, onClose, onRegenerate }: { questions: QuizQuestion[], type: 'MATH' | 'READING_WRITING', onClose: () => void, onRegenerate?: () => void }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [key: string]: string | number }>({});
  const [showResults, setShowResults] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [reviewQuestion, setReviewQuestion] = useState<QuizQuestion | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Sync textInput when changing questions
  useEffect(() => {
    const q = questions[currentIndex];
    if (q.type === 'text') {
      setTextInput((answers[q.id] as string) || "");
    }
  }, [currentIndex, questions, answers]);

  const handleSelectOption = (idx: number) => {
    if (showResults) return;
    setAnswers(prev => ({ ...prev, [questions[currentIndex].id]: idx }));
  };

  const handleTextChange = (val: string) => {
    if (showResults) return;
    setTextInput(val);
    setAnswers(prev => ({ ...prev, [questions[currentIndex].id]: val }));
  };

  const handleRegen = async () => {
    if (!onRegenerate) return;
    setIsRegenerating(true);
    await onRegenerate();
    setCurrentIndex(0);
    setAnswers({});
    setShowResults(false);
    setTextInput("");
    setIsRegenerating(false);
  };

  if (isRegenerating) {
    return <GenerationLoaderModal isOpen={true} title="Regenerating Module" subtitle="Recompiling Adaptive Vectors" />;
  }

  const handleNextStage = () => {
    setShowResults(true);
  };

  const checkAnswer = (q: QuizQuestion) => {
    if (q.type === 'text') {
      const userVal = (answers[q.id] as string || "").toLowerCase().replace(/\s/g, '');
      const correctVal = (q.correctAnswerText || "").toLowerCase().replace(/\s/g, '');
      if (!userVal || !correctVal) return false;
      if (userVal === correctVal) return true;
      const uNum = parseFloat(userVal);
      const cNum = parseFloat(correctVal);
      if (!isNaN(uNum) && !isNaN(cNum) && Math.abs(uNum - cNum) < 0.001) return true;
      return false;
    } else {
      return answers[q.id] === q.correctAnswer;
    }
  };

  const currentQ = questions[currentIndex];

  const score = questions.reduce((acc, q) => {
    return acc + (checkAnswer(q) ? 1 : 0);
  }, 0);

  // --- REVIEW MODAL (Popup for questions) ---
  if (reviewQuestion) {
    const isCorrect = checkAnswer(reviewQuestion);
    const userAnswer = answers[reviewQuestion.id];
    // Handle cases where type might not be strictly 'text' but options are empty/null (Grid-in)
    const isTextQuestion = reviewQuestion.type === 'text' || !reviewQuestion.options || reviewQuestion.options.length === 0;

    return (
      <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-in fade-in">
        <div className="w-full max-w-3xl bg-[#0A0A0A] border border-white/10 rounded-3xl p-8 relative shadow-2xl">
          <button onClick={() => setReviewQuestion(null)} className="absolute top-4 right-4 p-2 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white">
            <X size={20} />
          </button>

          <div className="mb-6 flex gap-3">
            <span className={`px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest ${isCorrect ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
              {isCorrect ? 'Correct' : 'Incorrect'}
            </span>
            {isTextQuestion && <span className="px-3 py-1 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 uppercase border border-blue-500/20">Grid-In</span>}
          </div>

          {reviewQuestion.passage && (
            <div className="mb-6 p-6 bg-zinc-900/30 rounded-2xl border border-white/5 font-serif text-zinc-300 leading-relaxed max-h-40 overflow-y-auto custom-scrollbar text-sm">
              {reviewQuestion.passage}
            </div>
          )}

          {reviewQuestion.imageUrl && (
            <div className="mb-6 rounded-2xl overflow-hidden border border-white/5 bg-white flex justify-center p-2">
              <img src={reviewQuestion.imageUrl} alt="Question reference" className="max-w-full h-auto object-contain max-h-[300px]" />
            </div>
          )}

          <h3 className="text-xl font-medium text-white mb-8 whitespace-pre-wrap font-serif leading-relaxed">
            {reviewQuestion.question}
          </h3>

          <div className="mb-8 p-6 bg-black/40 rounded-2xl border border-white/5 space-y-4">
            <div className="text-sm flex justify-between border-b border-white/5 pb-4">
              <span className="text-zinc-500 uppercase text-xs font-bold tracking-widest">Your Input</span>
              <span className={`font-mono font-bold ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                {isTextQuestion ? (userAnswer || '—') : (reviewQuestion.options[userAnswer as number] || '—')}
              </span>
            </div>
            <div className="text-sm flex justify-between">
              <span className="text-zinc-500 uppercase text-xs font-bold tracking-widest">Target Output</span>
              <span className="text-green-400 font-mono font-bold text-lg">
                {isTextQuestion ? (reviewQuestion.correctAnswerText || "Answer Key Missing") : reviewQuestion.options[reviewQuestion.correctAnswer]}
              </span>
            </div>
          </div>

          <div className="bg-zinc-900/30 p-6 rounded-2xl border border-white/5">
            <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Analysis</h4>
            <p className="text-zinc-300 leading-relaxed text-sm">{reviewQuestion.explanation}</p>
          </div>
        </div>
      </div>
    )
  }

  if (showResults) {
    return (
      <div className="fixed inset-0 z-[100] bg-[#000] flex flex-col animate-in fade-in duration-300">
        <div className="h-20 border-b border-white/10 flex items-center justify-between px-8 bg-[#050505] shrink-0">
          <div className="font-bold text-white text-xl">Session Results</div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-zinc-900 text-zinc-500 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-4xl mx-auto space-y-10 py-8">

            <div className="p-12 rounded-[2rem] bg-zinc-900/20 border border-white/10 text-center relative overflow-hidden">
              <div className="relative z-10">
                <div className="inline-flex items-center justify-center p-6 bg-indigo-500/10 rounded-full mb-8 border border-indigo-500/20 shadow-[0_0_40px_rgba(79,70,229,0.3)]">
                  <Trophy size={40} className="text-indigo-400" />
                </div>
                <h3 className="text-6xl font-medium text-white mb-2 tracking-tight">{Math.round((score / questions.length) * 100)}%</h3>
                <p className="text-zinc-400">Accuracy Rating ({score}/{questions.length})</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {questions.map((q, idx) => {
                const isCorrect = checkAnswer(q);
                const isTextQuestion = q.type === 'text' || !q.options || q.options.length === 0;

                return (
                  <button
                    key={q.id}
                    onClick={() => setReviewQuestion(q)}
                    className={`p-6 rounded-2xl border text-left transition-all hover:scale-[1.02] flex flex-col justify-between h-40 ${isCorrect ? 'border-green-500/20 bg-green-900/5 hover:bg-green-900/10' : 'border-red-500/20 bg-red-900/5 hover:bg-red-900/10'}`}
                  >
                    <div className="flex justify-between w-full mb-2">
                      <span className="text-zinc-500 font-mono text-xs">0{idx + 1}</span>
                      {isTextQuestion && <Keyboard size={12} className="text-zinc-600" />}
                    </div>
                    <div className={`font-bold text-lg ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                      {isCorrect ? 'Correct' : 'Incorrect'}
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-2 truncate w-full uppercase tracking-widest">
                      Review Node
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="text-center pt-8 flex gap-4 justify-center">
              <button onClick={onClose} className="px-8 py-3 bg-zinc-900 border border-zinc-800 text-zinc-300 font-bold rounded-full hover:bg-zinc-800 transition-all text-sm">
                Close Protocol
              </button>
              {onRegenerate && (
                <button
                  onClick={handleRegen}
                  disabled={isRegenerating}
                  className="px-8 py-3 bg-white text-black font-bold rounded-full hover:scale-105 transition-transform flex items-center gap-2 text-sm"
                >
                  {isRegenerating ? <span className="animate-spin"><RotateCcw size={14} /></span> : <RotateCcw size={14} />}
                  Regenerate
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- ACTIVE QUESTION VIEW ---
  return (
    <div className="fixed inset-0 z-[100] bg-[#000] flex flex-col animate-in fade-in duration-300">
      <div className="h-20 border-b border-white/5 flex items-center justify-between px-8 bg-[#000000] shrink-0">
        <div className="font-bold text-white flex items-center gap-4">
          <span className="text-lg text-zinc-400 uppercase tracking-widest text-[10px]">Question Node</span>
          <span className="text-4xl font-bold text-white font-sans">
            {String(currentIndex + 1).padStart(2, '0')}
            <span className="text-zinc-700 text-xl font-light"> / {String(questions.length).padStart(2, '0')}</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-48 h-1.5 bg-zinc-900 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}></div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-zinc-900 text-zinc-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col p-8 overflow-y-auto custom-scrollbar bg-noise">
        <div className={`w-full max-w-7xl mx-auto h-full flex flex-col justify-center ${currentQ.passage ? 'lg:grid lg:grid-cols-2 lg:gap-16 lg:items-start' : 'items-center'}`}>

          {currentQ.passage && (
            <div className="bg-zinc-900/30 p-10 rounded-3xl border border-white/5 h-full max-h-[600px] overflow-y-auto custom-scrollbar mb-8 lg:mb-0 shadow-inner">
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-6 border-b border-white/5 pb-2">Source Text</div>
              <p className="font-serif text-lg leading-loose text-zinc-300 whitespace-pre-wrap">{currentQ.passage}</p>
            </div>
          )}

          <div className={`w-full ${!currentQ.passage ? 'max-w-3xl' : 'flex flex-col justify-center h-full'}`}>
            {!currentQ.passage && (
              <div className="text-center text-zinc-500 font-mono text-xs uppercase tracking-widest mb-6">
                Question Node {currentIndex + 1}
              </div>
            )}

            {currentQ.imageUrl && (
              <div className="mb-8 rounded-2xl overflow-hidden border border-white/5 bg-white flex justify-center p-4">
                <img src={currentQ.imageUrl} alt="Question Graphic" className="max-w-full h-auto object-contain max-h-[400px]" />
              </div>
            )}

            <h2 className={`text-3xl md:text-4xl font-medium leading-tight text-white font-serif whitespace-pre-wrap mb-10 ${!currentQ.passage ? 'text-center' : ''}`}>
              {currentQ.question}
            </h2>

            <div className={`w-full ${!currentQ.passage ? 'max-w-xl mx-auto' : ''}`}>
              {currentQ.type === 'text' ? (
                <div className="space-y-4">
                  <input
                    className="w-full p-6 bg-zinc-900/50 border border-zinc-700 rounded-2xl text-white outline-none focus:border-indigo-500 font-mono text-center text-2xl"
                    placeholder="Enter answer..."
                    value={answers[currentQ.id] || ''}
                    onChange={(e) => setAnswers({ ...answers, [currentQ.id]: e.target.value })}
                  />
                  <p className="text-center text-zinc-500 text-[10px] uppercase tracking-widest">Student-Produced Response</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {currentQ.options.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => setAnswers({ ...answers, [currentQ.id]: i })}
                      className={`w-full text-left p-5 rounded-xl border transition-all flex items-center gap-5 group ${answers[currentQ.id] === i ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-zinc-900/30 border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-white hover:border-zinc-700'}`}
                    >
                      <div className={`w-8 h-8 rounded-lg border flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${answers[currentQ.id] === i ? 'bg-white text-black border-white' : 'border-zinc-700 group-hover:border-zinc-500'}`}>
                        {String.fromCharCode(65 + i)}
                      </div>
                      <span className="text-base font-medium">{opt}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="h-24 border-t border-white/5 bg-[#050505] flex items-center justify-between px-8 shrink-0">
        <button
          onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
          disabled={currentIndex === 0}
          className="px-8 py-3 rounded-full border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900 disabled:opacity-0 transition-all text-sm font-bold uppercase tracking-wide"
        >
          Back
        </button>
        {currentIndex < questions.length - 1 ? (
          <button onClick={() => setCurrentIndex(prev => prev + 1)} className="px-10 py-4 bg-white text-black font-bold rounded-full hover:scale-105 transition-all text-sm tracking-wide">
            Next
          </button>
        ) : (
          <button onClick={() => handleNextStage()} className="px-10 py-4 bg-indigo-600 text-white font-bold rounded-full hover:bg-indigo-500 shadow-[0_0_30px_rgba(79,70,229,0.3)] transition-all text-sm tracking-wide">
            Submit Module
          </button>
        )}
      </div>
    </div>
  );
};

// --- Topics Section Component ---
const TopicsSection = () => {
  const [selectedSkill, setSelectedSkill] = useState<SATSkill | null>(null);
  const [lessonContent, setLessonContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const handleSkillClick = async (skill: SATSkill) => {
    setSelectedSkill(skill);
    setLoading(true);
    setLessonContent(null);
    setLoadError(null);
    try {
      const lesson = await generateSATLesson(skill.title + '. ' + (skill.promptContext || ''));
      setLessonContent(lesson);
    } catch (e: any) {
      console.error('Lesson load failed:', e);
      setLoadError(e?.message || 'Unable to load lesson. Check your API key and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-16 animate-enter">
      {/* Math Domains */}
      <section className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Calculator size={20} className="text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Math Domains</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Algebra, advanced math, data analysis, geometry</p>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-5">
          {SAT_MATH_DOMAINS.map(domain => (
            <DomainCard key={domain.id} domain={domain} onSkillSelect={handleSkillClick} accent="blue" />
          ))}
        </div>
      </section>

      {/* Reading & Writing Domains */}
      <section className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
            <PenTool size={20} className="text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Reading & Writing</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Craft, structure, conventions, expression</p>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-5">
          {SAT_READING_DOMAINS.map(domain => (
            <DomainCard key={domain.id} domain={domain} onSkillSelect={handleSkillClick} accent="purple" />
          ))}
        </div>
      </section>

      {selectedSkill && (
        <SkillModal
          skill={selectedSkill}
          content={lessonContent}
          loading={loading}
          error={loadError}
          onRetry={() => handleSkillClick(selectedSkill)}
          onClose={() => { setSelectedSkill(null); setLoadError(null); }}
        />
      )}
    </div>
  );
};

// Reusable Skill Modal
const SkillModal = ({ skill, content, loading, error, onRetry, onClose }: { skill: SATSkill, content: string | null, loading: boolean, error?: string | null, onRetry?: () => void, onClose: () => void }) => {
  const [tab, setTab] = useState<'study' | 'quiz'>('study');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [qLoading, setQLoading] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);

  // Embedded Quiz State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [key: string]: number | string }>({});
  const [showResults, setShowResults] = useState(false);

  const startQuiz = async () => {
    setTab('quiz');
    if (questions.length === 0) {
      setQLoading(true);
      try {
        // Determine type based on skill context (simplified for this demo)
        const type = skill.title.includes('Math') || skill.promptContext.includes('equations') || skill.promptContext.includes('functions') ? 'MATH' : 'READING_WRITING';
        const qs = await generateSATQuestions(5, type, skill.promptContext);
        setQuestions(qs);
        setQuizStarted(true);
      } catch (e) {
        alert("Failed to load quiz.");
      } finally {
        setQLoading(false);
      }
    }
  };

  // Styling for HTML
  const styledLesson = (content || "")
    .replace(/<h2>/g, '<h2 class="text-2xl font-bold text-white mt-10 mb-6 border-b border-white/10 pb-3 flex items-center gap-3"><span class="w-1.5 h-6 bg-indigo-500 rounded-full"></span>')
    .replace(/<\/h2>/g, '</h2>')
    .replace(/<p>/g, '<p class="text-zinc-300 leading-8 mb-6 text-lg font-light">')
    .replace(/<ul>/g, '<ul class="space-y-4 mb-8 text-zinc-300 bg-zinc-900/30 p-8 rounded-2xl border border-white/5">')
    .replace(/<li>/g, '<li class="flex items-start gap-3"><span class="mt-2.5 w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0"></span><span>')
    .replace(/<\/li>/g, '</span></li>')
    .replace(/<strong>/g, '<strong class="text-indigo-300 font-bold">');

  // -- Embedded Quiz Logic --
  const currentQ = questions[currentIndex];
  const score = questions.reduce((acc, q) => {
    if (q.type === 'text') {
      const userVal = (answers[q.id] as string || "").toLowerCase().replace(/\s/g, '');
      const correctVal = (q.correctAnswerText || "").toLowerCase().replace(/\s/g, '');
      if (!isNaN(parseFloat(userVal)) && !isNaN(parseFloat(correctVal)) && Math.abs(parseFloat(userVal) - parseFloat(correctVal)) < 0.001) return acc + 1;
      return acc + (userVal === correctVal ? 1 : 0);
    }
    return acc + (answers[q.id] === q.correctAnswer ? 1 : 0);
  }, 0);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-6 animate-fade-in">
      <div className="w-full max-w-6xl h-[90vh] bg-[#0a0a0a] border border-white/10 rounded-2xl flex flex-col relative overflow-hidden shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center bg-[#0d0d0d] shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center">
              <Target size={22} className="text-primary-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">{skill.title}</h3>
              <p className="text-xs text-zinc-500 mt-0.5">{skill.description}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 rounded-xl hover:bg-white/5 text-zinc-400 hover:text-white transition-colors duration-200">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-8 border-b border-white/5 bg-[#0d0d0d] shrink-0 gap-1">
          <button
            onClick={() => setTab('study')}
            className={`py-4 px-2 text-sm font-semibold border-b-2 -mb-px transition-colors duration-200 ${tab === 'study' ? 'text-white border-primary-500' : 'text-zinc-500 border-transparent hover:text-zinc-300'}`}
          >
            Study Guide
          </button>
          <button
            onClick={startQuiz}
            className={`py-4 px-2 text-sm font-semibold border-b-2 -mb-px transition-colors duration-200 ${tab === 'quiz' ? 'text-white border-primary-500' : 'text-zinc-500 border-transparent hover:text-zinc-300'}`}
          >
            Skill Check
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-10 bg-[#080808] relative">
          <GenerationLoaderModal isOpen={loading} title="Loading Study Module" subtitle="Extracting Concept Documentation" />

          {error ? (
            <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
              <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <AlertTriangle size={28} className="text-red-400" />
              </div>
              <div>
                <p className="text-zinc-300 font-medium mb-2">Couldn't load this lesson</p>
                <p className="text-zinc-500 text-sm max-w-md">{error}</p>
              </div>
              <div className="flex gap-3">
                {onRetry && <button onClick={onRetry} className="px-6 py-3 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-500 transition-colors">Try Again</button>}
                <button onClick={onClose} className="px-6 py-3 bg-white/5 text-zinc-300 font-medium rounded-xl hover:bg-white/10 transition-colors">Close</button>
              </div>
            </div>
          ) : tab === 'study' ? (
            <div className="prose prose-invert max-w-3xl mx-auto" dangerouslySetInnerHTML={{ __html: styledLesson }} />
          ) : (
            // QUIZ TAB
            <div className="h-full flex flex-col relative">
              <GenerationLoaderModal isOpen={qLoading} title="Generating Skill Assessment" subtitle="Assembling Node Challenges" />

              {showResults ? (
                <div className="h-full flex flex-col animate-in fade-in pb-8">
                  <div className="text-center space-y-4 mb-8 shrink-0">
                    <div className="w-16 h-16 mx-auto rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                      <Trophy size={32} />
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold text-white">Module Complete</h2>
                      <p className="text-zinc-400">Score: {Math.round((score / questions.length) * 100)}% ({score}/{questions.length})</p>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pr-4">
                    {questions.map((q, idx) => {
                      const uAns = answers[q.id];
                      const cAns = q.correctAnswer;
                      const isText = q.type === 'text';
                      const uVal = (uAns as string || "").toLowerCase().replace(/\\s/g, '');
                      const cVal = (q.correctAnswerText || "").toLowerCase().replace(/\\s/g, '');
                      let isCorrect = false;
                      if (isText) {
                        if (!isNaN(parseFloat(uVal)) && !isNaN(parseFloat(cVal)) && Math.abs(parseFloat(uVal) - parseFloat(cVal)) < 0.001) isCorrect = true;
                        else if (uVal === cVal) isCorrect = true;
                      } else {
                        isCorrect = uAns === cAns;
                      }

                      return (
                        <div key={q.id} className={`p-6 rounded-2xl border ${isCorrect ? 'border-green-500/20 bg-green-500/5' : 'border-red-500/30 bg-red-500/10'}`}>
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-zinc-400 font-mono text-xs uppercase tracking-widest">Question {idx + 1}</span>
                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest ${isCorrect ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                              {isCorrect ? 'Correct' : 'Incorrect'}
                            </span>
                          </div>
                          {q.imageUrl && (
                            <div className="mb-4 rounded-xl overflow-hidden border border-white/5 bg-white flex justify-center p-2">
                              <img src={q.imageUrl} alt="Question reference" className="max-w-full h-auto object-contain max-h-[250px]" />
                            </div>
                          )}
                          <h4 className="text-lg font-medium text-white mb-4">{q.question}</h4>
                          {!isCorrect && (
                            <div className="space-y-4">
                              <div className="p-4 rounded-xl bg-black/40 border border-white/5">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Your Answer:</span>
                                  <span className="text-red-400 font-medium">
                                    {isText ? (uAns || '—') : q.options[uAns as number] || '—'}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center pt-2 border-t border-white/5">
                                  <span className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Correct Answer:</span>
                                  <span className="text-green-400 font-medium">
                                    {isText ? q.correctAnswerText : q.options[cAns]}
                                  </span>
                                </div>
                              </div>
                              <div className="p-5 rounded-xl bg-zinc-900/50 border border-white/5 text-sm text-zinc-300 leading-relaxed">
                                <strong className="text-zinc-500 uppercase text-[10px] tracking-widest block mb-2">Explanation</strong>
                                {q.explanation}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="pt-6 mt-6 border-t border-white/5 shrink-0 text-center">
                    <button onClick={onClose} className="px-10 py-4 bg-white text-black font-bold rounded-full hover:scale-105 transition-transform">Exit Module</button>
                  </div>
                </div>
              ) : currentQ ? (
                <div className={`w-full max-w-6xl mx-auto h-full flex flex-col justify-center ${currentQ.passage ? 'lg:grid lg:grid-cols-2 lg:gap-16 lg:items-start' : ''}`}>

                  {currentQ.passage && (
                    <div className="bg-zinc-900/20 p-8 rounded-3xl border border-white/5 h-full max-h-[500px] overflow-y-auto custom-scrollbar mb-8 lg:mb-0 shadow-inner">
                      <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4 border-b border-white/5 pb-2">Reading Passage</div>
                      <p className="font-serif text-lg leading-loose text-zinc-300 whitespace-pre-wrap">{currentQ.passage}</p>
                    </div>
                  )}

                  <div className={`w-full ${!currentQ.passage ? 'max-w-2xl mx-auto' : 'flex flex-col justify-center h-full'}`}>
                    <div className={`mb-8 flex justify-between text-[10px] font-mono text-zinc-500 uppercase tracking-widest ${!currentQ.passage ? '' : ''}`}>
                      <span>Question {currentIndex + 1} of {questions.length}</span>
                      <span>Exam Mode</span>
                    </div>

                    {currentQ.imageUrl && (
                      <div className="mb-8 rounded-2xl overflow-hidden border border-white/5 bg-white flex justify-center p-4">
                        <img src={currentQ.imageUrl} alt="Question graphic" className="max-w-full h-auto object-contain max-h-[350px]" />
                      </div>
                    )}

                    <h3 className={`text-3xl font-medium text-white mb-10 leading-tight font-serif ${!currentQ.passage ? 'text-center' : ''}`}>{currentQ.question}</h3>

                    <div className="space-y-4">
                      {currentQ.type === 'text' ? (
                        <input
                          className="w-full p-6 bg-zinc-900/50 border border-zinc-700 rounded-2xl text-white outline-none focus:border-indigo-500 font-mono text-center text-2xl"
                          placeholder="Enter answer..."
                          value={answers[currentQ.id] || ''}
                          onChange={(e) => setAnswers({ ...answers, [currentQ.id]: e.target.value })}
                        />
                      ) : (
                        <div className="grid gap-3">
                          {currentQ.options.map((opt, i) => (
                            <button
                              key={i}
                              onClick={() => setAnswers({ ...answers, [currentQ.id]: i })}
                              className={`w-full text-left p-5 rounded-xl border transition-all flex items-center gap-5 group ${answers[currentQ.id] === i ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-zinc-900/30 border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-white hover:border-zinc-700'}`}
                            >
                              <div className={`w-8 h-8 rounded-lg border flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${answers[currentQ.id] === i ? 'bg-white text-black border-white' : 'border-zinc-700 group-hover:border-zinc-500'}`}>
                                {String.fromCharCode(65 + i)}
                              </div>
                              <span className="text-base font-medium">{opt}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="mt-10 flex justify-between">
                      <button
                        onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                        disabled={currentIndex === 0}
                        className="px-6 py-3 rounded-full border border-zinc-800 text-zinc-400 hover:text-white disabled:opacity-0 transition-all text-xs font-bold uppercase tracking-wide"
                      >
                        Previous
                      </button>
                      {currentIndex < questions.length - 1 ? (
                        <button onClick={() => setCurrentIndex(prev => prev + 1)} className="px-8 py-3 bg-white text-black font-bold rounded-full hover:scale-105 transition-all text-xs uppercase tracking-wide">
                          Next Question
                        </button>
                      ) : (
                        <button onClick={() => setShowResults(true)} className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-full hover:bg-indigo-500 shadow-lg transition-all text-xs uppercase tracking-wide">
                          Submit
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Full Exam Placeholder ---
const FullExamInterface = () => {
  return (
    <div className="flex flex-col items-center justify-center h-[500px] text-center bg-[#0A0A0A] border border-white/5 rounded-3xl p-10">
      <div className="w-20 h-20 rounded-full bg-zinc-900 flex items-center justify-center mb-6">
        <Lock size={32} className="text-zinc-600" />
      </div>
      <h3 className="text-2xl font-bold text-white mb-2">Full Simulation Locked</h3>
      <p className="text-zinc-500 max-w-md">The full-length 2.5 hour adaptive simulation requires Scholar Clearance. Please upgrade to access this module.</p>
    </div>
  )
}

const DomainCard: React.FC<{ domain: SATDomain; onSkillSelect: (s: SATSkill) => void | Promise<void>; accent?: 'blue' | 'purple' }> = ({ domain, onSkillSelect, accent = 'blue' }) => {
  const accentClass = accent === 'blue' ? 'hover:border-blue-500/30 hover:bg-blue-500/5' : 'hover:border-purple-500/30 hover:bg-purple-500/5';
  const accentDot = accent === 'blue' ? 'bg-blue-500' : 'bg-purple-500';
  return (
    <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-all duration-200 group">
      <h3 className="text-base font-bold text-white mb-1 tracking-tight">{domain.title}</h3>
      <p className="text-sm text-zinc-500 mb-5">{domain.description}</p>
      <div className="space-y-2">
        {domain.skills.map((skill, idx) => (
          <button
            key={idx}
            onClick={() => onSkillSelect(skill)}
            className={`group w-full text-left p-4 rounded-xl bg-white/[0.02] border border-transparent hover:border-white/10 text-zinc-300 hover:text-white transition-all duration-200 text-sm font-medium flex justify-between items-center ${accentClass}`}
          >
            <span className="flex items-center gap-3">
              <span className={`w-1.5 h-1.5 rounded-full ${accentDot} opacity-60`}></span>
              {skill.title}
            </span>
            <ChevronRight size={16} className="text-zinc-600 opacity-0 group-hover:opacity-100 group-hover:text-zinc-400 transition-all" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default SATPrep;