import React, { useState, useEffect } from 'react';
import { Layout, Menu, FileText, Plus, Home, LogOut, Shield, Zap, Clock, Sparkles, GraduationCap, Target, Calendar, X, RotateCw } from 'lucide-react';
import { Resource, StudyTask, CalendarEvent } from '../types';
import Dashboard from './Dashboard';
import NeuralTimer from './NeuralTimer';
import StrategicPlanner from './StrategicPlanner';
import CalendarView from './CalendarView';
import ResourceView from './ResourceView';
import UploadModal from './UploadModal';
import ExamGeneratorModal from './ExamGeneratorModal';
import LandingPage from './LandingPage';
import APCenter from './APCenter';
import SATPrep from './SATPrep';
import { Logo } from './Logo';
import { getResources } from '../services/mockDb';
import { getUserTier, unlockSession, initIdleMonitor } from '../utils/security';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentView, setCurrentView] = useState<'dashboard' | 'timer' | 'planner' | 'calendar' | 'ap-center' | 'sat-prep'>('dashboard');
  const [resourceViewId, setResourceViewId] = useState<string | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isExamOpen, setIsExamOpen] = useState(false);
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userTier, setUserTier] = useState<string>('Initiate');
  const [currentUsername, setCurrentUsername] = useState<string>('');
  
  // Mobile UI States
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showRotatePrompt, setShowRotatePrompt] = useState(false);
  
  // Shared To-Do State
  const [todoTasks, setTodoTasks] = useState<StudyTask[]>([]);
  // Shared Weekly Calendar State
  const [weeklyEvents, setWeeklyEvents] = useState<CalendarEvent[]>([]);

  // Load State on Mount
  useEffect(() => {
    const savedTodos = localStorage.getItem('ascent_todos');
    const savedWeekly = localStorage.getItem('ascent_weekly_plan');
    if (savedTodos) setTodoTasks(JSON.parse(savedTodos));
    if (savedWeekly) setWeeklyEvents(JSON.parse(savedWeekly));
  }, []);

  // Check Orientation on Login/Resize
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkOrientation = () => {
      // Increased threshold to 1024 to catch large phones/small tablets
      const isMobile = window.innerWidth < 1024; 
      const isPortrait = window.innerHeight > window.innerWidth;
      const hasDismissed = sessionStorage.getItem('ascent_dismiss_rotate');
      
      // Show prompt if device is mobile-sized, currently in portrait, and hasn't dismissed yet
      setShowRotatePrompt(isMobile && isPortrait && !hasDismissed);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    return () => window.removeEventListener('resize', checkOrientation);
  }, [isAuthenticated]);

  // Save State on Change
  useEffect(() => {
    if (isAuthenticated) {
      localStorage.setItem('ascent_todos', JSON.stringify(todoTasks));
      localStorage.setItem('ascent_weekly_plan', JSON.stringify(weeklyEvents));
    }
  }, [todoTasks, weeklyEvents, isAuthenticated]);

  const handleAddTodo = (text: string) => {
    setTodoTasks(prev => [{ id: Date.now().toString(), text, completed: false }, ...prev]);
  };

  const handleToggleTodo = (id: string) => {
    setTodoTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const handleDeleteTodo = (id: string) => {
    setTodoTasks(prev => prev.filter(t => t.id !== id));
  };

  // Logout Logic
  const handleLogout = () => {
    localStorage.removeItem('ascent_session');
    localStorage.removeItem('ascent_user_tier');
    localStorage.removeItem('ascent_username');
    
    if (currentUsername) {
      unlockSession(currentUsername);
    }
    
    setIsAuthenticated(false);
    setCurrentView('dashboard');
    setCurrentUsername('');
  };

  // Check for existing session & Init Security Monitors
  useEffect(() => {
    const session = localStorage.getItem('ascent_session');
    const user = localStorage.getItem('ascent_username');
    if (session) {
      setIsAuthenticated(true);
      setUserTier(getUserTier());
      if (user) setCurrentUsername(user);
      
      // Init Idle Monitor
      initIdleMonitor(handleLogout);
    }

    // Safety: Unlock session if user closes tab
    const handleUnload = () => {
      if (user) unlockSession(user);
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [isAuthenticated, currentUsername]);

  const handleLogin = (username: string) => {
    localStorage.setItem('ascent_session', 'true');
    localStorage.setItem('ascent_username', username);
    setCurrentUsername(username);
    setIsAuthenticated(true);
    setUserTier(getUserTier());
    // Init Idle Monitor immediately upon login
    initIdleMonitor(handleLogout);
  };

  const refreshResources = async () => {
    setIsLoading(true);
    const data = await getResources();
    setResources(data);
    setIsLoading(false);
  };

  useEffect(() => {
    if (isAuthenticated) {
      refreshResources();
      document.documentElement.classList.add('dark');
    }
  }, [isAuthenticated]);

  const handleResourceClick = (id: string) => {
    setResourceViewId(id);
    setIsMobileMenuOpen(false);
  };

  const handleExamReady = (id: string) => {
    refreshResources();
    handleResourceClick(id); 
  }

  const handleHomeClick = () => {
    setResourceViewId(null);
    setCurrentView('dashboard');
    setIsMobileMenuOpen(false);
  };

  const handleViewChange = (view: typeof currentView) => {
    setCurrentView(view);
    setResourceViewId(null);
    setIsMobileMenuOpen(false);
  };

  const dismissRotatePrompt = () => {
    setShowRotatePrompt(false);
    sessionStorage.setItem('ascent_dismiss_rotate', 'true');
  };

  if (!isAuthenticated) {
    return <LandingPage onLogin={handleLogin} />;
  }

  // Determine what to render in the main content area
  let content;
  if (resourceViewId) {
    content = (
      <ResourceView 
        resourceId={resourceViewId} 
        onBack={() => setResourceViewId(null)}
        darkMode={true}
      />
    );
  } else {
    switch(currentView) {
      case 'dashboard':
        content = (
          <Dashboard 
            darkMode={true} 
            resources={resources} 
            onResourceClick={handleResourceClick}
            onUploadClick={() => setIsUploadOpen(true)}
            onExamClick={() => setIsExamOpen(true)}
            todoTasks={todoTasks}
            weeklyEvents={weeklyEvents}
            onAddTodo={handleAddTodo}
            onToggleTodo={handleToggleTodo}
            onDeleteTodo={handleDeleteTodo}
          />
        );
        break;
      case 'timer':
        content = <NeuralTimer />;
        break;
      case 'planner':
        content = (
          <StrategicPlanner 
            weeklyEvents={weeklyEvents}
            setWeeklyEvents={setWeeklyEvents}
            onNavigate={(view) => setCurrentView(view)}
          />
        );
        break;
      case 'calendar':
        content = (
           <CalendarView 
              events={weeklyEvents} 
              setEvents={setWeeklyEvents}
           />
        );
        break;
      case 'ap-center':
        content = <APCenter onExamReady={handleExamReady} />;
        break;
      case 'sat-prep':
        content = <SATPrep />;
        break;
    }
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#030303] text-white selection:bg-primary-900/50 selection:text-white font-sans">
      
      {/* Rotate Prompt Overlay */}
      {showRotatePrompt && (
        <div className="fixed inset-0 z-[120] bg-black/95 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500 backdrop-blur-xl">
           <div className="w-20 h-20 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-8 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
              <RotateCw className="w-8 h-8 text-white animate-spin-slow duration-[3s]" />
           </div>
           <h2 className="text-3xl font-bold text-white mb-4">Rotate Device</h2>
           <p className="text-zinc-400 mb-10 max-w-xs text-lg leading-relaxed">
             Flip your screen to horizontal view for the optimal Command Center experience.
           </p>
           <button 
             onClick={dismissRotatePrompt}
             className="px-8 py-4 rounded-full border border-white/10 text-white font-bold text-sm hover:bg-white/10 transition-all uppercase tracking-widest"
           >
             Continue Anyway
           </button>
        </div>
      )}

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-md z-40 lg:hidden animate-fade-in"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Responsive Drawer */}
      <aside 
        className={`fixed lg:static inset-y-0 left-0 z-50 w-72 flex-shrink-0 flex flex-col border-r border-white/5 bg-[#050505] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] transform lg:transform-none ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-8 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={handleHomeClick}>
            <div className="transition-transform duration-500 group-hover:scale-110 group-hover:rotate-180">
              <Logo size={28} />
            </div>
            <span className="font-bold text-xl tracking-tight text-white group-hover:text-primary-400 transition-colors">ASCENT</span>
          </div>
          {/* Mobile Close Button */}
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden p-2 text-zinc-500 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-6 mb-8">
          <button 
            onClick={() => { setIsUploadOpen(true); setIsMobileMenuOpen(false); }}
            className="w-full py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition-all duration-300 bg-white text-black hover:bg-primary-500 hover:text-white hover:shadow-[0_0_20px_rgba(37,99,235,0.4)] transform hover:scale-[1.02] active:scale-[0.98] group"
          >
            <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
            <span>New Space</span>
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
          <NavItem 
            icon={<Home size={18} />} 
            label="Command Center" 
            active={!resourceViewId && currentView === 'dashboard'} 
            onClick={() => handleViewChange('dashboard')}
          />
          <NavItem 
            icon={<GraduationCap size={18} />} 
            label="AP Nexus" 
            active={!resourceViewId && currentView === 'ap-center'} 
            onClick={() => handleViewChange('ap-center')}
          />
          <NavItem 
            icon={<Target size={18} />} 
            label="SAT Prep" 
            active={!resourceViewId && currentView === 'sat-prep'} 
            onClick={() => handleViewChange('sat-prep')}
          />
          
          {/* Mobile-only Nav Items */}
          <div className="lg:hidden mt-6 pt-6 border-t border-white/5">
             <div className="px-4 text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-2">Tools</div>
             <NavItem 
                icon={<Clock size={18} />} 
                label="Neural Timer" 
                active={currentView === 'timer'} 
                onClick={() => handleViewChange('timer')}
             />
             <NavItem 
                icon={<Sparkles size={18} />} 
                label="Planner" 
                active={currentView === 'planner'} 
                onClick={() => handleViewChange('planner')}
             />
             <NavItem 
                icon={<Calendar size={18} />} 
                label="Calendar" 
                active={currentView === 'calendar'} 
                onClick={() => handleViewChange('calendar')}
             />
          </div>
          
          <div className="mt-8 mb-3 px-4 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">Encrypted Library</span>
            <span className="bg-zinc-900/50 border border-white/5 text-zinc-500 px-1.5 py-0.5 rounded text-[10px] font-mono">{resources.length}</span>
          </div>
          
          <div className="space-y-1">
            {resources.map(res => (
              <NavItem 
                key={res.id}
                icon={<FileText size={18} />} 
                label={res.title} 
                active={resourceViewId === res.id}
                onClick={() => handleResourceClick(res.id)}
              />
            ))}
          </div>
        </nav>

        <div className="p-4 border-t border-white/5 mt-auto bg-[#050505]">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/30 border border-white/5 mb-3">
            <div className={`w-8 h-8 rounded-full shadow-lg ring-2 ring-black bg-gradient-to-tr ${userTier === 'Scholar' ? 'from-purple-600 to-primary-600' : 'from-zinc-600 to-zinc-400'}`}></div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm text-white truncate">
                {userTier === 'Scholar' ? 'Scholar Client' : 'Initiate'}
              </div>
              <div className="text-[10px] text-primary-400 font-mono tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> ONLINE
              </div>
            </div>
            <Shield size={14} className="text-zinc-600" />
          </div>
          {userTier !== 'Scholar' && (
            <a href="/#pricing" className="mb-3 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium text-primary-400 hover:text-primary-300 hover:bg-primary-500/10 transition-colors border border-primary-500/20">
              <Zap size={12} /> Upgrade to Scholar
            </a>
          )}
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-medium text-zinc-500 hover:text-red-400 hover:bg-red-950/20 transition-colors"
          >
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 relative bg-[#030303]">
        
        {/* Mobile Header */}
        <header className="lg:hidden h-16 flex items-center justify-between px-6 border-b border-white/5 bg-[#030303]/80 backdrop-blur-md sticky top-0 z-30">
           <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -ml-2 text-zinc-400 hover:text-white">
              <Menu size={24} />
           </button>
           <div className="flex items-center gap-2">
              <Logo size={24} />
              <span className="font-bold text-lg tracking-tight">ASCENT</span>
           </div>
           <div className="w-8"></div> {/* Spacer for center alignment */}
        </header>

        {/* Desktop Top Navigation Bar - Tools (Hidden on Mobile) */}
        {!resourceViewId && (
          <header className="hidden lg:flex h-20 w-full items-center justify-center sticky top-0 z-20 pointer-events-none">
            <nav className="flex items-center gap-1 p-1.5 bg-zinc-900/80 backdrop-blur-xl rounded-full border border-white/10 shadow-2xl mt-4 pointer-events-auto transition-all duration-300 hover:border-white/20">
              <TopNavLink 
                active={currentView === 'timer'} 
                onClick={() => setCurrentView('timer')} 
                label="Neural Timer"
                icon={<Clock size={14} />}
              />
              <TopNavLink 
                active={currentView === 'planner'} 
                onClick={() => setCurrentView('planner')} 
                label="Strategic Planner"
                icon={<Sparkles size={14} />}
              />
              <TopNavLink 
                active={currentView === 'calendar'} 
                onClick={() => setCurrentView('calendar')} 
                label="Calendar"
                icon={<Calendar size={14} />}
              />
            </nav>
          </header>
        )}

        {/* View Content - smooth transition on view change */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 scroll-smooth scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
           <div key={resourceViewId ?? currentView} className="w-full h-full animate-enter">
             {content}
           </div>
        </div>
      </main>

      {/* Modals */}
      {isUploadOpen && (
        <UploadModal 
          isOpen={isUploadOpen} 
          onClose={() => setIsUploadOpen(false)} 
          onUploadComplete={refreshResources}
          darkMode={true}
        />
      )}
      
      {isExamOpen && (
        <ExamGeneratorModal 
          isOpen={isExamOpen}
          onClose={() => setIsExamOpen(false)}
          onExamReady={handleExamReady}
        />
      )}
    </div>
  );
};

const NavItem = ({ icon, label, active, onClick }: any) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 mb-1 group relative overflow-hidden ${
      active 
        ? 'bg-primary-600/10 text-white shadow-lg' 
        : 'text-zinc-500 hover:text-white hover:bg-white/5'
    }`}
  >
    {active && (
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-500 rounded-r-full"></div>
    )}
    <span className={`transition-colors duration-300 ${active ? 'text-primary-400' : 'group-hover:text-zinc-300'}`}>{icon}</span>
    <span className="truncate relative z-10">{label}</span>
  </button>
);

const TopNavLink = ({ active, onClick, label, icon }: any) => (
  <button
    onClick={onClick}
    className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all duration-200 ease-out flex items-center gap-2 relative overflow-hidden group ${
      active
        ? 'text-white shadow-lg bg-white/10'
        : 'text-zinc-500 hover:text-white hover:bg-white/5'
    }`}
  >
    {active && <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-50"></div>}
    <span className="relative z-10 flex items-center gap-2">
      {icon}
      {label}
    </span>
  </button>
);

export default App;