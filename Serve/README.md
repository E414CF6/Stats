# Serve

> 마인크래프트 서버 통계 REST API 플러그인 (Paper/Spigot 1.21+)

Viewer(대시보드)와 Vercel 등 외부 서비스에 마인크래프트 서버의 통계(CMI, mcMMO, GriefPrevention, LuckPerms, 바닐라 통계 및 발전과제)를 안전하게 제공하는 초경량 내장
HTTP REST API 플러그인입니다.

---

## 🌟 주요 기능

1. **내장 경량 HTTP REST API 서버**:
    - JDK 내장 `com.sun.net.httpserver`를 활용하여 별도 무거운 프레임워크나 외부 런타임 종속성 없이 동작
    - 전용 비동기 워커 스레드풀(`ExecutorService`) 기반으로 메인 틱(TPS)에 전혀 영향을 주지 않음
    - CORS 완벽 지원 (`GET`, `OPTIONS` preflight 대응)

2. **RSA-SHA256 디지털 서명 인증 (기본 활성화)**:
    - 2048-bit RSA 키페어를 기반으로 한 강력한 비대칭 암호화 서명 검증
    - 모든 API 요청에 `x-api-signature` 및 `x-api-timestamp` 헤더가 필수적으로 요구됨
    - 타임스탬프 유효 시간(기본 300초 = 5분) 검증으로 재생 공격(Replay Attack) 원천 차단
    - 플러그인 첫 구동 시 `keys/` 폴더에 RSA 키페어가 없을 경우 자동으로 2048-bit 키페어 자동 생성

3. **통합 데이터 소스 수집**:
    - **CMI**: 사용자 프로필, 닉네임, 잔고, 플레이 시간, 랭크, 투표 수, 일별/시간대별 접속 히스토리
    - **mcMMO**: 17개 스킬 레벨/경험치, 파워 레벨, 특화(Specialty) 역할군 및 직업군 계산
    - **GriefPrevention**: 블록 청구(Claims) 영역 목록, 권한자(builders/containers/accessors/managers) 목록, 잔여 블록 계산
    - **LuckPerms**: 기본 권한 그룹 (`primary_group`)
    - **Vanilla Stats & Advancements**: 월드 디렉터리의 플레이어 통계(`stats/{uuid}.json`) 및 발전과제(`advancements/{uuid}.json`) 파싱
    - **실시간 접속 여부**: `Bukkit.getPlayer()`를 통한 실시간 감지 (오프라인 시 CMI 로그인/로그오프 기록으로 판정)

4. **고성능 캐싱 (Cache TTL)**:
    - 빈번한 API 호출로 인한 데이터베이스 부하를 방지하기 위해 인메모리 TTL 캐시 탑재 (기본 10초, 설정 가능)

5. **인게임 관리 명령어**:
    - `/Serve reload`: 서버 재시작 없이 DB 풀, HTTP 서버, 설정 즉시 재적용
    - `/Serve genkey`: 새로운 2048-bit RSA 키페어 재생성 및 즉시 적용
    - `/Serve status`: API 서버 바인드 주소 및 RSA 인증 상태 확인

---

## 🔒 RSA-SHA256 인증 규격

모든 클라이언트(Viewer 대시보드 등)는 요청 시 아래 헤더를 반드시 포함해야 합니다:

| 헤더 이름 | 설명 | 예시 |
| --- | --- | --- |
| `x-api-signature` | `${METHOD}\n${PATH}\n${TIMESTAMP}` 형태의 페이로드를 RSA Private Key로 서명한 Base64 문자열 | `t8L4...kQ==` |
| `x-api-timestamp` | 요청 생성 시점의 Unix 타임스탬프 (밀리초) | `1731372000000` |

### 서명 생성 방식 (Node.js 예시)

```javascript
const timestamp = Date.now().toString();
const payload = `${req.method.toUpperCase()}\n${req.path}\n${timestamp}`;

const signer = crypto.createSign('SHA256');
signer.update(payload);
signer.end();
const signature = signer.sign(privateKeyPem, 'base64');

// HTTP 요청 헤더에 첨부
// headers: {
//   'x-api-signature': signature,
//   'x-api-timestamp': timestamp
// }
```

---

## 📋 API 엔드포인트 사양

| 메서드 | 엔드포인트 | 인증 필수 | 설명 | 응답 형식 |
| --- | --- | --- | --- | --- |
| `GET` | `/health` | X | 서버 헬스체크 | `{"status": "ok", "timestamp": "..."}` |
| `GET` | `/api/stats` | **O** | 전체 서버 개요 및 플레이어 통계 목록 (검색 지원) | `{"overview": {...}, "players": [...]}` |
| `GET` | `/api/stats?q={query}` | **O** | 플레이어 닉네임, 유저네임, UUID 검색 필터링 | `{"overview": {...}, "players": [...]}` |
| `GET` | `/api/players/{id}` | **O** | 특정 플레이어(UUID 또는 유저네임) 상세 통계 | `{"player": {...}, "queriedAt": "...", "sourceMode": "local-mariadb"}` |

---

## ⚙️ 설정 파일 (`config.yml`)

```yaml
# ==============================================================================
# Serve Configuration
# ==============================================================================

http:
  # HTTP 서버 바인드 호스트 (로컬 전용 127.0.0.1 또는 외부 개방 0.0.0.0)
  host: "127.0.0.1"
  # 포트 (기본값: 4000)
  port: 4000
  # 레거시 x-api-key 검증 (선택적)
  require-api-key: false
  api-secret-key: ""

security:
  # RSA-SHA256 디지털 서명 검증 필수화 (기본값: true)
  require-rsa-signature: true
  # 재생 공격 방지를 위한 허용 오차 시간(초) (기본값: 300초 = 5분)
  allowed-clock-skew-seconds: 300
  # 공개키 PEM 경로 (플러그인 폴더 기준 상대경로 또는 절대경로)
  public-key-path: "keys/public_key.pem"
  # 개인키 PEM 경로 (플러그인에서 자동 생성 시 저장될 경로)
  private-key-path: "keys/private_key.pem"

database:
  host: "127.0.0.1"
  port: 3306
  user: "46770d6"
  password: "7f04916"
  database-wc: "msdwc"
  database-gl: "msdgl"
  maximum-pool-size: 10
  minimum-idle: 2
  connection-timeout-ms: 5000

cache:
  # 캐시 유지 시간(초). 0 설정 시 캐시 비활성화
  ttl-seconds: 10

# 사용자 지정 월드 경로 (비워두면 서버 메인 월드 디렉터리 자동 감지)
world-dir: ""
```

---

## 🔑 키페어 생성 및 관리

### 1. 자동 생성 (플러그인 구동 시)

플러그인이 처음 실행될 때 `plugins/Serve/keys/`에 키가 없으면 자동으로 2048-bit RSA 키페어를 생성합니다.

- `plugins/Serve/keys/public_key.pem` (서버 검증용)
- `plugins/Serve/keys/private_key.pem` (Viewer 클라이언트 서명용)

### 2. 스크립트로 직접 생성

```bash
# Serve 스크립트 실행
./Serve/scripts/generate-keys.sh

# 또는 Viewer npm 명령어 실행 (양쪽 폴더에 자동 배치)
cd Viewer && npm run gen-keys
```

### 3. Viewer 연동 방법

생성된 `private_key.pem`의 내용을 `../Dash` 또는 Vercel 환경 변수에 설정합니다:

```env
REMOTE_API_URL=http://127.0.0.1:4000
# 파일 경로로 지정할 경우 (로컬 구동 시 자동 감지)
RSA_PRIVATE_KEY_PATH=keys/private_key.pem
# 또는 Vercel 환경변수에 PEM 문자열 직접 입력 시
# RSA_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

---

## 🔨 빌드 및 설치

### 요구사항

- Java 21 이상
- Maven 3.8+
- Paper / Purpur / Spigot 1.21+

### 빌드 명령어

```bash
cd Serve
mvn clean package
```

빌드가 완료되면 `target/Serve-1.0.0.jar`가 생성되며, 마인크래프트 서버의 `plugins/` 폴더에 복사하여 사용합니다.
