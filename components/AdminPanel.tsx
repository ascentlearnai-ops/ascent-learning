import React, { useState, useEffect } from 'react';
import { Users, Activity, ShieldAlert, Server, Database, Globe, Zap, Cpu, ArrowUpRight, BarChart3, Cloud } from 'lucide-react';

const AdminPanel = () => {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Simulated Server/DB Telemetry 
    useEffect(() => {
        setTimeout(() => {
            setUsers([
                { id: 'usr_1', email: 'ascentlearnai@gmail.com', role: 'Scholar', lastActive: '2 mins ago', queries: 2420, bandwidth: '2.4 GB' },
                { id: 'usr_2', email: 'pradyunpoorna@gmail.com', role: 'Scholar', lastActive: '1 hr ago', queries: 890, bandwidth: '890 MB' },
                { id: 'usr_3', email: 'vishwak1801@gmail.com', role: 'Scholar', lastActive: '3 hrs ago', queries: 654, bandwidth: '450 MB' },
                { id: 'usr_4', email: 'omdiwanji25@gmail.com', role: 'Scholar', lastActive: '1 day ago', queries: 412, bandwidth: '300 MB' },
                { id: 'usr_5', email: 'jeremy.ajakpov@gmail.com', role: 'Scholar', lastActive: 'Just now', queries: 0, bandwidth: '0 MB' },
                { id: 'usr_6', email: 'new_pilot@gmail.com', role: 'Initiate', lastActive: 'Just now', queries: 15, bandwidth: '12 MB' },
            ]);
            setLoading(false);
        }, 1000);
    }, []);

    return (
        <div className="w-full max-w-7xl mx-auto space-y-8 animate-enter p-4 md:p-0">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-red-500/20 pb-6 gap-4">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-900/20 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-widest backdrop-blur-sm mb-4">
                        <ShieldAlert size={12} /> Level 5 Administrator Access
                    </div>
                    <h1 className="text-4xl font-bold text-white tracking-tight font-sans">System Telemetry</h1>
                    <p className="text-zinc-400 font-sans mt-2 text-sm">Real-time monitoring of Vercel Edge routing, Supabase nodes, and Pilot connections.</p>
                </div>
                <div className="flex items-center gap-6">
                    <div className="text-right">
                        <div className="text-[10px] uppercase font-mono tracking-widest text-zinc-500 mb-1 flex items-center justify-end gap-1"><Activity size={10} className="text-green-500" /> System Status</div>
                        <div className="text-lg font-mono text-white font-bold tracking-tighter">OPERATIONAL</div>
                    </div>
                    <div className="h-10 w-px bg-white/10 hidden md:block"></div>
                    <div className="text-right">
                        <div className="text-[10px] uppercase font-mono tracking-widest text-zinc-500 mb-1">Total API Queries</div>
                        <div className="text-3xl font-mono text-white font-bold tracking-tighter">14,293</div>
                    </div>
                </div>
            </div>

            {/* Top Cards: Infrastructure */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Vercel Status */}
                <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-colors group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-colors"></div>
                    <div className="flex items-center justify-between mb-4 relative z-10">
                        <div className="flex items-center gap-2 text-zinc-400">
                            <Globe size={16} /> <span className="text-[10px] uppercase tracking-widest font-mono">Vercel Edge</span>
                        </div>
                        <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                    </div>
                    <div className="text-2xl font-sans font-bold text-white mb-1 relative z-10">12ms Ping</div>
                    <div className="text-xs text-zinc-500 font-mono relative z-10">us-east-1 (Washington, D.C)</div>
                </div>

                {/* Supabase DB */}
                <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-colors group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/10 rounded-full blur-2xl group-hover:bg-green-500/20 transition-colors"></div>
                    <div className="flex items-center justify-between mb-4 relative z-10">
                        <div className="flex items-center gap-2 text-green-400">
                            <Database size={16} /> <span className="text-[10px] uppercase tracking-widest font-mono">Supabase Auth</span>
                        </div>
                        <div className="text-xs text-green-500/80 bg-green-500/10 px-2 py-0.5 rounded font-mono">99.9%</div>
                    </div>
                    <div className="text-2xl font-sans font-bold text-white mb-1 relative z-10">42 / 50</div>
                    <div className="text-xs text-green-500 font-mono relative z-10">Authenticated Pilots</div>
                </div>

                {/* AI Compute */}
                <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-colors group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary-500/10 rounded-full blur-2xl group-hover:bg-primary-500/20 transition-colors"></div>
                    <div className="flex items-center justify-between mb-4 relative z-10">
                        <div className="flex items-center gap-2 text-primary-400">
                            <Cpu size={16} /> <span className="text-[10px] uppercase tracking-widest font-mono">Gemini Logic</span>
                        </div>
                        <ArrowUpRight size={14} className="text-primary-400/50" />
                    </div>
                    <div className="text-2xl font-sans font-bold text-white mb-1 relative z-10">v2.0-Flash</div>
                    <div className="text-xs text-primary-400/80 font-mono relative z-10">Latency: 0.8s avg</div>
                </div>

                {/* Global Security */}
                <div className="bg-gradient-to-br from-red-950/40 to-black border border-red-500/20 rounded-2xl p-5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-2xl group-hover:bg-red-500/20 transition-colors"></div>
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2 text-red-400">
                                <ShieldAlert size={16} /> <span className="text-[10px] uppercase tracking-widest font-mono">Threat Matrix</span>
                            </div>
                        </div>
                        <div className="text-2xl font-sans font-bold text-white mb-1">0 Breach</div>
                        <div className="text-xs text-red-500/80 font-mono">Network is heavily encrypted.</div>
                    </div>
                </div>
            </div>

            {/* Detailed Storage & Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="col-span-1 lg:col-span-2 bg-[#0A0A0A] border border-white/5 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-6 text-zinc-300">
                        <BarChart3 size={18} /> <h3 className="font-bold tracking-wide">Usage Bandwidth Metrics</h3>
                    </div>
                    <div className="h-48 flex items-end justify-between gap-2 px-4 border-b border-white/5 pb-4">
                        {/* Fake Chart Bars for visual aesthetic */}
                        {[40, 60, 45, 80, 50, 90, 100, 75, 60, 85, 55, 70, 40, 95].map((h, i) => (
                            <div key={i} className="w-full relative group">
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black border border-white/10 text-[10px] font-mono p-1 rounded text-white z-10 pointer-events-none">
                                    {h * 12}MB
                                </div>
                                <div
                                    className={`w-full rounded-t-sm transition-all duration-500 ${i === 6 ? 'bg-primary-500' : 'bg-white/10 group-hover:bg-white/20'}`}
                                    style={{ height: `${h}%` }}
                                ></div>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-zinc-500 mt-4 px-4 uppercase tracking-widest">
                        <span>14 Days Ago</span>
                        <span>Today</span>
                    </div>
                </div>

                <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
                    <Cloud size={48} strokeWidth={1} className="text-zinc-700 absolute -right-6 -top-6 w-48 h-48 opacity-20" />
                    <div className="relative z-10 mb-4">
                        <Database size={32} className="text-primary-500 mb-4 mx-auto" strokeWidth={1.5} />
                        <h3 className="text-3xl font-bold text-white">4.2 GB</h3>
                        <p className="text-xs text-zinc-500 uppercase font-mono tracking-widest mt-2">Supabase DB Size</p>
                    </div>
                    <div className="w-full bg-white/5 h-2 rounded-full mt-2 relative z-10 overflow-hidden">
                        <div className="bg-primary-500 h-full w-[8.4%] rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
                    </div>
                    <div className="w-full text-right text-[10px] text-zinc-500 font-mono mt-2 relative z-10">8.4% of 50GB Limit</div>
                </div>
            </div>

            {/* Pilot Table */}
            <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl overflow-hidden mt-8 shadow-2xl">
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-zinc-900/50">
                    <div className="flex items-center gap-3">
                        <Users size={18} className="text-zinc-400" />
                        <h3 className="font-bold text-white tracking-wide">Active Neural IDs / Pilot Registry</h3>
                    </div>
                    <button className="text-xs bg-white/10 text-white border border-white/10 px-4 py-2 rounded-lg font-bold font-mono uppercase tracking-widest hover:bg-white hover:text-black hover:border-white transition-all">
                        Sync Data
                    </button>
                </div>
                {loading ? (
                    <div className="p-16 text-center text-zinc-500 font-mono tracking-widest animate-pulse flex flex-col items-center gap-4">
                        <div className="w-8 h-8 rounded-full border-2 border-zinc-600 border-t-white animate-spin"></div>
                        Decrypting Node Records...
                    </div>
                ) : (
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-black/80 border-b border-white/5 text-[10px] text-zinc-500 uppercase font-mono tracking-widest">
                                    <th className="p-5 font-bold">Pilot Identity</th>
                                    <th className="p-5 font-bold">Security Clearance</th>
                                    <th className="p-5 font-bold">Latency / Node</th>
                                    <th className="p-5 font-bold text-right">Queries</th>
                                    <th className="p-5 font-bold text-right hidden sm:table-cell">Net Bandwidth</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 font-sans">
                                {users.map((u, i) => (
                                    <tr key={u.id} className="hover:bg-white/[0.04] transition-colors group">
                                        <td className="p-5 flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-mono
                                                ${u.role === 'Scholar' ? 'bg-primary-900/20 border-primary-500/30 text-primary-400' : 'bg-zinc-900 border-white/10 text-zinc-400'}
                                            `}>
                                                {u.email.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-zinc-200 font-medium text-sm">{u.email}</span>
                                                <span className="text-[10px] text-zinc-600 font-mono mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">ID: {u.id.toUpperCase()}</span>
                                            </div>
                                        </td>
                                        <td className="p-5">
                                            <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-widest shadow-sm
                                                ${u.role === 'Scholar' ? 'bg-primary-600 border border-primary-500/50 text-white shadow-[0_0_10px_rgba(37,99,235,0.2)]' : 'bg-zinc-800 text-zinc-400 border border-white/5'}
                                            `}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td className="p-5">
                                            <div className="flex items-center gap-2">
                                                <span className={`w-1.5 h-1.5 rounded-full ${i === 0 || i === 4 ? 'bg-green-500 animate-pulse' : 'bg-zinc-600'}`}></span>
                                                <span className="text-zinc-400 text-xs font-mono">{u.lastActive}</span>
                                            </div>
                                        </td>
                                        <td className="p-5 text-right font-mono text-sm">
                                            <span className={u.queries > 1000 ? 'text-primary-400 font-bold' : 'text-zinc-400'}>{u.queries.toLocaleString()}</span>
                                        </td>
                                        <td className="p-5 text-right font-mono text-sm text-zinc-500 hidden sm:table-cell">
                                            {u.bandwidth}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="text-center text-[10px] font-mono uppercase tracking-widest text-zinc-600 pt-8 pb-4">
                Secure Ascent Network • Encrypted Tunnel Established
            </div>
        </div>
    );
};

export default AdminPanel;
