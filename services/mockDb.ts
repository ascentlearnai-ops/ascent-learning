import { Resource, UserStats } from "../types";
import { encryptData, decryptData } from "../utils/security";
import { supabase } from '../lib/supabase';
import * as supabaseDb from './supabaseDb';

const DB_STORAGE_KEY = "ascent_secure_storage_v2";

// ── Local Storage Fallback ──

const loadResources = (): Resource[] => {
  const stored = localStorage.getItem(DB_STORAGE_KEY);
  if (!stored) return [];
  const decrypted = decryptData<Resource[]>(stored);
  return decrypted || [];
};

const saveResources = (resources: Resource[]) => {
  try {
    const encrypted = encryptData(resources);
    localStorage.setItem(DB_STORAGE_KEY, encrypted);
  } catch (e) {
    console.error("Storage Quota Exceeded or Encryption Error");
  }
};

let MEMORY_CACHE: Resource[] = loadResources();

// Add Welcome Guide if Empty (only for local fallback)
if (MEMORY_CACHE.length === 0) {
  const welcomeRes: Resource = {
    id: 'welcome-guide',
    title: 'Ascent Protocol: User Guide',
    type: 'TEXT',
    originalContent: 'Welcome to Ascent...',
    summary: '<h2>Welcome to Ascent</h2><p>Ascent is a high-performance cognitive augmentation platform.</p><ul><li><strong>Ingestion Engine</strong>: Upload PDFs, Audio, or Video URLs.</li><li><strong>Neural Synthesis</strong>: AI generates structured notes.</li><li><strong>Active Recall</strong>: Automated flashcards.</li></ul>',
    flashcards: [
      { id: 'f1', front: 'What is the primary function of Ascent?', back: 'Cognitive augmentation through AI-driven synthesis.', status: 'mastered' },
      { id: 'f2', front: 'How is data secured?', back: 'Enterprise-grade encryption at rest.', status: 'learning' }
    ],
    quiz: [
      { id: 'q1', question: 'Which AI model powers the engine?', options: ['Legacy v1', 'Gemini 2.5 Flash', 'Basic RNN', 'Static Scripts'], correctAnswer: 1, explanation: 'Ascent utilizes Google\'s Gemini 2.5 Flash for high-speed reasoning.' }
    ],
    createdAt: Date.now(),
    lastAccessed: Date.now(),
    status: 'ready',
    tags: ['Onboarding', 'System']
  };
  MEMORY_CACHE = [welcomeRes];
  saveResources(MEMORY_CACHE);
}

// ── Supabase-First with Local Fallback ──

const isSupabaseReady = () => {
  return supabase !== null;
};

export const getResources = async (): Promise<Resource[]> => {
  if (isSupabaseReady()) {
    try {
      const resources = await supabaseDb.getResources();
      if (resources.length > 0 || MEMORY_CACHE.length === 0) {
        return resources;
      }
    } catch (e) {
      console.warn('Supabase getResources failed, using local cache:', e);
    }
  }
  // Fallback to local
  return new Promise((resolve) => {
    setTimeout(() => resolve([...MEMORY_CACHE]), 50);
  });
};

export const getResourceById = async (id: string): Promise<Resource | undefined> => {
  if (isSupabaseReady()) {
    try {
      const resource = await supabaseDb.getResourceById(id);
      if (resource) return resource;
    } catch (e) {
      console.warn('Supabase getResourceById failed, using local cache:', e);
    }
  }
  // Fallback to local
  const res = MEMORY_CACHE.find(r => r.id === id);
  if (res) {
    res.lastAccessed = Date.now();
    saveResources(MEMORY_CACHE);
  }
  return res;
};

export const createResource = async (resource: Resource): Promise<void> => {
  // Always save locally for fast access
  const existing = MEMORY_CACHE.find(r => r.id === resource.id);
  if (!existing) {
    MEMORY_CACHE.unshift(resource);
    if (MEMORY_CACHE.length > 50) {
      MEMORY_CACHE = MEMORY_CACHE.slice(0, 50);
    }
    saveResources(MEMORY_CACHE);
  }

  // Also save to Supabase for cloud persistence
  if (isSupabaseReady()) {
    try {
      await supabaseDb.createResource(resource);
      console.log('✓ Resource saved to Supabase');
    } catch (e) {
      console.warn('Supabase createResource failed (local saved):', e);
    }
  }
};

export const deleteResource = async (id: string): Promise<void> => {
  // Delete locally
  MEMORY_CACHE = MEMORY_CACHE.filter(r => r.id !== id);
  saveResources(MEMORY_CACHE);

  // Delete from Supabase
  if (isSupabaseReady()) {
    try {
      await supabaseDb.deleteResource(id);
      console.log('✓ Resource deleted from Supabase');
    } catch (e) {
      console.warn('Supabase deleteResource failed:', e);
    }
  }
};

export const getUserStats = async (): Promise<UserStats> => {
  if (isSupabaseReady()) {
    try {
      return await supabaseDb.getUserStats();
    } catch (e) {
      console.warn('Supabase getUserStats failed, using local:', e);
    }
  }

  // Local fallback
  const streak = parseInt(localStorage.getItem('ascent_streak') || '1');
  const cardsLearned = MEMORY_CACHE.reduce((acc, res) => acc + res.flashcards.length, 0);
  const totalCards = cardsLearned;
  const mastered = MEMORY_CACHE.reduce((acc, res) => acc + res.flashcards.filter(f => f.status === 'mastered').length, 0);
  const retention = totalCards > 0 ? Math.round((mastered / totalCards) * 100) : 85;

  const focusTimeSeconds = parseInt(localStorage.getItem('ascent_focus_seconds') || '0');
  const hoursLearned = parseFloat((focusTimeSeconds / 3600).toFixed(1));

  return {
    streak,
    cardsLearned,
    quizScoreAvg: retention,
    hoursLearned
  };
};

// Re-export progress tracking for components that need it
export { saveStudyProgress, logStudyTime } from './supabaseDb';