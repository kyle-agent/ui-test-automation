# 회귀 결과 정리

> 생성 파일입니다. 직접 고치지 말고 `npm run results` 로 다시 만듭니다 (원본: `reports/runs/*.json`, `service-map/coverage.yaml`, `data/known-issues.yaml`). 생성 시각 2026-09-28 15:17, 실행 기록 55건.

## 1. spec 별 최근 상태

| spec | 마지막 실행 | 결과 | 소요 | 최근 5회 | 통과 평균 |
| --- | --- | --- | ---: | --- | ---: |
| networking.vpc.create-delete | 2026-09-23 20:04 | PASS | 42초 | PPP | 42초 |
| compute.vm-stack | 2026-09-28 10:00 | PASS | 14분 36초 | PFPFP | 13분 19초 |
| compute.vm-volume | 2026-09-23 20:21 | PASS | 16분 21초 | PP | 15분 54초 |
| compute.vm-stack-net | 2026-09-28 07:35 | PASS | 14분 16초 | FFP | 14분 16초 |
| compute.server-group | 2026-09-23 21:41 | PASS | 1분 22초 | P | 1분 22초 |
| security.address-group | 2026-09-28 10:43 | PASS | 1분 16초 | PFP | 1분 20초 |
| storage.object-storage-bucket | 2026-09-23 21:44 | PASS | 1분 20초 | FPP | 1분 15초 |
| management.resource-group | 2026-09-23 21:45 | PASS | 57초 | PP | 55초 |
| iam.user-group | 2026-09-23 21:46 | PASS | 58초 | PP | 56초 |
| compute.launch-configuration | 2026-09-23 21:47 | PASS | 1분 29초 | FPP | 1분 27초 |
| networking.vpc-port | 2026-09-23 21:49 | PASS | 11분 11초 | PP | 10분 18초 |
| networking.private-dns | 2026-09-23 22:00 | PASS | 6분 51초 | FPP | 6분 41초 |
| storage.file-storage | 2026-09-23 22:07 | PASS | 1분 55초 | PP | 1분 37초 |
| networking.dns-hosted-zone | 2026-09-23 22:09 | PASS | 5분 59초 | PP | 6분 27초 |
| security.security-group-rule | 2026-09-28 10:26 | PASS | 1분 41초 | FFFFP | 1분 41초 |
| networking.nat-gateway | 2026-09-28 10:34 | PASS | 11분 27초 | FFFP | 11분 27초 |
| compute.auto-scaling-group | 2026-09-28 10:03 | PASS | 14분 51초 | FP | 14분 51초 |
| networking.vpc-peering | 2026-09-23 22:15 | PASS | 11분 53초 | FPP | 11분 45초 |
| container.ske-cluster | 2026-09-28 14:04 | PASS | 22분 37초 | P | 22분 37초 |
| database.postgresql | 2026-09-28 14:41 | PASS | 23분 48초 | FP | 23분 48초 |

실행 기록은 `npm run test:stacks` 가 spec 하나를 마칠 때마다 `reports/runs/<YYYYMMDD-HHMM>-<spec id>.json` 으로 남긴다. 결과의 FAIL(class) 는 실패 분류(unclassified/environment/product/test), FAIL(known: KI-xxx) 는 알려진 이슈에 매칭된 실패.

## 2. 최근 실패 (최대 10건)

| 실행 | spec | class | 오류 | 첨부 |
| --- | --- | --- | --- | --- |
| 2026-09-28 14:04 | database.postgresql | unclassified | TimeoutError: locator.waitFor: Timeout 10000ms exceeded. | `test-results/artifacts/database.postgresql-VPC-→--d0e4e-eSQL-DBaaS-단일-서버-생성-후-역순-해지-regression/test-failed-2.png`, `test-results/artifacts/database.postgresql-VPC-→--d0e4e-eSQL-DBaaS-단일-서버-생성-후-역순-해지-regression/test-failed-4.png`, `test-results/artifacts/database.postgresql-VPC-→--d0e4e-eSQL-DBaaS-단일-서버-생성-후-역순-해지-regression/test-failed-1.png`, `test-results/artifacts/database.postgresql-VPC-→--d0e4e-eSQL-DBaaS-단일-서버-생성-후-역순-해지-regression/test-failed-3.png`, `test-results/artifacts/database.postgresql-VPC-→--d0e4e-eSQL-DBaaS-단일-서버-생성-후-역순-해지-regression/screenshot-database.postgresql.png`, `test-results/artifacts/database.postgresql-VPC-→--d0e4e-eSQL-DBaaS-단일-서버-생성-후-역순-해지-regression/error-context.md`, `test-results/artifacts/database.postgresql-VPC-→--d0e4e-eSQL-DBaaS-단일-서버-생성-후-역순-해지-regression/trace.zip` |
| 2026-09-28 10:38 | security.address-group | unclassified | Error: 추가한 대상 주소가 표에 보여야 합니다 | `test-results/artifacts/security.address-group-Add-f70db--후-삭제-Address-Group-생성-후-삭제-regression/test-failed-4.png`, `test-results/artifacts/security.address-group-Add-f70db--후-삭제-Address-Group-생성-후-삭제-regression/test-failed-2.png`, `test-results/artifacts/security.address-group-Add-f70db--후-삭제-Address-Group-생성-후-삭제-regression/test-failed-1.png`, `test-results/artifacts/security.address-group-Add-f70db--후-삭제-Address-Group-생성-후-삭제-regression/test-failed-3.png`, `test-results/artifacts/security.address-group-Add-f70db--후-삭제-Address-Group-생성-후-삭제-regression/screenshot-simple-crud.ts.png`, `test-results/artifacts/security.address-group-Add-f70db--후-삭제-Address-Group-생성-후-삭제-regression/error-context.md`, `test-results/artifacts/security.address-group-Add-f70db--후-삭제-Address-Group-생성-후-삭제-regression/trace.zip` |
| 2026-09-28 10:16 | security.security-group-rule | unclassified | TimeoutError: locator.fill: Timeout 15000ms exceeded. | `test-results/artifacts/security.security-group-ru-17885-ty-Group-생성-→-규칙-추가·삭제-→-해지-regression/test-failed-3.png`, `test-results/artifacts/security.security-group-ru-17885-ty-Group-생성-→-규칙-추가·삭제-→-해지-regression/test-failed-1.png`, `test-results/artifacts/security.security-group-ru-17885-ty-Group-생성-→-규칙-추가·삭제-→-해지-regression/test-failed-2.png`, `test-results/artifacts/security.security-group-ru-17885-ty-Group-생성-→-규칙-추가·삭제-→-해지-regression/screenshot-security.security-group-rule.png`, `test-results/artifacts/security.security-group-ru-17885-ty-Group-생성-→-규칙-추가·삭제-→-해지-regression/error-context.md`, `test-results/artifacts/security.security-group-ru-17885-ty-Group-생성-→-규칙-추가·삭제-→-해지-regression/trace.zip` |
| 2026-09-28 10:08 | security.security-group-rule | unclassified | Error: 추가한 규칙이 규칙 탭에 보여야 합니다 | `test-results/artifacts/security.security-group-ru-17885-ty-Group-생성-→-규칙-추가·삭제-→-해지-regression/test-failed-1.png`, `test-results/artifacts/security.security-group-ru-17885-ty-Group-생성-→-규칙-추가·삭제-→-해지-regression/test-failed-4.png`, `test-results/artifacts/security.security-group-ru-17885-ty-Group-생성-→-규칙-추가·삭제-→-해지-regression/test-failed-5.png`, `test-results/artifacts/security.security-group-ru-17885-ty-Group-생성-→-규칙-추가·삭제-→-해지-regression/test-failed-6.png`, `test-results/artifacts/security.security-group-ru-17885-ty-Group-생성-→-규칙-추가·삭제-→-해지-regression/test-failed-3.png`, `test-results/artifacts/security.security-group-ru-17885-ty-Group-생성-→-규칙-추가·삭제-→-해지-regression/test-failed-2.png`, `test-results/artifacts/security.security-group-ru-17885-ty-Group-생성-→-규칙-추가·삭제-→-해지-regression/screenshot-security.security-group-rule.png`, `test-results/artifacts/security.security-group-ru-17885-ty-Group-생성-→-규칙-추가·삭제-→-해지-regression/error-context.md`, `test-results/artifacts/security.security-group-ru-17885-ty-Group-생성-→-규칙-추가·삭제-→-해지-regression/trace.zip` |
| 2026-09-28 10:02 | networking.nat-gateway | unclassified | TimeoutError: locator.click: Timeout 15000ms exceeded. | `test-results/artifacts/networking.nat-gateway-VPC-33f68-IP-→-NAT-Gateway-생성-후-역순-삭제-regression/test-failed-1.png`, `test-results/artifacts/networking.nat-gateway-VPC-33f68-IP-→-NAT-Gateway-생성-후-역순-삭제-regression/test-failed-6.png`, `test-results/artifacts/networking.nat-gateway-VPC-33f68-IP-→-NAT-Gateway-생성-후-역순-삭제-regression/test-failed-4.png`, `test-results/artifacts/networking.nat-gateway-VPC-33f68-IP-→-NAT-Gateway-생성-후-역순-삭제-regression/test-failed-2.png`, `test-results/artifacts/networking.nat-gateway-VPC-33f68-IP-→-NAT-Gateway-생성-후-역순-삭제-regression/test-failed-5.png`, `test-results/artifacts/networking.nat-gateway-VPC-33f68-IP-→-NAT-Gateway-생성-후-역순-삭제-regression/test-failed-3.png`, `test-results/artifacts/networking.nat-gateway-VPC-33f68-IP-→-NAT-Gateway-생성-후-역순-삭제-regression/screenshot-networking.nat-gateway.png`, `test-results/artifacts/networking.nat-gateway-VPC-33f68-IP-→-NAT-Gateway-생성-후-역순-삭제-regression/test-failed-7.png`, `test-results/artifacts/networking.nat-gateway-VPC-33f68-IP-→-NAT-Gateway-생성-후-역순-삭제-regression/error-context.md` |
| 2026-09-28 10:00 | security.security-group-rule | unclassified | TimeoutError: locator.waitFor: Timeout 5000ms exceeded. | `test-results/artifacts/security.security-group-ru-17885-ty-Group-생성-→-규칙-추가·삭제-→-해지-regression/test-failed-1.png`, `test-results/artifacts/security.security-group-ru-17885-ty-Group-생성-→-규칙-추가·삭제-→-해지-regression/test-failed-3.png`, `test-results/artifacts/security.security-group-ru-17885-ty-Group-생성-→-규칙-추가·삭제-→-해지-regression/test-failed-2.png`, `test-results/artifacts/security.security-group-ru-17885-ty-Group-생성-→-규칙-추가·삭제-→-해지-regression/test-failed-4.png`, `test-results/artifacts/security.security-group-ru-17885-ty-Group-생성-→-규칙-추가·삭제-→-해지-regression/screenshot-security.security-group-rule.png`, `test-results/artifacts/security.security-group-ru-17885-ty-Group-생성-→-규칙-추가·삭제-→-해지-regression/error-context.md`, `test-results/artifacts/security.security-group-ru-17885-ty-Group-생성-→-규칙-추가·삭제-→-해지-regression/trace.zip` |
| 2026-09-28 09:56 | security.security-group-rule | unclassified | TimeoutError: locator.click: Timeout 15000ms exceeded. | `test-results/artifacts/security.security-group-ru-17885-ty-Group-생성-→-규칙-추가·삭제-→-해지-regression/test-failed-5.png`, `test-results/artifacts/security.security-group-ru-17885-ty-Group-생성-→-규칙-추가·삭제-→-해지-regression/test-failed-2.png`, `test-results/artifacts/security.security-group-ru-17885-ty-Group-생성-→-규칙-추가·삭제-→-해지-regression/test-failed-3.png`, `test-results/artifacts/security.security-group-ru-17885-ty-Group-생성-→-규칙-추가·삭제-→-해지-regression/test-failed-1.png`, `test-results/artifacts/security.security-group-ru-17885-ty-Group-생성-→-규칙-추가·삭제-→-해지-regression/test-failed-4.png`, `test-results/artifacts/security.security-group-ru-17885-ty-Group-생성-→-규칙-추가·삭제-→-해지-regression/screenshot-security.security-group-rule.png`, `test-results/artifacts/security.security-group-ru-17885-ty-Group-생성-→-규칙-추가·삭제-→-해지-regression/error-context.md`, `test-results/artifacts/security.security-group-ru-17885-ty-Group-생성-→-규칙-추가·삭제-→-해지-regression/trace.zip` |
| 2026-09-28 09:48 | networking.nat-gateway | unclassified | Error: "Public IP" 드롭다운에 /123\.41\.34\.242/ 항목이 없습니다. 보이는 항목: ["vpc-0928-0945-bad5 AZ: kr-west1-b","vpc-0928-0945-d3ea AZ: kr-west1-b","vpc-0928-0948-bd81 AZ: k | `test-results/artifacts/networking.nat-gateway-VPC-33f68-IP-→-NAT-Gateway-생성-후-역순-삭제-regression/test-failed-1.png`, `test-results/artifacts/networking.nat-gateway-VPC-33f68-IP-→-NAT-Gateway-생성-후-역순-삭제-regression/test-failed-5.png`, `test-results/artifacts/networking.nat-gateway-VPC-33f68-IP-→-NAT-Gateway-생성-후-역순-삭제-regression/test-failed-4.png`, `test-results/artifacts/networking.nat-gateway-VPC-33f68-IP-→-NAT-Gateway-생성-후-역순-삭제-regression/test-failed-2.png`, `test-results/artifacts/networking.nat-gateway-VPC-33f68-IP-→-NAT-Gateway-생성-후-역순-삭제-regression/test-failed-3.png`, `test-results/artifacts/networking.nat-gateway-VPC-33f68-IP-→-NAT-Gateway-생성-후-역순-삭제-regression/screenshot-networking.nat-gateway.png`, `test-results/artifacts/networking.nat-gateway-VPC-33f68-IP-→-NAT-Gateway-생성-후-역순-삭제-regression/error-context.md` |
| 2026-09-28 09:45 | compute.vm-stack | unclassified | Error: 상세에 /^(정지\|중지\|Stop)$/i 버튼이 없습니다. 보이는 버튼: ["시작(dis)","중지","재시작","Image 생성","콘솔 로그","Dump 생성","서비스 해지","신규 네트워크 포트로 추가","기존 네트워크 포트로 추가","신규 네트워크 포트로 추가", | `test-results/artifacts/compute.vm-stack-VPC-→-Sub-a6f0c-→-Virtual-Server-생성-후-역순-삭제-regression/test-failed-6.png`, `test-results/artifacts/compute.vm-stack-VPC-→-Sub-a6f0c-→-Virtual-Server-생성-후-역순-삭제-regression/test-failed-1.png`, `test-results/artifacts/compute.vm-stack-VPC-→-Sub-a6f0c-→-Virtual-Server-생성-후-역순-삭제-regression/test-failed-2.png`, `test-results/artifacts/compute.vm-stack-VPC-→-Sub-a6f0c-→-Virtual-Server-생성-후-역순-삭제-regression/test-failed-5.png`, `test-results/artifacts/compute.vm-stack-VPC-→-Sub-a6f0c-→-Virtual-Server-생성-후-역순-삭제-regression/test-failed-4.png`, `test-results/artifacts/compute.vm-stack-VPC-→-Sub-a6f0c-→-Virtual-Server-생성-후-역순-삭제-regression/test-failed-3.png`, `test-results/artifacts/compute.vm-stack-VPC-→-Sub-a6f0c-→-Virtual-Server-생성-후-역순-삭제-regression/screenshot-compute.vm-stack.png`, `test-results/artifacts/compute.vm-stack-VPC-→-Sub-a6f0c-→-Virtual-Server-생성-후-역순-삭제-regression/test-failed-7.png`, `test-results/artifacts/compute.vm-stack-VPC-→-Sub-a6f0c-→-Virtual-Server-생성-후-역순-삭제-regression/error-context.md`, `test-results/artifacts/compute.vm-stack-VPC-→-Sub-a6f0c-→-Virtual-Server-생성-후-역순-삭제-regression/trace.zip` |
| 2026-09-28 09:45 | compute.auto-scaling-group | unclassified | Error: "VPC명" 드롭다운에 /^vpc-0928-0945-bad5\b/ 항목이 없습니다. 보이는 항목: ["vpc-0928-0945-bad5 AZ: kr-west1-b","vpc-0928-0945-d3ea AZ: kr-west1-b","vpc-0928-0948-bd81 AZ: k | `test-results/artifacts/compute.auto-scaling-group-79505-Scaling-Group-0대-생성-후-역순-삭제-regression/test-failed-5.png`, `test-results/artifacts/compute.auto-scaling-group-79505-Scaling-Group-0대-생성-후-역순-삭제-regression/test-failed-3.png`, `test-results/artifacts/compute.auto-scaling-group-79505-Scaling-Group-0대-생성-후-역순-삭제-regression/test-failed-2.png`, `test-results/artifacts/compute.auto-scaling-group-79505-Scaling-Group-0대-생성-후-역순-삭제-regression/test-failed-4.png`, `test-results/artifacts/compute.auto-scaling-group-79505-Scaling-Group-0대-생성-후-역순-삭제-regression/test-failed-1.png`, `test-results/artifacts/compute.auto-scaling-group-79505-Scaling-Group-0대-생성-후-역순-삭제-regression/screenshot-compute.auto-scaling-group.png`, `test-results/artifacts/compute.auto-scaling-group-79505-Scaling-Group-0대-생성-후-역순-삭제-regression/error-context.md` |

## 3. 알려진 이슈

등록 1개 (활성 0개) — data/known-issues.yaml

적용된 항목 없음 (알려진 이슈로 분류된 실패가 없다)

## 4. 커버리지 (service-map/coverage.yaml)

level: 0 없음 · 1 진입(스모크) · 2 CRUD · 3 동작 · 4 통합 의존 체인. 갱신 규칙은 README "회귀 스택 스위트" 절.

- 서비스 89 · 화면 276 (Service Home 83, 그 외 193) · 스모크 진입 282
- 목록 화면 100, 그중 리소스 키 있음 112 = 장부 리소스 112개
- level ≥ 2 (CRUD 이상): **22/112** (20%) · level ≥ 3 (동작 이상): **17/112** (15%)

| 카테고리 | 리소스 | L1 | L2 | L3 | L4 |
| --- | ---: | ---: | ---: | ---: | ---: |
| AI-ML | 3 | 3 | 0 | 0 | 0 |
| Application Service | 4 | 4 | 0 | 0 | 0 |
| Compute | 15 | 10 | 1 | 1 | 3 |
| Container | 3 | 2 | 0 | 0 | 1 |
| Data Analytics | 3 | 3 | 0 | 0 | 0 |
| Database | 6 | 5 | 0 | 0 | 1 |
| DevOps Tools | 1 | 1 | 0 | 0 | 0 |
| Financial Management | 1 | 1 | 0 | 0 | 0 |
| Hybrid Cloud | 3 | 3 | 0 | 0 | 0 |
| Management | 14 | 12 | 2 | 0 | 0 |
| Networking | 44 | 33 | 0 | 2 | 9 |
| Security | 7 | 7 | 0 | 0 | 0 |
| Storage | 8 | 6 | 2 | 0 | 0 |
| **합계** | **112** | **90** | **5** | **3** | **14** |
