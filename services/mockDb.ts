import { Resource, UserStats } from "../types";
import { encryptData, decryptData } from "../utils/security";

const DB_STORAGE_KEY = "ascent_secure_storage_v2";

// Initialize DB from Encrypted LocalStorage
const loadResources = (): Resource[] => {
  const stored = localStorage.getItem(DB_STORAGE_KEY);
  if (!stored) return [];
  const decrypted = decryptData<Resource[]>(stored);
  return decrypted || [];
};

// Save DB with Encryption
const saveResources = (resources: Resource[]) => {
  try {
    const encrypted = encryptData(resources);
    localStorage.setItem(DB_STORAGE_KEY, encrypted);
  } catch (e) {
    console.error("Storage Quota Exceeded or Encryption Error");
  }
};

// In-Memory Cache for speed
let MEMORY_CACHE: Resource[] = loadResources();

// Add Welcome Guide if Empty
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
        { id: 'q1', question: 'Which AI model powers the engine?', options: ['Legacy v1', 'Gemini 2.5 Flash', 'Basic RNN', 'Static Scripts'], correctAnswer: 1, explanation: 'Ascent utilizes Google\'s Gemini 2.5 Flash for high-speed reasoning.'}
      ],
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      status: 'ready',
      tags: ['Onboarding', 'System']
    };
    MEMORY_CACHE = [welcomeRes];
    saveResources(MEMORY_CACHE);
}

export const getResources = async (): Promise<Resource[]> => {
  return new Promise((resolve) => {
    // Simulate slight network delay for realism, but keep it fast (50ms)
    setTimeout(() => resolve([...MEMORY_CACHE]), 50);
  });
};

export const getResourceById = async (id: string): Promise<Resource | undefined> => {
  return new Promise((resolve) => {
    const res = MEMORY_CACHE.find(r => r.id === id);
    if (res) {
        // Update last accessed
        res.lastAccessed = Date.now();
        saveResources(MEMORY_CACHE);
    }
    setTimeout(() => resolve(res), 50);
  });
};

export const createResource = async (resource: Resource): Promise<void> => {
  // Optimization: Deduplicate
  const existing = MEMORY_CACHE.find(r => r.id === resource.id);
  if (existing) return;

  MEMORY_CACHE.unshift(resource);
  
  // Cap storage to 50 items to prevent localStorage overflow
  if (MEMORY_CACHE.length > 50) {
      MEMORY_CACHE = MEMORY_CACHE.slice(0, 50);
  }
  
  saveResources(MEMORY_CACHE);
};

export const deleteResource = async (id: string): Promise<void> => {
  return new Promise((resolve) => {
    MEMORY_CACHE = MEMORY_CACHE.filter(r => r.id !== id);
    saveResources(MEMORY_CACHE);
    setTimeout(resolve, 50);
  });
};

export const getUserStats = async (): Promise<UserStats> => {
  return new Promise((resolve) => {
    const streak = parseInt(localStorage.getItem('ascent_streak') || '1');
    const cardsLearned = MEMORY_CACHE.reduce((acc, res) => acc + res.flashcards.length, 0);
    // Calculate real retention based on mock "mastered" status
    const totalCards = cardsLearned;
    const mastered = MEMORY_CACHE.reduce((acc, res) => acc + res.flashcards.filter(f => f.status === 'mastered').length, 0);
    const retention = totalCards > 0 ? Math.round((mastered / totalCards) * 100) : 85;

    const focusTimeSeconds = parseInt(localStorage.getItem('ascent_focus_seconds') || '0');
    const hoursLearned = parseFloat((focusTimeSeconds / 3600).toFixed(1));

    setTimeout(() => resolve({
      streak: streak,
      cardsLearned: cardsLearned,
      quizScoreAvg: retention,
      hoursLearned: hoursLearned
    }), 50);
  });
};