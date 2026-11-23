# 자카르 — 범용 성경 암송 웹앱

브라우저에서 동작하는 무료·무서버 성경 암송 앱입니다. 외부 API나 패키지 설치 없이 GitHub Pages에서 사용 가능합니다.

## 기능
- 구절 추가/수정/삭제
- 본문 읽기 → 두 단계 빈칸 연습 → 짧은 구절 암송 → 장절만 보고 한 절 암송
- 소리 내어 암송 후 원문과 대조하거나, 직접 입력 후 자동 채점
- 틀린 단어를 다음 문제에 더 자주 출제
- 브라우저에 학습 기록 자동 저장
- JSON 백업 및 복원
- PWA 홈 화면 설치 및 캐시된 오프라인 실행

## GitHub Pages 배포
1. GitHub에서 **public** 저장소를 만듭니다. (예: `zakhar`)
2. 이 폴더 안의 파일을 저장소 최상위 경로에 업로드합니다. (`index.html`이 루트에 있어야 합니다.)
3. 저장소의 **Settings → Pages → Build and deployment → Source: Deploy from a branch** 선택
4. **Branch: main / (root)** 선택 후 Save
5. 배포 완료 후 `https://사용자명.github.io/zakhar/` 접속

`/` 상대 경로를 사용하지 않아 저장소 하위 경로에서도 실행됩니다.

## 로컬 실행
`python -m http.server 8000` 후 `http://localhost:8000` 접속. 파일을 직접 더블클릭해도 핵심 기능은 동작하지만 PWA는 HTTP(S)/localhost에서만 등록됩니다.

## 데이터 및 유의사항
- 브라우저 `localStorage`에 저장되며 GitHub에 전송되지 않습니다.
- 기기 간 자동 동기화는 없습니다. 설정의 JSON 백업을 활용하세요.
- 개인이 입력한 본문은 브라우저에만 저장됩니다. 포함된 초기 2개 구절은 사용자가 제공한 텍스트입니다.
- 한 절을 힌트 없이 암송했다고 확인하면 다음 날 복습이 말씀 목록에 표시됩니다.

## 개역개정 본문 조회 설정

GitHub Pages는 정적 앱을 제공하고, 본문 조회는 `api/logos-worker.mjs`를 배포한 Cloudflare Worker가 중계합니다.

1. 개역개정 본문을 이 앱에서 조회·표시하고 암송용으로 저장하는 이용 범위를 확인합니다.
2. Cloudflare Workers에서 GitHub의 `raylucid/zakhar` 저장소를 가져옵니다. Worker 이름은 `zakhar-logos`, 브랜치는 `main`, 루트 디렉터리는 저장소 루트를 사용합니다.
3. Worker 설정의 **Variables and Secrets**에서 `LOGOS_API_KEY`를 **Secret**으로 추가하고 배포합니다.
4. `index.html`의 `logos-lookup-endpoint`에 배포된 HTTPS Worker의 `/verse` 주소를 넣습니다.

연결이 설정되면 새 말씀 추가 화면에서 장절을 조회하고, 가져온 본문을 확인한 뒤 저장할 수 있습니다.
