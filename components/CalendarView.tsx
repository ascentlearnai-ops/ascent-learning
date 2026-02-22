import React, { useState, useRef, useEffect } from 'react';
import { Plus, X, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { CalendarEvent } from '../types';

interface CalendarViewProps {
   events: CalendarEvent[];
   setEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>;
}

const CalendarView: React.FC<CalendarViewProps> = ({ events, setEvents }) => {
   const [isModalOpen, setIsModalOpen] = useState(false);
   const [editingId, setEditingId] = useState<string | null>(null);
   const [selectedDay, setSelectedDay] = useState<string>('Mon');
   const [startTime, setStartTime] = useState('09:00');
   const [endTime, setEndTime] = useState('10:00');
   const [eventTitle, setEventTitle] = useState('');
   const [eventType, setEventType] = useState<'Study' | 'Review' | 'Exam' | 'Break'>('Study');

   // Drag & Resize State
   const [draggingId, setDraggingId] = useState<string | null>(null);
   const [resizingId, setResizingId] = useState<string | null>(null);
   const [dragOffset, setDragOffset] = useState(0); // Offset from top of event block
   const [initialPos, setInitialPos] = useState({ x: 0, y: 0 }); // Track click vs drag
   const [hasMoved, setHasMoved] = useState(false); // Flag if drag threshold exceeded

   const containerRef = useRef<HTMLDivElement>(null);

   const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
   const START_HOUR = 6;
   const END_HOUR = 24;
   const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => i + START_HOUR);
   const HOUR_HEIGHT = 80;

   const now = new Date();
   const currentDay = now.toLocaleDateString('en-US', { weekday: 'short' });
   const currentMinutes = (now.getHours() - START_HOUR) * 60 + now.getMinutes();
   const currentTimeTop = (currentMinutes / 60) * HOUR_HEIGHT;

   // --- Helpers ---
   const timeToPixels = (time: string) => {
      const [h, m] = time.split(':').map(Number);
      return ((h - START_HOUR) * 60 + m) * (HOUR_HEIGHT / 60);
   };

   const pixelsToTime = (px: number) => {
      const totalMinutes = (px / HOUR_HEIGHT) * 60;
      let h = Math.floor(totalMinutes / 60) + START_HOUR;
      let m = Math.floor(totalMinutes % 60);
      // Snap to 15 mins
      m = Math.round(m / 15) * 15;
      if (m === 60) { m = 0; h += 1; }
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
   };

   const formatTime12hr = (time24: string) => {
      const [h, m] = time24.split(':').map(Number);
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
   };

   // --- Interaction Handlers ---

   const handleDragStart = (e: React.MouseEvent, id: string) => {
      if (resizingId) return; // Don't drag if resizing
      e.stopPropagation();
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setDragOffset(e.clientY - rect.top);
      setDraggingId(id);
      setInitialPos({ x: e.clientX, y: e.clientY });
      setHasMoved(false);
   };

   const handleResizeStart = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      e.preventDefault(); // Prevent text selection
      setResizingId(id);
      setHasMoved(true); // Always treat resize as a move to avoid click trigger
   };

   const handleClickEvent = (e: React.MouseEvent, evt: CalendarEvent) => {
      e.stopPropagation();
      if (!hasMoved) {
         setEditingId(evt.id);
         setEventTitle(evt.title);
         setSelectedDay(evt.day);
         setStartTime(evt.startTime);
         setEndTime(evt.endTime);
         setEventType(evt.type);
         setIsModalOpen(true);
      }
   };

   const openCreateModal = () => {
      setEditingId(null);
      setEventTitle('');
      setStartTime('09:00');
      setEndTime('10:00');
      setEventType('Study');
      setIsModalOpen(true);
   };

   useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
         if (!containerRef.current) return;

         // Check drag threshold to distinguish click vs drag
         if ((draggingId || resizingId) && !hasMoved) {
            const dist = Math.sqrt(Math.pow(e.clientX - initialPos.x, 2) + Math.pow(e.clientY - initialPos.y, 2));
            if (dist > 5) setHasMoved(true);
         }

         // --- RESIZING ---
         if (resizingId) {
            const evt = events.find(ev => ev.id === resizingId);
            if (!evt) return;

            const containerRect = containerRef.current.getBoundingClientRect();
            const relativeY = e.clientY - containerRect.top + containerRef.current.scrollTop;

            // Calculate new End Time
            // Min duration 15 mins
            const startPx = timeToPixels(evt.startTime);
            const newEndPx = Math.max(startPx + (15 * (HOUR_HEIGHT / 60)), relativeY);
            const newEndStr = pixelsToTime(newEndPx);

            setEvents(prev => prev.map(ev =>
               ev.id === resizingId ? { ...ev, endTime: newEndStr } : ev
            ));
            return;
         }

         // --- DRAGGING ---
         if (draggingId && hasMoved) {
            const containerRect = containerRef.current.getBoundingClientRect();
            const sidebarWidth = 60;
            const colWidth = (containerRect.width - sidebarWidth) / 7;

            // 1. Determine Day
            const relativeX = e.clientX - containerRect.left - sidebarWidth;
            let dayIndex = Math.floor(relativeX / colWidth);
            dayIndex = Math.max(0, Math.min(6, dayIndex));
            const newDay = DAYS[dayIndex];

            // 2. Determine Time
            const relativeY = e.clientY - containerRect.top + containerRef.current.scrollTop - dragOffset;
            const newStartStr = pixelsToTime(Math.max(0, relativeY));

            // Calculate duration to keep constant
            const evt = events.find(ev => ev.id === draggingId);
            if (!evt) return;

            const [sh, sm] = evt.startTime.split(':').map(Number);
            const [eh, em] = evt.endTime.split(':').map(Number);
            const durationMins = (eh * 60 + em) - (sh * 60 + sm);

            const [nsh, nsm] = newStartStr.split(':').map(Number);
            const endMins = nsh * 60 + nsm + durationMins;
            const neh = Math.floor(endMins / 60);
            const nem = endMins % 60;
            const newEndStr = `${neh.toString().padStart(2, '0')}:${nem.toString().padStart(2, '0')}`;

            setEvents(prev => prev.map(ev =>
               ev.id === draggingId ? { ...ev, day: newDay as any, startTime: newStartStr, endTime: newEndStr } : ev
            ));
         }
      };

      const handleMouseUp = () => {
         setDraggingId(null);
         setResizingId(null);
         // NOTE: hasMoved is NOT reset here, it's used by the click handler, then reset on next mousedown
      };

      if (draggingId || resizingId) {
         window.addEventListener('mousemove', handleMouseMove);
         window.addEventListener('mouseup', handleMouseUp);
      }
      return () => {
         window.removeEventListener('mousemove', handleMouseMove);
         window.removeEventListener('mouseup', handleMouseUp);
      };
   }, [draggingId, resizingId, events, hasMoved, initialPos]);

   const saveEvent = () => {
      if (!eventTitle.trim()) return;

      if (editingId) {
         // Update
         setEvents(prev => prev.map(ev => ev.id === editingId ? {
            ...ev,
            title: eventTitle,
            day: selectedDay as any,
            startTime,
            endTime,
            type: eventType
         } : ev));
      } else {
         // Create
         const newEvent: CalendarEvent = {
            id: `evt-${Date.now()}`,
            title: eventTitle,
            day: selectedDay as any,
            startTime,
            endTime,
            type: eventType,
            completed: false
         };
         setEvents([...events, newEvent]);
      }
      setIsModalOpen(false);
   }

   const deleteEvent = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setEvents(events.filter(ev => ev.id !== id));
      if (editingId === id) setIsModalOpen(false);
   }

   const getTypeStyle = (type: string) => {
      switch (type) {
         case 'Study': return 'bg-blue-600 border-blue-400';
         case 'Review': return 'bg-purple-600 border-purple-400';
         case 'Exam': return 'bg-red-600 border-red-400';
         case 'Break': return 'bg-emerald-600 border-emerald-400';
         default: return 'bg-zinc-700 border-zinc-500';
      }
   }

   return (
      <div className="h-full flex flex-col animate-fade-in max-h-[calc(100vh-140px)]">
         {/* Header */}
         <div className="flex flex-col md:flex-row md:items-center justify-between px-4 mb-4 gap-4">
            <div className="flex items-center gap-4">
               <h2 className="text-2xl font-bold text-white tracking-tight">{now.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
               <div className="flex gap-1">
                  <button className="p-2 rounded-xl hover:bg-white/5 text-zinc-400 hover:text-white transition-all duration-200"><ChevronLeft size={18} /></button>
                  <button className="p-2 rounded-xl hover:bg-white/5 text-zinc-400 hover:text-white transition-all duration-200"><ChevronRight size={18} /></button>
               </div>
            </div>
            <button
               onClick={openCreateModal}
               className="flex items-center gap-2 px-5 py-2.5 bg-white text-black rounded-xl font-bold text-sm hover:bg-zinc-100 active:scale-[0.98] shadow-lg hover:shadow-xl transition-all duration-200"
            >
               <Plus size={18} /> New Block
            </button>
         </div>

         {/* Grid Container */}
         <div className="flex-1 bg-[#0a0a0a] border border-white/5 rounded-2xl flex flex-col overflow-hidden relative shadow-xl transition-shadow duration-300">
            {/* Header Row */}
            <div className="flex border-b border-white/5 bg-[#0d0d0d] h-12 shrink-0">
               <div className="w-[60px] border-r border-white/5 shrink-0"></div>
               <div className="flex-1 grid grid-cols-7">
                  {DAYS.map(day => (
                     <div key={day} className={`flex flex-col items-center justify-center border-r border-white/5 last:border-r-0 transition-colors duration-200 ${day === currentDay ? 'bg-primary-500/10' : ''}`}>
                        <span className={`text-xs font-bold uppercase tracking-wider ${day === currentDay ? 'text-primary-400' : 'text-zinc-500'}`}>{day}</span>
                     </div>
                  ))}
               </div>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto relative custom-scrollbar bg-[#080808]" ref={containerRef}>
               <div className="flex relative" style={{ height: HOURS.length * HOUR_HEIGHT }}>

                  {/* Time Sidebar */}
                  <div className="w-[60px] shrink-0 border-r border-white/5 bg-[#0d0d0d] text-right pr-2 pt-2 select-none sticky left-0 z-20">
                     {HOURS.map(h => (
                        <div key={h} className="h-[80px] text-[10px] text-zinc-500 font-mono relative -top-2">
                           {h > 12 ? h - 12 : h} {h >= 12 ? 'PM' : 'AM'}
                        </div>
                     ))}
                  </div>

                  {/* Grid Lines */}
                  <div className="absolute inset-0 left-[60px] pointer-events-none z-0">
                     {HOURS.map((_, i) => (
                        <div key={i} className="border-b border-white/5" style={{ height: HOUR_HEIGHT }}></div>
                     ))}
                     <div className="grid grid-cols-7 h-full absolute inset-0">
                        {DAYS.map(d => <div key={d} className="border-r border-white/5 last:border-r-0"></div>)}
                     </div>
                  </div>

                  {/* Events */}
                  <div className="flex-1 grid grid-cols-7 absolute inset-0 left-[60px] z-10">
                     {DAYS.map(day => (
                        <div key={day} className="relative h-full">
                           {/* Current Time Line */}
                           {day === currentDay && (
                              <div className="absolute w-full border-t-2 border-primary-500 z-20 pointer-events-none" style={{ top: currentTimeTop }}>
                                 <div className="w-2 h-2 bg-primary-500 rounded-full -mt-[5px] -ml-1 shadow-[0_0_8px_rgba(41,98,255,0.6)]"></div>
                              </div>
                           )}

                           {events.filter(e => e.day === day).map(evt => {
                              const top = timeToPixels(evt.startTime);
                              const height = Math.max(30, timeToPixels(evt.endTime) - top);

                              return (
                                 <div
                                    key={evt.id}
                                    onMouseDown={(e) => handleDragStart(e, evt.id)}
                                    onClick={(e) => handleClickEvent(e, evt)}
                                    className={`absolute left-1 right-1 rounded-lg px-2 py-1 text-xs text-white border-l-4 shadow-md cursor-pointer hover:brightness-110 transition-all duration-200 ease-out select-none overflow-hidden group ${getTypeStyle(evt.type)} ${draggingId === evt.id ? 'z-[60] shadow-xl scale-[1.02] opacity-95 ring-2 ring-white/20' : 'z-10'}`}
                                    style={{ top, height, cursor: draggingId === evt.id ? 'grabbing' : 'grab' }}
                                 >
                                    <div className="font-bold truncate">{evt.title}</div>
                                    <div className="text-[10px] opacity-80 pointer-events-none">{formatTime12hr(evt.startTime)} - {formatTime12hr(evt.endTime)}</div>

                                    {/* Delete Button */}
                                    <button
                                       onClick={(e) => deleteEvent(evt.id, e)}
                                       className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 hover:bg-black/20 rounded transition-all"
                                    >
                                       <Trash2 size={12} />
                                    </button>

                                    {/* Resize Handle */}
                                    <div
                                       onMouseDown={(e) => handleResizeStart(e, evt.id)}
                                       className="absolute bottom-0 left-0 w-full h-3 cursor-ns-resize flex items-end justify-center opacity-0 group-hover:opacity-100 hover:bg-black/10 transition-opacity"
                                    >
                                       <div className="w-8 h-1 bg-white/30 rounded-full mb-1"></div>
                                    </div>
                                 </div>
                              )
                           })}
                        </div>
                     ))}
                  </div>
               </div>
            </div>
         </div>

         {/* Edit/Create Modal */}
         {isModalOpen && (
            <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
               <div className="w-full max-w-sm bg-[#0d0d0d] border border-white/10 rounded-2xl p-6 shadow-2xl relative animate-scale-in">
                  <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-colors duration-200"><X size={18} /></button>
                  <h3 className="text-xl font-bold text-white mb-6 tracking-tight">{editingId ? 'Edit Event' : 'Add Event'}</h3>

                  <div className="space-y-4">
                     <input
                        value={eventTitle}
                        onChange={(e) => setEventTitle(e.target.value)}
                        placeholder="Event title"
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3.5 text-white placeholder:text-zinc-600 focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/20 outline-none transition-all duration-200"
                        autoFocus
                     />
                     <div className="grid grid-cols-2 gap-4">
                        <select value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)} className="bg-black/40 border border-white/10 rounded-xl p-3.5 text-white outline-none focus:border-primary-500/50 transition-colors duration-200">
                           {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <select value={eventType} onChange={(e) => setEventType(e.target.value as any)} className="bg-black/40 border border-white/10 rounded-xl p-3.5 text-white outline-none focus:border-primary-500/50 transition-colors duration-200">
                           {['Study', 'Review', 'Exam', 'Break'].map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="bg-black/40 border border-white/10 rounded-xl p-3.5 text-white outline-none focus:border-primary-500/50 transition-colors duration-200" />
                        <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="bg-black/40 border border-white/10 rounded-xl p-3.5 text-white outline-none focus:border-primary-500/50 transition-colors duration-200" />
                     </div>
                     <button onClick={saveEvent} className="w-full py-3.5 bg-white text-black font-bold rounded-xl hover:bg-zinc-100 active:scale-[0.99] transition-all duration-200 mt-2">
                        {editingId ? 'Save Changes' : 'Create Block'}
                     </button>
                     {editingId && (
                        <button onClick={(e) => deleteEvent(editingId, e)} className="w-full py-2.5 text-red-400 text-xs font-medium hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors duration-200">
                           Delete Event
                        </button>
                     )}
                  </div>
               </div>
            </div>
         )}
      </div>
   );
};

export default CalendarView;