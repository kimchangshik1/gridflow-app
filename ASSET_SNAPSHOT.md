GridFlow 자산 스냅샷

기준
- 작성 기준: 2026-04-20 UTC
- 기준 자료: 저장소 구조, `GRIDFLOW_RELEASE_EVIDENCE.txt`, `GRIDFLOW_RELEASE_QUALITY_GATES.txt`, `D_OPERATIONS_RUNBOOK.txt`, 관련 코드 파일
- 문서 간 충돌 가능 항목은 추가 확인 필요로 둔다.

1. 구조 자산

백엔드 app 구조 요약
- 확정: `app/main.py` 기준 FastAPI 앱이 `/api`, `/bapi`, `/config`, `/auth`, `/grid`, `/dca`, `/backtest`, `/rebalancing` 라우터를 묶는다.
- 확정: `app/strategy/`에 `grid_engine.py`, `dca_engine.py`, `rebalancing_engine.py`, 주문 게이트웨이, 거래소 reconciler가 있다.
- 확정: `app/db/`에 DB 연결과 모델이 있고, `planned_orders`, `positions`, `bot_configs` 등 핵심 테이블 모델이 정의돼 있다.
- 확정: `app/monitor/product_app.py`는 별도 FastAPI 앱으로 `/monitor` 경로를 제공한다.

프론트 구조 요약
- 확정: 메인 UI는 `static/index.html` 단일 엔트리와 `static/js/*.js`, `static/css/main.css`, `static/gridflow_patch.css` 조합이다.
- 확정: monitor UI는 `static/monitor.html`, `monitor_login.html`, `monitor_setup.html`로 분리돼 있다.
- 추정: 메인 프론트는 단일 HTML 안에서 홈/거래소/전략/포트폴리오/시뮬레이션/설정 탭을 동작시키는 구조다.

ops / backup / restore / alert 존재
- 확정: `ops/gridflow_pg_backup.sh`, `ops/gridflow_pg_restore_verify.sh`, `ops/gridflow_health_alert.sh`가 존재한다.
- 확정: 관련 systemd unit/timer 파일과 `ops/gridflow.logrotate`가 저장소에 있다.
- 확정: `GRIDFLOW_RELEASE_EVIDENCE.txt`에 백업 성공, 복구 검증 성공, health alert 검증 근거가 기록돼 있다.

서비스 구조
- 확정: 현재 운영 필수 서비스 기준은 `gridflow-app.service`, `orderlens-ops.service`, `upbit-bot.service`, `nginx.service`, `postgresql@16-main.service`다.
- 확정: `gridflow-app`은 `app.main:app` 8000, `orderlens-ops`는 `app.monitor.product_app:app` 8010, `upbit-bot`은 `app.bot` 실행 구조다.
- 확정: `upbit-web.service`는 현재 운영 필수 경로가 아니라고 문서에 명시돼 있다.

2. 운영 자산

사이트 정상 작동 / 서비스·보안 현황 파악 상태
- 확정: `GRIDFLOW_RELEASE_EVIDENCE.txt`에 HTTPS `/` 200, HTTPS `/monitor` 로그인 리다이렉트 302, 필수 서비스 active 근거가 있다.
- 확정: 백업, 복구 검증, logrotate, health alert 점검 근거는 확보돼 있다.
- 미확정: 브라우저 기준 인증서 경고 없음 여부, 80→443 리다이렉트, 외부 노출 포트 최소화는 문서상 미확정이다.
- 추정: 기본 운영 장치는 buyer 설명용 최소 수준까지는 정리돼 있으나, 보안 최종 판정은 아직 닫히지 않았다.

auth 저장 방식
- 확정: 사용자 API 키는 `bot_configs`에 저장되고 `app/core/crypto.py`의 Fernet 키 파일 `.upbit_bot_key`로 암호화/복호화한다.
- 확정: 일반 사용자 세션은 DB `user_sessions` 기반이다.
- 확정: monitor 세션은 `app/monitor/auth.py`의 메모리 `_sessions` 딕셔너리 기반이다.
- 추정: 메인 앱과 monitor의 세션 저장 방식이 이원화돼 있어 buyer 실사 관점에서는 설명 보강이 필요하다.
- 미확정: 이 구조가 이번 릴리스의 딜브레이커인 “auth 저장 방식 문제”를 해소한 상태인지 여부는 추가 확인 필요다.

positions 설계 이슈
- 확정: `app/db/models.py`의 `positions` 테이블은 `symbol` 단일 unique 기준이며 `user_id`, `exchange` 컬럼이 없다.
- 확정: 실제 `/api/positions` 응답은 테이블보다 거래소 잔고 조회 결과를 직접 조합하는 경로가 중심이다.
- 추정: 멀티유저/멀티거래소 기준 장기 source of truth로는 `positions` 모델이 부족할 가능성이 높다.
- 미확정: 현재 운영에서 `positions` 테이블이 실질적으로 얼마나 쓰이는지, buyer-facing 설계 결함으로 판정할 수준인지는 추가 확인 필요다.

rebalancing trigger 조건 파악 상태
- 확정: `app/strategy/rebalancing_engine.py` 기준 trigger는 `INTERVAL`, `THRESHOLD`, `BOTH` 세 가지다.
- 확정: `INTERVAL`은 마지막 실행 후 경과 시간, `THRESHOLD`는 자산 비중 편차, `BOTH`는 둘 중 하나 충족 시 실행이다.
- 확정: `app/api/rebalancing_routes.py`에 같은 trigger enum과 수동 `rebalance-now` 경로가 있다.
- 미확정: 실제 운영 데이터에서 각 trigger가 검증된 범위와 buyer 데모 수준의 재현 증거는 별도 확인이 더 필요하다.

3. 증거 자산

수동주문 증거 요약
- 확정: `app/api/routes.py`와 거래소 reconciler/order gateway에 수동주문 경로와 `manual_order` 활동 로그 기록 코드가 있다.
- 확정: `static/index.html` 거래 화면에 주문 폼과 주문 전 요약 박스 구조가 있다.
- 미확정: 실제 최근 운영 로그나 캡처 기준의 buyer 제출용 수동주문 실행 증거 패키지는 이 문서 작성 범위에서 확정하지 못했다.

Grid 증거 요약
- 확정: `app/strategy/grid_engine.py`, `app/api/grid_routes.py`에 생성/조회/일시정지/재개/중지/수정 경로가 구현돼 있다.
- 확정: 홈 화면 스크립트가 `/grid/strategies`를 집계 대상으로 사용한다.
- 미확정: 최소 1회 정상 실행의 buyer 제출용 자동 검증 결과는 현재 확인 자료만으로 확정하지 못했다.

DCA 증거 요약
- 확정: `app/strategy/dca_engine.py`, `app/api/dca_routes.py`가 존재하고 전략/주문 테이블을 다룬다.
- 확정: 홈 화면 스크립트가 `/dca/strategies`를 집계 대상으로 사용한다.
- 미확정: 실제 실행 성공 로그 또는 buyer용 증거 묶음은 현재 확인 자료에서 확정하지 못했다.

Rebalancing 증거 요약
- 확정: `app/strategy/rebalancing_engine.py`, `app/api/rebalancing_routes.py`가 존재하며 전략 생성/조회/상태 변경/즉시 실행 경로가 있다.
- 확정: trigger 로직은 코드 기준으로 파악했다.
- 미확정: 실제 운영 검증 또는 buyer용 실행 증거는 현재 확인 자료에서 확정하지 못했다.

monitor 증거 요약
- 확정: `app.monitor.product_app`와 `static/monitor*.html` 조합의 별도 monitor 앱이 있다.
- 확정: `GRIDFLOW_RELEASE_EVIDENCE.txt`에 HTTPS `/monitor` 리다이렉트 근거와 `orderlens-ops.service` active 근거가 있다.
- 확정: `MONITOR_RUN_GUIDE.txt`, `MONITOR_DELIVERY_CHECKLIST.txt`가 존재한다.
- 추정: monitor는 buyer-facing 부속 운영 화면으로 설명 가능한 수준의 구조와 문서를 이미 일부 갖췄다.

4. 현재 판단

buyer에게 바로 설명 가능한 자산
- 확정: 설치형 납품 범위 문서
- 확정: 운영 런북, 설치 체크리스트, monitor 가이드
- 확정: 백업/복구/alert/logrotate 실증 기록
- 확정: 메인 앱과 monitor 앱의 분리된 서비스 구조

추가 확인 필요 자산
- 미확정: auth 저장 방식 딜브레이커 해소 여부
- 미확정: 새 서버 재현 완료 증거
- 미확정: 수동주문 / Grid / DCA / Rebalancing의 buyer 제출용 자동 검증 패키지
- 미확정: `positions` 설계 이슈의 실제 영향도
- 미확정: 외부 포트 최소화와 브라우저 보안 체감 검증
