-- ========================================================
-- ASCENT LEARNING: SUPABASE ROW LEVEL SECURITY (RLS) SETUP
-- ========================================================
-- Run this script in the Supabase SQL Editor to lock down your tables
-- and fix the critical security vulnerabilities.

-- 1. Enable RLS on all tables
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 2. Create Policies for Resources table
-- Users can only READ their own resources
CREATE POLICY "Users can view their own resources" 
ON resources FOR SELECT 
USING (auth.uid() = user_id);

-- Users can only INSERT their own resources
CREATE POLICY "Users can insert their own resources" 
ON resources FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can only UPDATE their own resources
CREATE POLICY "Users can update their own resources" 
ON resources FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can only DELETE their own resources
CREATE POLICY "Users can delete their own resources" 
ON resources FOR DELETE 
USING (auth.uid() = user_id);

-- 3. Create Policies for Flashcards table
-- Since flashcards don't have a user_id, they rely on the parent resource_id.
-- We join the resources table to check ownership.
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

-- 4. Create Policies for Quizzes table
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

-- 5. Create Policies for Profiles table (where tier is stored)
-- Users can only read their own profile
CREATE POLICY "Users can view own profile" 
ON profiles FOR SELECT 
USING (auth.uid() = id);

-- Only service role or triggers can insert/update profiles
CREATE POLICY "Users cannot update own tier" 
ON profiles FOR UPDATE 
USING (false); -- Prevents users from upgrading themselves

-- Note: Ensure you have a 'profiles' table with:
-- id uuid references auth.users (primary key)
-- tier text default 'Initiate'
