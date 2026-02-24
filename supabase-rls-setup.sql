-- ========================================================
-- ASCENT LEARNING: COMPLETE SUPABASE DATABASE SETUP
-- ========================================================
-- Run this ENTIRE script in Supabase SQL Editor (one time)

-- ── TABLES ──

-- User profiles with stats tracking
CREATE TABLE IF NOT EXISTS profiles (
  id uuid REFERENCES auth.users PRIMARY KEY,
  tier text DEFAULT 'Initiate',
  display_name text,
  streak_count int DEFAULT 0,
  last_active date DEFAULT CURRENT_DATE,
  total_study_minutes int DEFAULT 0,
  quiz_scores jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);

-- Resources (summaries, uploaded content)
CREATE TABLE IF NOT EXISTS resources (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  title text NOT NULL,
  type text NOT NULL,
  original_content text,
  summary text,
  tags text[] DEFAULT '{}',
  status text DEFAULT 'processing',
  created_at timestamptz DEFAULT now(),
  last_accessed timestamptz DEFAULT now()
);

-- Flashcards linked to resources
CREATE TABLE IF NOT EXISTS flashcards (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_id uuid REFERENCES resources ON DELETE CASCADE,
  front text NOT NULL,
  back text NOT NULL,
  status text DEFAULT 'new'
);

-- Quiz questions linked to resources
CREATE TABLE IF NOT EXISTS quizzes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_id uuid REFERENCES resources ON DELETE CASCADE,
  question text NOT NULL,
  options jsonb NOT NULL,
  correct_answer int NOT NULL,
  explanation text,
  passage text
);

-- Study progress tracking
CREATE TABLE IF NOT EXISTS study_progress (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  activity_type text NOT NULL,
  subject text,
  score numeric,
  total_questions int,
  duration_seconds int,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- ── AUTO-CREATE PROFILE ON SIGNUP ──

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, tier, display_name)
  VALUES (NEW.id, 'Initiate', COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── ROW LEVEL SECURITY ──

ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_progress ENABLE ROW LEVEL SECURITY;

-- Resources policies
CREATE POLICY "Users can view their own resources" 
ON resources FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own resources" 
ON resources FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own resources" 
ON resources FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own resources" 
ON resources FOR DELETE USING (auth.uid() = user_id);

-- Flashcards policies (via parent resource ownership)
CREATE POLICY "Users can view own flashcards" 
ON flashcards FOR SELECT
USING (EXISTS (
  SELECT 1 FROM resources 
  WHERE resources.id = flashcards.resource_id 
  AND resources.user_id = auth.uid()
));

CREATE POLICY "Users can insert own flashcards" 
ON flashcards FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM resources 
  WHERE resources.id = flashcards.resource_id 
  AND resources.user_id = auth.uid()
));

-- Quizzes policies (via parent resource ownership)
CREATE POLICY "Users can view own quizzes" 
ON quizzes FOR SELECT
USING (EXISTS (
  SELECT 1 FROM resources 
  WHERE resources.id = quizzes.resource_id 
  AND resources.user_id = auth.uid()
));

CREATE POLICY "Users can insert own quizzes" 
ON quizzes FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM resources 
  WHERE resources.id = quizzes.resource_id 
  AND resources.user_id = auth.uid()
));

-- Profiles policies
CREATE POLICY "Users can view own profile" 
ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users cannot update own tier" 
ON profiles FOR UPDATE USING (auth.uid() = id);

-- Study progress policies
CREATE POLICY "Users can view own progress"
ON study_progress FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
ON study_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
