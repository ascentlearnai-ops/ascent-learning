
export type ResourceType = 'YOUTUBE' | 'PDF' | 'TEXT' | 'AUDIO';

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  status: 'new' | 'learning' | 'mastered';
}

export interface QuizQuestion {
  id: string;
  passage?: string; // New field for context paragraphs/reading passages
  question: string;
  options: string[];
  correctAnswer: number; // Index of correct option (for Multiple Choice)
  type?: 'multiple-choice' | 'text'; // New field to distinguish types
  correctAnswerText?: string; // New field for Grid-in answers
  explanation: string;
}

export interface SummarySection {
  title: string;
  content: string; // Markdown
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}

export interface Resource {
  id: string;
  title: string;
  type: ResourceType;
  originalContent: string; // The full text or transcript
  summary: string; // Markdown summary
  flashcards: Flashcard[];
  quiz: QuizQuestion[];
  createdAt: number;
  lastAccessed: number;
  status: 'processing' | 'ready' | 'error';
  tags: string[];
}

export interface UserStats {
  streak: number;
  cardsLearned: number;
  quizScoreAvg: number;
  hoursLearned: number;
}

export interface StudyTask {
  id: string;
  text: string;
  completed: boolean;
}

export interface CalendarEvent {
  id: string;
  day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
  title: string;
  startTime: string; // "09:00"
  endTime: string;   // "10:30"
  type: 'Study' | 'Review' | 'Exam' | 'Break';
  completed: boolean;
}
