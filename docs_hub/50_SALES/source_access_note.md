# Source Access Note

기준
- 작성 기준: 2026-04-25 UTC
- 문서 성격: post-freeze communication doc update
- 목적: source/code/history request 대응 문구 고정

## 기본 원칙

- first outbound deliverable은 clean delivery tarball 기준이다.
- clean/squash repo는 필요 시 diligence request artifact only다.
- full history repo는 non-deliverable이다.
- 현재 freeze artifact를 source-control tag와 동일하다고 설명하지 않는다.

## 바로 보낼 수 있는 답변 문구

### 1. "repo 전체를 받을 수 있나요?"

현재 first outbound deliverable은 고정된 clean delivery tarball 기준입니다. source-form review가 추가로 필요하면 clean/squash repo를 별도 diligence artifact로 협의할 수 있지만, full history repository는 deliverable에 포함되지 않습니다.

### 2. "full history를 볼 수 있나요?"

아니요. full history repository는 non-deliverable입니다. 이 제한은 숨기지 않으며, buyer-facing diligence에서 직접 설명합니다.

### 3. "tagged source release가 있나요?"

현재 freeze artifact는 buyer-send tarball, checksum, manifest 기준으로 고정돼 있습니다. 이를 source-control tag와 동일한 것으로 표현하지는 않습니다.

### 4. "그럼 source 자체는 전혀 못 보나요?"

first outbound는 tarball 기준입니다. 더 깊은 source review가 필요하면 clean/squash repo 형태의 diligence artifact를 별도로 논의할 수 있습니다.

## 짧은 응답형 문구

- 기본 deliverable은 clean delivery tarball입니다.
- clean/squash repo는 request-only diligence artifact입니다.
- full history repo는 non-deliverable입니다.
- 현재 freeze artifact를 tagged source release로 과장하지 않습니다.
