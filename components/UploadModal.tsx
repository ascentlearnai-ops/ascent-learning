import React, { useState, useRef, useEffect } from 'react';
import { X, Youtube, Type, UploadCloud, Loader2, AlertCircle, Lock, CheckCircle, Brain, Database, FileText, ArrowUpCircle, Mic, Square } from 'lucide-react';
import { createResource } from '../services/mockDb';
import { generateSummary, generateFlashcards, generateQuiz, synthesizeVideoContent } from '../services/aiService';
import { Resource } from '../types';
import { validateInput, dailyUploadLimiter, getTierLimits, getUserTier } from '../utils/security';
import * as pdfjsLib from 'pdfjs-dist';
// Use bundled worker to guarantee version match (fixes "PDF library version mismatch")
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: () => void;
  darkMode: boolean;
}

type ProcessingStep = 'idle' | 'fetching_transcript' | 'extracting' | 'synthesizing' | 'generating' | 'finalizing';

const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onUploadComplete, darkMode }) => {
  const [activeTab, setActiveTab] = useState<'youtube' | 'text' | 'voice'>('youtube');
  const [input, setInput] = useState('');
  const [processingStep, setProcessingStep] = useState<ProcessingStep>('idle');
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [isPdfProcessing, setIsPdfProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [countdown, setCountdown] = useState(45);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (processingStep !== 'idle' && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => Math.max(0, prev - 1));
      }, 1000);
    } else if (processingStep === 'idle') {
      setCountdown(45);
    }
    return () => clearInterval(timer);
  }, [processingStep, countdown]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const handleToggleRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Speech recognition is not supported in this browser. Try Chrome.");
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const tier = getUserTier();
    if (tier !== 'Scholar') {
      setError("Audio Recording feature requires Scholar Clearance level.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      let finalTranscript = input;

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let newFinal = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            newFinal += event.results[i][0].transcript + ' ';
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        if (newFinal) {
          finalTranscript += newFinal;
          setInput(finalTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        setError(`Recording error: ${event.error}`);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsRecording(true);
      setError('');

      // Auto-stop after 20 minutes (1200000 ms) max supported conceptually
      setTimeout(() => {
        if (recognitionRef.current) {
          recognitionRef.current.stop();
          setIsRecording(false);
        }
      }, 1200000);

    } catch (e: any) {
      setError("Could not start recording.");
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setError('');
    const limits = getTierLimits();
    if (!dailyUploadLimiter.check(limits.dailyUploads)) {
      setError(`Daily upload limit reached (${limits.dailyUploads}). Please wait 24h.`);
      return;
    }
    if (!input.trim()) {
      setError('Input content is required.');
      return;
    }
    setProcessingStep(activeTab === 'youtube' && input.trim().startsWith('http') ? 'fetching_transcript' : 'extracting');
    try {
      let title = 'Note Analysis';
      let content = input;
      const isYoutubeUrl = activeTab === 'youtube' && input.trim().startsWith('http');
      if (activeTab === 'youtube') {
        title = 'YouTube Content Analysis';
        if (isYoutubeUrl) {
          setProcessingStep('fetching_transcript');
          content = await synthesizeVideoContent(input);
          if (!content || content.length < 50) throw new Error("Unable to retrieve video content.");
        }
      } else {
        const validation = validateInput(input, 'content');
        if (!validation.valid) throw new Error(validation.error);
      }
      setProcessingStep('synthesizing');
      const summary = await generateSummary(content);
      setProcessingStep('generating');
      const flashcards = await generateFlashcards(content);
      const quiz = await generateQuiz(content);
      setProcessingStep('finalizing');
      await new Promise(r => setTimeout(r, 800));
      const newResource: Resource = {
        id: Date.now().toString(),
        title,
        type: activeTab === 'youtube' ? 'YOUTUBE' : activeTab === 'voice' ? 'VOICE' : 'TEXT',
        originalContent: content,
        summary,
        flashcards,
        quiz,
        createdAt: Date.now(),
        lastAccessed: Date.now(),
        status: 'ready',
        tags: ['New']
      };
      await createResource(newResource);
      setInput('');
      setProcessingStep('idle');
      onUploadComplete();
      onClose();
    } catch (e: any) {
      console.error('Processing error:', e);
      setError(e.message || 'Processing failed. Please try again.');
      setProcessingStep('idle');
    }
  };

  const processPdfFile = async (file: File) => {
    setIsPdfProcessing(true);
    setError('');

    try {
      // Validate file type
      if (file.type !== 'application/pdf') {
        throw new Error(`Please upload a PDF file. File type: ${file.type || 'unknown'}`);
      }

      const arrayBuffer = await file.arrayBuffer();

      // Load PDF document
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;

      let fullText = '';

      // Extract text from all pages
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();

        // Combine text items with proper spacing
        const pageText = textContent.items
          .map((item: any) => {
            if ('str' in item) {
              return item.str;
            }
            return '';
          })
          .join(' ');

        fullText += pageText + '\n\n';
      }

      // Clean and validate extracted text
      fullText = fullText.replace(/\s+/g, ' ').trim();

      if (!fullText || fullText.length < 50) {
        throw new Error(`Only extracted ${fullText.length} characters. PDF may be image-based or empty.`);
      }

      setInput(fullText);
      console.log(`✓ Successfully extracted ${fullText.length} characters from ${file.name}`);

    } catch (e: any) {
      console.error('PDF parsing error:', e);

      // Provide user-friendly error messages
      let errorMessage = 'Failed to parse PDF. ';

      if (e.message?.includes('API version')) {
        errorMessage += 'PDF library version mismatch. Please refresh the page and try again.';
      } else if (e.message?.includes('image-based') || e.message?.includes('empty')) {
        errorMessage += 'PDF appears to be image-based or has no text. Try a text-based PDF.';
      } else if (e.message?.includes('password') || e.message?.includes('encrypted')) {
        errorMessage += 'PDF is password-protected or encrypted.';
      } else if (e.message?.includes('Invalid PDF')) {
        errorMessage += 'File appears corrupted or is not a valid PDF.';
      } else {
        errorMessage += e.message || 'Unknown error occurred.';
      }

      setError(errorMessage);

    } finally {
      setIsPdfProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const isProcessing = processingStep !== 'idle';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-in" onClick={!isProcessing ? onClose : undefined}>
      <div className="w-full max-w-xl rounded-2xl border border-white/10 shadow-2xl bg-[#0a0a0a] animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-white/5 flex justify-between bg-[#0d0d0d]">
          <h3 className="font-bold text-lg text-white tracking-tight">{isProcessing ? 'Processing...' : 'Add Resource'}</h3>
          {!isProcessing && <button onClick={onClose} className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors duration-200"><X size={20} /></button>}
        </div>
        {!isProcessing && (
          <div className="flex border-b border-white/5">
            <button onClick={() => { setActiveTab('youtube'); setInput(''); }} className={`flex-1 py-3.5 text-sm font-medium transition-colors duration-200 ${activeTab === 'youtube' ? 'text-primary-400 border-b-2 border-primary-500' : 'text-zinc-500 hover:text-zinc-300'}`}>
              <Youtube size={18} className="inline mr-2" />YouTube
            </button>
            <button onClick={() => { setActiveTab('text'); setInput(''); }} className={`flex-1 py-3.5 text-sm font-medium transition-colors duration-200 ${activeTab === 'text' ? 'text-primary-400 border-b-2 border-primary-500' : 'text-zinc-500 hover:text-zinc-300'}`}>
              <FileText size={18} className="inline mr-2" />Text/PDF
            </button>
            <button onClick={() => { setActiveTab('voice'); setInput(''); }} className={`flex-1 py-3.5 text-sm font-medium transition-colors duration-200 ${activeTab === 'voice' ? 'text-primary-400 border-b-2 border-primary-500' : 'text-zinc-500 hover:text-zinc-300'}`}>
              <Mic size={18} className="inline mr-2" />Voice
            </button>
          </div>
        )}
        <div className="p-6 bg-[#080808]">
          {isProcessing ? (
            <div className="flex flex-col items-center py-16 px-4 relative overflow-hidden rounded-2xl bg-zinc-950 border border-white/5 shadow-2xl">
              <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none mix-blend-overlay"></div>

              <div className="relative flex justify-center items-center w-24 h-24 mb-8">
                <div className="absolute inset-0 rounded-full border-t-2 border-r-2 border-primary-500/80 animate-spin" style={{ animationDuration: '2s' }}></div>
                <div className="absolute inset-2 rounded-full border-b-2 border-l-2 border-zinc-500/50 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
                <Brain size={36} className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)] animate-pulse" />
              </div>

              <h4 className="text-2xl font-black text-white uppercase tracking-widest mb-3 font-mono drop-shadow-md">
                Synthesizing Data
              </h4>

              <div className="flex items-center gap-3 mb-10">
                <span className="text-primary-400 font-mono text-sm uppercase tracking-wider">
                  {processingStep.replace('_', ' ')}
                </span>
                <span className="flex gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </span>
              </div>

              <div className="flex flex-col items-center bg-black/60 border border-white/10 px-8 py-5 rounded-2xl shadow-inner backdrop-blur-md">
                <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-[0.2em] mb-2">Estimated Time</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-black font-mono tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white to-zinc-400">
                    {String(Math.floor(countdown / 60)).padStart(2, '0')}:{String(countdown % 60).padStart(2, '0')}
                  </span>
                  <span className="text-sm font-bold text-zinc-500 font-mono">s</span>
                </div>
              </div>
            </div>
          ) : (
            <>
              {activeTab === 'youtube' ? (
                <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="YouTube URL or transcript..." className="w-full px-4 py-3.5 bg-black/40 border border-white/10 rounded-xl text-white placeholder:text-zinc-600 resize-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/20 outline-none transition-all duration-200" rows={8} />
              ) : activeTab === 'voice' ? (
                <div className="space-y-4">
                  <button onClick={handleToggleRecording} className={`w-full flex items-center justify-center gap-2 py-8 rounded-2xl border-2 transition-all duration-200 ${isRecording ? 'border-red-500/50 bg-red-500/10' : 'border-dashed border-white/10 hover:border-primary-500/50 hover:bg-white/5'}`}>
                    {isRecording ? <Square size={32} className="text-red-400 animate-pulse" /> : <Mic size={32} className="text-zinc-500" />}
                    <span className={`text-lg font-medium ${isRecording ? 'text-red-400' : 'text-zinc-400'}`}>
                      {isRecording ? 'Stop Recording' : 'Start Recording (Up to 20m)'}
                    </span>
                  </button>
                  {isRecording && <div className="text-center text-red-500/80 text-sm animate-pulse flex items-center justify-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500"></div> Recording... Speak clearly into microphone</div>}
                  <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="Live transcription will appear here... you can also edit manually." className="w-full px-4 py-3.5 bg-black/40 border border-white/10 rounded-xl text-white placeholder:text-zinc-600 resize-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/20 outline-none transition-all duration-200" rows={5} />
                </div>
              ) : (
                <div>
                  <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="Paste text..." className="w-full px-4 py-3.5 bg-black/40 border border-white/10 rounded-xl text-white placeholder:text-zinc-600 resize-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/20 outline-none transition-all duration-200" rows={6} />
                  <input ref={fileInputRef} type="file" accept=".pdf" onChange={(e) => e.target.files && processPdfFile(e.target.files[0])} className="hidden" id="pdf-upload" />
                  <label htmlFor="pdf-upload" className="mt-3 flex items-center justify-center gap-2 p-4 border-2 border-dashed border-white/10 rounded-xl cursor-pointer hover:border-primary-500/50 hover:bg-white/5 transition-all duration-200">
                    {isPdfProcessing ? <Loader2 size={20} className="animate-spin text-primary-400" /> : <UploadCloud size={20} className="text-zinc-500" />}
                    <span className="text-zinc-400">{isPdfProcessing ? 'Processing...' : 'Upload PDF'}</span>
                  </label>
                </div>
              )}
              {error && <div className="mt-3 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-sm">{error}</div>}
            </>
          )}
        </div>
        {!isProcessing && (
          <div className="px-6 py-4 border-t border-white/5 flex justify-end gap-3 bg-[#0d0d0d]">
            <button onClick={onClose} className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 transition-colors duration-200">Cancel</button>
            <button onClick={handleSubmit} disabled={!input.trim() || isPdfProcessing} className="px-6 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 disabled:bg-zinc-800 disabled:cursor-not-allowed text-white font-medium transition-all duration-200 active:scale-[0.98]">Process</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadModal;
