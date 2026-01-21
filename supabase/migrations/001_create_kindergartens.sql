-- 유치원/어린이집 지오코딩 결과 저장 테이블
CREATE TABLE IF NOT EXISTS kindergartens (
  id SERIAL PRIMARY KEY,
  kindercode VARCHAR(20) UNIQUE NOT NULL,  -- 유치원 알리미 고유 코드
  name VARCHAR(100) NOT NULL,
  address VARCHAR(200) NOT NULL,
  lat DECIMAL(10, 7) NOT NULL,
  lng DECIMAL(10, 7) NOT NULL,
  sido_code VARCHAR(10),                    -- 시도 코드
  sigungu_code VARCHAR(10),                 -- 시군구 코드
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_kindergartens_sigungu ON kindergartens(sigungu_code);
CREATE INDEX IF NOT EXISTS idx_kindergartens_location ON kindergartens(lat, lng);
CREATE INDEX IF NOT EXISTS idx_kindergartens_kindercode ON kindergartens(kindercode);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_kindergartens_updated_at
  BEFORE UPDATE ON kindergartens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) 활성화
ALTER TABLE kindergartens ENABLE ROW LEVEL SECURITY;

-- 읽기 정책: 모든 사용자가 읽기 가능
CREATE POLICY "Allow public read access" ON kindergartens
  FOR SELECT USING (true);

-- 쓰기 정책: 서비스 역할만 쓰기 가능 (anon key로는 쓰기 불가)
CREATE POLICY "Allow service role write access" ON kindergartens
  FOR ALL USING (auth.role() = 'service_role');
