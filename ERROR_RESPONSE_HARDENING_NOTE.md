# ERROR_RESPONSE_HARDENING_NOTE

이번 문서는 메인 앱의 500 계열 오류 응답에서 내부 예외 문자열 직접 노출 패턴을 줄이기 위한 1차 정리 메모다.
이번 턴은 외부 응답 일반화만 다루며, CSRF/Origin/Referer/입력 검증 체계 개편은 범위 밖이다.

## 수정 파일 목록

- `app/api/auth_routes.py`
- `app/api/routes.py`
- `app/api/grid_routes.py`
- `app/api/dca_routes.py`
- `app/api/rebalancing_routes.py`
- `app/api/bithumb_routes.py`

## 정리한 노출 패턴 유형

- `HTTPException(500, str(e))`
- `HTTPException(500, f"... {e}")`
- 샌드박스/DB 처리 예외를 외부 응답 detail로 직접 전달하던 패턴

## 외부 응답 정책 요약

- 500 계열 외부 응답은 일반화된 메시지로 정리
- 내부 예외 문자열, 쿼리 정보, 구현 세부, 자격정보 추정 가능 문자열은 외부 응답에서 제거
- 기존 `print` 기반 내부 추적은 가능한 범위에서 유지
- 기존 4xx 의미는 유지

## 아직 남은 추가 점검 필요 항목

- 이번 대상 밖 라우트에 동일한 패턴이 남아 있는지 추가 확인 필요
- main app 전역 예외 핸들러 부재로 인한 응답 정책 불일치 가능성은 추가 확인 필요
- 4xx 중에도 내부 구현 정보가 과도하게 드러나는 문구가 있는지 별도 점검 필요

## 이번 턴 범위 밖 항목

- CSRF 보호
- Origin/Referer/custom-header 보호
- 입력 검증 체계 정리
- monitor 앱 정책 변경
