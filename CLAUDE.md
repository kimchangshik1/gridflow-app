# GridFlow — Claude Code 작업 지시서
# 이 파일을 /home/ubuntu/upbit_bot/CLAUDE.md 에 저장할 것

---

## 프로젝트 개요

- **제품명**: GridFlow
- **정체성**: Upbit / Bithumb 트레이딩 전략 시뮬레이션 + 운영 컨트롤 타워
- **핵심 파일**: `index_v31_base.html` (현재 약 9,273줄)
- **작업 언어**: 한국어 UI, 코드 주석은 한국어 가능

---

## 작업 원칙 (반드시 준수)

1. **전체 파일 재출력 금지** — 변경이 필요한 부분만 수정할 것
2. **설명 최소화** — 코드 변경 전후 요약만 1~2줄로, 긴 해설 불필요
3. **한 번에 하나의 섹션** — 작업 단위를 작게 나눠서 진행할 것
4. **수정 전 반드시 해당 코드 구간 확인** — 추측으로 수정 금지
5. **완료 후 스스로 검수** — 색상/구조/금지사항 기준으로 체크 후 보고

---

## 색상 시스템 (스펙 기준 — 이걸 쓸 것)

```css
--bg-base: #0A0B0D;                          /* 전체 배경 */
--card-bg: rgba(20, 22, 25, 0.6);            /* 카드 배경 */
--card-blur: blur(12px);                     /* backdrop-filter */
--card-border: 1px solid rgba(255,255,255,0.05); /* 카드 테두리 */

--color-normal: #10B981;    /* 정상 / 실행중 */
--color-warning: #F59E0B;   /* 경고 / 일시정지 / 주요 액션 */
--color-error: #EF4444;     /* 오류 / 실패 / 정지 */
--color-info: #3B82F6;      /* 정보 / 연결 */
--color-inactive: #4B5563;  /* 비활성 */
```

**현재 v31과의 차이점**:
- 기존 `--bg: #0d1117` → `#0A0B0D` 로 교체
- 기존 노란 탑바 (`#ca8a04`) → 스펙 탑바 스타일로 교체
- 기존 `--accent: #f5c842` 계열 → 위 상태 색상 체계로 전환

---

## 타이포그래피

| 용도 | 크기 | 굵기 |
|------|------|------|
| 최상위 숫자 (총 자산 등) | 24px | Bold |
| 핵심 숫자 | 20px | Bold |
| 보조 값 | 14~16px | Normal |
| 설명/레이블 | 12px | Normal, Gray |

---

## 홈 화면 레이아웃 (컨트롤 타워 구조)

현재 v31은 거래소 주문 UI 중심 → 아래 구조로 홈 패널을 개편해야 함

### 1. TOP BAR
- 좌: GridFlow 로고 | BETA 뱃지 | 네비 (홈/거래소/전략/포트폴리오/시뮬레이션/설정)
- 우: 총 자산 | 실행중 전략 수 | 오류/경고 수 | 유저 메뉴 | 햄버거
- 맨 우측 분리: **글로벌 긴급정지 버튼** (빨간 테두리, 눈에 띄게)
- ❌ "가용 잔고"는 탑바에 넣지 말 것

### 2. GLOBAL STATUS BANNER (탑바 바로 아래)
- 한 줄짜리 시스템 상태 배너 (필수)
- 형식: `[상태 라벨] + 한 줄 요약 문장 + "자세히 보기" 링크`
- 상태 예시: 정상 운영 중 / API 응답 지연 감지 / 긴급정지 활성화

### 3. ROW 1 — 오늘 현황 요약 (4등분 카드, min-height 136px)
| 카드 | 핵심값 | 보조값 |
|------|--------|--------|
| 자산 요약 | 총 자산 | 미실현 손익, 수익률%, 가용 잔고 |
| 전략 현황 | 실행중 전략 수 | 일시정지 수, 대기 수, 마지막 상태 변경 |
| 거래소 상태 | 전체 상태 뱃지 | 업비트 상태, 빗썸 상태, 마지막 동기화 |
| 오늘의 이슈 | 오늘 오류 수 | 실패 주문 수, 최신 경고 한 줄, 상세 링크 |

- 오늘의 이슈 카드: **실제 오류가 있을 때만** red glow 적용

### 4. ROW 2 — 메인 컨트롤 영역 (좌 70% / 우 30%)

**좌측: 실행중 전략 리스트**
- 우상단에 퀵 액션 바: 새 그리드 / 새 DCA / 새 리밸런싱
- 컬럼: 전략명 | 거래소 | 심볼 | 상태 뱃지 | 누적 손익 | 마지막 실행 | 액션
- 정렬 우선순위: 오류 > 실행중 > 일시정지 > 대기
- 액션 버튼: **행당 최대 2개** (주요 1개: 일시정지/재개/오류확인 + 상세 1개)
- 빈 상태: "실행중인 전략이 없습니다." + "전략 만들기" 버튼

**우측: 활동/오류/체결 패널**
- 높이는 좌측과 동일하게 맞출 것
- 탭: 활동 / 오류 / 체결
- 형식: 시간 | 대상 | 상태 뱃지 | 한 줄 설명
- 최신순 정렬 / 수동 스크롤만 / **자동 스크롤 절대 금지**

### 5. ROW 3 — 포지션 테이블 (전체 너비)
- 컬럼: 자산 | 거래소 | 연결 전략 | 수익률% | 미실현 손익 | 수량 | 상세
- 정렬: 연결된 전략 포지션 우선 → 손익 영향 큰 순
- ❌ 현재가 / 평균단가는 여기 넣지 말 것 (상세 화면으로)
- 빈 상태: "활성 포지션 없음." + "거래 화면으로 이동" 버튼

### 6. ROW 4 — 상세 요약 (3등분 카드)
- 카드1: 업비트 요약 (KRW 잔고, 자산 평가액, 연결 상태, 마지막 동기화)
- 카드2: 빗썸 요약 (KRW 잔고, 자산 평가액, 연결 상태, 마지막 동기화)
- 카드3: 동적 카드 — 아래 우선순위로 하나만 렌더링
  1. 리밸런싱 현황
  2. 시뮬레이션 결과 요약
  3. 시스템 상태 요약
  - 해당 없으면 빈 상태 메시지 표시

---

## 상태 표현 규칙

- **색상만으로 상태 전달 금지** — 반드시 텍스트 라벨과 함께 사용
- **긴급정지 활성화 시**: 글로벌 배너 + 전략 상태 + 활동 로그 전체에 반영, 숨기면 안 됨
- **Red glow**: `box-shadow: 0 0 12px rgba(239, 68, 68, 0.4)` — 실제 심각한 오류 상태에만, 장식용 절대 금지

---

## 절대 금지 사항

- ❌ 홈 화면에 전략 생성 폼 직접 삽입
- ❌ 대형 업비트/빗썸 히어로 카드
- ❌ 탭 없는 단일 혼합 로그 박스
- ❌ 장식용 비기능 그래프
- ❌ 일반 거래소 랜딩 페이지 스타일
- ❌ 전략 행당 액션 버튼 2개 초과
- ❌ 색상만으로 상태 표현

---

## 작업 순서 (우선순위)

> 토큰 절약을 위해 한 번에 하나씩 진행할 것

**Phase 1 — 색상/CSS 변수 교체** (가장 먼저)
- `:root` 변수를 스펙 색상으로 교체
- 탑바 배경색 교체 (노란색 → 다크)

**Phase 2 — 탑바 + 글로벌 배너 재구성**
- 스펙 탑바 레이아웃 적용
- 글로벌 상태 배너 추가

**Phase 3 — 홈 패널 ROW 1~2 구현**
- 4등분 요약 카드
- 전략 리스트 + 활동 패널

**Phase 4 — 홈 패널 ROW 3~4 구현**
- 포지션 테이블
- 상세 요약 카드

**Phase 5 — 전체 검수 + 버그 수정**
- 빈 상태 처리 확인
- 반응형 확인
- 금지사항 체크

---

## 작업 완료 기준 체크리스트

작업 완료 후 스스로 아래 항목 확인:

- [ ] 배경색 `#0A0B0D` 적용됨
- [ ] 카드 glassmorphism 스타일 적용됨
- [ ] 탑바에 긴급정지 버튼 있음
- [ ] 글로벌 상태 배너 있음
- [ ] ROW 1~4 구조 존재함
- [ ] 전략 행 액션 버튼 2개 이하
- [ ] 모든 상태 색상+텍스트 라벨 병용
- [ ] 빈 상태 메시지+버튼 존재
- [ ] Red glow 장식용 미사용
- [ ] 자동 스크롤 없음

---

## 저장 규칙

- 작업 결과 파일명: `index_v32.html`, `index_v33.html` 순서로 버전 올려서 저장
- 원본 `index_v31_base.html` 절대 덮어쓰기 금지
- 각 버전 완성 후 변경사항 1~3줄 요약 보고
---

## 거래화면 (Exchange/Trading Screen) 작업 지시

> 홈 화면 Phase 1~5 완료 후 이 섹션을 읽고 거래화면 작업 시작할 것.
> 기존 업비트/빗썸 거래 화면을 아래 명세로 전면 개편.

---

### 핵심 정체성

이 화면은 단순한 업비트/빗썸 흉내가 아니다.
**"트레이딩 보조 + 전략 연결 상태 확인 + 주문 실수 방지"** 에 초점을 맞춘 운영 보조 터미널.
"잘 만든 거래소형 화면"이 아니라 **"GridFlow만의 정밀 타격용 트레이딩 무기"** 여야 한다.

---

### 레이아웃 비율 (엄격히 준수)

전체 화면을 좌/중/우 3단으로 나누되: 좌측 16% / 중앙 60% / 우측 24%

---

### 좌측 (16%): 마켓 리스트

- 불필요한 여백 압축, 슬림하게
- 표시 항목: 코인 심볼 | 현재가 | 전일대비 % (텍스트 위주)
- 라벨 12px Gray, 핵심 수치 14~16px White Bold

---

### 중앙 (60%): 차트 + 전략/보유 표

**[상단] 차트 영역**
- 현재 선택된 코인명 옆에 전략 연결 상태 배지 반드시 추가
  - 동작 중: ● Grid-01 동작 중 (색상 #10B981 + 텍스트 라벨)
  - 없음: ○ 수동 매매 (색상 #4B5563 + 텍스트 라벨)
  - 색상만으로 상태 전달 금지 — 반드시 텍스트 라벨 병용

**[하단] 보유 포지션 요약**
- 기존 거대한 카드형 반복 제거
- 상단 얇은 요약 바: 총 보유 수 | 총 평가 금액 | 총 손익
- 아래는 촘촘한 표(Table): 종목 | 수량 | 평균가 | 현재가 | 손익 | 연결된 전략
- 높이 제한 + 스크롤 가능 (중앙 영역 너무 무거워지지 않게)
- Empty state 필수:
  - 문구: "현재 보유 포지션이 없습니다."
  - 버튼: "전략 화면으로 이동" 또는 "거래 계속하기"

---

### 우측 (24%): 스마트 주문 패널

**[상단] 거래소 특화 정보 (GridFlow 차별점)**
- 업비트/빗썸 탭 아래에 해당 거래소 룰을 1줄로 명시
  - 업비트: 수수료 0.05% | 최소 주문 5,500 KRW | ● API 정상
  - 빗썸: 수수료 0.04% | 최소 주문 1,000 KRW | ● API 정상
- API 상태: 색상+텍스트 라벨 병용 필수

**[중단] 주문 폼**
- 가격 / 수량 / 금액 입력 (기존 UI 유지, 패딩 축소)

**[하단] 주문 전 요약 박스 (Pre-trade Summary) ★ 가장 중요**
- 매수/매도 버튼 바로 위, 시각적으로 구분되는 어두운 박스
- 표시 항목 4개 고정:
  1. 예상 주문금액
  2. 예상 수수료
  3. 주문 후 예상 잔고
  4. 최소 주문 충족 여부 (항목으로 명시, 경고만으로 끝내지 말 것)
- 유효성 검사:
  - 최소 주문금액 미달 시: 박스 테두리 Red Glow + 경고 문구
  - Red Glow: box-shadow: 0 0 12px rgba(239, 68, 68, 0.4)
  - 정상 상태에서 Red Glow 절대 사용 금지

---

### 거래화면 완료 전 검수 체크리스트

- [ ] 레이아웃 비율 16% / 60% / 24% 준수
- [ ] 코인명 옆 전략 연결 상태 배지 존재
- [ ] 전략 배지: 색상 + 텍스트 라벨 병용
- [ ] 보유 포지션 영역: 카드형 제거, 표(Table) 구조
- [ ] 포지션 Empty state 문구 + 버튼 존재
- [ ] 거래소 탭 아래 룰 1줄 표시 (수수료/최소주문/API상태)
- [ ] 주문 전 요약 박스 4개 항목 모두 표시
- [ ] 최소 주문 미달 시 Red Glow + 경고 문구
- [ ] 모든 상태 색상+텍스트 라벨 병용
- [ ] 기존 거래 기능 JS 동작 유지 (주문 실행, 잔고 계산 등)

---

### 보강 규칙 (채택 보류 사유 기반)

1. "잘 만든 거래소 화면"이 아니라 GridFlow 운영 보조 터미널임을 항상 염두
2. 차트가 중심 — 좌측 리스트와 우측 패널은 차트를 보조하는 역할
3. 업비트/빗썸 탭이 거의 같은 화면처럼 보이면 안 됨 — 거래소별 특화 정보 반드시 차별화
4. 주문 버튼은 사용자가 안심하고 누를 수 있을 만큼 계산 요약이 선행되어야 함
5. 전략 연결 여부가 거래 화면에서도 항상 보여야 함 — "수동 매매 화면"처럼 보이면 안 됨

---

### 저장 규칙

- 거래화면 작업 결과: 최신 버전 파일에서 거래 화면 섹션만 수정
- 원본 거래 기능 JS 로직 절대 삭제 금지
- 완료 후 변경사항 1~3줄 요약 보고



# GridFlow project operating rules

GridFlow is a Korean trading-assistance, strategy-simulation, and operations-control product.
This is not a broad redesign task.
This is a production-oriented trust / safety / clarity correction workflow.

## Core priority
Top priority is:
1. prevent user mistakes
2. prevent duplicate actions
3. make action execution feedback obvious
4. make system state / freshness / status understandable
5. fix routing / clickability / operational trust issues
6. keep patch scope minimal

Visual polish is lower priority than trust and mistake prevention.

## User context
The user is not a developer.
Do not rely on the user for code interpretation.
Do not make speculative edits that require the user to validate architecture guesses.

## Mandatory work style
- Work on one screen at a time.
- Work on one issue at a time unless multiple issues are in the same exact UI block and same active file and fixing together reduces bug risk.
- Do not make opportunistic improvements.
- Do not redesign unrelated sections.
- Do not touch backup files, failed snapshots, or unused files.
- First identify the actual live file.
- Prefer minimum-file edits.
- If one file is enough, modify one file only.
- Do not guess structure.
- Do not use broad regex replacement over large ranges.
- Do not use broad CSS hiding hacks.
- Do not invent backend state that does not exist.
- If a requested UX fix actually requires backend/API changes, state that explicitly.

## Required workflow for every task
1. Find the actual live file(s).
2. Confirm they are active files, not backups/snapshots.
3. Locate the exact code/UI block for the target issue.
4. Separate confirmed findings from inferred findings.
5. Confirm what will be changed in this run.
6. Confirm what must not be changed.
7. Apply the smallest reasonable patch.
8. Check syntax / parse validity.
9. Check likely side effects.
10. Check whether the patch realistically fits the current project structure.
11. Submit final patch or replacement file.

## Non-negotiable risk checks
Always check for:
- broken routing
- broken click handlers
- duplicate event binding
- overlay click blocking
- pointer-events issues
- z-index issues
- overflow clipping
- disabled button never re-enabled
- layout regressions at 1920x1080
- layout regressions at smaller widths if touched

## Known GridFlow issue map

### Home screen
- Activity log "View All" routes to Strategy tab instead of logs view.
- Main status card "Details" button does not click properly.
- Emergency stop feedback is unclear.
- Top summary cards feel vertically compressed and may clip content.
- Home overall vertical spacing feels cramped.
- Smaller resolutions clip cards more severely.

### Exchange screen
- Right-side order panel requires inefficient scrolling.
- Buy/sell actions lack strong confirmation.
- Repeated clicking can submit multiple real orders.
- Immediate order feedback is too weak.
- Balance/status feedback feels unstable or flickery.

### Strategy screen
- Current structure is not user-friendly enough.
- Needs clearer “what is running / what is connected / current state / next action”.

### Lower priority
- Simulation polish
- Settings polish
- Admin polish
- Guest / sandbox mode planning

## Output structure for each task
Return:
1. confirmed live files
2. why they are active files
3. exact code/UI block found
4. issue handled in this run
5. what is intentionally not changed
6. root cause
7. final patch or file
8. syntax check result
9. likely side effects
10. user verification checklist
