import React, { useState, useRef } from 'react';
import { X, Youtube, Type, UploadCloud, Loader2, AlertCircle, Lock, CheckCircle, Brain, Database, FileText, ArrowUpCircle } from 'lucide-react';
import { createResource } from '../services/mockDb';
import { generateSummary, generateFlashcards, generateQuiz, synthesizeVideoContent } from '../services/aiService';
import { Resource } from '../types';
import { validateInput, dailyUploadLimiter, getTierLimits } from '../utils/security';
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
  const [activeTab, setActiveTab] = useState<'youtube' | 'text'>('youtube');
  const [input, setInput] = useState('');
  const [processingStep, setProcessingStep] = useState<ProcessingStep>('idle');
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [isPdfProcessing, setIsPdfProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        type: activeTab === 'youtube' ? 'YOUTUBE' : 'TEXT',
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
            <button onClick={() => {setActiveTab('youtube');setInput('');}} className={`flex-1 py-3.5 text-sm font-medium transition-colors duration-200 ${activeTab==='youtube'?'text-primary-400 border-b-2 border-primary-500':'text-zinc-500 hover:text-zinc-300'}`}>
              <Youtube size={18} className="inline mr-2"/>YouTube
            </button>
            <button onClick={() => {setActiveTab('text');setInput('');}} className={`flex-1 py-3.5 text-sm font-medium transition-colors duration-200 ${activeTab==='text'?'text-primary-400 border-b-2 border-primary-500':'text-zinc-500 hover:text-zinc-300'}`}>
              <FileText size={18} className="inline mr-2"/>Text/PDF
            </button>
          </div>
        )}
        <div className="p-6 bg-[#080808]">
          {isProcessing ? (
            <div className="flex flex-col items-center py-12">
              <Loader2 size={48} className="text-primary-500 animate-spin"/>
              <p className="mt-4 text-zinc-400">{processingStep.replace('_',' ')}</p>
            </div>
          ) : (
            <>
              {activeTab==='youtube' ? (
                <textarea value={input} onChange={(e)=>setInput(e.target.value)} placeholder="YouTube URL or transcript..." className="w-full px-4 py-3.5 bg-black/40 border border-white/10 rounded-xl text-white placeholder:text-zinc-600 resize-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/20 outline-none transition-all duration-200" rows={8}/>
              ) : (
                <div>
                  <textarea value={input} onChange={(e)=>setInput(e.target.value)} placeholder="Paste text..." className="w-full px-4 py-3.5 bg-black/40 border border-white/10 rounded-xl text-white placeholder:text-zinc-600 resize-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/20 outline-none transition-all duration-200" rows={6}/>
                  <input ref={fileInputRef} type="file" accept=".pdf" onChange={(e)=>e.target.files&&processPdfFile(e.target.files[0])} className="hidden" id="pdf-upload"/>
                  <label htmlFor="pdf-upload" className="mt-3 flex items-center justify-center gap-2 p-4 border-2 border-dashed border-white/10 rounded-xl cursor-pointer hover:border-primary-500/50 hover:bg-white/5 transition-all duration-200">
                    {isPdfProcessing?<Loader2 size={20} className="animate-spin text-primary-400"/>:<UploadCloud size={20} className="text-zinc-500"/>}
                    <span className="text-zinc-400">{isPdfProcessing?'Processing...':'Upload PDF'}</span>
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
            <button onClick={handleSubmit} disabled={!input.trim()||isPdfProcessing} className="px-6 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 disabled:bg-zinc-800 disabled:cursor-not-allowed text-white font-medium transition-all duration-200 active:scale-[0.98]">Process</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadModal;
