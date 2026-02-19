import React, { useEffect, useState } from 'react';
import { Clock, BookOpen, Brain, Flame, FileText, Youtube, Mic, ArrowRight, Plus, Activity, Search, Filter, Terminal, Zap, Layers, Play, Pause, RotateCcw, CheckSquare, Sparkles, Target, MoreHorizontal, Check, X, Shield, ChevronRight, Trash2, Calendar, Radio, BarChart2 } from 'lucide-react';
import { Resource, UserStats, StudyTask, CalendarEvent } from '../types';
import { getUserStats, deleteResource } from '../services/mockDb';

interface DashboardProps {
  darkMode: boolean;
  resources: Resource[];
  onResourceClick: (id: string) => void;
  onUploadClick: () => void;
  onExamClick: () => void;
  // Todo Props
  todoTasks: StudyTask[];
  weeklyEvents: CalendarEvent[];
  onAddTodo: (text: string) => void;
  onToggleTodo: (id: string) => void;
  onDeleteTodo: (id: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  darkMode, 
  resources, 
  onResourceClick, 
  onUploadClick, 
  onExamClick,
  todoTasks,
  weeklyEvents,
  onAddTodo,
  onToggleTodo,
  onDeleteTodo
}) => {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [greeting, setGreeting] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  // Local state for immediate UI updates on delete
  const [localResources, setLocalResources] = useState<Resource[]>(resources);
  
  // Dynamic Velocity Calculation
  const focusTime = stats?.hoursLearned ? stats.hoursLearned * 3600 : 0;
  const velocityPercentage = Math.min(100, Math.round((focusTime / 3600) * 100));
  const strokeDashoffset = 163.36 - (163.36 * (velocityPercentage / 100));

  useEffect(() => {
    setLocalResources(resources);
  }, [resources]);

  useEffect(() => {
    getUserStats().then(setStats);
    
    // Dynamic Greeting
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 18) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');

    // Live Clock
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [resources]);

  const handleDeleteResource = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("Permanently delete this protocol?")) {
        await deleteResource(id);
        setLocalResources(prev => prev.filter(r => r.id !== id));
        // Force refresh stats if needed
        getUserStats().then(setStats);
    }
  };

  return (
    <div className="w-full h-full flex flex-col gap-8 pb-20 animate-enter">
      
      {/* HUD Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 pb-6 border-b border-white/5">
        <div className="space-y-2 relative">
           <div className="text-[10px] font-bold font-mono text-primary-400 uppercase tracking-widest mb-2 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
              </span>
              System Operational v2.5
           </div>
           <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight leading-none">
            {greeting}, <br className="md:hidden" /><span className="text-zinc-500">Scholar.</span>
          </h1>
          <p className="text-zinc-400 text-sm font-medium tracking-wide">
             {currentTime.toLocaleDateString(undefined, {weekday: 'long', month: 'long', day: 'numeric'})}
          </p>
        </div>
        
        {/* Cooler Velocity HUD */}
        <div className="relative group w-full md:w-auto">
           <div className="absolute inset-0 bg-primary-500/20 blur-2xl rounded-full opacity-20 group-hover:opacity-40 transition-opacity"></div>
           <div className="flex items-center gap-6 p-6 rounded-2xl bg-[#080808] border border-white/10 relative overflow-hidden backdrop-blur-xl">
              
              {/* Ring Chart */}
              <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
                <svg className="w-full h-full transform -rotate-90 drop-shadow-[0_0_10px_rgba(41,98,255,0.3)]" viewBox="0 0 60 60">
                  <circle cx="30" cy="30" r="26" stroke="#1f1f22" strokeWidth="4" fill="none" />
                  <circle 
                    cx="30" cy="30" r="26" 
                    stroke="#2962FF" 
                    strokeWidth="4" 
                    fill="none" 
                    strokeDasharray="163.36" 
                    strokeDashoffset={strokeDashoffset} 
                    strokeLinecap="round" 
                    className="transition-all duration-1000 ease-out" 
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                   <Zap size={16} className="text-primary-400 mb-0.5 fill-current" />
                   <span className="text-xs font-bold text-white">{velocityPercentage}%</span>
                </div>
              </div>
              
              <div>
                <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-1">
                  Daily Velocity
                </div>
                <div className="text-2xl font-bold text-white tracking-tight flex items-baseline gap-1">
                  {Math.round(focusTime/60)} <span className="text-sm font-medium text-zinc-600">/ 60 min</span>
                </div>
                <div className="text-[10px] text-primary-400 font-medium mt-1">
                   {velocityPercentage >= 100 ? 'Target Reached' : 'In Progress'}
                </div>
              </div>
           </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-enter stagger-1">
        <StatCard 
          icon={<Flame size={20} />} 
          label="Current Streak" 
          value={stats?.streak || 0} 
          unit="Days"
          color="orange"
        />
        <StatCard 
          icon={<Brain size={20} />} 
          label="Knowledge Base" 
          value={stats?.cardsLearned || 0} 
          unit="Concepts"
          color="indigo"
        />
        <StatCard 
          icon={<Clock size={20} />} 
          label="Deep Focus" 
          value={stats?.hoursLearned || 0} 
          unit="Hours"
          color="cyan"
        />
        <StatCard 
          icon={<Layers size={20} />} 
          label="Retention" 
          value={stats?.quizScoreAvg || 0} 
          unit="%"
          color="emerald"
        />
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 animate-enter stagger-2">
         
         {/* Left Column: Actions & Recent */}
         <div className="lg:col-span-2 flex flex-col gap-8">
            
            {/* Action Buttons - Responsive Height Fix */}
            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4 pl-1 flex items-center gap-2">
                <Terminal size={12} /> Command Protocols
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <ActionButton 
                  icon={<FileText size={24} />} 
                  label="PDF Upload" 
                  description="Parser Ready"
                  onClick={onUploadClick} 
                  delay={0} 
                  color="blue"
                />
                <ActionButton 
                  icon={<Target size={24} />} 
                  label="Exam Mode" 
                  description="Simulation"
                  onClick={onExamClick} 
                  delay={50} 
                  color="red"
                />
                <ActionButton 
                  icon={<Youtube size={24} />} 
                  label="Video Sync" 
                  description="Analyzer"
                  onClick={onUploadClick} 
                  delay={100} 
                  color="purple"
                />
                <ActionButton 
                  icon={<Mic size={24} />} 
                  label="Audio Log" 
                  description="Transcriber"
                  onClick={onUploadClick} 
                  delay={150} 
                  color="green"
                />
              </div>
            </div>

            {/* Operations Log */}
            <div className="flex-1 min-h-[300px] flex flex-col">
               <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 pl-1 flex items-center gap-2">
                    <Activity size={12} /> Operations Log
                  </h2>
                  <div className="text-[10px] bg-zinc-900 px-2 py-1 rounded text-zinc-500 font-mono border border-zinc-800">
                     ENCRYPTED
                  </div>
               </div>
               
               <div className="space-y-3 flex-1">
                  {localResources.slice(0, 4).map((res) => (
                    <div 
                      key={res.id} 
                      onClick={() => onResourceClick(res.id)}
                      className="group flex items-center justify-between p-5 rounded-2xl bg-[#09090b] border border-white/5 hover:border-primary-500/30 hover:bg-primary-500/5 transition-all cursor-pointer relative overflow-hidden"
                    >
                       <div className="flex items-center gap-5 relative z-10 overflow-hidden min-w-0">
                          <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 group-hover:text-primary-400 group-hover:border-primary-500/30 transition-all shrink-0">
                             <FileText size={20} />
                          </div>
                          <div className="min-w-0 flex-1">
                             <h4 className="font-bold text-base text-zinc-200 group-hover:text-white transition-colors mb-1 truncate">{res.title}</h4>
                             <div className="flex items-center gap-3">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-900 text-zinc-500 border border-zinc-800 uppercase tracking-wide group-hover:border-primary-500/20 group-hover:text-primary-500/70 transition-colors">
                                   {res.type}
                                </span>
                                <p className="text-xs text-zinc-600">{new Date(res.createdAt).toLocaleDateString()}</p>
                             </div>
                          </div>
                       </div>
                       
                       <div className="flex items-center gap-3 relative z-10">
                          <button 
                            onClick={(e) => handleDeleteResource(e, res.id)}
                            className="p-2 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                            title="Delete Resource"
                          >
                             <Trash2 size={16} />
                          </button>
                          <div className="w-8 h-8 rounded-full border border-zinc-800 flex items-center justify-center text-zinc-600 group-hover:text-white group-hover:bg-primary-600 group-hover:border-primary-500 transition-all shrink-0">
                             <ChevronRight size={14} />
                          </div>
                       </div>
                    </div>
                  ))}
                  {localResources.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center p-10 text-center border-2 border-dashed border-zinc-900 rounded-2xl">
                      <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center mb-3 text-zinc-700">
                        <BarChart2 size={20} />
                      </div>
                      <div className="text-zinc-600 font-bold text-sm">System Idle</div>
                      <div className="text-zinc-700 text-xs mt-1">Initialize a protocol to begin ingestion.</div>
                    </div>
                  )}
               </div>
            </div>
         </div>

         {/* Right Column: Priority Queue */}
         <div className="flex flex-col h-full">
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4 pl-1 flex items-center gap-2">
              <CheckSquare size={12} /> Priority Queue
            </h2>
            <div className="flex-1 bg-[#09090b] rounded-3xl border border-white/5 p-6 flex flex-col relative overflow-hidden shadow-xl min-h-[300px]">
               <div className="absolute top-0 right-0 w-64 h-64 bg-primary-900/5 blur-[80px] rounded-full pointer-events-none"></div>

               <TodoWidget 
                 tasks={todoTasks} 
                 weeklyEvents={weeklyEvents}
                 onAdd={onAddTodo} 
                 onToggle={onToggleTodo} 
                 onDelete={onDeleteTodo} 
               />
            </div>
         </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value, unit, color }: any) => {
  const styles: any = {
    indigo: "border-indigo-500/10 text-indigo-400 bg-indigo-500/5",
    orange: "border-orange-500/10 text-orange-400 bg-orange-500/5",
    cyan: "border-cyan-500/10 text-cyan-400 bg-cyan-500/5",
    emerald: "border-emerald-500/10 text-emerald-400 bg-emerald-500/5"
  };

  return (
    <div className={`border rounded-2xl p-6 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 ${styles[color]}`}>
      <div className="relative z-10 flex flex-col h-full justify-between gap-4">
        <div className="flex justify-between items-start">
           <div className="opacity-80 group-hover:opacity-100 transition-opacity transform group-hover:scale-110 duration-300">{icon}</div>
        </div>
        <div>
          <div className="text-2xl md:text-3xl font-bold text-white mb-1 tracking-tight">{value} <span className="text-[10px] md:text-xs font-medium text-zinc-500 ml-1 uppercase">{unit}</span></div>
          <div className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-600 group-hover:text-zinc-400 transition-colors">{label}</div>
        </div>
      </div>
    </div>
  );
};

const ActionButton = ({ icon, label, description, onClick, delay, color }: any) => {
  const glowStyles: any = {
    blue: "hover:shadow-[0_0_30px_rgba(41,98,255,0.3)] hover:border-blue-500/50 hover:bg-blue-900/10",
    red: "hover:shadow-[0_0_30px_rgba(239,68,68,0.3)] hover:border-red-500/50 hover:bg-red-900/10",
    purple: "hover:shadow-[0_0_30px_rgba(168,85,247,0.3)] hover:border-purple-500/50 hover:bg-purple-900/10",
    green: "hover:shadow-[0_0_30px_rgba(34,197,94,0.3)] hover:border-green-500/50 hover:bg-green-900/10",
  };

  return (
    <button 
      onClick={onClick}
      // Increased text size for description to text-xs (was text-[10px]) for legibility
      className={`h-32 sm:h-40 lg:h-56 flex flex-col items-start justify-between p-6 bg-[#09090b] border border-white/5 rounded-3xl transition-all duration-300 group animate-enter ${glowStyles[color] || glowStyles.blue}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="p-3 md:p-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-400 group-hover:text-white group-hover:scale-110 transition-all duration-300 shadow-lg scale-90 md:scale-100 origin-top-left">
        {icon}
      </div>
      <div className="text-left w-full mb-1">
        <div className="text-sm md:text-base font-bold text-white mb-1 group-hover:translate-x-1 transition-transform">{label}</div>
        <div className="text-[10px] md:text-xs font-mono text-zinc-600 uppercase tracking-widest group-hover:text-zinc-400 truncate">{description}</div>
      </div>
    </button>
  );
};

const TodoWidget = ({ tasks, weeklyEvents, onAdd, onToggle, onDelete }: { 
  tasks: StudyTask[], 
  weeklyEvents: CalendarEvent[],
  onAdd: (text: string) => void, 
  onToggle: (id: string) => void, 
  onDelete: (id: string) => void 
}) => {
  const [input, setInput] = useState('');
  
  const today = new Date().toLocaleDateString('en-US', { weekday: 'short' });
  const todaysEvents = weeklyEvents
    .filter(e => e.day === today)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onAdd(input);
    setInput('');
  };

  return (
    <div className="flex flex-col h-full relative z-10">
      <form onSubmit={handleSubmit} className="relative mb-6">
        <input 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="New Directive..." 
          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 pr-10 text-xs font-medium text-white placeholder:text-zinc-700 focus:outline-none focus:border-primary-500/50 transition-all"
        />
        <button 
          type="submit"
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-white/5 hover:bg-white/20 rounded-lg text-zinc-400 hover:text-white transition-colors"
        >
          <Plus size={14} />
        </button>
      </form>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
        {/* Scheduled for Today Section */}
        {todaysEvents.length > 0 && (
           <div className="space-y-2 mb-6">
             <div className="text-[9px] font-bold text-primary-400 uppercase tracking-widest flex items-center gap-2 mb-2 px-1">
               <Calendar size={10} /> Active Protocol
             </div>
             {todaysEvents.map(evt => (
               <div key={evt.id} className="p-3.5 rounded-xl border border-primary-500/20 bg-primary-500/5 flex items-start gap-3">
                  <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary-400 shrink-0"></div>
                  <div>
                     <div className="text-xs font-bold text-primary-100 leading-tight">{evt.title}</div>
                     <div className="text-[10px] text-primary-400/60 mt-1 font-mono uppercase">{evt.startTime} - {evt.endTime}</div>
                  </div>
               </div>
             ))}
           </div>
        )}

        {/* Manual Tasks */}
        <div className="space-y-2">
          {tasks.map((task) => (
            <div 
              key={task.id} 
              className="group flex items-center gap-3 p-3 rounded-xl bg-zinc-900/20 hover:bg-zinc-900/60 border border-transparent hover:border-white/5 transition-all"
            >
              <button 
                onClick={() => onToggle(task.id)}
                className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                  task.completed ? 'bg-primary-600 border-primary-600 text-white' : 'border-zinc-700 hover:border-primary-500'
                }`}
              >
                {task.completed && <Check size={10} />}
              </button>
              <span className={`flex-1 text-xs font-medium truncate ${task.completed ? 'text-zinc-600 line-through' : 'text-zinc-300'}`}>
                {task.text}
              </span>
              <button 
                onClick={() => onDelete(task.id)}
                className="opacity-0 group-hover:opacity-100 p-1.5 text-zinc-600 hover:text-red-400 transition-all"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>

        {tasks.length === 0 && todaysEvents.length === 0 && (
          <div className="text-center py-10 text-zinc-700 text-[10px] font-mono uppercase tracking-widest">
            Queue Clear
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;