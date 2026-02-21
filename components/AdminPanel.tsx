import React, { useState, useEffect } from 'react';
import { Users, Activity, ExternalLink, ShieldAlert } from 'lucide-react';
import { supabase } from '../lib/supabase';

const AdminPanel = () => {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // In a real app we would fetch all user data from Supabase DB or API
    // For this demo, let's create a simulated overview based on local telemetry
    useEffect(() => {
        // Simulating fetching users
        setTimeout(() => {
            setUsers([
                { id: 'usr_1', email: 'ascentlearnai@gmail.com', role: 'Scholar', lastActive: '2 mins ago', queries: 1420 },
                { id: 'usr_2', email: 'pradyunpoorna@gmail.com', role: 'Scholar', lastActive: '1 hr ago', queries: 890 },
                { id: 'usr_3', email: 'vishwak1801@gmail.com', role: 'Scholar', lastActive: '3 hrs ago', queries: 654 },
                { id: 'usr_4', email: 'omdiwanji25@gmail.com', role: 'Scholar', lastActive: '1 day ago', queries: 412 },
                { id: 'usr_5', email: 'new_pilot@gmail.com', role: 'Initiate', lastActive: 'Just now', queries: 15 },
            ]);
            setLoading(false);
        }, 1000);
    }, []);

    return (
        <div className="w-full max-w-6xl mx-auto space-y-8 animate-enter">
            <div className="flex justify-between items-end border-b border-red-500/20 pb-6">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-900/20 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-widest backdrop-blur-sm mb-4">
                        <ShieldAlert size={12} /> Administrator Level Access
                    </div>
                    <h1 className="text-4xl font-bold text-white tracking-tight font-sans">Global Command Center</h1>
                    <p className="text-zinc-400 font-sans mt-2">Viewing live telemetry and active pilots.</p>
                </div>
                <div className="text-right flex flex-col items-end">
                    <div className="text-[10px] uppercase font-mono tracking-widest text-zinc-500 mb-1">Total System Queries</div>
                    <div className="text-3xl font-mono text-white font-bold tracking-tighter">14,293</div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-2 text-zinc-400">
                        <Users size={18} /> <span className="text-xs uppercase tracking-widest font-mono">Active Pilots</span>
                    </div>
                    <div className="text-4xl font-sans font-bold text-white">42<span className="text-zinc-600 text-lg">/50</span></div>
                </div>
                <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-2 text-zinc-400">
                        <Activity size={18} /> <span className="text-xs uppercase tracking-widest font-mono">Server Load</span>
                    </div>
                    <div className="text-4xl font-sans font-bold text-white">12%</div>
                </div>
                <div className="bg-gradient-to-br from-red-900/20 to-black border border-red-500/20 rounded-2xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-2xl"></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-2 text-red-400">
                            <ShieldAlert size={18} /> <span className="text-xs uppercase tracking-widest font-mono">Security Status</span>
                        </div>
                        <div className="text-2xl font-sans font-bold text-white">SECURE</div>
                        <div className="text-xs text-red-500/80 mt-1 uppercase font-mono">No breaches detected.</div>
                    </div>
                </div>
            </div>

            {/* Pilot Table */}
            <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl overflow-hidden mt-8">
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black/40">
                    <h3 className="font-bold text-white tracking-wide">Pilot Registry</h3>
                    <button className="text-xs bg-white text-black px-4 py-2 rounded-lg font-bold font-mono uppercase tracking-wide hover:bg-zinc-200 transition-colors">
                        Export CSV
                    </button>
                </div>
                {loading ? (
                    <div className="p-10 text-center text-zinc-500 font-mono tracking-widest animate-pulse">Decrypting Records...</div>
                ) : (
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-black border-b border-white/5 text-xs text-zinc-500 uppercase font-mono tracking-widest">
                                    <th className="p-4 font-normal">Pilot Email</th>
                                    <th className="p-4 font-normal">Clearance</th>
                                    <th className="p-4 font-normal">Last Online</th>
                                    <th className="p-4 font-normal text-right">Total Queries</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 font-sans">
                                {users.map((u) => (
                                    <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="p-4 flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center text-xs font-mono text-zinc-400">
                                                {u.email.substring(0, 2).toUpperCase()}
                                            </div>
                                            <span className="text-zinc-300 font-medium">{u.email}</span>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest
                         ${u.role === 'Scholar' ? 'bg-primary-500/20 text-primary-400 border border-primary-500/20' : 'bg-zinc-800 text-zinc-400'}
                       `}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td className="p-4 text-zinc-500 text-sm">
                                            {u.lastActive}
                                        </td>
                                        <td className="p-4 text-right text-white font-mono font-medium">
                                            {u.queries.toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminPanel;
