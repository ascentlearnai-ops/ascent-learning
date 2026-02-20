
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
    explanation: q.explanation
  })) || []
});

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
  // 1. Insert Resource
  const userResponse = await supabase.auth.getUser();
  const { data: resData, error: resError } = await supabase
    .from('resources')
    .insert({
      user_id: userResponse.data.user?.id, // Requires Auth
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
    throw new Error('Failed to save resource to database');
  }

  const resourceId = resData.id;

  // 2. Insert Flashcards
  if (resource.flashcards.length > 0) {
    const flashcardsPayload = resource.flashcards.map(f => ({
      resource_id: resourceId,
      front: f.front,
      back: f.back,
      status: 'new'
    }));
    await supabase.from('flashcards').insert(flashcardsPayload);
  }

  // 3. Insert Quiz
  if (resource.quiz.length > 0) {
    const quizPayload = resource.quiz.map(q => ({
      resource_id: resourceId,
      question: q.question,
      options: q.options,
      correct_answer: q.correctAnswer,
      explanation: q.explanation
    }));
    await supabase.from('quizzes').insert(quizPayload);
  }
};

export const getUserStats = async (): Promise<UserStats> => {
  // In a real app, this would query a 'profiles' table
  return {
    streak: 1,
    cardsLearned: 0,
    quizScoreAvg: 100,
    hoursLearned: 0
  };
};
