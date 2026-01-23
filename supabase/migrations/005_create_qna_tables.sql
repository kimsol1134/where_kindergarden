-- Q&A 커뮤니티 테이블 생성

-- 사용자 프로필 (닉네임 저장용)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_nickname UNIQUE (nickname)
);

-- 질문 테이블
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kindergarten_id VARCHAR(20) NOT NULL,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_nickname VARCHAR(20) NOT NULL,
  category VARCHAR(20) NOT NULL CHECK (category IN ('meal', 'teacher', 'facility', 'bus', 'program', 'safety', 'cost', 'other')),
  title VARCHAR(100) NOT NULL,
  content TEXT,
  answer_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_hidden BOOLEAN DEFAULT FALSE
);

-- 답변 테이블
CREATE TABLE IF NOT EXISTS answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_nickname VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  relation VARCHAR(30) DEFAULT 'other' CHECK (relation IN ('current_parent', 'graduated_parent', 'prospective', 'other')),
  upvote_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_hidden BOOLEAN DEFAULT FALSE
);

-- 답변 좋아요
CREATE TABLE IF NOT EXISTS answer_upvotes (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  answer_id UUID NOT NULL REFERENCES answers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, answer_id)
);

-- 인덱스
CREATE INDEX idx_questions_kg ON questions(kindergarten_id, created_at DESC) WHERE NOT is_hidden;
CREATE INDEX idx_answers_q ON answers(question_id, created_at ASC) WHERE NOT is_hidden;
CREATE INDEX idx_questions_author ON questions(author_id);
CREATE INDEX idx_answers_author ON answers(author_id);

-- RLS 활성화
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE answer_upvotes ENABLE ROW LEVEL SECURITY;

-- user_profiles RLS
CREATE POLICY "user_profiles_read" ON user_profiles
  FOR SELECT USING (true);

CREATE POLICY "user_profiles_insert" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "user_profiles_update" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- questions RLS
CREATE POLICY "questions_read" ON questions
  FOR SELECT USING (NOT is_hidden);

CREATE POLICY "questions_insert" ON questions
  FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "questions_update" ON questions
  FOR UPDATE USING (auth.uid() = author_id AND NOT is_hidden);

CREATE POLICY "questions_delete" ON questions
  FOR DELETE USING (auth.uid() = author_id);

-- answers RLS
CREATE POLICY "answers_read" ON answers
  FOR SELECT USING (NOT is_hidden);

CREATE POLICY "answers_insert" ON answers
  FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "answers_update" ON answers
  FOR UPDATE USING (auth.uid() = author_id AND NOT is_hidden);

CREATE POLICY "answers_delete" ON answers
  FOR DELETE USING (auth.uid() = author_id);

-- answer_upvotes RLS
CREATE POLICY "upvotes_read" ON answer_upvotes
  FOR SELECT USING (true);

CREATE POLICY "upvotes_insert" ON answer_upvotes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "upvotes_delete" ON answer_upvotes
  FOR DELETE USING (auth.uid() = user_id);

-- answer_count 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_answer_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE questions SET answer_count = answer_count + 1 WHERE id = NEW.question_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE questions SET answer_count = answer_count - 1 WHERE id = OLD.question_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_answer_count
  AFTER INSERT OR DELETE ON answers
  FOR EACH ROW EXECUTE FUNCTION update_answer_count();

-- upvote_count 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_upvote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE answers SET upvote_count = upvote_count + 1 WHERE id = NEW.answer_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE answers SET upvote_count = upvote_count - 1 WHERE id = OLD.answer_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_upvote_count
  AFTER INSERT OR DELETE ON answer_upvotes
  FOR EACH ROW EXECUTE FUNCTION update_upvote_count();
