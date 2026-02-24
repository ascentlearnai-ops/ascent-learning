
import { supabase } from '../lib/supabase';
import { Resource, Flashcard, QuizQuestion, UserStats } from "../types";

// Helper to map DB response to App Type
const mapResource = (row: any): Resource => ({
  id: row.id,
  title: row.title,
  type: row.type as any,
  originalContent: row.original_content,
  summary: row.summary,
  createdAt: new Date(row.created_at).getTime(),
  lastAccessed: new Date(row.last_accessed).getTime(),
  status: row.status as any,
  tags: row.tags || [],
  flashcards: row.flashcards?.map((f: any) => ({
    id: f.id,
    front: f.front,
    back: f.back,
    status: f.status
  })) || [],
  quiz: row.quizzes?.map((q: any) => ({
    id: q.id,
    question: q.question,
    options: q.options,
    correctAnswer: q.correct_answer,
    explanation: q.explanation,
    passage: q.passage || ''
  })) || []
});

// ── RESOURCES ──

export const getResources = async (): Promise<Resource[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('resources')
    .select(`
      *,
      flashcards (*),
      quizzes (*)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching resources:', error);
    return [];
  }

  return data.map(mapResource);
};

export const getResourceById = async (id: string): Promise<Resource | undefined> => {
  if (!supabase) return undefined;

  // Update last_accessed timestamp
  await supabase.from('resources').update({ last_accessed: new Date().toISOString() }).eq('id', id);

  const { data, error } = await supabase
    .from('resources')
    .select(`
      *,
      flashcards (*),
      quizzes (*)
    `)
    .eq('id', id)
    .single();

  if (error) return undefined;
  return mapResource(data);
};

export const createResource = async (resource: Resource): Promise<void> => {
  if (!supabase) throw new Error('Supabase client is not configured');

  const userResponse = await supabase.auth.getUser();
  const userId = userResponse.data.user?.id;
  if (!userId) throw new Error('User not authenticated');

  // 1. Insert Resource
  const { data: resData, error: resError } = await supabase
    .from('resources')
    .insert({
      user_id: userId,
      title: resource.title,
      type: resource.type,
      original_content: resource.originalContent,
      summary: resource.summary,
      tags: resource.tags,
      status: 'ready'
    })
    .select()
    .single();

  if (resError || !resData) {
    console.error('Resource insert error:', resError);
    throw new Error('Failed to save resource to database');
  }

  const resourceId = resData.id;

  // 2. Insert Flashcards (batch)
  if (resource.flashcards.length > 0) {
    const flashcardsPayload = resource.flashcards.map(f => ({
      resource_id: resourceId,
      front: f.front,
      back: f.back,
      status: 'new'
    }));
    const { error: fcError } = await supabase.from('flashcards').insert(flashcardsPayload);
    if (fcError) console.error('Flashcards insert error:', fcError);
  }

  // 3. Insert Quiz Questions (batch)
  if (resource.quiz.length > 0) {
    const quizPayload = resource.quiz.map(q => ({
      resource_id: resourceId,
      question: q.question,
      options: q.options,
      correct_answer: q.correctAnswer,
      explanation: q.explanation,
      passage: (q as any).passage || ''
    }));
    const { error: qError } = await supabase.from('quizzes').insert(quizPayload);
    if (qError) console.error('Quiz insert error:', qError);
  }
};

export const deleteResource = async (id: string): Promise<void> => {
  if (!supabase) return;
  // Flashcards and quizzes cascade-delete via foreign key
  const { error } = await supabase.from('resources').delete().eq('id', id);
  if (error) console.error('Delete resource error:', error);
};

// ── STUDY PROGRESS TRACKING ──

export const saveStudyProgress = async (
  activityType: string,
  subject: string,
  score: number,
  totalQuestions: number,
  durationSeconds: number,
  metadata: Record<string, any> = {}
): Promise<void> => {
  if (!supabase) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase.from('study_progress').insert({
    user_id: user.id,
    activity_type: activityType,
    subject,
    score,
    total_questions: totalQuestions,
    duration_seconds: durationSeconds,
    metadata
  });

  if (error) console.error('Save progress error:', error);

  // Update streak
  await updateStreak(user.id);
};

// ── STREAK TRACKING ──

const updateStreak = async (userId: string): Promise<void> => {
  if (!supabase) return;

  const { data: profile } = await supabase
    .from('profiles')
    .select('streak_count, last_active')
    .eq('id', userId)
    .single();

  if (!profile) return;

  const today = new Date().toISOString().split('T')[0];
  const lastActive = profile.last_active;

  let newStreak = profile.streak_count || 0;

  if (lastActive !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (lastActive === yesterdayStr) {
      newStreak += 1; // Consecutive day
    } else if (lastActive !== today) {
      newStreak = 1; // Streak broken, restart
    }

    await supabase
      .from('profiles')
      .update({ streak_count: newStreak, last_active: today })
      .eq('id', userId);
  }
};

// ── USER STATS (Real Data) ──

export const getUserStats = async (): Promise<UserStats> => {
  if (!supabase) {
    return { streak: 1, cardsLearned: 0, quizScoreAvg: 0, hoursLearned: 0 };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { streak: 1, cardsLearned: 0, quizScoreAvg: 0, hoursLearned: 0 };
  }

  // Get profile for streak
  const { data: profile } = await supabase
    .from('profiles')
    .select('streak_count, total_study_minutes')
    .eq('id', user.id)
    .single();

  // Get flashcard count from resources
  const { count: cardCount } = await supabase
    .from('flashcards')
    .select('*', { count: 'exact', head: true });

  // Get quiz scores from study_progress
  const { data: progressData } = await supabase
    .from('study_progress')
    .select('score, total_questions, duration_seconds')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  let quizAvg = 0;
  let totalSeconds = 0;

  if (progressData && progressData.length > 0) {
    const totalScore = progressData.reduce((sum, p) => sum + (p.score || 0), 0);
    const totalQ = progressData.reduce((sum, p) => sum + (p.total_questions || 1), 0);
    quizAvg = totalQ > 0 ? Math.round((totalScore / totalQ) * 100) : 0;
    totalSeconds = progressData.reduce((sum, p) => sum + (p.duration_seconds || 0), 0);
  }

  const hoursFromProfile = (profile?.total_study_minutes || 0) / 60;
  const hoursFromProgress = totalSeconds / 3600;

  return {
    streak: profile?.streak_count || 1,
    cardsLearned: cardCount || 0,
    quizScoreAvg: quizAvg,
    hoursLearned: parseFloat((hoursFromProfile + hoursFromProgress).toFixed(1))
  };
};

// ── USER TIER ──

export const fetchUserTier = async (): Promise<'Initiate' | 'Scholar' | 'Admin'> => {
  const scholarEmails = ['pradyunpoorna@gmail.com', 'vishwak1801@gmail.com', 'omdiwanji25@gmail.com', 'ascentlearnai@gmail.com', 'jeremy.ajakpov@gmail.com'];

  // Check Local Storage (Mock Login Support)
  if (typeof localStorage !== 'undefined') {
    const mockUser = localStorage.getItem('ascent_username');
    if (mockUser && scholarEmails.includes(mockUser.toLowerCase())) {
      return 'Scholar';
    }
    const storedTier = localStorage.getItem('ascent_user_tier');
    if (storedTier === 'Admin') return 'Admin';
    if (storedTier === 'Scholar') return 'Scholar';
  }

  if (!supabase) return 'Initiate';
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 'Initiate';

  if (user.email && scholarEmails.includes(user.email.toLowerCase())) {
    return 'Scholar';
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('tier')
    .eq('id', user.id)
    .single();

  if (error || !data) {
    return 'Initiate';
  }
  return data.tier as 'Initiate' | 'Scholar' | 'Admin';
};

// ── LOG STUDY TIME ──

export const logStudyTime = async (minutes: number): Promise<void> => {
  if (!supabase) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Increment total_study_minutes in profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('total_study_minutes')
    .eq('id', user.id)
    .single();

  const currentMinutes = profile?.total_study_minutes || 0;
  await supabase
    .from('profiles')
    .update({ total_study_minutes: currentMinutes + minutes })
    .eq('id', user.id);
};
