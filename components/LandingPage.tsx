import React, { useState, useEffect } from 'react';
import { Shield, Zap, Brain, ArrowRight, Check, X, Globe, Cpu, Lock, ChevronRight, Activity, Users, Database, Layers, Rocket, AlertTriangle, Terminal, Hourglass, Star, Play, Command, Github, Twitter } from 'lucide-react';
import { Logo } from './Logo';
import { lockSession, unlockSession } from '../utils/security';
import { supabase } from '../lib/supabase';

interface LandingPageProps {
  onLogin: (username: string) => void;
}

const ACCESS_KEYS = Array.from({ length: 50 }, (_, i) => `PILOT-${String(i + 1).padStart(2, '0')}`);

const LandingPage: React.FC<LandingPageProps> = ({ onLogin }) => {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Login State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const inputId = username.trim();

    if (!inputId) {
      setLoginError('Identity required.');
      return;
    }

    setIsAuthenticating(true);

    setTimeout(() => {
      // Custom Admin Override
      if (inputId === 'Client_Login' && password === 'Pradyun@2010') {
        localStorage.setItem('ascent_user_tier', 'Admin'); // special admin tier
        handleSuccessfulLogin(inputId);
        return;
      }

      // If not correct admin logic, reject as unauthorized (since regular pilot logic is removed)
      setIsAuthenticating(false);
      setLoginError('Invalid Administrator Credentials.');
    }, 1200);
  };

  const handleSuccessfulLogin = (user: string) => {
    const lastLogin = localStorage.getItem('ascent_last_login');
    const currentStreak = parseInt(localStorage.getItem('ascent_streak') || '0');
    const today = new Date().toDateString();

    if (lastLogin !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (lastLogin === yesterday.toDateString()) {
        localStorage.setItem('ascent_streak', (currentStreak + 1).toString());
      } else {
        localStorage.setItem('ascent_streak', '1');
      }
      localStorage.setItem('ascent_last_login', today);
    }

    lockSession(user);
    onLogin(user);
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#020202] text-white selection:bg-indigo-500/30 selection:text-white flex flex-col overflow-x-hidden font-sans relative">

      {/* --- BACKGROUND (Electric Blue Gradient) --- */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-[#050505] to-[#000000]">
        {/* Moving Grid - Brighter Mix */}
        <div className="absolute inset-0 perspective-grid opacity-20 mix-blend-screen will-change-transform"></div>

        {/* Shooting Stars */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="shooting-star" style={{ top: '10%', left: '20%', animationDelay: '0s' }}></div>
          <div className="shooting-star" style={{ top: '30%', left: '60%', animationDelay: '2s' }}></div>
          <div className="shooting-star" style={{ top: '70%', left: '10%', animationDelay: '4s' }}></div>
          <div className="shooting-star" style={{ top: '50%', left: '80%', animationDelay: '1s' }}></div>
        </div>

        {/* Ambient Glows - Reduced blur for performance */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-blue-600/10 blur-[40px] rounded-full opacity-40"></div>
      </div>

      {/* Nav */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-500 border-b ${scrolled ? 'bg-[#020202]/90 border-white/5 py-4 backdrop-blur-md' : 'bg-transparent border-transparent py-6'}`}>
        <div className="max-w-[1600px] mx-auto px-6 md:px-12 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="transition-transform duration-500 group-hover:rotate-180">
              <Logo size={32} />
            </div>
            <span className="font-bold text-xl tracking-tight text-white group-hover:text-blue-400 transition-colors font-sans">
              ASCENT
            </span>
          </div>
          <div className="flex items-center gap-8">
            <div className="hidden md:flex items-center gap-8 text-xs font-bold text-zinc-400 uppercase tracking-widest font-mono">
              <button onClick={() => scrollToSection('features')} className="hover:text-white transition-colors">Protocol</button>
              <button onClick={() => scrollToSection('workflow')} className="hover:text-white transition-colors">Workflow</button>
              <button onClick={() => scrollToSection('pricing')} className="hover:text-white transition-colors">Clearance</button>
            </div>
            <button
              onClick={() => setShowLoginModal(true)}
              className="text-xs font-bold px-6 py-2.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all shadow-[0_0_20px_rgba(255,255,255,0.05)] active:scale-95 flex items-center gap-2 group text-white font-mono"
            >
              SECURE LOGIN
              <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center pt-32 pb-20 px-6 relative z-10">
        <div className="max-w-7xl mx-auto text-center space-y-10 animate-enter">

          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold tracking-[0.2em] text-zinc-300 uppercase shadow-2xl animate-pulse-slow font-mono">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            Neural Network Online v2.5
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-8xl lg:text-[7rem] font-bold tracking-tighter leading-[0.95] md:leading-[0.9] text-white drop-shadow-2xl font-sans">
            Cognitive <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-white">
              Augmentation
            </span>
          </h1>

          <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed font-light font-sans">
            The high-performance knowledge engine for the elite scholar. <br className="hidden md:block" />Transform chaos into structural mastery.
          </p>

          <div className="flex flex-col md:flex-row items-center justify-center gap-6 pt-8">
            <button
              onClick={() => setShowLoginModal(true)}
              className="px-10 py-5 rounded-full bg-white text-black font-bold text-sm tracking-wide transition-all hover:scale-105 active:scale-95 hover:shadow-[0_0_50px_rgba(255,255,255,0.2)] flex items-center gap-2 font-mono w-full md:w-auto justify-center"
            >
              <Zap size={18} fill="currentColor" /> INITIALIZE PROTOCOL
            </button>
            <button onClick={() => scrollToSection('features')} className="px-10 py-5 rounded-full border border-white/10 text-zinc-400 hover:text-white hover:border-white/30 font-bold text-sm tracking-wide transition-all bg-black/20 font-mono w-full md:w-auto">
              EXPLORE ARCHITECTURE
            </button>
          </div>

          {/* Elite Scholars Performance Ticker */}
          <div className="mt-16 pt-16 border-t border-white/5 animate-enter stagger-1 hidden md:block">
            <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest mb-8">Trusted by Elite Scholars Across the Globe</p>
            <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-8 opacity-70">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg"><Activity size={20} className="text-blue-400" /></div>
                <div className="text-left">
                  <div className="text-xl font-bold text-white font-sans">2.4M+</div>
                  <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Concepts Synthesized</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg"><Brain size={20} className="text-purple-400" /></div>
                <div className="text-left">
                  <div className="text-xl font-bold text-white font-sans">47%</div>
                  <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Avg Recall Boost</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg"><Zap size={20} className="text-green-400" /></div>
                <div className="text-left">
                  <div className="text-xl font-bold text-white font-sans">&lt; 3.2s</div>
                  <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Execution Latency</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Hologram */}
        <div className="mt-32 w-full max-w-[1400px] mx-auto animate-enter stagger-2 relative perspective-1000">
          <div className="relative rounded-2xl bg-[#050505] p-2 shadow-2xl border border-white/10 transform rotate-x-12 hover:rotate-0 transition-transform duration-1000 ease-out origin-center group">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none rounded-xl z-20"></div>
            <div className="aspect-[16/9] bg-[#030303] rounded-xl overflow-hidden relative border border-white/5">
              <div className="h-12 border-b border-white/5 flex items-center px-6 justify-between bg-[#080808]">
                <div className="flex gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-800"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-800"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-800"></div>
                </div>
                <div className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Command Center // Active</div>
              </div>
              <div className="p-8 grid grid-cols-12 gap-6 h-full bg-noise">
                <div className="col-span-3 bg-zinc-900/20 rounded-xl border border-white/5 animate-pulse"></div>
                <div className="col-span-9 grid grid-rows-3 gap-6">
                  <div className="row-span-1 grid grid-cols-3 gap-6">
                    <div className="bg-indigo-500/10 rounded-xl border border-indigo-500/20"></div>
                    <div className="bg-zinc-900/20 rounded-xl border border-white/5"></div>
                    <div className="bg-zinc-900/20 rounded-xl border border-white/5"></div>
                  </div>
                  <div className="row-span-2 bg-zinc-900/10 rounded-xl border border-white/5 relative overflow-hidden flex items-center justify-center">
                    <Cpu size={64} className="text-zinc-800" />
                  </div>
                </div>
              </div>

              <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-20 group-hover:opacity-0 transition-opacity duration-700">
                <div className="p-8 bg-[#050505] border border-white/10 rounded-2xl text-center shadow-[0_0_50px_rgba(255,255,255,0.1)]">
                  <Lock size={32} className="mx-auto text-zinc-500 mb-4" />
                  <h3 className="text-xl font-bold text-white">System Locked</h3>
                  <p className="text-zinc-500 text-xs mt-2 uppercase tracking-widest">Authorization Required</p>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute -bottom-20 left-0 right-0 h-24 bg-gradient-to-b from-blue-500/10 to-transparent blur-3xl opacity-40"></div>
        </div>
      </main>

      {/* Features Bento Grid */}
      <section id="features" className="py-20 bg-transparent relative border-t border-white/5">
        <div className="max-w-[1600px] mx-auto px-6 md:px-12">
          <div className="mb-12 md:flex justify-between items-end">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight font-sans">Capabilities</h2>
              <p className="text-zinc-400 max-w-md text-lg leading-relaxed font-sans">
                A suite of military-grade cognitive tools designed for high-velocity learning.
              </p>
            </div>
            <div className="hidden md:block">
              <Globe size={40} className="text-zinc-800" strokeWidth={1} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Cards */}
            <div className="md:col-span-2 bg-[#0A0A0A] border border-white/5 rounded-3xl p-6 md:p-10 relative overflow-hidden group hover:border-blue-500/30 transition-all duration-500">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[80px] rounded-full pointer-events-none group-hover:bg-blue-600/20 transition-colors"></div>
              <div className="relative z-10">
                <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center mb-6 text-white border border-white/10"><Brain /></div>
                <h3 className="text-2xl font-bold text-white mb-3 font-sans">Neural Synthesis Engine</h3>
                <p className="text-zinc-400 leading-relaxed max-w-lg font-sans">
                  Our proprietary AI architect restructures chaotic information streams into high-fidelity summaries, extracting key relationships and hidden patterns instantly.
                </p>
              </div>
            </div>

            <div className="md:row-span-2 bg-[#0A0A0A] border border-white/5 rounded-3xl p-6 md:p-10 relative overflow-hidden group hover:border-purple-500/30 transition-all duration-500">
              <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-purple-900/10 to-transparent pointer-events-none"></div>
              <div className="relative z-10 h-full flex flex-col">
                <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center mb-6 text-white border border-white/10"><Database /></div>
                <h3 className="text-2xl font-bold text-white mb-3 font-sans">Knowledge Vault</h3>
                <p className="text-zinc-400 leading-relaxed mb-8 flex-1 font-sans">
                  Securely store and organize unlimited course materials with encrypted access protocols. Your data is sovereign.
                </p>
                <div className="p-4 bg-black/40 rounded-xl border border-white/5 text-xs font-mono text-zinc-500">
                  {'>'} ENCRYPTION: AES-256<br />
                  {'>'} STORAGE: DISTRIBUTED<br />
                  {'>'} ACCESS: BIOMETRIC
                </div>
              </div>
            </div>

            <div className="bg-[#0A0A0A] border border-white/5 rounded-3xl p-6 md:p-10 group hover:border-white/20 transition-all duration-500">
              <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center mb-6 text-white border border-white/10"><Zap /></div>
              <h3 className="text-xl font-bold text-white mb-3 font-sans">Active Recall</h3>
              <p className="text-zinc-400 text-sm leading-relaxed font-sans">
                Automated flashcard generation and adaptive quizzing reinforce neural pathways.
              </p>
            </div>

            <div className="bg-[#0A0A0A] border border-white/5 rounded-3xl p-6 md:p-10 group hover:border-white/20 transition-all duration-500">
              <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center mb-6 text-white border border-white/10"><Activity /></div>
              <h3 className="text-xl font-bold text-white mb-3 font-sans">Focus Telemetry</h3>
              <p className="text-zinc-400 text-sm leading-relaxed font-sans">
                Track learning velocity and retention rates with precision analytics dashboards.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section id="workflow" className="py-24 md:py-32 relative border-t border-white/5 bg-[#020202]">
        <div className="absolute inset-0 bg-noise opacity-10 pointer-events-none"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-blue-900/10 blur-[100px] rounded-full pointer-events-none"></div>

        <div className="max-w-[1600px] mx-auto px-6 md:px-12 relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight font-sans">Execution Protocol</h2>
            <p className="text-zinc-400 max-w-2xl mx-auto text-lg leading-relaxed font-sans">
              A systematic approach to breaking down complex subjects and permanently retaining information.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-5xl mx-auto relative">
            {/* Connecting Line */}
            <div className="hidden md:block absolute top-[48px] left-[15%] right-[15%] h-px bg-gradient-to-r from-blue-500/0 via-blue-500/30 to-blue-500/0"></div>

            <WorkflowStep
              number="01"
              title="Synthesize"
              desc="Upload source materials or input raw concepts. The Neural Engine instantly restructures it into optimized study models."
              icon={<Layers size={32} />}
            />
            <WorkflowStep
              number="02"
              title="Retain"
              desc="Engage with adaptive flashcards and active recall quizzes generated directly from your structured data."
              icon={<Zap size={32} />}
            />
            <WorkflowStep
              number="03"
              title="Conquer"
              desc="Track telemetry, manage time via the Strategic Planner, and dominate exams with perfect recall."
              icon={<Rocket size={32} />}
            />
          </div>
        </div>
      </section>

      {/* Pricing - REDESIGNED: GLOSSY, MONO FONTS, SEAMLESS */}
      <section id="pricing" className="py-40 relative border-t border-white/5">
        {/* Seamless Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#020202] via-[#050505] to-black"></div>

        {/* Decorative Ambience */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none"></div>

        <div className="max-w-[1600px] mx-auto px-6 md:px-12 relative z-10">
          <div className="text-center mb-24">
            <div className="inline-block mb-6 px-4 py-2 rounded-full border border-white/5 bg-white/5 backdrop-blur-md shadow-2xl">
              <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <Lock size={10} className="text-blue-500" />
                Security Clearance Required
              </span>
            </div>
            <h2 className="text-5xl md:text-7xl font-bold text-white mb-8 tracking-tighter font-sans">
              Access Protocol
            </h2>
            <p className="text-zinc-400 max-w-xl mx-auto text-lg leading-relaxed font-light">
              Authenticate your clearance level to unlock advanced neural synthesis capabilities.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto items-stretch">
            <PricingCard
              tier="INITIATE"
              price="0"
              desc="Standard access for the casual observer."
              features={['Daily Query Limit: 50', 'Standard Response Time', 'Basic Neural Synthesis', 'Public Knowledge Base']}
              highlight={false}
              onSelect={() => setShowLoginModal(true)}
            />
            <PricingCard
              tier="SCHOLAR"
              price="9.99"
              desc="Unrestricted access for the elite mind."
              features={['Unlimited Queries', 'Zero-Latency Processing', 'Deep Research Agent', 'Exam Simulation Mode', 'Priority Support Channel']}
              highlight={true}
              onSelect={() => setShowLoginModal(true)}
            />
          </div>
        </div>
      </section>

      {/* Footer - REDESIGNED: Full Width & Spread Out */}
      <footer className="relative bg-black pt-32 pb-16 overflow-hidden border-t border-white/5">
        {/* Top Gradient Fade (Seamless Integration) */}
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent opacity-50"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-blue-900/5 via-black to-black pointer-events-none"></div>

        <div className="w-full px-6 md:px-12 lg:px-24 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 lg:gap-16 mb-24">
            {/* Brand Section - Spans 4 columns on large screens */}
            <div className="col-span-1 md:col-span-5 lg:col-span-4 space-y-8">
              <div className="flex items-center gap-3">
                <Logo size={48} />
                <span className="font-bold text-3xl tracking-tight text-white font-sans">ASCENT</span>
              </div>
              <p className="text-zinc-400 text-base max-w-md leading-relaxed font-sans font-light">
                The next evolution in cognitive augmentation.
                Ascent integrates neural synthesis with active recall protocols to accelerate human learning velocity.
              </p>
              <div className="flex gap-4 pt-4">
                <SocialButton icon={<Twitter size={20} />} />
                <SocialButton icon={<Github size={20} />} />
                <SocialButton icon={<Command size={20} />} />
              </div>
            </div>

            {/* Spacer - Flexible based on screen size */}
            <div className="hidden lg:block lg:col-span-2"></div>
            <div className="hidden md:block lg:hidden md:col-span-1"></div>

            {/* Links - Platform */}
            <div className="col-span-1 md:col-span-2 space-y-8">
              <h4 className="font-mono text-xs font-bold text-white uppercase tracking-[0.2em] mb-6">Platform</h4>
              <ul className="space-y-4 text-sm text-zinc-500 font-sans">
                <li><a href="#" className="hover:text-blue-400 transition-colors duration-300">Neural Engine</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors duration-300">Knowledge Graph</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors duration-300">Pricing Protocol</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors duration-300">API Access</a></li>
              </ul>
            </div>

            {/* Links - Company */}
            <div className="col-span-1 md:col-span-2 space-y-8">
              <h4 className="font-mono text-xs font-bold text-white uppercase tracking-[0.2em] mb-6">Company</h4>
              <ul className="space-y-4 text-sm text-zinc-500 font-sans">
                <li><a href="#" className="hover:text-blue-400 transition-colors duration-300">Mission</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors duration-300">Research</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors duration-300">Careers</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors duration-300">Contact</a></li>
              </ul>
            </div>

            {/* Links - Legal */}
            <div className="col-span-1 md:col-span-2 space-y-8">
              <h4 className="font-mono text-xs font-bold text-white uppercase tracking-[0.2em] mb-6">Legal</h4>
              <ul className="space-y-4 text-sm text-zinc-500 font-sans">
                <li><a href="#" className="hover:text-blue-400 transition-colors duration-300">Terms of Service</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors duration-300">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors duration-300">Security Audit</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex flex-col gap-2">
              <span className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest">
                © 2025 ASCENT LEARNING SYSTEMS.
              </span>
              <span className="text-[10px] text-zinc-700 font-mono">
                DESIGNED FOR HIGH-PERFORMANCE COGNITION.
              </span>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-right">
                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">System Status</div>
                <div className="flex items-center justify-end gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                  <span className="text-xs font-bold text-white">OPERATIONAL</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4 animate-enter duration-200 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0A0A0A] border border-white/10 rounded-[32px] p-10 relative shadow-2xl overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500"></div>

            <button onClick={() => setShowLoginModal(false)} className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors">
              <X size={20} />
            </button>

            <div className="text-center mb-10">
              <Logo size={56} className="mx-auto mb-6" />
              <h3 className="text-2xl font-bold text-white mb-2 font-sans">Secure Handshake</h3>
              <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest">Authenticate via Google Data Stream</p>
            </div>

            {supabase ? (
              <div className="flex flex-col gap-4">
                <button
                  onClick={async () => {
                    if (!supabase) return;
                    const { error } = await supabase.auth.signInWithOAuth({
                      provider: 'google',
                      options: {
                        redirectTo: window.location.origin,
                        queryParams: {
                          access_type: 'offline',
                          prompt: 'consent',
                        },
                      }
                    });
                    if (error) {
                      console.error("Google login error:", error);
                      alert("Error with Google Login: " + error.message);
                    }
                  }}
                  className="w-full flex items-center justify-center gap-3 py-4 rounded-xl border border-white/10 hover:bg-white/5 hover:border-white/20 text-white font-bold transition-all bg-[#0A0A0A] shadow-[0_4px_14px_0_rgba(0,0,0,0.39)] hover:shadow-[0_6px_20px_rgba(255,255,255,0.05)]"
                >
                  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span className="font-mono uppercase text-sm tracking-wide">Sign in with Google</span>
                </button>

                <div className="relative flex items-center py-4">
                  <div className="flex-grow border-t border-white/10"></div>
                  <span className="flex-shrink-0 px-4 text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Administrator Override</span>
                  <div className="flex-grow border-t border-white/10"></div>
                </div>

                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div>
                    <input
                      type="text"
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-4 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono text-xs tracking-wide"
                      placeholder="ENTER ADMIN ID"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </div>
                  {username === 'Client_Login' && (
                    <div className="animate-enter">
                      <input
                        type="password"
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-4 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono text-xs tracking-wide"
                        placeholder="ENTER OVERRIDE PASSWORD"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                  )}
                  {loginError && (
                    <div className="text-red-400 text-xs font-mono bg-red-900/10 p-3 rounded-xl border border-red-900/30 flex items-center gap-2">
                      <AlertTriangle size={14} /> {loginError}
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={isAuthenticating}
                    className="w-full py-4 rounded-xl font-bold text-xs tracking-[0.1em] transition-all bg-white/5 border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 hover:border-white/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 font-mono uppercase"
                  >
                    {isAuthenticating ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full border-2 border-zinc-400 border-t-transparent animate-spin"></span>
                        Authenticating...
                      </span>
                    ) : (
                      <>Initialize <ChevronRight size={14} /></>
                    )}
                  </button>
                </form>
              </div>
            ) : (
              <div className="p-4 bg-red-900/10 border border-red-900/20 rounded-xl text-red-400 text-xs text-center font-bold flex items-center justify-center gap-2 font-mono">
                <AlertTriangle size={14} /> Database connection not established.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Waitlist Modal */}
      {showWaitlistModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/95 p-4 animate-enter duration-300">
          <div className="w-full max-w-md bg-[#0A0A0A] border border-red-900/30 rounded-[32px] p-10 relative shadow-2xl overflow-hidden text-center">
            <div className="w-20 h-20 rounded-full bg-red-900/10 border border-red-500/20 flex items-center justify-center mx-auto mb-8">
              <Hourglass size={32} className="text-red-500" />
            </div>

            <h2 className="text-3xl font-bold text-white mb-3 font-sans">Access Denied</h2>
            <div className="inline-block px-3 py-1 bg-red-900/10 border border-red-900/30 rounded-full text-red-400 text-[10px] font-bold uppercase tracking-widest mb-8 font-mono">
              Capacity Reached
            </div>

            <p className="text-zinc-400 text-sm leading-relaxed mb-8">
              The Ascent Protocol is currently operating at max pilot capacity.
              Your Neural ID has been placed in the priority queue.
            </p>

            <div className="bg-black/40 rounded-xl p-6 mb-8 border border-white/5">
              <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mb-2">Current Queue Position</div>
              <div className="text-3xl font-mono text-white">#2,401</div>
            </div>

            <button
              onClick={() => { setShowWaitlistModal(false); setShowLoginModal(true); }}
              className="w-full py-4 rounded-xl border border-white/10 hover:bg-white/5 text-white font-bold text-sm transition-all font-mono uppercase tracking-wide"
            >
              Retry Credentials
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const WorkflowStep = ({ number, title, desc, icon }: any) => (
  <div className="relative z-10 flex flex-col items-center text-center group">
    <div className="w-24 h-24 rounded-full bg-[#0A0A0A] border border-white/10 flex items-center justify-center mb-6 group-hover:border-blue-500/50 transition-colors duration-500 shadow-2xl relative">
      <div className="absolute inset-0 bg-blue-500/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
      <div className="text-zinc-400 group-hover:text-blue-400 transition-colors">{icon}</div>
      <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-blue-500 text-white font-bold flex items-center justify-center text-xs border-2 border-[#0A0A0A] font-mono">
        {number}
      </div>
    </div>
    <h3 className="text-xl font-bold text-white mb-2 font-sans">{title}</h3>
    <p className="text-sm text-zinc-500 max-w-xs leading-relaxed font-sans">{desc}</p>
  </div>
);

// REFINED Pricing Card: Glassmorphism + Tech Aesthetic
const PricingCard = ({ tier, price, desc, features, highlight, onSelect }: any) => (
  <div className={`relative p-1 rounded-[32px] transition-all duration-500 group hover:-translate-y-2 ${highlight ? 'bg-gradient-to-b from-blue-600/30 via-purple-600/30 to-blue-600/10' : 'bg-white/5'}`}>
    {/* Glow Effect on Hover */}
    <div className="absolute inset-0 bg-white/10 blur-xl rounded-[32px] opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

    <div className="h-full bg-black/60 backdrop-blur-2xl rounded-[30px] p-10 flex flex-col relative overflow-hidden border border-white/5">
      {/* Subtle noise texture */}
      <div className="absolute inset-0 bg-noise opacity-20 pointer-events-none"></div>
      {highlight && <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 blur-[80px] rounded-full pointer-events-none"></div>}

      <div className="relative z-10 flex flex-col h-full">
        <div className="flex justify-between items-start mb-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              {highlight && <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></div>}
              <h3 className={`text-xs font-mono font-bold uppercase tracking-[0.2em] ${highlight ? 'text-blue-400' : 'text-zinc-500'}`}>
                {tier}
              </h3>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-6xl font-sans font-bold text-white tracking-tighter">${price}</span>
              {price !== '0' && <span className="text-zinc-500 font-mono text-xs">/MO</span>}
            </div>
          </div>
          {highlight ? (
            <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400 border border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.2)]">
              <Shield size={24} />
            </div>
          ) : (
            <div className="p-3 bg-white/5 rounded-2xl text-zinc-600 border border-white/5">
              <Shield size={24} />
            </div>
          )}
        </div>

        <p className="text-zinc-300 font-light text-lg mb-10 pb-10 border-b border-white/5 font-sans leading-relaxed">
          {desc}
        </p>

        <div className="flex-1 space-y-6 mb-12">
          {features.map((f: string, i: number) => (
            <div key={i} className="flex items-center gap-4 group/item">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-colors ${highlight
                ? 'border-blue-500/30 bg-blue-500/10 text-blue-400'
                : 'border-zinc-800 bg-zinc-900 text-zinc-600'
                }`}>
                <Check size={10} strokeWidth={3} />
              </div>
              <span className={`text-sm font-medium transition-colors font-sans ${highlight ? 'text-zinc-300 group-hover/item:text-white' : 'text-zinc-500 group-hover/item:text-zinc-300'}`}>
                {f}
              </span>
            </div>
          ))}
        </div>

        <button
          onClick={onSelect}
          className={`w-full py-5 rounded-2xl font-bold text-xs tracking-[0.2em] uppercase transition-all duration-300 relative overflow-hidden group/btn font-mono ${highlight
            ? 'bg-white text-black hover:bg-zinc-200 shadow-[0_0_30px_rgba(255,255,255,0.1)]'
            : 'bg-white/5 text-white hover:bg-white/10 border border-white/5'
            }`}
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            Initialize Protocol <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
          </span>
        </button>
      </div>
    </div>
  </div>
);

const SocialButton = ({ icon }: any) => (
  <button className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all border border-white/5 hover:border-white/20">
    {icon}
  </button>
);

export default LandingPage;