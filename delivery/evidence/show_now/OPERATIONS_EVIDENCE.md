# OPERATIONS_EVIDENCE.md

## 비상정지 요약

- stop 판정: `stop confirmed`
- release 판정: `release confirmed`
- confirmed: 최신 비상정지 발동 근거는 전역 emergency stop 1건이다.
- confirmed: 최신 해제 근거는 더 이전 시점의 `emergency_stop_reset` audit 1건이다.
- missing: 현재 확보 자료에서는 최신 stop과 같은 incident에 대응하는 release 쌍을 확인하지 못했다.

## stop confirmed

- 대상 전략/심볼: 전략 개별 단위가 아니라 `전역 신규 주문 차단`; 특정 심볼 직접 매핑은 없음
- 시각:
  - 파일 로그: `2026-04-18 07:37:39 UTC` 부근
  - DB 감사로그: `2026-04-18 07:37:39.281353 UTC`
- 왜 멈췄는지:
  - reason `balance_query_failed`
  - 직전 파일 로그에 `잔고 조회 실패`가 반복 기록됨
- 멈춤 후 상태:
  - `bot.log.1`에 `[EMERGENCY] 비상정지 발동: balance_query_failed`
  - 이후 같은 로그에 `[EMERGENCY] 정지 상태: balance_query_failed`가 반복 기록됨
  - `audit_logs.id=238512`에 `event=emergency_stop_triggered`, `detail={"reason": "balance_query_failed"}` 기록이 남아 있음

## release confirmed

- 대상 전략/심볼: 전략 개별 단위가 아니라 `전역 신규 주문 차단 해제`; 특정 심볼 직접 매핑은 없음
- 최신 확인 시각:
  - DB 감사로그: `2026-03-22 07:14:07.374159 UTC`
- 해제 근거:
  - `audit_logs.id=5258`
  - `event=emergency_stop_reset`
  - `detail={"reason": "auto_recovered"}`
- 해제 후 상태:
  - 코드 `app/monitor/emergency_stop.py` 기준 `reset("auto_recovered")`는 `is_stopped=False`, `stop_reason=""`로 되돌린다.
- 한계:
  - 현재 파일 로그에서는 같은 해제 사건의 출력 라인을 확인하지 못했다.
  - 최신 stop(`2026-04-18`)과 직접 이어지는 최신 release 증거는 확보하지 못했다.

## UI / DB / log / activity 판정

- UI: missing
  - 비상정지/해제 화면 캡처를 확보하지 못했다.
- DB: confirmed
  - `audit_logs`에 `emergency_stop_triggered`, `emergency_stop_reset` 이벤트가 남아 있다.
- log: confirmed
  - stop는 `bot.log.1`에서 직접 확인된다.
  - release는 코드상 로그 출력 경로는 있으나, 최신 파일 로그 캡처는 확보하지 못했다.
- activity: missing
  - `activity_logs`에는 전역 emergency stop/reset 전용 이벤트를 확인하지 못했다.

## confirmed

- `bot.log.1`
  - `[EMERGENCY] 비상정지 발동: balance_query_failed`
  - `[EMERGENCY] 정지 상태: balance_query_failed`
- `audit_logs`
  - `238512|emergency_stop_triggered|{"reason":"balance_query_failed"}|2026-04-18 07:37:39.281353+00`
  - `5258|emergency_stop_reset|{"reason":"auto_recovered"}|2026-03-22 07:14:07.374159+00`
- 코드
  - `app/monitor/emergency_stop.py`의 `trigger()`는 `emergency_stop_triggered`를 기록한다.
  - `reset()`은 `emergency_stop_reset`을 기록하고 내부 stop 상태를 해제한다.

## inferred

- inferred: 최신 stop 이후에는 반복적인 `정지 상태` 로그가 남아 있어 전역 신규 주문 차단 상태가 유지된 것으로 해석할 수 있다.
- inferred: release는 audit 기준으로 자동 복구 경로가 한 번 이상 실제 동작한 것으로 해석할 수 있다.

## missing

- missing: 최신 stop(`2026-04-18`)과 짝이 맞는 release 증거
- missing: buyer-facing UI 캡처
- missing: activity 로그 기반 전역 emergency stop / reset 기록
- missing: 특정 전략 주문 차단 전후를 직접 보여주는 DB 스냅샷

## needed capture / 추가로 필요한 캡처·추출

- monitor 또는 운영 화면에서 비상정지 상태가 보이는 캡처
- 비상정지 해제 후 정상 상태가 보이는 캡처
- `audit_logs`의 `emergency_stop_triggered` / `emergency_stop_reset` sanitized 추출 스냅샷
- stop 직후 신규 주문이 차단되는지 보여주는 운영 캡처 또는 로그 추출

---

## backup / restore / alert 요약

- confirmed: `gridflow-pg-backup.timer`와 `gridflow-health-alert.timer`가 운영 서비스 구조에 포함되어 있다.
- confirmed: `2026-04-20` 기준 백업 dump 실파일과 backup 성공 로그를 재확인했다.
- confirmed: `2026-04-20` 기준 restore verify 성공 로그를 재확인했다.
- confirmed: health alert는 실제 발송 로그, timer 실행 상태, duplicate suppression direct proof 1개 이상을 현재 raw pack에서 다시 확인했다.
- inferred: 백업/복구/알림 체계는 실제 운영 경로 기준으로 설명 가능하다.
- missing: buyer-facing 운영 화면 캡처는 현재 확보하지 못했다.

## backup / restore confirmed

- backup timer/service confirmed:
  - 시각: `2026-04-20 UTC`
  - 서비스명: `gridflow-pg-backup.service`, `gridflow-pg-backup.timer`
  - 핵심 설명: 현재 `gridflow-pg-backup.timer`는 `active`, `enabled` 상태이며 다음 실행 시각이 systemd timer에 잡혀 있다.
- 최근 백업 파일 존재 confirmed:
  - 시각: `2026-04-20 03:29:36 UTC`
  - 파일명: `/var/backups/gridflow/upbit_bot_20260420_032935.dump`
  - 핵심 설명: `2026-04-20` 현재 `/var/backups/gridflow/upbit_bot_20260420_032935.dump` 실파일과 `/var/log/gridflow_backup.log`의 `START`/`OK` 라인을 재확인했다.
- restore verify confirmed:
  - 시각: `2026-04-20 06:45:57 UTC`
  - 파일명: `/var/log/gridflow_restore_verify.log`
  - 핵심 설명: 임시 DB `gridflow_restore_verify_20260420_064555`에 복원 후 `tables=19`, `estimated_rows=285895`, `key_tables=activity_logs, grid_orders, grid_strategies, planned_orders, users` OK 기록이 있다.
- 한계:
  - buyer-facing 운영 화면 캡처는 여전히 없다.
  - raw snapshot은 텍스트 발췌라 dump 내용을 직접 검증한 것은 아니다.

## health alert confirmed

- 시각:
  - 발송 로그: `2026-04-18 09:09:57 UTC`
  - 최근 timer 실행: `2026-04-20 08:44:12 UTC`
- 서비스명/파일명:
  - `gridflow-health-alert.service`
  - `gridflow-health-alert.timer`
  - `/var/log/gridflow_alert.log.1`
  - `/var/lib/gridflow/health_alert.last`
  - `/home/ubuntu/upbit_bot/evidence/raw/ops/health_alert_suppression_check.txt`
  - `/home/ubuntu/upbit_bot/evidence/raw/ops/health_alert_duplicate_suppression.txt`
  - `/home/ubuntu/upbit_bot/evidence/raw/ops/health_alert_duplicate_context.txt`
- 핵심 설명:
  - rotated log `/var/log/gridflow_alert.log.1`에 `GridFlow health alert ... upbit-bot.service active=inactive substate=dead` 발송 로그가 남아 있다.
  - 현재 `gridflow-health-alert.timer`는 `active`, `enabled` 상태이며 `gridflow-health-alert.service`가 주기적으로 성공 종료된 systemd journal이 남아 있다.
  - direct proof 기준 `2026-04-22 06:24`의 `endpoint app unreachable + endpoint monitor unreachable` alert 이후 같은 unit이 다시 실행됐지만, 같은 alert text는 반복 기록되지 않았다.
  - 다음 `gridflow-health` alert line은 `2026-04-22 06:38`에 upbit-bot failure가 추가되며 problem set이 바뀐 뒤에만 다시 나타난다.
  - 보조 window `2026-04-22 23:33 -> 23:49`에서도 같은 패턴이 다시 보인다. alert line은 반복 unit run마다 재방송되지 않고, problem set이 달라질 때만 다음 line이 생긴다.
  - 이번 buyer-facing raw는 host, endpoint URL, webhook host를 마스킹했다.

## control path alignment note

- captured:
  - `/home/ubuntu/upbit_bot/evidence/raw/ops/control_path_alignment_note.md`
- verified backend control path:
  - Grid/DCA pause-resume
  - integration test `tests/integration/test_emergency_stop_release.py`는 paused 상태에서 submit 차단, resume 후 submit 재개를 확인한다.
- documented operational safeguard:
  - `app/monitor/emergency_stop.py`의 runtime safeguard와 `audit_logs` 기반 stop/reset evidence는 별도로 존재한다.
- not claimed:
  - dedicated backend emergency release endpoint
  - single global incident release API
- buyer-facing wording:
  - backend control path는 `pause/resume`
  - runtime safeguard는 evidence/documented procedure
  - 전용 backend emergency release API는 현재 주장하지 않는다

## monitor read-only 운용 근거

- confirmed: monitor 앱 진입점은 `app/monitor/product_app.py`이고 `/monitor/orders`, `/monitor/activity`는 모두 `GET` 조회 엔드포인트다.
- confirmed: `app/monitor/repo.py`의 `list_recent_orders()`는 `planned_orders` 최근 50건을 조회해 반환한다.
- confirmed: `app/monitor/repo.py`의 `list_recent_activity()`는 `activity_logs` 최근 50건을 조회하고, 실패/취소/정합성 필요 상태를 안전한 메시지로 가공해 반환한다.
- confirmed: `static/js/monitor.js`는 `/monitor/orders`와 `/monitor/activity`를 주기적으로 새로고침하고 recent orders, activity, error, filter UI를 구성한다.
- confirmed: `filterOrders()`, `filterActivity()`, `filterErrors()`가 있어 거래소/상태 기준 필터링이 프론트에서 동작한다.
- confirmed: bad status는 오류 패널과 최근 오류 요약으로 분리 표시된다.
- inferred: 주문/활동 모니터링 범위에서는 읽기 전용으로 운용된다고 설명 가능하다.
- captured:
  - `evidence/raw/monitor/monitor_login_entry.png` — 배포 중인 `/monitor/login` 진입 화면 safe crop
  - `evidence/raw/monitor/monitor_postlogin_overview.png` — 배포 중인 `static/monitor.html` 홈 자산 상단 crop, `READ-ONLY` badge와 landing chrome 포함
  - `evidence/raw/monitor/monitor_orders_activity_filter.png` — 같은 홈 자산에서 filter + recent orders/activity 섹션을 보이게 한 safe crop
  - `evidence/raw/monitor/monitor_auth_status.json` — `GET /monitor/auth-status` raw, `has_password=true`
- provenance:
  - 이번 raw pack의 홈 화면 캡처는 배포 중인 `monitor.html` 자산 기준이다. `app/monitor/product_app.py`의 `/monitor`는 인증 후 동일 자산을 반환한다.
  - 이번 pack은 buyer-facing safe capture를 위한 것이며, live operator 세션 상태나 multi-instance session persistence를 증명하지 않는다.

## monitor confirmed

- recent orders confirmed:
  - 화면/엔드포인트: `/monitor/orders`, `ordersBody`, `ordersCount`
  - 핵심 설명: `planned_orders` 최근 50건을 조회해 최근 주문 표로 렌더링한다.
- recent activity confirmed:
  - 화면/엔드포인트: `/monitor/activity`, `activityBody`, `activityCount`
  - 핵심 설명: `activity_logs` 최근 50건을 조회해 활동 표로 렌더링한다.
- recent error confirmed:
  - 화면명: `errorsBody`, `errorsCount`, `latest-error-text`
  - 핵심 설명: `FAILED`, `CANCELLED`, `RECONCILE_NEEDED` 상태를 오류 패널과 최근 오류 슬롯으로 표시한다.
- filter confirmed:
  - 화면명: `filterOrders()`, `filterActivity()`, `filterErrors()`
  - 핵심 설명: 거래소/상태 기준 필터가 프론트에서 적용된다.
- read-only confirmed:
  - 범위: recent orders/activity/error/filter
  - 핵심 설명: monitor 데이터 조회 경로는 `GET /monitor/orders`, `GET /monitor/activity`만 사용하며, 이 경로는 DB 조회만 수행한다.
- read-only 한계:
  - monitor 전체 앱에는 로그인/설정 저장/설정 삭제 같은 `POST`/`DELETE` 엔드포인트가 별도로 존재한다.
  - 따라서 “monitor 전체가 완전 read-only”가 아니라 “주문/활동 관측 기능은 read-only”로 적는 것이 정확하다.

## 추가 판정

- backup: confirmed
- restore: confirmed
- health alert: confirmed
- control path alignment note: confirmed
- monitor recent orders/activity/error/filter/read-only: confirmed

## 추가 inferred

- inferred: buyer-facing 관점에서 운영 체계는 `자동 백업`, `임시 DB 복구 검증`, `장애 알림`, `읽기 중심 monitor`까지 설명 가능한 수준이다.

## 추가 missing

- missing: live operator session으로 `/monitor` home에 진입한 post-login runtime capture
- missing: restore verify 실행 화면 또는 로그 스냅샷 캡처
- missing: health alert webhook 결과 화면 캡처

## 추가 needed capture / 추가로 필요한 캡처·추출

- monitor authenticated post-login runtime capture 1세트
- `/var/log/gridflow_backup.log`, `/var/log/gridflow_restore_verify.log`, `/var/log/gridflow_alert.log.1` sanitized 추출 스냅샷
- `/var/backups/gridflow/upbit_bot_20260420_032935.dump` 존재 화면 또는 파일 목록 캡처
