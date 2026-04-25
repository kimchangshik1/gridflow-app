# SECRET_ROTATION_MATRIX

이 표는 2026-04-25 UTC closeout 기준 buyer-facing final freeze에 필요한 4개 항목만 잠근다.
runtime secret store의 실제 rotation 완료 증빙은 포함하지 않고, 실제 secret 값도 적지 않는다.

| Secret type | Evidence basis | Current risk | Rotation status | Owner / action |
| --- | --- | --- | --- | --- |
| PostgreSQL credential | git history에 DB credential literal exposure가 있었다. current runtime DB password도 그 historically exposed literal과 아직 일치한다. | history exposure + current runtime reuse | rotation required | DB owner가 즉시 교체 후 downstream consumers 재주입. old literal을 buyer bundle이나 운영 기준값처럼 설명하지 않는다. |
| Exchange key | repo current tree/history에서는 `UPBIT_ACCESS_KEY`, `UPBIT_SECRET_KEY`, `BITHUMB_ACCESS_KEY`, `BITHUMB_SECRET_KEY` name reference만 확인됐다. concrete repo value exposure는 이번 closeout에서 확정되지 않았다. | runtime key lifecycle은 운영 책임이지만 repo exposure evidence는 낮음 | no concrete exposure confirmed | operator가 key lifecycle 관리 지속. buyer-facing은 clean delivery tarball과 절차 문서만 사용한다. |
| Monitor secret/hash | current runtime `/etc/gridflow/monitor_config.json` / `/etc/gridflow/monitor_auth.json`에는 non-placeholder 값이 있으나, repo current tree/history에서는 구조 참조만 확인됐다. | buyer set에 raw monitor config/auth 포함 금지 | no concrete exposure confirmed | operator가 runtime file 권한과 rotation lifecycle 유지. buyer-facing은 template/schema만 사용한다. |
| Webhook URL | current runtime env에는 webhook 값이 있으나, repo current tree/history에서는 `GRIDFLOW_ALERT_WEBHOOK_URL`, `DISCORD_WEBHOOK_URL` env-name reference만 확인됐다. | endpoint disclosure risk는 runtime 관리 이슈 | no concrete exposure confirmed | ops owner가 runtime secret로만 관리한다. buyer-facing 문서에는 endpoint 원문을 적지 않는다. |

## Scope Note

- `.upbit_bot_key`, raw `.env`, raw monitor config/auth, backup dump, archive/log artifact는 rotation matrix 항목이 아니라 delivery exclusion 항목으로 관리한다.
- 이번 closeout 대상 4개 항목에는 `unknown`을 남기지 않는다.

## Handoff Rule

- clean delivery tarball: 전달 가능
- full history repo: 전달 불가
- clean/squash repo: 별도 hygiene review 후 diligence artifact로만 취급
