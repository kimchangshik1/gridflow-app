# GridFlow Document Consistency Check

## Scope

checked documents:

- [README.md](/home/ubuntu/upbit_bot/README.md:1)
- [ARCHITECTURE.md](/home/ubuntu/upbit_bot/ARCHITECTURE.md:1)
- [DEPLOYMENT.md](/home/ubuntu/upbit_bot/DEPLOYMENT.md:1)
- [OPERATIONS.md](/home/ubuntu/upbit_bot/OPERATIONS.md:1)
- [SECURITY.md](/home/ubuntu/upbit_bot/SECURITY.md:1)
- [API.md](/home/ubuntu/upbit_bot/API.md:1)
- [CHANGELOG.md](/home/ubuntu/upbit_bot/CHANGELOG.md:1)
- [KNOWN_LIMITATIONS.md](/home/ubuntu/upbit_bot/KNOWN_LIMITATIONS.md:1)
- [SUPPORT_SCOPE.md](/home/ubuntu/upbit_bot/SUPPORT_SCOPE.md:1)

이 문서는 외부 문서 세트의 교차 점검표다. checked docs끼리 직접 충돌하는 표현은 최소 수정으로 정리하고, 아직 닫히지 않은 것은 `OPEN`으로 남긴다.

## Cross-Check Results

### a. Service Name Consistency

Status: `PASS`

confirmed consistent names:
- `gridflow-app.service`
- `upbit-bot.service`
- `orderlens-ops.service`
- `nginx.service`
- `postgresql@16-main.service`
- `gridflow-pg-backup.timer`
- `gridflow-health-alert.timer`

legacy handling:
- `upbit-web.service`는 현재 운영 경로가 아닌 legacy service로만 적는다.

### b. Port Consistency

Status: `PASS`

consistent values:
- external nginx: `80`, `443`
- main app bind: `127.0.0.1:8000`
- monitor bind: `127.0.0.1:8010`
- PostgreSQL: `5432`

### c. Path Consistency

Status: `PASS WITH NOTE`

primary paths aligned:
- source root: `/home/ubuntu/upbit_bot`
- venv: `/home/ubuntu/upbit_bot/venv`
- config dir: `/etc/gridflow`
- main env: `/etc/gridflow/gridflow.env`
- monitor config: `/etc/gridflow/monitor_config.json`
- monitor auth: `/etc/gridflow/monitor_auth.json`
- nginx site: `/etc/nginx/sites-available/gridflow`
- logrotate: `/etc/logrotate.d/gridflow`

note:
- checked code still allows env override and some fallback behavior.
- external docs now standardize `/etc/gridflow/gridflow.env` as the primary deployment/operations contract so the buyer-facing set does not present `.env` as the main path.

### d. Main App / Bot / Monitor Role Consistency

Status: `PASS`

aligned roles:
- main app: primary web UI + API surface
- bot: background trading engines and order/status work
- monitor: separate monitor app and operations aid

boundary kept consistent:
- monitor is read-oriented for recent orders/activity/error/filter
- monitor is not described as a fully read-only application
- monitor auth is described as separate from main app auth

### e. Mode Consistency

Status: `PASS`

consistent mode set:
- `GUEST`
- `DRY RUN`
- `LIVE`

consistent explanation:
- guest is treated as dry-run class
- dry run uses sandbox path
- live uses normal order/strategy path

### f. Supported Exchanges / Strategies Consistency

Status: `PASS`

aligned scope:
- exchanges: `Upbit`, `Bithumb`
- core buyer-facing strategy families: manual order, Grid, DCA, Rebalancing

note:
- `API.md` and `ARCHITECTURE.md` acknowledge a backtest route family.
- `README.md` keeps buyer-facing primary strategy scope to the four operational families above.
- this is treated as an intentional distinction, not a contradiction.

### g. Install / Operations / Support Scope Wording

Status: `PASS`

aligned statement:
- GridFlow is documented as an install-and-handoff product.
- base delivery covers installation, baseline runtime setup, startup verification, and handoff documents.
- ongoing monitoring, trading judgment, profit guarantee, and continuous server operations are outside base scope.

### h. Limitation And Support Scope Non-Contradiction

Status: `PASS`

consistency rule now held across docs:
- limitation disclosure does not imply unlimited free support.
- support scope does not claim to absorb structural product limits into always-on managed operations.
- positions, monitor session, and evidence gaps are documented as product/ops caveats, not hidden warranty promises.

## Conflicts Resolved In This Pass

- env path wording was aligned so buyer-facing deployment/operations docs treat `/etc/gridflow/gridflow.env` as the primary contract.
- monitor wording was kept consistent as "monitor app" and "operations aid", while avoiding the overclaim that the whole monitor is read-only.
- security wording was aligned to the current checked code/docs state: custom header protection exists, but full CSRF closure does not.
- API wording was aligned with README by separating core buyer-facing strategy families from the auxiliary backtest surface.

## Remaining OPEN Notes

- OPEN: some internal source docs still contain older wording around env paths and should be treated as internal context, not direct buyer-facing copy.
- OPEN: buyer-facing screenshot coverage remains uneven across strategy UI and monitor UI.
- OPEN: version naming and final release tag wording are not fixed in the checked docs.
