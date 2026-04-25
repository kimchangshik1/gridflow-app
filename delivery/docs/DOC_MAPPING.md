# DOC_MAPPING

## Purpose

This document maps reusable internal docs and evidence notes into the buyer-facing external doc set for major section 6.

Scope for this pass:
- create the external doc skeletons
- define source anchors
- avoid bulk copy/paste
- keep unsupported claims as `TODO` or `OPEN`

## External Doc Set

- [README.md](/home/ubuntu/upbit_bot/README.md:1)
- [ARCHITECTURE.md](/home/ubuntu/upbit_bot/ARCHITECTURE.md:1)
- [DEPLOYMENT.md](/home/ubuntu/upbit_bot/DEPLOYMENT.md:1)
- [OPERATIONS.md](/home/ubuntu/upbit_bot/OPERATIONS.md:1)
- [SECURITY.md](/home/ubuntu/upbit_bot/SECURITY.md:1)
- [API.md](/home/ubuntu/upbit_bot/API.md:1)
- [CHANGELOG.md](/home/ubuntu/upbit_bot/CHANGELOG.md:1)
- [KNOWN_LIMITATIONS.md](/home/ubuntu/upbit_bot/KNOWN_LIMITATIONS.md:1)
- [SUPPORT_SCOPE.md](/home/ubuntu/upbit_bot/SUPPORT_SCOPE.md:1)

## Merge Rules

- Summarize once, then link back to the strongest source anchor.
- Prefer doc-to-doc absorption over copying raw evidence into narrative docs.
- Keep raw evidence as proof anchors, not as buyer-facing prose.
- Keep blocked, missing, and unavailable items visible in `KNOWN_LIMITATIONS.md` or `CHANGELOG.md`.
- Keep internal workflow instructions and collaborator notes out of the buyer-facing set.

## Reusable Source Inventory Checked

Top-level docs checked:
- `APPLY_INSTALL_PAYLOAD.txt`
- `APPLY_INSTALL_PERMISSIONS.txt`
- `ASSET_SNAPSHOT.md`
- `AUTH_MODE_EVIDENCE.md`
- `AUTH_STORAGE_AUDIT.md`
- `AWS_CLEAN_VM_LAUNCH_CARD.txt`
- `AWS_CLEAN_VM_MANUAL_PROVISION.txt`
- `BOOTSTRAP_RUNBOOK.txt`
- `CLEAN_INSTALL_FIRST_EXECUTE.txt`
- `CLEAN_INSTALL_REHEARSAL_PLAN.txt`
- `CLEAN_VM_CONTAMINATION_ROOT_CAUSE.txt`
- `CLEAN_VM_EXECUTION_PACKET.txt`
- `CLEAN_VM_FIRST_EXECUTE_BLOCKERS.txt`
- `CLEAN_VM_FIRST_EXECUTE_EVIDENCE_RUNBOOK.txt`
- `CLEAN_VM_LIVE_INSTALL.txt`
- `CLEAN_VM_PROVISION_PREREQS.txt`
- `CLEAN_VM_READY_CHECK.txt`
- `CLEAN_VM_TRANSFER_BUNDLE.txt`
- `CLEAN_VM_TRANSFER_BUNDLE_PROOF.txt`
- `CONFIG_TEMPLATE_MAP.txt`
- `DB_BOOTSTRAP.txt`
- `DB_SCHEMA_INVENTORY.txt`
- `DELIVERY_MANIFEST.md`
- `DELIVERY_POLICY.md`
- `DEPLOYMENT_BASELINE.txt`
- `DEPLOY_SOURCE_TREE.txt`
- `D_OPERATIONS_RUNBOOK.txt`
- `ENV_SCHEMA.txt`
- `ERROR_RESPONSE_HARDENING_NOTE.md`
- `GENERATE_MONITOR_PASSWORD_HASH.txt`
- `GRIDFLOW_DOC_INDEX.txt`
- `GRIDFLOW_PRIVATE_DEPLOYMENT_SCOPE.txt`
- `GRIDFLOW_PRIVATE_HANDOFF_RUNBOOK.txt`
- `GRIDFLOW_PRIVATE_INSTALL_CHECKLIST.txt`
- `GRIDFLOW_RELEASE_EVIDENCE.txt`
- `GRIDFLOW_RELEASE_QUALITY_GATES.txt`
- `INPUT_VALIDATION_HARDENING_NOTE.md`
- `INSTALL_TEMPLATE_MAP.txt`
- `KNOWN_LIMITATIONS.md`
- `LOCAL_INSTALL_PIPELINE_PROOF.txt`
- `LOCAL_INSTALL_PIPELINE_PROOF_FULL.txt`
- `MAJOR2_CLOSEOUT.txt`
- `MAJOR2_DRIFT_AUDIT.txt`
- `MANUAL_ORDER_EVIDENCE.md`
- `MONITOR_AUTH_BOUNDARY.md`
- `MONITOR_DELIVERY_CHECKLIST.txt`
- `MONITOR_ENV_EXAMPLE.txt`
- `MONITOR_RUN_GUIDE.txt`
- `OPERATIONS_EVIDENCE.md`
- `OPS_INSTALL_PAYLOAD_MAP.txt`
- `POSITIONS_DESIGN_NOTE.md`
- `POST_INSTALL_ACTIVATION.txt`
- `POST_INSTALL_SMOKE_CHECK.txt`
- `PREPARE_APP_RUNTIME.txt`
- `PREPARE_CLEAN_VM_DB.txt`
- `PRE_INSTALL_PREFLIGHT.txt`
- `RENDER_INSTALL_PAYLOAD.txt`
- `RESTORE_PROOF.txt`
- `SCOPE_FREEZE.md`
- `SECRET_HYGIENE_NOTE.md`
- `SECURITY_GATE_SUMMARY.md`
- `STATE_CHANGE_PROTECTION_NOTE.md`
- `STRATEGY_EVIDENCE.md`
- `VALIDATION_GAP_NOTE.md`
- `auth_security_audit.md`

Sales and evidence docs checked:
- `sales/evidence_capture_checklist.md`
- `sales/evidence_delivery_manifest.md`
- `sales/evidence_diligence_bundle_index.md`
- `sales/evidence_gap_register.md`
- `sales/evidence_internal_hold_bundle_index.md`
- `sales/evidence_one_pager.md`
- `sales/evidence_pack_closeout.md`
- `sales/evidence_package_master_index.md`
- `sales/evidence_show_now_bundle_index.md`
- `sales/evidence_unlock_backlog.md`
- `sales/guest_sandbox_proof_bundle.md`
- `sales/safe_capture_path_note.md`
- `sales/auth_capture_harness.md`

Raw evidence anchors checked:
- `evidence/raw/INDEX.md`
- `evidence/raw/manual/guest_sandbox_db_extract.txt`
- `evidence/raw/manual/guest_sandbox_position_db_bridge.txt`
- `evidence/raw/ops/backup_dump_presence.txt`
- `evidence/raw/ops/emergency_stop_release_pair_trace.txt`
- `evidence/raw/ops/health_alert_excerpt.txt`
- `evidence/raw/ops/health_alert_suppression_check.txt`
- `evidence/raw/ops/restore_verify_excerpt.txt`

Excluded from buyer-facing remap:
- `CLAUDE.md`
- `CLAUDE_trading_addon.md`
- internal execution cards and operator-only instruction files when they are not needed as buyer-facing source material

## Core Mapping Table

| Source doc | Primary target | Secondary target(s) | Handling | Notes |
| --- | --- | --- | --- | --- |
| `GRIDFLOW_PRIVATE_DEPLOYMENT_SCOPE.txt` | `README.md` | `SUPPORT_SCOPE.md` | absorb summary | strongest buyer-facing scope boundary |
| `GRIDFLOW_PRIVATE_HANDOFF_RUNBOOK.txt` | `OPERATIONS.md` | `SUPPORT_SCOPE.md` | absorb summary | customer handoff flow and first-line ops |
| `GRIDFLOW_PRIVATE_INSTALL_CHECKLIST.txt` | `DEPLOYMENT.md` | `OPERATIONS.md` | absorb checklist summary | install acceptance and delivery checks |
| `D_OPERATIONS_RUNBOOK.txt` | `OPERATIONS.md` | `DEPLOYMENT.md`, `README.md` | absorb summary | strongest ops baseline |
| `MONITOR_RUN_GUIDE.txt` | `OPERATIONS.md` | `ARCHITECTURE.md` | absorb summary | monitor usage and operator path |
| `MONITOR_DELIVERY_CHECKLIST.txt` | `OPERATIONS.md` | `DEPLOYMENT.md` | absorb checklist summary | monitor delivery acceptance |
| `MONITOR_ENV_EXAMPLE.txt` | `DEPLOYMENT.md` | `SECURITY.md` | reference only | example config shape, not real values |
| `ASSET_SNAPSHOT.md` | `ARCHITECTURE.md` | `README.md`, `API.md`, `KNOWN_LIMITATIONS.md` | absorb summary | broad product/code snapshot |
| `DEPLOYMENT_BASELINE.txt` | `ARCHITECTURE.md` | `DEPLOYMENT.md`, `OPERATIONS.md` | absorb summary | runtime topology and paths |
| `ENV_SCHEMA.txt` | `DEPLOYMENT.md` | `SECURITY.md`, `API.md` | absorb summary | config contract and key classification |
| `DB_SCHEMA_INVENTORY.txt` | `ARCHITECTURE.md` | `KNOWN_LIMITATIONS.md` | absorb summary | live schema and ORM mismatch |
| `DB_BOOTSTRAP.txt` | `DEPLOYMENT.md` | `CHANGELOG.md` | absorb summary | blank DB baseline proof |
| `BOOTSTRAP_RUNBOOK.txt` | `DEPLOYMENT.md` | none | absorb summary | install/bootstrap operator flow |
| `DEPLOY_SOURCE_TREE.txt` | `DEPLOYMENT.md` | none | absorb summary | source packaging/deploy rules |
| `INSTALL_TEMPLATE_MAP.txt` | `DEPLOYMENT.md` | none | reference only | template inventory |
| `CONFIG_TEMPLATE_MAP.txt` | `DEPLOYMENT.md` | none | reference only | config file inventory |
| `OPS_INSTALL_PAYLOAD_MAP.txt` | `DEPLOYMENT.md` | none | reference only | rendered payload map |
| `CLEAN_VM_LIVE_INSTALL.txt` | `DEPLOYMENT.md` | `CHANGELOG.md` | reference only | clean-VM execution flow |
| `CLEAN_INSTALL_FIRST_EXECUTE.txt` | `DEPLOYMENT.md` | `CHANGELOG.md` | reference only | first execute wrapper path |
| `CLEAN_VM_PROVISION_PREREQS.txt` | `DEPLOYMENT.md` | none | reference only | infra prerequisites |
| `CLEAN_VM_READY_CHECK.txt` | `DEPLOYMENT.md` | none | reference only | clean host readiness |
| `CLEAN_VM_TRANSFER_BUNDLE.txt` | `DEPLOYMENT.md` | none | reference only | transfer packaging |
| `CLEAN_VM_TRANSFER_BUNDLE_PROOF.txt` | `DEPLOYMENT.md` | `CHANGELOG.md` | reference only | transfer proof |
| `CLEAN_VM_EXECUTION_PACKET.txt` | `DEPLOYMENT.md` | none | reference only | operator packet |
| `LOCAL_INSTALL_PIPELINE_PROOF.txt` | `DEPLOYMENT.md` | `CHANGELOG.md` | reference only | install dry-run proof |
| `LOCAL_INSTALL_PIPELINE_PROOF_FULL.txt` | `DEPLOYMENT.md` | `CHANGELOG.md` | reference only | extended install proof |
| `RESTORE_PROOF.txt` | `OPERATIONS.md` | `CHANGELOG.md`, `DEPLOYMENT.md` | absorb summary | restore verification proof |
| `OPERATIONS_EVIDENCE.md` | `OPERATIONS.md` | `CHANGELOG.md`, `KNOWN_LIMITATIONS.md` | absorb summary | ops proof and remaining gaps |
| `GRIDFLOW_RELEASE_EVIDENCE.txt` | `CHANGELOG.md` | `README.md`, `OPERATIONS.md` | absorb summary | strongest cross-area status summary |
| `GRIDFLOW_RELEASE_QUALITY_GATES.txt` | `CHANGELOG.md` | `README.md` | reference only | release gate framing |
| `MAJOR2_CLOSEOUT.txt` | `CHANGELOG.md` | `DEPLOYMENT.md` | absorb summary | deployment/doc milestone handoff |
| `MAJOR2_DRIFT_AUDIT.txt` | `CHANGELOG.md` | none | reference only | release drift audit anchor |
| `SCOPE_FREEZE.md` | `README.md` | `CHANGELOG.md`, `SUPPORT_SCOPE.md` | absorb summary | release purpose and non-goals |
| `DELIVERY_MANIFEST.md` | `README.md` | `SUPPORT_SCOPE.md`, `DEPLOYMENT.md` | absorb summary | what belongs in delivery set |
| `DELIVERY_POLICY.md` | `SUPPORT_SCOPE.md` | `README.md` | absorb summary | clean delivery policy and exclusions |
| `GRIDFLOW_DOC_INDEX.txt` | `README.md` | `DOC_MAPPING.md` | absorb summary | old document reading order |
| `AUTH_MODE_EVIDENCE.md` | `SECURITY.md` | `API.md`, `CHANGELOG.md` | absorb summary | auth/session evidence and mode boundaries |
| `auth_security_audit.md` | `SECURITY.md` | none | absorb summary | main auth storage cleanup |
| `AUTH_STORAGE_AUDIT.md` | `SECURITY.md` | none | reference only | auth storage audit anchor |
| `SECURITY_GATE_SUMMARY.md` | `SECURITY.md` | `KNOWN_LIMITATIONS.md`, `CHANGELOG.md` | absorb summary | best consolidated security status |
| `MONITOR_AUTH_BOUNDARY.md` | `SECURITY.md` | `KNOWN_LIMITATIONS.md`, `OPERATIONS.md` | absorb summary | monitor/main auth boundary |
| `SECRET_HYGIENE_NOTE.md` | `SECURITY.md` | `SUPPORT_SCOPE.md` | absorb summary | delivery hygiene and secret handling |
| `STATE_CHANGE_PROTECTION_NOTE.md` | `SECURITY.md` | `KNOWN_LIMITATIONS.md` | reference only | state-change hardening note |
| `INPUT_VALIDATION_HARDENING_NOTE.md` | `SECURITY.md` | `API.md` | reference only | current validation hardening |
| `VALIDATION_GAP_NOTE.md` | `SECURITY.md` | `API.md`, `KNOWN_LIMITATIONS.md` | absorb summary | strongest remaining validation gaps |
| `ERROR_RESPONSE_HARDENING_NOTE.md` | `SECURITY.md` | `API.md` | reference only | external error contract hardening |
| `MANUAL_ORDER_EVIDENCE.md` | `API.md` | `CHANGELOG.md` | absorb summary | manual order evidence and caveats |
| `STRATEGY_EVIDENCE.md` | `API.md` | `CHANGELOG.md`, `KNOWN_LIMITATIONS.md` | absorb summary | Grid/DCA/Rebalancing evidence status |
| `POSITIONS_DESIGN_NOTE.md` | `KNOWN_LIMITATIONS.md` | `ARCHITECTURE.md` | absorb summary | strongest current positions design note |
| `KNOWN_LIMITATIONS.md` | `KNOWN_LIMITATIONS.md` | none | keep and restructure | external limitation register |

## Sales and Evidence Mapping

| Source doc | Primary target | Secondary target(s) | Handling | Notes |
| --- | --- | --- | --- | --- |
| `sales/evidence_one_pager.md` | `README.md` | `CHANGELOG.md` | absorb summary | strongest short buyer summary |
| `sales/evidence_gap_register.md` | `KNOWN_LIMITATIONS.md` | `CHANGELOG.md` | absorb summary | blocked/missing registry |
| `sales/evidence_package_master_index.md` | `CHANGELOG.md` | `DOC_MAPPING.md` | reference only | evidence packaging structure |
| `sales/evidence_delivery_manifest.md` | `CHANGELOG.md` | `README.md` | reference only | what to show now vs later |
| `sales/evidence_diligence_bundle_index.md` | `CHANGELOG.md` | none | reference only | diligence drill-down path |
| `sales/evidence_show_now_bundle_index.md` | `README.md` | `CHANGELOG.md` | reference only | strongest current proof set |
| `sales/evidence_internal_hold_bundle_index.md` | `KNOWN_LIMITATIONS.md` | `CHANGELOG.md` | reference only | internal hold set |
| `sales/evidence_unlock_backlog.md` | `CHANGELOG.md` | `KNOWN_LIMITATIONS.md` | reference only | next evidence unlock priorities |
| `sales/evidence_pack_closeout.md` | `CHANGELOG.md` | none | reference only | pack closeout status |
| `sales/evidence_capture_checklist.md` | `CHANGELOG.md` | none | reference only | evidence capture process |
| `sales/guest_sandbox_proof_bundle.md` | `API.md` | `CHANGELOG.md` | reference only | sandbox proof bundle |
| `sales/safe_capture_path_note.md` | `KNOWN_LIMITATIONS.md` | `CHANGELOG.md` | reference only | blocked capture routes |
| `sales/auth_capture_harness.md` | `SECURITY.md` | `CHANGELOG.md` | reference only | auth capture method |

## Raw Evidence Anchor Mapping

| Source doc | Primary target | Secondary target(s) | Handling | Notes |
| --- | --- | --- | --- | --- |
| `evidence/raw/INDEX.md` | `CHANGELOG.md` | `API.md`, `OPERATIONS.md` | reference only | raw binder index |
| `evidence/raw/manual/guest_sandbox_db_extract.txt` | `API.md` | `CHANGELOG.md` | reference only | sandbox DB bridge |
| `evidence/raw/manual/guest_sandbox_position_db_bridge.txt` | `KNOWN_LIMITATIONS.md` | `API.md` | reference only | sandbox/positions schema limit |
| `evidence/raw/ops/backup_dump_presence.txt` | `OPERATIONS.md` | `CHANGELOG.md` | reference only | backup raw proof |
| `evidence/raw/ops/restore_verify_excerpt.txt` | `OPERATIONS.md` | `CHANGELOG.md` | reference only | restore raw proof |
| `evidence/raw/ops/health_alert_excerpt.txt` | `OPERATIONS.md` | `KNOWN_LIMITATIONS.md` | reference only | alert raw excerpt |
| `evidence/raw/ops/health_alert_suppression_check.txt` | `KNOWN_LIMITATIONS.md` | `OPERATIONS.md` | reference only | suppression remains limited |
| `evidence/raw/ops/emergency_stop_release_pair_trace.txt` | `OPERATIONS.md` | `KNOWN_LIMITATIONS.md` | reference only | emergency stop/release pairing gap |

## External Doc Ownership Summary

| External doc | Primary role | Primary source anchors |
| --- | --- | --- |
| `README.md` | product overview and doc entrypoint | deployment scope, asset snapshot, evidence one-pager, delivery manifest |
| `ARCHITECTURE.md` | runtime and data model overview | asset snapshot, deployment baseline, DB schema inventory |
| `DEPLOYMENT.md` | install and bootstrap contract | deployment baseline, env schema, install checklist, clean-VM docs |
| `OPERATIONS.md` | daily operations and incident handling | D operations runbook, handoff runbook, operations evidence |
| `SECURITY.md` | auth, secret, validation, error, and boundary posture | security gate summary, auth evidence, validation gap, monitor auth boundary |
| `API.md` | route-family and behavior overview | asset snapshot, manual order evidence, strategy evidence, route files |
| `CHANGELOG.md` | externally readable milestone and status log | release evidence, major closeout, evidence packaging docs |
| `KNOWN_LIMITATIONS.md` | explicit limitation register | positions design note, monitor auth boundary, security gap summaries, evidence gaps |
| `SUPPORT_SCOPE.md` | support and responsibility boundary | deployment scope, delivery policy, handoff runbook |

## OPEN

- Exact public wording for version numbers and release names is not fixed yet.
- Final buyer-facing evidence set should reference sanitized screenshots only; this mapping does not finalize which images are external-safe.
- Some install and clean-VM docs are operator-facing rather than buyer-facing. They are kept as source anchors for `DEPLOYMENT.md`, not for direct external delivery.
