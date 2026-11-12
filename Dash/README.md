# Stats

> Everest MC 서버 통계 대시보드

## Architecture

데이터베이스 계정 (`'46770d6'@'localhost'`)이 로컬 전용이므로 클라이언트는 DB에 직접 접근하지 않고 반드시 Next.js API Route Handler를 통해 질의합니다.

1. **로컬 구동 모드 (기본값)**:
    - `/api/stats` 및 `/api/players/[id]`가 로컬 `127.0.0.1:3306` MariaDB의 `msdwc`, `msdgl` 데이터베이스를 직접 조회하여 반환합니다.
2. **Vercel 클라우드 배포 모드 (`REMOTE_API_URL` 프록시)**:
    - Vercel에 배포할 때는 로컬 서버에서 실행 중인 이 API (예: Cloudflare Tunnel / Tailscale Funnel / 포트포워딩 주소)를 Vercel 환경변수
      `REMOTE_API_URL`에 등록하면, Vercel의 `/api/*` 엔드포인트가 로컬 API로 안전하게 프록시 질의합니다.

## Environment Variables (`stats/.env.local`):

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=46770d6
DB_PASSWORD=7f04916
DB_NAME_WC=msdwc
DB_NAME_GL=msdgl

# Vercel 배포 시 로컬 API 터널 URL (선택)
# REMOTE_API_URL=https://stats-api.your-domain.com
# API_SECRET_KEY=your-secret-key
# REQUIRE_API_KEY=false
```

## Vercel 배포 + 로컬 경량 API 서버 연동 가이드

Vercel에 프론트엔드를 배포할 때 마인크래프트 홈서버에서 무거운 Next.js 전체를 띄울 필요 없이, 내장된 초경량 API 데몬 ([
`server/local-api-server.mjs`](file:///Users/kernelily/Project/Everest/stats/server/local-api-server.mjs), 메모리 약 30MB)만
실행해 연결할 수 있습니다.

### 1단계: 마인크래프트 서버 (로컬)에서 경량 API 데몬 실행

1. `stats/.env.local` 파일 생성:
   ```env
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_USER=46770d6
   DB_PASSWORD=7f04916
   DB_NAME_WC=msdwc
   DB_NAME_GL=msdgl

   API_HOST=127.0.0.1
   API_PORT=4000
   API_SECRET_KEY=나만의_안전한_시크릿_키
   REQUIRE_API_KEY=true
   ```
2. 경량 API 데몬 실행:
   ```bash
   npm run api-server
   # [Everest Local API] Listening on http://127.0.0.1:4000 (API Key protection: ENABLED)
   ```
3. Cloudflare Tunnel (`cloudflared`) 등으로 `http://127.0.0.1:4000`을 외부 HTTPS 도메인 (예: `https://stats-api.yourdomain.com`)으로
   연결합니다.
    - 빠른 테스트 시: `cloudflared tunnel --url http://127.0.0.1:4000`

### 2단계: Vercel 프로젝트 설정

1. Vercel에서 레포지토리를 Import한 뒤 **Root Directory**를 `stats`로 지정합니다.
2. Vercel **Environment Variables**에 아래 두 가지만 등록합니다:
    - `REMOTE_API_URL`: `https://stats-api.yourdomain.com` (1단계의 터널 주소)
    - `API_SECRET_KEY`: `나만의_안전한_시크릿_키` (1단계와 동일한 키)
3. 배포하면 Vercel의 `/api/stats` 및 `/api/players/[id]`가 자동으로 `x-api-key` 헤더를 담아 로컬 API 서버로 안전하게 프록시 질의합니다.

## 로컬 단독 실행 방법 (프론트+백엔드 통합)

```bash
cd stats
npm install
npm run dev
```
