
import React, { useState, useEffect } from 'react';
import { BookOpen, ChevronRight, GraduationCap, ArrowLeft, Brain, Zap, Target, Layers, Play, CheckCircle, Lock, AlertTriangle, X } from 'lucide-react';
import { AP_COURSES, APCourse, APUnit } from '../data/apCourses';
import { generateAPLesson, generateAPQuestions, generateFlashcards } from '../services/aiService';
import { createResource } from '../services/mockDb';
import { Resource } from '../types';
import { getUserTier } from '../utils/security';
import { GenerationLoaderModal } from './GenerationLoaderModal';

interface APCenterProps {
  onExamReady: (id: string) => void;
}

const APCenter: React.FC<APCenterProps> = ({ onExamReady }) => {
  const [selectedCourse, setSelectedCourse] = useState<APCourse | null>(null);
  const [loadingUnit, setLoadingUnit] = useState<string | null>(null);
  const [loadingExam, setLoadingExam] = useState(false);
  const [userTier, setUserTier] = useState<string>('Initiate');
  const [error, setError] = useState<string | null>(null);

  const INITIATE_ACCESS_IDS = [
    'ap-world',
    'ap-stats',
    'ap-physics-1',
    'ap-physics-c-em',
    'ap-human-geo'
  ];

  useEffect(() => {
    setUserTier(getUserTier());
  }, []);

  // Reverted to distinct gradient backgrounds for categories
  const getCategoryGradient = (cat: string) => {
    switch (cat) {
      case 'Math': return 'from-blue-500 to-cyan-500';
      case 'Science': return 'from-emerald-500 to-teal-500';
      case 'History': return 'from-orange-500 to-amber-500';
      case 'Computer Science': return 'from-purple-500 to-indigo-500';
      default: return 'from-zinc-500 to-zinc-400';
    }
  };

  const isLocked = (courseId: string) => {
    if (userTier === 'Scholar') return false;
    return !INITIATE_ACCESS_IDS.includes(courseId);
  };

  const handleCourseSelect = (course: APCourse) => {
    if (isLocked(course.id)) return;
    setError(null);
    setSelectedCourse(course);
  };

  const handleStudyUnit = async (unit: APUnit, index: number) => {
    if (loadingUnit) return;
    setLoadingUnit(unit.title);
    setError(null);

    try {
      const topicString = `AP Course: ${selectedCourse?.title}. Unit: ${unit.title}. Topics: ${unit.topics}.`;

      // Parallel generation — all 3 run at the same time for speed
      const [summary, quiz, flashcards] = await Promise.all([
        generateAPLesson(selectedCourse?.title || '', unit.title, unit.topics),
        generateAPQuestions(10, selectedCourse?.title || '', unit.title, 'medium'),
        generateFlashcards(topicString)
      ]);

      const resource: Resource = {
        id: `ap-${Date.now()}`,
        title: `${selectedCourse?.title}: ${unit.title}`,
        type: 'TEXT',
        originalContent: topicString,
        summary,
        flashcards,
        quiz,
        createdAt: Date.now(),
        lastAccessed: Date.now(),
        status: 'ready',
        tags: ['AP Nexus', selectedCourse?.title || 'AP', 'Unit Study']
      };

      await createResource(resource);
      onExamReady(resource.id);

    } catch (e) {
      console.error(e);
      setError((e as Error).message || "Neural Link Failed");
    } finally {
      setLoadingUnit(null);
    }
  };

  const handleComprehensiveExam = async () => {
    if (!selectedCourse || loadingExam) return;
    setLoadingExam(true);
    setError(null);

    try {
      const allTopics = selectedCourse.units.map(u => `${u.title}: ${u.topics}`).join('\n');
      const topicString = `Comprehensive Review for ${selectedCourse.title}. Covering all units:\n${allTopics}`;

      const quiz = await generateAPQuestions(50, selectedCourse.title, 'Comprehensive Review', 'hard');

      const resource: Resource = {
        id: `ap-final-${Date.now()}`,
        title: `${selectedCourse.title} - Final Protocol`,
        type: 'TEXT',
        originalContent: topicString,
        summary: `<h2>Comprehensive Assessment Protocol</h2><p>This exam module covers all units of ${selectedCourse.title}.</p>`,
        flashcards: [],
        quiz,
        createdAt: Date.now(),
        lastAccessed: Date.now(),
        status: 'ready',
        tags: ['AP Nexus', 'Exam Mode', 'Cumulative']
      };

      await createResource(resource);
      onExamReady(resource.id);
    } catch (e) {
      console.error(e);
      setError((e as Error).message || "Exam generation failed");
    } finally {
      setLoadingExam(false);
    }
  };

  const sortedCourses = [...AP_COURSES].sort((a, b) => {
    const isAFree = INITIATE_ACCESS_IDS.includes(a.id);
    const isBFree = INITIATE_ACCESS_IDS.includes(b.id);
    if (isAFree && !isBFree) return -1;
    if (!isAFree && isBFree) return 1;
    return 0;
  });

  if (selectedCourse) {
    return (
      <div className="max-w-5xl mx-auto py-8 animate-enter relative">
        <GenerationLoaderModal isOpen={loadingUnit !== null} onClose={() => setLoadingUnit(null)} title="Extracting Unit Modules" subtitle={`Processing ${loadingUnit}`} />
        <GenerationLoaderModal isOpen={loadingExam} onClose={() => setLoadingExam(false)} title="Constructing Final Simulation" subtitle="Cross-referencing All Domains" />

        <button
          onClick={() => setSelectedCourse(null)}
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-white mb-8 group transition-colors"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Return to Nexus
        </button>

        {error && (
          <div className="mb-8 p-4 rounded-xl bg-red-900/10 border border-red-900/30 text-red-400 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <AlertTriangle size={20} />
              <span className="font-bold text-sm">{error}</span>
            </div>
            <button onClick={() => setError(null)} className="p-1 hover:bg-red-900/20 rounded">
              <X size={16} />
            </button>
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-10 items-start mb-16 border-b border-white/5 pb-12">
          <div className={`w-24 h-24 rounded-3xl flex items-center justify-center text-4xl shadow-2xl bg-gradient-to-br ${getCategoryGradient(selectedCourse.category)} text-white`}>
            <GraduationCap />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-[10px] font-bold px-2 py-1 rounded bg-white/5 border border-white/10 uppercase tracking-widest text-zinc-400">
                {selectedCourse.category}
              </span>
            </div>
            <h1 className="text-5xl font-medium text-white mb-4 tracking-tight">{selectedCourse.title}</h1>
            <p className="text-zinc-400 text-lg leading-relaxed max-w-2xl">{selectedCourse.description}</p>
          </div>
          <div className="text-right hidden md:block">
            <div className="text-4xl font-bold text-white">{selectedCourse.units.length}</div>
            <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Total Modules</div>
          </div>
        </div>

        <div className="space-y-4 mb-20">
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2 px-2">
            <Layers size={14} /> Course Curriculum
          </h3>
          {selectedCourse.units.map((unit, idx) => (
            <div
              key={idx}
              className="group flex items-center justify-between p-6 rounded-2xl bg-[#0A0A0A] border border-white/5 hover:border-white/10 transition-all hover:bg-zinc-900/40"
            >
              <div className="flex items-center gap-6">
                <div className="w-8 h-8 rounded-full border border-zinc-800 bg-black flex items-center justify-center text-zinc-500 font-mono text-xs group-hover:border-white/20 group-hover:text-white transition-colors">
                  {String(idx + 1).padStart(2, '0')}
                </div>
                <div>
                  <h4 className="font-bold text-base text-white mb-1 group-hover:text-indigo-300 transition-colors">{unit.title}</h4>
                  <p className="text-sm text-zinc-500 line-clamp-1 max-w-lg">{unit.topics}</p>
                </div>
              </div>

              <button
                onClick={() => handleStudyUnit(unit, idx)}
                disabled={loadingUnit !== null}
                className="px-6 py-2.5 rounded-full border border-white/10 hover:bg-white text-zinc-300 hover:text-black transition-all text-xs font-bold uppercase tracking-wide flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Initialize <ChevronRight size={12} />
              </button>
            </div>
          ))}
        </div>

        <div className="p-10 rounded-3xl bg-gradient-to-r from-zinc-900 to-black border border-white/10 flex items-center justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-96 h-full bg-gradient-to-l from-indigo-900/20 to-transparent pointer-events-none"></div>
          <div className="relative z-10 flex items-center gap-8">
            <div className="w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Target size={32} />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white mb-1">Final Assessment Protocol</h3>
              <p className="text-zinc-400 text-sm">Comprehensive 50-question simulation covering all course material.</p>
            </div>
          </div>
          <button
            onClick={handleComprehensiveExam}
            disabled={loadingExam}
            className="relative z-10 px-8 py-4 bg-white text-black font-bold rounded-full shadow-xl transition-all hover:scale-105 disabled:opacity-50"
          >
            {loadingExam ? 'Constructing...' : 'Begin Simulation'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 animate-enter max-w-7xl mx-auto">
      <div className="mb-16 space-y-4 border-b border-white/5 pb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold uppercase tracking-widest">
          <Brain size={12} /> AP Nexus
        </div>
        <h1 className="text-5xl md:text-6xl font-medium text-white tracking-tight">Advanced Placement</h1>
        <p className="text-zinc-400 text-lg">Select a neural pathway to begin targeted acquisition.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedCourses.map((course, idx) => {
          const locked = isLocked(course.id);

          return (
            <button
              key={course.id}
              onClick={() => handleCourseSelect(course)}
              disabled={locked}
              className={`group flex flex-col items-start text-left p-8 rounded-3xl border transition-all hover:-translate-y-1 relative overflow-hidden h-full ${locked ? 'bg-black border-zinc-900 opacity-50 cursor-not-allowed' : 'bg-[#0A0A0A] border-white/5 hover:border-white/10'}`}
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              {/* Lock Overlay */}
              {locked && (
                <div className="absolute top-6 right-6 z-20">
                  <Lock size={20} className="text-zinc-600" />
                </div>
              )}

              {/* Gradient Line Top - Re-enabled for color distinction */}
              <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r transition-opacity duration-500 opacity-0 group-hover:opacity-100 ${getCategoryGradient(course.category)}`}></div>

              <div className="mb-8 w-full flex justify-between items-start">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br ${getCategoryGradient(course.category)} text-white shadow-lg`}>
                  <GraduationCap size={24} />
                </div>
                {!locked && <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/50 group-hover:bg-white group-hover:text-black transition-all"><ChevronRight size={14} /></div>}
              </div>

              <div className="mb-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{course.category}</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-white/90 leading-tight">{course.title}</h3>
              <p className="text-sm text-zinc-500 leading-relaxed line-clamp-2">{course.description}</p>

              <div className="mt-auto pt-8 w-full flex items-center justify-between border-t border-white/5">
                <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500 uppercase">
                  <Layers size={12} /> {course.units.length} Modules
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default APCenter;
