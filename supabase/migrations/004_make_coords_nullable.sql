-- 좌표 필드를 nullable로 변경
-- 유치원 알리미 API는 좌표 정보를 제공하지 않으므로,
-- 배치 동기화 후 별도의 지오코딩 과정을 통해 좌표를 채웁니다.

-- lat, lng 컬럼의 NOT NULL 제약 제거
ALTER TABLE kindergartens
  ALTER COLUMN lat DROP NOT NULL,
  ALTER COLUMN lng DROP NOT NULL;

-- 기본값 설정 (null)
ALTER TABLE kindergartens
  ALTER COLUMN lat SET DEFAULT NULL,
  ALTER COLUMN lng SET DEFAULT NULL;

-- 좌표 존재 여부 확인용 인덱스 (지오코딩 필요한 레코드 빠르게 조회)
CREATE INDEX IF NOT EXISTS idx_kindergartens_needs_geocoding
  ON kindergartens(kindercode)
  WHERE lat IS NULL OR lng IS NULL;

-- 코멘트 업데이트
COMMENT ON COLUMN kindergartens.lat IS '위도 (지오코딩 전 NULL일 수 있음)';
COMMENT ON COLUMN kindergartens.lng IS '경도 (지오코딩 전 NULL일 수 있음)';
