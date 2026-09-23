# 회귀 결과 정리

> 생성 파일입니다. 직접 고치지 말고 `npm run results` 로 다시 만듭니다 (원본: `reports/runs/*.json`, `service-map/coverage.yaml`, `data/known-issues.yaml`). 생성 시각 2026-09-23 20:01, 실행 기록 18건.

## 1. spec 별 최근 상태

| spec | 마지막 실행 | 결과 | 소요 | 최근 5회 | 통과 평균 |
| --- | --- | --- | ---: | --- | ---: |
| networking.vpc.create-delete | 2026-09-23 17:09 | PASS | 42초 | PP | 42초 |
| compute.vm-stack | 2026-09-23 17:09 | PASS | 13분 2초 | P | 13분 2초 |
| compute.vm-volume | 2026-09-23 17:22 | PASS | 15분 27초 | P | 15분 27초 |
| compute.vm-stack-net | 2026-09-23 17:38 | FAIL(unclassified) | 16분 29초 | F | - |
| compute.server-group | 기록 없음 | - | - | - | - |
| security.address-group | 기록 없음 | - | - | - | - |
| storage.object-storage-bucket | 2026-09-23 17:40 | PASS | 1분 9초 | FP | 1분 9초 |
| management.resource-group | 2026-09-23 18:00 | PASS | 52초 | P | 52초 |
| iam.user-group | 2026-09-23 18:01 | PASS | 53초 | P | 53초 |
| compute.launch-configuration | 2026-09-23 18:05 | PASS | 1분 25초 | FP | 1분 25초 |
| networking.vpc-port | 2026-09-23 18:47 | PASS | 9분 25초 | P | 9분 25초 |
| networking.private-dns | 2026-09-23 19:30 | PASS | 6분 31초 | FP | 6분 31초 |
| storage.file-storage | 2026-09-23 19:37 | PASS | 1분 18초 | P | 1분 18초 |
| networking.dns-hosted-zone | 2026-09-23 19:54 | PASS | 6분 54초 | P | 6분 54초 |
| networking.vpc-peering | 2026-09-23 19:49 | PASS | 11분 36초 | FP | 11분 36초 |

실행 기록은 `npm run test:stacks` 가 spec 하나를 마칠 때마다 `reports/runs/<YYYYMMDD-HHMM>-<spec id>.json` 으로 남긴다. 결과의 FAIL(class) 는 실패 분류(unclassified/environment/product/test), FAIL(known: KI-xxx) 는 알려진 이슈에 매칭된 실패.

## 2. 최근 실패 (최대 10건)

| 실행 | spec | class | 오류 | 첨부 |
| --- | --- | --- | --- | --- |
| 2026-09-23 19:31 | networking.vpc-peering | unclassified | Error: 정리 중 실패 (남은 리소스를 확인하세요): | `test-results/artifacts/networking.vpc-peering-VPC-c6ab1-2개-→-VPC-Peering-생성-후-역순-삭제-regression/screenshot-networking.vpc-peering.png`, `test-results/artifacts/networking.vpc-peering-VPC-c6ab1-2개-→-VPC-Peering-생성-후-역순-삭제-regression/test-failed-1.png`, `test-results/artifacts/networking.vpc-peering-VPC-c6ab1-2개-→-VPC-Peering-생성-후-역순-삭제-regression/test-failed-4.png`, `test-results/artifacts/networking.vpc-peering-VPC-c6ab1-2개-→-VPC-Peering-생성-후-역순-삭제-regression/test-failed-2.png`, `test-results/artifacts/networking.vpc-peering-VPC-c6ab1-2개-→-VPC-Peering-생성-후-역순-삭제-regression/test-failed-3.png`, `test-results/artifacts/networking.vpc-peering-VPC-c6ab1-2개-→-VPC-Peering-생성-후-역순-삭제-regression/test-failed-5.png`, `test-results/artifacts/networking.vpc-peering-VPC-c6ab1-2개-→-VPC-Peering-생성-후-역순-삭제-regression/error-context.md`, `test-results/artifacts/networking.vpc-peering-VPC-c6ab1-2개-→-VPC-Peering-생성-후-역순-삭제-regression/trace.zip` |
| 2026-09-23 19:10 | networking.private-dns | unclassified | Error: pdns-0923-1910-ec9a 상태 /Active/i 대기 180초 초과. 마지막: pdns-0923-1910-ec9a kr-west1 Creating | `test-results/artifacts/networking.private-dns-Pri-0dada-생성-후-해지-Private-DNS-생성-후-해지-regression/test-failed-3.png`, `test-results/artifacts/networking.private-dns-Pri-0dada-생성-후-해지-Private-DNS-생성-후-해지-regression/test-failed-7.png`, `test-results/artifacts/networking.private-dns-Pri-0dada-생성-후-해지-Private-DNS-생성-후-해지-regression/test-failed-6.png`, `test-results/artifacts/networking.private-dns-Pri-0dada-생성-후-해지-Private-DNS-생성-후-해지-regression/test-failed-4.png`, `test-results/artifacts/networking.private-dns-Pri-0dada-생성-후-해지-Private-DNS-생성-후-해지-regression/test-failed-1.png`, `test-results/artifacts/networking.private-dns-Pri-0dada-생성-후-해지-Private-DNS-생성-후-해지-regression/test-failed-2.png`, `test-results/artifacts/networking.private-dns-Pri-0dada-생성-후-해지-Private-DNS-생성-후-해지-regression/test-failed-5.png`, `test-results/artifacts/networking.private-dns-Pri-0dada-생성-후-해지-Private-DNS-생성-후-해지-regression/screenshot-simple-crud.ts.png`, `test-results/artifacts/networking.private-dns-Pri-0dada-생성-후-해지-Private-DNS-생성-후-해지-regression/error-context.md`, `test-results/artifacts/networking.private-dns-Pri-0dada-생성-후-해지-Private-DNS-생성-후-해지-regression/trace.zip` |
| 2026-09-23 18:02 | compute.launch-configuration | unclassified | TimeoutError: locator.click: Timeout 15000ms exceeded. | `test-results/artifacts/compute.launch-configurati-9eebd-aunch-Configuration-생성-후-삭제-regression/test-failed-8.png`, `test-results/artifacts/compute.launch-configurati-9eebd-aunch-Configuration-생성-후-삭제-regression/test-failed-4.png`, `test-results/artifacts/compute.launch-configurati-9eebd-aunch-Configuration-생성-후-삭제-regression/test-failed-3.png`, `test-results/artifacts/compute.launch-configurati-9eebd-aunch-Configuration-생성-후-삭제-regression/test-failed-2.png`, `test-results/artifacts/compute.launch-configurati-9eebd-aunch-Configuration-생성-후-삭제-regression/test-failed-1.png`, `test-results/artifacts/compute.launch-configurati-9eebd-aunch-Configuration-생성-후-삭제-regression/test-failed-5.png`, `test-results/artifacts/compute.launch-configurati-9eebd-aunch-Configuration-생성-후-삭제-regression/test-failed-6.png`, `test-results/artifacts/compute.launch-configurati-9eebd-aunch-Configuration-생성-후-삭제-regression/test-failed-7.png`, `test-results/artifacts/compute.launch-configurati-9eebd-aunch-Configuration-생성-후-삭제-regression/screenshot-simple-crud.ts.png`, `test-results/artifacts/compute.launch-configurati-9eebd-aunch-Configuration-생성-후-삭제-regression/error-context.md`, `test-results/artifacts/compute.launch-configurati-9eebd-aunch-Configuration-생성-후-삭제-regression/trace.zip` |
| 2026-09-23 17:38 | compute.vm-stack-net | unclassified | Error: 정리 중 실패 (남은 리소스를 확인하세요): | `test-results/artifacts/compute.vm-stack-net-SG·IG-c43a4-irtual-Server-스택-생성-후-역순-삭제-regression/screenshot-compute.vm-stack-net.png`, `test-results/artifacts/compute.vm-stack-net-SG·IG-c43a4-irtual-Server-스택-생성-후-역순-삭제-regression/test-failed-2.png`, `test-results/artifacts/compute.vm-stack-net-SG·IG-c43a4-irtual-Server-스택-생성-후-역순-삭제-regression/test-failed-4.png`, `test-results/artifacts/compute.vm-stack-net-SG·IG-c43a4-irtual-Server-스택-생성-후-역순-삭제-regression/test-failed-3.png`, `test-results/artifacts/compute.vm-stack-net-SG·IG-c43a4-irtual-Server-스택-생성-후-역순-삭제-regression/test-failed-1.png`, `test-results/artifacts/compute.vm-stack-net-SG·IG-c43a4-irtual-Server-스택-생성-후-역순-삭제-regression/test-failed-6.png`, `test-results/artifacts/compute.vm-stack-net-SG·IG-c43a4-irtual-Server-스택-생성-후-역순-삭제-regression/test-failed-5.png`, `test-results/artifacts/compute.vm-stack-net-SG·IG-c43a4-irtual-Server-스택-생성-후-역순-삭제-regression/test-failed-7.png`, `test-results/artifacts/compute.vm-stack-net-SG·IG-c43a4-irtual-Server-스택-생성-후-역순-삭제-regression/error-context.md`, `test-results/artifacts/compute.vm-stack-net-SG·IG-c43a4-irtual-Server-스택-생성-후-역순-삭제-regression/trace.zip` |
| 2026-09-23 17:37 | storage.object-storage-bucket | unclassified | TimeoutError: locator.click: Timeout 15000ms exceeded. | `test-results/artifacts/storage.object-storage-buc-1741a-지-Object-Storage-버킷-생성-후-해지-regression/screenshot-simple-crud.ts.png`, `test-results/artifacts/storage.object-storage-buc-1741a-지-Object-Storage-버킷-생성-후-해지-regression/test-failed-6.png`, `test-results/artifacts/storage.object-storage-buc-1741a-지-Object-Storage-버킷-생성-후-해지-regression/test-failed-2.png`, `test-results/artifacts/storage.object-storage-buc-1741a-지-Object-Storage-버킷-생성-후-해지-regression/test-failed-4.png`, `test-results/artifacts/storage.object-storage-buc-1741a-지-Object-Storage-버킷-생성-후-해지-regression/test-failed-1.png`, `test-results/artifacts/storage.object-storage-buc-1741a-지-Object-Storage-버킷-생성-후-해지-regression/test-failed-3.png`, `test-results/artifacts/storage.object-storage-buc-1741a-지-Object-Storage-버킷-생성-후-해지-regression/test-failed-7.png`, `test-results/artifacts/storage.object-storage-buc-1741a-지-Object-Storage-버킷-생성-후-해지-regression/test-failed-5.png`, `test-results/artifacts/storage.object-storage-buc-1741a-지-Object-Storage-버킷-생성-후-해지-regression/error-context.md`, `test-results/artifacts/storage.object-storage-buc-1741a-지-Object-Storage-버킷-생성-후-해지-regression/trace.zip` |

## 3. 알려진 이슈

등록 1개 (활성 0개) — data/known-issues.yaml

적용된 항목 없음 (알려진 이슈로 분류된 실패가 없다)

## 4. 커버리지 (service-map/coverage.yaml)

level: 0 없음 · 1 진입(스모크) · 2 CRUD · 3 동작 · 4 통합 의존 체인. 갱신 규칙은 README "회귀 스택 스위트" 절.

- 서비스 89 · 화면 276 (Service Home 83, 그 외 193) · 스모크 진입 282
- 목록 화면 100, 그중 리소스 키 있음 80 = 장부 리소스 80개
- level ≥ 2 (CRUD 이상): **18/80** (23%) · level ≥ 3 (동작 이상): **11/80** (14%)

| 카테고리 | 리소스 | L1 | L2 | L3 | L4 |
| --- | ---: | ---: | ---: | ---: | ---: |
| AI-ML | 3 | 3 | 0 | 0 | 0 |
| Compute | 14 | 10 | 2 | 1 | 1 |
| Data Analytics | 3 | 3 | 0 | 0 | 0 |
| Database | 6 | 6 | 0 | 0 | 0 |
| Financial Management | 1 | 1 | 0 | 0 | 0 |
| Management | 8 | 6 | 2 | 0 | 0 |
| Networking | 30 | 20 | 1 | 1 | 8 |
| Security | 7 | 7 | 0 | 0 | 0 |
| Storage | 8 | 6 | 2 | 0 | 0 |
| **합계** | **80** | **62** | **7** | **2** | **9** |
