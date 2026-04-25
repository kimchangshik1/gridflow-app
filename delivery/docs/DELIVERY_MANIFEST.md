GridFlow Delivery Manifest

상태
- 대단원 8 delivery tree draft 기준
- 실제 staging root는 `delivery/`
- evidence visibility는 `show_now / diligence_only / internal_hold` 기존 구조로만 잠금
- buyer 기본 deliverable은 clean delivery tarball only로 잠금

목적
- buyer 전달용 clean tree에 무엇을 실제로 넣고 무엇을 분리하는지 고정한다.
- 대단원 2 install 자산은 `delivery/install/`로 재배치하고, 대단원 4 evidence visibility는 새 taxonomy 없이 잠근다.
- full history repo는 전달 범위에서 제외한다.

1. delivery tree actual

전달 방식 판정
- deliverable: clean delivery tarball
- diligence-only artifact: 별도 clean/squash repo 또는 추가 evidence binder
- non-deliverable: full history repo
- 이유: history scan 기준 과거 DB credential literal exposure가 확인됐다.
- disclosure rule: full history repo 제외 사유를 buyer에게 숨기지 않고, security disposition으로 직접 설명한다.

root runtime payload
- 포함: `delivery/app/`
- 포함: `delivery/static/`
- 포함: `delivery/ops/`
- 포함: `delivery/alembic/`
- 포함: `delivery/alembic.ini`
- 포함: `delivery/requirements-web.txt`
- 이유: buyer가 source-based install 또는 handoff 검토를 할 때 실행 코드와 설치 스크립트가 직접 필요하다.

buyer-facing docs
- 포함 위치: `delivery/docs/`
- 포함 파일:
  - `README.md`
  - `API.md`
  - `ARCHITECTURE.md`
  - `DEPLOYMENT.md`
  - `OPERATIONS.md`
  - `SECURITY.md`
  - `CHANGELOG.md`
  - `KNOWN_LIMITATIONS.md`
  - `SUPPORT_SCOPE.md`
  - `DOC_MAPPING.md`
  - `DOC_CONSISTENCY_CHECK.md`
  - `MAJOR6_CLOSEOUT.md`
  - `GRIDFLOW_PRIVATE_DEPLOYMENT_SCOPE.txt`
  - `GRIDFLOW_PRIVATE_INSTALL_CHECKLIST.txt`
  - `GRIDFLOW_PRIVATE_HANDOFF_RUNBOOK.txt`
  - `D_OPERATIONS_RUNBOOK.txt`
  - `MONITOR_RUN_GUIDE.txt`
  - `MONITOR_DELIVERY_CHECKLIST.txt`
  - `DELIVERY_MANIFEST.md`
  - `EVIDENCE_VISIBILITY_LOCK.md`

install structure
- 포함 위치: `delivery/install/`
- 포함 파일:
  - `env.example`
  - `install_values.example.json`
  - `install_values.rehearsal.json`
  - `BOOTSTRAP_RUNBOOK.txt`
  - `ENV_SCHEMA.txt`
  - `INSTALL_TEMPLATE_MAP.txt`
  - `CONFIG_TEMPLATE_MAP.txt`
  - `gridflow.logrotate`
- 포함 하위 디렉터리:
  - `delivery/install/systemd/`
  - `delivery/install/nginx/`
  - `delivery/install/monitor/`
- 이유: 대단원 2의 env/systemd/nginx/bootstrap 자산을 buyer install 구조로 재배치한 staging area다.

sales materials
- 포함 위치: `delivery/sales/`
- 포함 원칙: existing buyer-facing sales/diligence 문서만 재배치
- 제외 원칙: internal closeout, unlock backlog, safe-capture 내부 메모는 staging tree에 넣지 않음

evidence payload
- 포함 위치: `delivery/evidence/show_now/`
- 포함 위치: `delivery/evidence/diligence_only/`
- 이유: 대단원 4의 `show_now / diligence_only / internal_hold` 구조를 실제 tree에서 분리해 보이기 위함

2. show_now lock

현재 즉시 보낼 strongest set
- `delivery/evidence/show_now/evidence_show_now_bundle_index.md`
- `delivery/evidence/show_now/evidence_one_pager.md`
- `delivery/evidence/show_now/AUTH_MODE_EVIDENCE.md`
- `delivery/evidence/show_now/MANUAL_ORDER_EVIDENCE.md`
- `delivery/evidence/show_now/guest_sandbox_proof_bundle.md`
- `delivery/evidence/show_now/OPERATIONS_EVIDENCE.md`

해석 규칙
- auth는 `GUEST / LIVE` 기준까지만 buyer-facing으로 설명한다.
- manual은 live DB/log 근거와 guest sandbox proof를 섞지 않는다.
- ops는 backup/restore/emergency/health alert 구조까지만 설명한다.

3. diligence_only lock

요청 시만 보내는 drill-down set
- `delivery/evidence/diligence_only/GRIDFLOW_RELEASE_EVIDENCE.txt`
- `delivery/evidence/diligence_only/STRATEGY_EVIDENCE.md`
- `delivery/evidence/diligence_only/evidence_gap_register.md`
- `delivery/evidence/diligence_only/evidence_delivery_manifest.md`
- `delivery/evidence/diligence_only/raw/INDEX.md`
- `delivery/evidence/diligence_only/raw/`

보조 인덱스
- `delivery/sales/evidence_package_master_index.md`
- `delivery/sales/evidence_diligence_bundle_index.md`

해석 규칙
- diligence_only는 buyer 초기 전달 세트가 아니라 요청 기반 상세 검토용이다.
- raw binder, gap register, release evidence는 blocker와 limitation을 숨기지 않는 방향으로만 사용한다.

4. internal_hold lock

현재 보내지 않는 항목
- `DRY RUN badge capture set`
- `live manual before/after / UI-DB mapping`
- `Grid / DCA / Rebal existing strategy UI capture set`
- `monitor buyer-facing UI capture set`
- `emergency stop/release UI capture set`
- `Rebalancing live confirmed evidence`
- `latest emergency stop-release pair evidence`
- `health alert duplicate suppression direct raw proof`
- `guest sandbox full balance before/after series`
- `guest position qty DB bridge`

잠금 규칙
- internal_hold는 `delivery/`에 capture set을 staging하지 않는다.
- `closeout`와 `unlock backlog`는 내부 추적용으로만 유지하고 buyer delivery tree에는 넣지 않는다.

5. excluded from delivery tree

internal-only docs
- 제외: `sales/evidence_internal_hold_bundle_index.md`
- 제외: `sales/evidence_pack_closeout.md`
- 제외: `sales/evidence_unlock_backlog.md`
- 제외: `sales/auth_capture_harness.md`
- 제외: `sales/safe_capture_path_note.md`
- 이유: internal hold, closeout, capture-path 메모는 buyer-facing staging tree 범위를 넘는다.

generated / secret / debug artifacts
- 제외: `_install_render*`
- 제외: `.codex`, `CLAUDE*`
- 제외: `venv/`, `__pycache__/`, `*.pyc`, `test-results/`, `tests/`
- 제외: raw `.env`, `.upbit_bot_key`, raw monitor auth/config, actual `/etc/gridflow/*`
- 제외: `*.log`, `*.log.*`, `*.dump`, `*.tar.gz`, `*.sha256`, `nohup.out*`
- 제외: full `.git/` history and buyer branch style history handoff
- 이유: 환경 종속성, 민감값, 내부 생성물, old runtime 흔적은 clean delivery에 넣지 않는다.

6. alignment rule

- `delivery/` 실제 tree와 이 문서의 include/exclude 경계가 어긋나면 tree를 다시 맞춘다.
- 이 문서는 buyer-facing install staging과 evidence visibility lock 기준선이다.
