-- 유치원 상세 정보 캐싱을 위한 컬럼 추가
-- 이 마이그레이션은 유치원 알리미 API 응답을 DB에 캐싱하여
-- 재검색 시 즉시 응답이 가능하도록 합니다.

-- 상세 정보 컬럼 추가
ALTER TABLE kindergartens
  ADD COLUMN IF NOT EXISTS type VARCHAR(20),                    -- 기관 유형 (유치원/어린이집)
  ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 0,          -- 정원
  ADD COLUMN IF NOT EXISTS has_bus BOOLEAN DEFAULT false,       -- 통학차량 유무
  ADD COLUMN IF NOT EXISTS bus_count INTEGER DEFAULT 0,         -- 통학차량 대수
  ADD COLUMN IF NOT EXISTS meal_type VARCHAR(20),               -- 급식 유형
  ADD COLUMN IF NOT EXISTS has_after_school BOOLEAN DEFAULT false, -- 방과후 과정 유무
  ADD COLUMN IF NOT EXISTS area_per_child DECIMAL(5,2) DEFAULT 0,  -- 1인당 면적
  ADD COLUMN IF NOT EXISTS phone VARCHAR(20),                   -- 전화번호
  ADD COLUMN IF NOT EXISTS has_playground BOOLEAN DEFAULT false,-- 놀이터 유무
  ADD COLUMN IF NOT EXISTS detail_cached_at TIMESTAMP WITH TIME ZONE; -- 상세 정보 캐싱 시점

-- 캐싱 여부 확인을 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_kindergartens_detail_cached
  ON kindergartens(sigungu_code, detail_cached_at);

-- 코멘트 추가 (문서화)
COMMENT ON COLUMN kindergartens.type IS '기관 유형: kindergarten(유치원) 또는 daycare(어린이집)';
COMMENT ON COLUMN kindergartens.capacity IS '정원 (최대 수용 가능 원아 수)';
COMMENT ON COLUMN kindergartens.has_bus IS '통학차량 운영 여부';
COMMENT ON COLUMN kindergartens.bus_count IS '통학차량 대수';
COMMENT ON COLUMN kindergartens.meal_type IS '급식 유형 (자체조리, 외부배달 등)';
COMMENT ON COLUMN kindergartens.has_after_school IS '방과후 과정 운영 여부';
COMMENT ON COLUMN kindergartens.area_per_child IS '1인당 교실 면적 (제곱미터)';
COMMENT ON COLUMN kindergartens.phone IS '연락처';
COMMENT ON COLUMN kindergartens.has_playground IS '놀이터 유무';
COMMENT ON COLUMN kindergartens.detail_cached_at IS '상세 정보 캐싱 시점 (NULL이면 캐싱 안됨)';
