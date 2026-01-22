#!/bin/bash
#
# TestFlight 자동 배포 스크립트
#
# 사용법:
#   ./scripts/deploy-testflight.sh           # 전체 배포 (빌드 + 업로드)
#   ./scripts/deploy-testflight.sh --build   # 빌드만 (업로드 없이)
#   ./scripts/deploy-testflight.sh --skip-web # 웹 빌드 스킵 (Capacitor sync만)
#
# 필요한 환경 변수 (.env.local 또는 export):
#   APPLE_ID          - Apple ID 이메일
#   TEAM_ID           - Apple Developer Team ID
#   ITC_TEAM_ID       - App Store Connect Team ID
#
# 또는 API Key 방식 (권장):
#   APP_STORE_CONNECT_API_KEY_ID
#   APP_STORE_CONNECT_API_ISSUER_ID
#   APP_STORE_CONNECT_API_KEY_CONTENT (base64 인코딩)
#

set -e  # 에러 발생 시 중단

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 로그 함수
log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

# 프로젝트 루트로 이동
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

# 옵션 파싱
BUILD_ONLY=false
SKIP_WEB=false
USE_API_KEY=false

for arg in "$@"; do
  case $arg in
    --build)
      BUILD_ONLY=true
      ;;
    --skip-web)
      SKIP_WEB=true
      ;;
    --api-key)
      USE_API_KEY=true
      ;;
    --help|-h)
      echo "TestFlight 자동 배포 스크립트"
      echo ""
      echo "사용법:"
      echo "  ./scripts/deploy-testflight.sh [옵션]"
      echo ""
      echo "옵션:"
      echo "  --build      빌드만 수행 (TestFlight 업로드 안 함)"
      echo "  --skip-web   웹 빌드 스킵 (Capacitor sync만)"
      echo "  --api-key    App Store Connect API Key 사용"
      echo "  --help, -h   이 도움말 표시"
      exit 0
      ;;
  esac
done

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  🚀 TestFlight 배포 시작"
echo "═══════════════════════════════════════════════════════"
echo ""

# 1. 환경 확인
log_info "환경 확인 중..."

# Xcode 설치 확인
if ! command -v xcodebuild &> /dev/null; then
  log_error "Xcode가 설치되어 있지 않습니다."
  exit 1
fi

# Fastlane 설치 확인
if ! command -v fastlane &> /dev/null; then
  log_warning "Fastlane이 설치되어 있지 않습니다. 설치 중..."
  if command -v brew &> /dev/null; then
    brew install fastlane
  else
    log_error "Homebrew가 필요합니다. https://brew.sh 에서 설치하세요."
    exit 1
  fi
fi

log_success "환경 확인 완료"

# 2. 웹 빌드
if [ "$SKIP_WEB" = false ]; then
  echo ""
  log_info "Next.js 빌드 중..."
  pnpm build
  log_success "웹 빌드 완료"
fi

# 3. Capacitor 동기화
echo ""
log_info "Capacitor iOS 동기화 중..."
npx cap sync ios
log_success "Capacitor 동기화 완료"

# 4. iOS 빌드 및 배포
echo ""
cd ios/App

if [ "$BUILD_ONLY" = true ]; then
  log_info "iOS 빌드 중 (업로드 없이)..."
  fastlane build_only
  log_success "iOS 빌드 완료: ios/App/build/App.ipa"
else
  if [ "$USE_API_KEY" = true ]; then
    log_info "TestFlight 배포 중 (API Key 방식)..."
    fastlane beta_with_api_key
  else
    log_info "TestFlight 배포 중..."
    fastlane beta
  fi
  log_success "TestFlight 업로드 완료!"
fi

cd "$PROJECT_ROOT"

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  ✅ 배포 완료!"
echo "═══════════════════════════════════════════════════════"
echo ""

if [ "$BUILD_ONLY" = false ]; then
  echo "📱 App Store Connect에서 빌드 처리 상태를 확인하세요:"
  echo "   https://appstoreconnect.apple.com"
  echo ""
fi
