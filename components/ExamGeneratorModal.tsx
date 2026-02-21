import React, { useState, useRef } from 'react';
import { X, Youtube, Type, Plus, Trash2, Brain, Loader2, Target, Layers, UploadCloud, FileCheck } from 'lucide-react';
import { generateMultiSourceQuiz } from '../services/aiService';
import { createResource } from '../services/mockDb';
import { Resource } from '../types';
import * as pdfjsLib from 'pdfjs-dist';
// Use bundled worker to guarantee version match (fixes "PDF library version mismatch")
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
import { MiniUnoGame } from './MiniUnoGame';

interface ExamGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExamReady: (resourceId: string) => void;
}

const ExamGeneratorModal: React.FC<ExamGeneratorModalProps> = ({ isOpen, onClose, onExamReady }) => {
  const [sources, setSources] = useState<{ type: 'youtube' | 'text', content: string, loading?: boolean, filename?: string }[]>([
    { type: 'youtube', content: '' }
  ]);
  const [questionCount, setQuestionCount] = useState(10);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [isGameOpen, setIsGameOpen] = useState(false);

  // Refs for file inputs
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  if (!isOpen) return null;

  const addSource = () => {
    setSources([...sources, { type: 'text', content: '' }]);
  };

  const removeSource = (index: number) => {
    setSources(sources.filter((_, i) => i !== index));
  };

  const updateSource = (index: number, content: string, type: 'youtube' | 'text', loading: boolean = false, filename?: string) => {
    const newSources = [...sources];
    newSources[index] = { type, content, loading, filename };
    setSources(newSources);
  };

  const handleFileUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (file.type !== 'application/pdf') {
      setError(`Please upload a PDF file. Selected file type: ${file.type || 'unknown'}`);
      return;
    }

    updateSource(index, '', 'text', true, file.name);
    setError(''); // Clear previous errors

    try {
      const arrayBuffer = await file.arrayBuffer();
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
        throw new Error(`Extracted only ${fullText.length} characters. PDF may be image-based or empty.`);
      }

      updateSource(index, fullText, 'text', false, file.name);
      console.log(`✓ Successfully extracted ${fullText.length} characters from ${file.name}`);

    } catch (err: any) {
      console.error('PDF parsing error:', err);

      // Provide user-friendly error messages
      let errorMessage = 'Failed to parse PDF. ';

      if (err.message?.includes('API version')) {
        errorMessage += 'PDF library version mismatch detected. Please refresh the page and try again.';
      } else if (err.message?.includes('image-based') || err.message?.includes('empty')) {
        errorMessage += 'The PDF appears to be image-based or has no extractable text. Try a text-based PDF.';
      } else if (err.message?.includes('password') || err.message?.includes('encrypted')) {
        errorMessage += 'The PDF is password-protected or encrypted.';
      } else if (err.message?.includes('Invalid PDF')) {
        errorMessage += 'The file appears to be corrupted or not a valid PDF.';
      } else {
        errorMessage += `Error: ${err.message || 'Unknown error'}`;
      }

      setError(errorMessage);
      updateSource(index, '', 'text', false);

      // Clear file input
      if (fileInputRefs.current[index]) {
        fileInputRefs.current[index]!.value = '';
      }
    }
  };

  const handleGenerate = async () => {
    setError('');

    // Validation
    const validSources = sources.filter(s => s.content.trim().length > 10);
    if (validSources.length === 0) {
      setError('Please provide at least one valid source (URL or Text).');
      return;
    }

    setIsProcessing(true);

    try {
      const aggregatedContent = validSources.map(s => s.content).join('\n\n---\n\n');

      const quiz = await generateMultiSourceQuiz(aggregatedContent, questionCount);

      const examResource: Resource = {
        id: `exam-${Date.now()}`,
        title: `Comprehensive Exam (${questionCount} Qs)`,
        type: 'TEXT',
        originalContent: aggregatedContent,
        summary: `# Exam Mode Protocol\n\nGenerated from ${validSources.length} sources.\n\nTargeting ${questionCount} questions.`,
        flashcards: [],
        quiz: quiz,
        createdAt: Date.now(),
        lastAccessed: Date.now(),
        status: 'ready',
        tags: ['Exam Mode', 'Multi-Source']
      };

      await createResource(examResource);

      setIsGameOpen(false);
      onExamReady(examResource.id);
      onClose();

    } catch (e: any) {
      setError(e.message || "Exam generation failed.");
      setIsProcessing(false);
    }
  };

  return (
    <>
      {isGameOpen && isProcessing && <MiniUnoGame onClose={() => setIsGameOpen(false)} />}
      <div
        className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-in ${isGameOpen ? 'hidden' : ''}`}
        onClick={!isProcessing ? onClose : undefined}
      >
        <div
          className="w-full max-w-2xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col bg-[#0a0a0a] relative max-h-[90vh] animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="absolute top-0 w-full h-0.5 bg-gradient-to-r from-red-600 via-orange-500 to-red-600"></div>

          {/* Header */}
          <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-[#0d0d0d] shrink-0">
            <div>
              <h3 className="font-bold text-lg text-white flex items-center gap-2 tracking-tight">
                <Target className="text-red-500" size={20} />
                Multi-Vector Exam Generator
              </h3>
              <p className="text-xs mt-1 text-zinc-500">Ingest multiple sources to synthesize a comprehensive examination.</p>
            </div>
            {!isProcessing && (
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition-colors duration-200 text-zinc-400 hover:text-white">
                <X size={20} />
              </button>
            )}
          </div>

          {/* Scrollable Body */}
          <div className="p-6 bg-[#080808] overflow-y-auto custom-scrollbar flex-1">
            {isProcessing ? (
              <div className="flex flex-col items-center justify-center h-full py-10 space-y-6">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full border-4 border-zinc-800 flex items-center justify-center">
                    <Brain size={32} className="text-zinc-600" />
                  </div>
                  <svg className="absolute top-0 left-0 w-20 h-20 animate-spin" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="46" stroke="#EF4444" strokeWidth="4" fill="none" strokeDasharray="200" strokeDashoffset="50" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="text-center space-y-2">
                  <h4 className="text-white font-bold animate-pulse">Synthesizing Examination...</h4>
                  <p className="text-zinc-500 text-sm">Cross-referencing {sources.length} sources</p>
                </div>

                <button
                  onClick={() => setIsGameOpen(true)}
                  className="mt-8 px-6 py-3 rounded-full bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600/30 transition-all font-mono text-sm tracking-widest font-bold uppercase shadow-lg hover:scale-105 active:scale-95"
                >
                  Play Card Game While You Wait
                </button>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Question Count Slider */}
                <div className="bg-[#0A0A0A] p-6 rounded-xl border border-zinc-800 space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-bold text-white flex items-center gap-2">
                      <Layers size={16} className="text-primary-500" /> Exam Depth
                    </label>
                    <span className="text-2xl font-bold text-white">{questionCount} <span className="text-sm text-zinc-500 font-normal">Questions</span></span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    step="5"
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Number(e.target.value))}
                    className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-primary-600"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-600 font-mono uppercase">
                    <span>Quick Quiz (5)</span>
                    <span>Deep Dive (50)</span>
                  </div>
                </div>

                {/* Source Inputs */}
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <label className="text-sm font-bold text-white">Knowledge Sources</label>
                    <button onClick={addSource} className="text-xs font-bold text-primary-400 hover:text-white flex items-center gap-1 transition-colors">
                      <Plus size={14} /> ADD SOURCE
                    </button>
                  </div>

                  {sources.map((source, idx) => (
                    <div key={idx} className="flex gap-3 animate-enter">
                      <div className="flex-1 space-y-2">
                        <div className="flex gap-2">
                          <button
                            onClick={() => updateSource(idx, source.content, 'youtube')}
                            className={`px-3 py-1.5 rounded text-[10px] font-bold border ${source.type === 'youtube' ? 'bg-red-900/20 text-red-400 border-red-900/50' : 'bg-zinc-900 text-zinc-500 border-zinc-800'}`}
                          >
                            YouTube
                          </button>
                          <button
                            onClick={() => updateSource(idx, source.content, 'text')}
                            className={`px-3 py-1.5 rounded text-[10px] font-bold border ${source.type === 'text' ? 'bg-blue-900/20 text-blue-400 border-blue-900/50' : 'bg-zinc-900 text-zinc-500 border-zinc-800'}`}
                          >
                            Text / PDF
                          </button>
                        </div>

                        <div className="relative">
                          {source.type === 'text' && (
                            <div className="absolute right-2 bottom-2 z-10">
                              <input
                                type="file"
                                ref={(el) => { fileInputRefs.current[idx] = el; }}
                                className="hidden"
                                accept=".pdf"
                                onChange={(e) => handleFileUpload(idx, e)}
                              />
                              <button
                                onClick={() => fileInputRefs.current[idx]?.click()}
                                className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-white transition-colors border border-zinc-700"
                                title="Upload PDF"
                              >
                                <UploadCloud size={16} />
                              </button>
                            </div>
                          )}
                          <textarea
                            value={source.content}
                            onChange={(e) => updateSource(idx, e.target.value, source.type, false, source.filename)}
                            placeholder={source.type === 'youtube' ? "Paste YouTube Transcript or URL..." : "Paste Notes or Upload PDF..."}
                            disabled={source.loading}
                            className={`w-full h-24 p-3 rounded-lg bg-zinc-900/50 border border-zinc-800 text-sm text-white focus:border-primary-500 outline-none resize-none transition-all placeholder:text-zinc-700 ${source.loading ? 'opacity-50' : ''}`}
                          />

                          {/* Filename Badge */}
                          {source.filename && !source.loading && (
                            <div className="absolute top-2 right-2 bg-blue-900/40 text-blue-300 text-xs px-2 py-1 rounded border border-blue-500/30 flex items-center gap-1 backdrop-blur-md">
                              <FileCheck size={12} /> {source.filename}
                            </div>
                          )}

                          {source.loading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm rounded-lg">
                              <Loader2 size={20} className="text-primary-500 animate-spin" />
                              <span className="ml-2 text-xs font-bold text-white">Extracting PDF...</span>
                            </div>
                          )}
                        </div>
                      </div>
                      {sources.length > 1 && (
                        <button onClick={() => removeSource(idx)} className="h-10 w-10 mt-8 rounded-lg flex items-center justify-center text-zinc-600 hover:text-red-400 hover:bg-red-900/10 transition-colors">
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          {!isProcessing && (
            <div className="px-6 py-5 border-t border-white/5 flex justify-between items-center bg-[#0d0d0d] shrink-0">
              <div className="text-red-400 text-xs font-bold">
                {error}
              </div>
              <div className="flex gap-3">
                <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white">Cancel</button>
                <button
                  onClick={handleGenerate}
                  className="px-6 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-bold flex items-center gap-2 shadow-[0_0_15px_rgba(220,38,38,0.4)] transition-all hover:scale-105"
                >
                  <Target size={16} /> Generate Exam
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ExamGeneratorModal;