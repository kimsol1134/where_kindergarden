-- 배치 동기화를 위한 컬럼 추가
-- 전국 유치원 데이터를 사전에 수집하여 캐싱하기 위한 메타데이터

-- 배치 동기화 메타데이터 컬럼 추가
ALTER TABLE kindergartens
  ADD COLUMN IF NOT EXISTS batch_synced_at TIMESTAMP WITH TIME ZONE,  -- 배치 동기화 시점
  ADD COLUMN IF NOT EXISTS data_version VARCHAR(20);                   -- 데이터 버전 (예: '2025-1학기')

-- 배치 동기화 상태 확인을 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_kindergartens_batch_synced
  ON kindergartens(batch_synced_at);

-- 코멘트 추가 (문서화)
COMMENT ON COLUMN kindergartens.batch_synced_at IS '배치 동기화 시점 (엑셀 데이터 기준)';
COMMENT ON COLUMN kindergartens.data_version IS '데이터 버전 (예: 2025-1학기)';

-- 데이터 버전 관리 테이블 (선택적)
CREATE TABLE IF NOT EXISTS data_sync_metadata (
  id SERIAL PRIMARY KEY,
  endpoint VARCHAR(50) NOT NULL,           -- API 엔드포인트명 (basicInfo, schoolBus 등)
  data_version VARCHAR(20) NOT NULL,       -- 데이터 버전
  record_count INTEGER DEFAULT 0,          -- 동기화된 레코드 수
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(endpoint, data_version)
);

-- RLS 활성화
ALTER TABLE data_sync_metadata ENABLE ROW LEVEL SECURITY;

-- 읽기 정책: 모든 사용자가 읽기 가능
CREATE POLICY "Allow public read access" ON data_sync_metadata
  FOR SELECT USING (true);

-- 쓰기 정책: 서비스 역할만 쓰기 가능
CREATE POLICY "Allow service role write access" ON data_sync_metadata
  FOR ALL USING (auth.role() = 'service_role');

-- 코멘트
COMMENT ON TABLE data_sync_metadata IS '데이터 동기화 메타데이터 (배치 동기화 이력)';
