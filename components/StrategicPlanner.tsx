import React, { useState } from 'react';
import { Sparkles, ArrowRight, RotateCcw, CheckCircle, Calendar } from 'lucide-react';
import { CalendarEvent } from '../types';
import { generateWeeklyPlan } from '../services/aiService';

const DAY_MAP: Record<string, 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun'> = {
  monday: 'Mon', mon: 'Mon', tuesday: 'Tue', tue: 'Tue', wednesday: 'Wed', wed: 'Wed',
  thursday: 'Thu', thu: 'Thu', friday: 'Fri', fri: 'Fri', saturday: 'Sat', sat: 'Sat',
  sunday: 'Sun', sun: 'Sun'
};

function weeklyPlanToCalendarEvents(plan: Array<{ day: string; tasks: string[] }>): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  
  for (const dayBlock of plan) {
    const dayKey = (dayBlock.day || '').toLowerCase().trim();
    const calDay = DAY_MAP[dayKey] || DAY_MAP[dayKey.slice(0, 3)] || 'Mon';
    const tasks = Array.isArray(dayBlock.tasks) ? dayBlock.tasks : [];
    
    tasks.forEach((task, i) => {
      const startHour = 9 + Math.floor(i * 1.5);
      const startTime = `${String(startHour).padStart(2, '0')}:00`;
      const endHour = startHour + 1;
      const endTime = `${String(Math.min(endHour, 23)).padStart(2, '0')}:30`;
      events.push({
        id: `plan-${Date.now()}-${events.length}`,
        day: calDay,
        title: typeof task === 'string' ? task : String(task),
        startTime,
        endTime,
        type: 'Study',
        completed: false
      });
    });
  }
  return events;
}

interface StrategicPlannerProps {
  weeklyEvents: CalendarEvent[];
  setWeeklyEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>;
  onNavigate?: (view: any) => void;
}

const StrategicPlanner: React.FC<StrategicPlannerProps> = ({ weeklyEvents, setWeeklyEvents, onNavigate }) => {
  const [goal, setGoal] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!goal.trim()) return;
    setLoading(true);
    setSuccess(false);
    setError('');
    try {
      const plan = await generateWeeklyPlan([goal.trim()]);
      const events = weeklyPlanToCalendarEvents(plan);
      setWeeklyEvents(events);
      setSuccess(true);
      setGoal('');
    } catch (e: any) {
      console.error('Plan generation failed:', e);
      const msg = e?.message || 'Failed to generate plan. Please check your API key (VITE_OPENROUTER_API_KEY) and try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-10 md:py-20 animate-enter flex flex-col items-center text-center h-full md:h-[600px] justify-center px-4 md:px-0">
      <div className="mb-8 md:mb-12 space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-900/20 border border-purple-500/30 text-purple-400 text-xs font-bold uppercase tracking-widest backdrop-blur-sm">
           <Sparkles size={12} /> Neural Architect
        </div>
        <h2 className="text-4xl md:text-5xl font-bold text-white">Strategic Planner</h2>
        <p className="text-zinc-500 text-base md:text-lg max-w-lg mx-auto">Define your objective. The Neural Engine will construct a 7-day high-performance protocol.</p>
      </div>

      {/* Input Section */}
      <div className="relative w-full max-w-2xl mb-12">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-primary-600 rounded-2xl opacity-30 blur-lg animate-pulse-slow"></div>
        <div className="relative flex flex-col md:flex-row items-center bg-[#0A0A0A] rounded-2xl border border-white/10 p-2 shadow-2xl gap-2 md:gap-0">
          <input 
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="E.g., Master AP Calculus Limits in one week..." 
            className="w-full flex-1 bg-transparent px-4 py-3 md:px-6 md:py-4 text-base md:text-lg text-white outline-none placeholder:text-zinc-600"
            onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
          />
          <button 
            onClick={handleGenerate}
            disabled={loading || !goal.trim()}
            className="w-full md:w-auto px-8 py-3 md:py-4 bg-white text-black font-bold rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2 whitespace-nowrap"
          >
            {loading ? 'Constructing...' : <>Generate <ArrowRight size={16} /></>}
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="animate-in fade-in duration-300 bg-red-900/10 border border-red-500/20 rounded-2xl p-6 flex flex-col items-center gap-4">
          <p className="text-red-400 text-sm text-center">{error}</p>
        </div>
      )}

      {/* Success State */}
      {success && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 bg-green-900/10 border border-green-500/20 rounded-2xl p-6 flex flex-col items-center gap-4">
           <div className="flex items-center gap-2 text-green-400 font-bold">
              <CheckCircle size={20} /> Protocol Generated Successfully
           </div>
           <p className="text-zinc-400 text-sm">
             Your schedule has been populated.
           </p>
           {onNavigate && (
             <button 
               onClick={() => onNavigate('calendar')}
               className="mt-2 px-6 py-2 rounded-full bg-green-600 text-white text-sm font-bold hover:bg-green-500 transition-all flex items-center gap-2"
             >
               <Calendar size={14} /> View Calendar
             </button>
           )}
        </div>
      )}

      {/* Existing Plan Warning */}
      {!success && weeklyEvents.length > 0 && (
         <div className="text-zinc-500 text-sm flex flex-col items-center gap-2">
            <span>Current Protocol Active: {weeklyEvents.length} Blocks</span>
            <button onClick={() => setWeeklyEvents([])} className="text-red-400 hover:text-red-300 flex items-center gap-1">
               <RotateCcw size={12} /> Reset Protocol
            </button>
         </div>
      )}
    </div>
  );
};

export default StrategicPlanner;