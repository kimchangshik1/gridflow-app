## GridFlow Secret Hygiene Note

이 문서는 2026-04-24 기준 current tree와 git history를 실제로 다시 스캔한 결과만 정리한다.
runtime secret store(`/etc/gridflow/*`, live DB, external vault) 자체의 회전 완료 여부를 증명하는 문서는 아니다.

## 1. Current Tree Scan Result

실행한 스캔

- 파일 존재 스캔:
  - `.env`, `monitor_auth.json`, `monitor_config.json`, `*.dump`, `*.tar.gz`, `*.bak`, `*.log`, `nohup.out*`, `.upbit_bot_key`
- 키워드 스캔:
  - `DB_URL`, `UPBIT_ACCESS_KEY`, `UPBIT_SECRET_KEY`, `BITHUMB_ACCESS_KEY`, `BITHUMB_SECRET_KEY`
  - `GRIDFLOW_ALERT_WEBHOOK_URL`, `DISCORD_WEBHOOK_URL`
  - `api_key`, `api_secret`, `password_hash`, `JWT_SECRET`
- 로그 샘플링:
  - 일반 로그는 `rg`
  - root-owned monitor 로그와 gzip rotation은 `sudo -n awk` / `sudo -n python3`로 동일 패턴 검색

확정 결과

- repo root에 `.upbit_bot_key` 파일이 존재한다.
- repo root와 `_archive/` 아래에 로그, `.bak`, `.tar.gz` 산출물이 남아 있다.
- `_install_render/`, `_install_render_rehearsal/`, `_install_render_ops_assets/`, `_install_render_full_rehearsal/` 아래에 rendered `monitor_config.json` / `monitor_auth.json`가 존재한다.
- 위 rendered tree는 현재 concrete live secret이 아니라 placeholder 값만 가진다.
  - 예: `CHANGE_ME`, `REPLACE_ME`, `REPLACE_ME_BCRYPT_HASH`
- `ops/templates/install_values.example.json`, `ops/templates/install_values.rehearsal.json`, `ops/templates/gridflow.env.template`, `ops/templates/monitor_*.json.template`는 placeholder/example 값만 가진다.
- targeted current-tree scan에서는 concrete webhook URL, cloud access key, private key block, concrete monitor hash를 찾지 못했다.
- targeted log scan에서는 지정한 민감 패턴(`postgresql://`, `upbit1234`, `api_secret`, `password_hash`, session/token 계열) 매치를 찾지 못했다.

current tree 판정

- raw repo tree 전체는 buyer handoff용으로 안전하지 않다.
- 이유:
  - secret-like local files와 운영 산출물 후보가 함께 남아 있다.
  - `.upbit_bot_key`, 로그, archive tarball, backup file은 delivery set에서 제외해야 한다.
- clean delivery tree / tarball만 buyer 전달 기준으로 안전하다.

## 2. Git History Exposure Result

실행한 스캔

- `git log -S 'DB_URL' --oneline --all`
- `git log -S 'UPBIT_ACCESS_KEY' --oneline --all`
- `git log -S 'UPBIT_SECRET_KEY' --oneline --all`
- `git log -S 'GRIDFLOW_ALERT_WEBHOOK_URL' --oneline --all`
- `git log -S 'DISCORD_WEBHOOK_URL' --oneline --all`
- `git log -S 'upbit1234' --oneline --all`
- `git grep -n ... a2c81f2`
- `git show d8c9757 --stat --summary --oneline`
- `git show c807845 --stat --summary --oneline`

확정 결과

- `DB_URL`와 `upbit1234`는 history에 실제 literal 노출이 있었다.
  - 노출 시작: `a2c81f2 Initial source import`
  - 제거 1차: `d8c9757 Remove hardcoded DB credentials from live source`
  - 제거 잔여 마감: `c807845 Fix remaining visible Bandit blockers`
- `a2c81f2`에는 아래 경로들에 `tradingbot / upbit1234` literal이 직접 들어 있었다.
  - `app/api/auth_routes.py`
  - `app/api/backtest_routes.py`
  - `app/api/bithumb_routes.py`
  - `app/api/dca_routes.py`
  - `app/api/grid_routes.py`
  - `app/api/rebalancing_routes.py`
  - `app/api/routes.py`
  - `app/auth/auth.py`
  - `app/bot_manager.py`
  - `app/strategy/dca_engine.py`
  - `app/strategy/grid_engine.py`
  - `app/strategy/rebalancing_engine.py`
- `UPBIT_ACCESS_KEY`, `UPBIT_SECRET_KEY`, `GRIDFLOW_ALERT_WEBHOOK_URL`, `DISCORD_WEBHOOK_URL`는 history에 존재한다.
  - 다만 이번 targeted scan에서는 concrete live value가 아니라 key name / env name / code reference만 확인됐다.
- monitor secret 계열은 history에 `monitor_config.json`, `monitor_auth.json`, `api_secret`, `password_hash` 구조 참조는 있다.
  - 이번 targeted scan에서는 concrete monitor API secret이나 concrete bcrypt hash commit은 확인하지 못했다.
- `.env`, `.upbit_bot_key`, `_install_render*`는 tracked history에서 발견되지 않았다.

history 판정

- full history repo는 buyer handoff 대상으로 안전하지 않다.
- 이유:
  - DB credential literal exposure가 실제로 있었다.
  - 다른 secret 계열은 concrete value exposure를 이번 scan에서 확정하지 못했어도, history 자체가 clean하다고 설명할 수는 없다.

## 3. Rotation Status and Delivery Guidance

회전 상태 원칙

- repo scan만으로 runtime secret의 현재 값이나 실제 rotation 완료를 증명할 수는 없다.
- `unknown`은 그대로 남기고, literal exposure가 확인된 항목은 별도 action을 명시해야 한다.

현재 결론

- PostgreSQL credential(`tradingbot / upbit1234`)
  - history literal exposure: `확정`
  - current runtime reuse: `확정`
  - rotation completion: `rotation required`
  - action: current `/etc/gridflow/gridflow.env` 기준 old exposed literal과 동일하므로 즉시 교체가 필요하다.
- exchange API key / secret
  - repo history literal exposure: `이번 scan 기준 미확정`
  - current runtime presence: `확정`
  - rotation completion: `no concrete exposure confirmed`
  - action: repo scan 기준 실값 노출은 확인되지 않았다. 운영 주체는 lifecycle 관리만 유지하면 된다.
- monitor API secret / monitor password hash
  - repo history literal exposure: `이번 scan 기준 미확정`
  - current runtime presence: `확정`
  - rotation completion: `no concrete exposure confirmed`
  - action: `/etc/gridflow/monitor_config.json`, `/etc/gridflow/monitor_auth.json` 원본은 buyer set에 포함하지 않는다.
- alert webhook URL
  - repo history literal exposure: `이번 scan 기준 미확정`
  - current runtime presence: `확정`
  - rotation completion: `no concrete exposure confirmed`
  - action: 실제 endpoint URL은 buyer-facing 문서에 넣지 않는다.

buyer 전달 방식 판정

- `safe`: clean delivery tarball / curated delivery tree
- `unsafe`: full history repo
- `conditionally safe`: squash or clean-export repo
  - 조건: polluted history와 local secret artifacts가 제거된 별도 export임을 별도 검증해야 한다.

## 4. Buyer Delivery Rules

- buyer set에는 실제 `.env`, `.upbit_bot_key`, raw monitor config/auth, raw logs, backup, archive tarball을 넣지 않는다.
- buyer set에는 placeholder template, schema, install guide만 넣는다.
- history exposure가 있는 repo 전체를 그대로 전달하지 않는다.
- delivery manifest는 canonical delivery tree 기준으로만 설명한다.

## 5. Final Judgment

- current tree: `clean delivery only`
- git history: `unsafe for full-history handoff`
- rotation evidence: `incomplete in repo evidence`
- buyer-facing safe statement:
  - "clean delivery bundle은 전달 가능"
  - "full history repo는 전달 불가"
  - "rotation 완료 여부는 별도 운영 증빙이 필요"
