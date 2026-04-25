# GridFlow Due Diligence FAQ

기준
- 작성 기준: 2026-04-21 UTC
- 원칙: 현재 확보 자료 기준으로만 답변
- 상태 반영: `confirmed` / `limited` / `blocked`를 문장 안에 자연스럽게 반영

재사용 source
- `sales/one_pager.md`
- `sales/demo_script.md`
- `sales/evidence_one_pager.md`
- `sales/handoff_scope.md`
- `SUPPORT_SCOPE.md`
- `README.md`
- `DEPLOYMENT.md`
- `ASSET_SNAPSHOT.md`
- `AUTH_MODE_EVIDENCE.md`
- `MANUAL_ORDER_EVIDENCE.md`
- `STRATEGY_EVIDENCE.md`
- `OPERATIONS_EVIDENCE.md`
- `GRIDFLOW_RELEASE_EVIDENCE.txt`

## 제품 범위

### 1. GridFlow는 어떤 제품인가요?

고객 서버 또는 합의된 서버 환경에 설치해 전달하는 설치형 자동매매 및 운영 보조 시스템이다. 현재 문서 기준 메인 웹 앱, 백그라운드 봇, 별도 monitor 화면으로 설명된다.

### 2. SaaS나 운영대행 서비스인가요?

아니다. 현재 문서 기준 기본 거래 범위는 설치, 초기 기동 확인, 운영 문서 handoff까지다. 상시 운영 대행은 기본 범위가 아니다.

### 3. buyer가 받는 기본 결과물은 무엇인가요?

설치 가능한 코드와 프론트 자산, 운영 스크립트, 설치/운영/handoff 문서, 기본 smoke check 기준을 담은 clean delivery tarball이다. 실제 secret 원문과 내부 debug 자료, full history repo는 포함되지 않는다.

## 지원 거래소 / 전략 / 모드

### 4. 지원 거래소는 어디까지인가요?

현재 확인 가능한 범위는 Upbit와 Bithumb 두 곳이다.

### 5. 지원 전략은 어디까지인가요?

수동 주문, Grid, DCA는 buyer-facing 설명이 가능하다. Rebalancing도 범주에는 포함되지만 현재 확보 자료 기준으로는 `limited`이며 live confirmed보다 dry-run confirmed 중심이다.

### 6. 지원 모드는 어떻게 되나요?

`GUEST`, `DRY RUN`, `LIVE` 3가지로 설명된다. 다만 현재 확보 자료 기준 `GUEST`와 `LIVE` 화면 근거는 있고, `DRY RUN` 일반 로그인 배지 캡처는 아직 없다.

### 7. guest와 live는 어떻게 다르나요?

guest는 코드 기준으로 dry-run 강제 세션이며 주문은 sandbox 경로로 분기된다. live는 dry-run이 아닐 때 일반 주문 및 전략 경로를 사용한다.

## 설치 / 배포

### 8. 설치형이라고 할 때 실제 배포 기준은 무엇인가요?

현재 문서 기준 소스 경로는 `/home/ubuntu/upbit_bot`, 가상환경은 `/home/ubuntu/upbit_bot/venv`, 런타임 설정은 `/etc/gridflow`, 서비스는 systemd 기준이다.

### 9. 설치 후 무엇까지 확인하나요?

main app, bot, monitor의 기본 기동, nginx/HTTPS/systemd 기본 구성, backup/restore/alert 같은 운영 장치, app `200`과 monitor 진입 `302` 수준의 smoke check까지가 기준선이다.

### 10. 새 서버 재현이 완전히 닫힌 상태인가요?

현재 확보 자료 기준으로는 `limited`다. 설치 경로와 절차는 문서화돼 있지만, 새 서버 기준 재현 완료를 buyer-facing 증거로 완전히 닫았다고 말할 단계는 아니다.

## 보안 / auth / session

### 11. 인증은 어떤 구조인가요?

메인 앱은 cookie 기반 세션 구조다. 로그인 성공 시 `session` cookie를 설정하고 `/auth/me` 경로로 세션 복원이 설명된다. 상태 변경 요청은 `X-GridFlow-State-Change: 1` header를 요구하고, 브라우저가 `Origin` 또는 `Referer`를 보내는 경우 host mismatch는 거절된다. 다만 이것을 formal CSRF token framework로 설명하면 과장이다.

### 12. API 키는 어떻게 다뤄지나요?

현재 자료 기준 사용자 API 키는 `bot_configs`에 저장되고 `.upbit_bot_key` 기반 암호화/복호화 경로가 있다. 거래소별, 사용자별 조회 경로도 코드 기준으로 확인된다.

### 13. monitor 인증은 메인 앱과 같은가요?

같지 않다. 현재 자료 기준 메인 앱은 DB `user_sessions`, monitor는 메모리 세션 경계로 설명된다. monitor mutation은 same-origin guard를 거치지만, 세션이 in-memory라 재시작 시 무효화되고 단일 인스턴스 전제에 가깝다. 이 이원화 구조는 buyer 실사에서 숨기지 않고 설명해야 하는 `limited` 포인트다.

## 백업 / 복구 / 모니터링

### 14. 운영 보조 체계는 무엇이 있나요?

자동 백업, 임시 DB 기반 restore verify, health alert, 최근 orders/activity/error/filter 중심의 monitor 관측 기능이 있다.

### 15. backup과 restore는 실제 근거가 있나요?

있다. 현재 확보 자료 기준 백업 dump 실파일 존재와 restore verify 성공 로그는 `confirmed`다.

### 16. monitor는 read-only인가요?

주문/활동/오류/필터 관측 범위는 read-only로 설명 가능하다. 다만 monitor 전체 앱에는 login, logout, password change, setup 저장/삭제 같은 mutation route가 있어 완전 read-only라고 단정하면 과장이다.

## 증거 자료 수준

### 17. 수동 주문 증거는 어느 정도까지 있나요?

Upbit/Bithumb manual BUY/SELL 성공 근거는 DB, 활동 로그, 상태 전이 로그 기준으로 `confirmed`다. buyer-facing UI 캡처는 guest sandbox 중심이고, live UI-DB 직접 매핑은 아직 없다.

### 18. 전략 증거는 어느 정도까지 있나요?

Grid는 최신 1사이클 근거 1건, DCA는 사용자 키 라우팅이 걸린 실행 근거 1건이 있다. Rebalancing은 현재 `limited`이며 dry-run confirmed + trigger/code trace 수준이다.

### 19. 왜 전략 화면 캡처가 적나요?

현재 확보 자료 기준 기존 전략 UI를 안전하게 다시 재현할 capture path가 제한적이기 때문이다. 이 부분은 숨기지 않고 `limited` 또는 `blocked`로 설명하는 것이 정확하다.

### 20. demo는 어떤 흐름으로 보는 것이 가장 안전한가요?

현재는 guest/auth 캡처, guest sandbox manual order, 설치형 배포 문서, 운영 evidence 순서가 가장 실패 가능성이 낮다. 실거래 재현보다 확보된 문서와 캡처를 중심으로 보는 것이 정확하다.

## 알려진 제한사항

### 21. 현재 buyer가 알아야 할 핵심 제한은 무엇인가요?

`DRY RUN` 배지 캡처 부재, live manual order UI-DB 직접 매핑 부재, 전략/monitor buyer-facing UI 캡처 부족, Rebalancing live confirmed 부재가 핵심이다.

### 22. positions 모델은 장기 source of truth인가요?

현재 확보 자료 기준으로는 그렇게 단정하지 않는다. `positions`는 구조적으로 약한 모델로 설명되며, 실제 응답은 거래소 잔고 조회 결과를 직접 조합하는 경로가 중심이다.

## 장애 대응

### 23. 장애가 나면 무엇을 먼저 봐야 하나요?

서비스 active 상태, 로그, API 키 상태, 거래소 응답, 백업 상태를 먼저 본다. 발생 시각, 심볼, 오류 문구, 최근 변경 사항을 함께 정리하면 좋다.

### 24. emergency stop 근거가 있나요?

있다. 다만 두 층을 분리해서 설명해야 한다. buyer-facing verified backend control path는 Grid/DCA `pause` / `resume`이고, 별도로 bot runtime에는 전역 신규 주문 차단 기준 stop evidence와 더 이전 시점의 reset evidence가 documented operational safeguard로 존재한다. dedicated backend emergency release endpoint나 full-system one-click recovery backend feature는 현재 not claimed다.

## 지원 범위 / 무상 수정 / 유상 대응

### 25. 기본 지원 범위는 어디까지인가요?

설치, 초기 기동 확인, 운영 문서 handoff까지다. 상시 운영 대행은 기본 범위가 아니다.

### 26. 무상 수정은 어디까지인가요?

전달 문서와 다르게 동작하는 명확한 버그, 설치 누락, 초기 설정 오류, 합의된 기능 범위 안의 재현 가능한 결함까지다.

### 27. 무엇이 유상 대응으로 넘어가나요?

신규 기능, 전략 변경, UI 재작업, 환경 차이 대응 확대, 거래소 API 변경 대응, 심화 장애 분석, buyer가 변경한 코드/설정/서버 복구는 유상 범주다.

## 코드 전달 / 접근 절차 / 비밀유지

### 28. buyer는 전체 repo history까지 받나요?

아니다. 현재 정책 기준 full history repo는 `non-deliverable`이다. buyer 기본 전달물은 clean delivery tarball only다. 이유도 숨기지 않는다. history scan 기준 과거 DB credential literal exposure가 있었으므로 full history 자체를 buyer deliverable처럼 설명하지 않는다.

### 29. 전달 형식은 clean repo인가요 tarball인가요?

현재 기준은 `confirmed`다. buyer 기본 전달 형식은 clean delivery tarball only다. clean/squash repo가 필요하면 별도 diligence artifact로만 다루며, 기본 handoff deliverable로 간주하지 않는다.

### 30. 데모나 문서 열람 전에 NDA가 필요한가요?

실무적으로는 필요할 수 있다. 이번 문서 세트에는 판매 전 코드/문서/데모 자료 열람 절차에 맞춘 실무용 NDA 초안이 포함된다.
