# 회귀 결과 정리

> 생성 파일입니다. 직접 고치지 말고 `npm run results` 로 다시 만듭니다 (원본: `reports/runs/*.json`, `service-map/coverage.yaml`, `data/known-issues.yaml`). 생성 시각 2026-09-29 17:19, 실행 기록 144건.

## 1. spec 별 최근 상태

| spec | 마지막 실행 | 결과 | 소요 | 최근 5회 | 통과 평균 |
| --- | --- | --- | ---: | --- | ---: |
| networking.vpc.create-delete | 2026-09-29 16:55 | PASS | 1분 15초 | PPPPP | 48초 |
| compute.vm-stack | 2026-09-29 17:05 | PASS | 12분 39초 | PFPFP | 13분 9초 |
| compute.vm-volume | 2026-09-29 16:02 | PASS | 16분 3초 | PPFP | 15분 57초 |
| compute.vm-stack-net | 2026-09-29 16:18 | PASS | 17분 11초 | FFPFP | 15분 44초 |
| compute.server-group | 2026-09-29 16:53 | PASS | 1분 31초 | PPP | 1분 39초 |
| security.address-group | 2026-09-29 16:54 | PASS | 2분 38초 | FPPFP | 1분 45초 |
| storage.object-storage-bucket | 2026-09-29 16:54 | PASS | 1분 24초 | FPPPP | 1분 48초 |
| management.resource-group | 2026-09-29 16:56 | PASS | 1분 1초 | PPFP | 57초 |
| iam.user-group | 2026-09-29 16:57 | PASS | 1분 1초 | PPFP | 57초 |
| compute.launch-configuration | 2026-09-29 16:55 | PASS | 1분 53초 | FPPPP | 1분 32초 |
| networking.vpc-port | 2026-09-29 16:32 | PASS | 11분 54초 | PPP | 10분 50초 |
| networking.private-dns | 2026-09-29 16:38 | PASS | 6분 8초 | FPPFP | 6분 30초 |
| storage.file-storage | 2026-09-29 17:06 | PASS | 1분 30초 | PPPFP | 3분 29초 |
| networking.dns-hosted-zone | 2026-09-29 16:44 | PASS | 5분 43초 | PPFP | 6분 12초 |
| security.security-group-rule | 2026-09-29 16:53 | PASS | 2분 14초 | FFPPP | 3분 52초 |
| networking.nat-gateway | 2026-09-29 16:32 | PASS | 18분 9초 | FFFPP | 14분 48초 |
| compute.auto-scaling-group | 2026-09-29 16:18 | PASS | 14분 21초 | FPFP | 14분 36초 |
| networking.vpc-peering | 2026-09-29 16:38 | PASS | 12분 49초 | FPPP | 12분 6초 |
| container.ske-cluster | 2026-09-29 16:01 | PASS | 21분 22초 | PPFP | 20분 30초 |
| database.postgresql | 2026-09-29 16:02 | PASS | 15분 29초 | PFPFP | 20분 37초 |
| database.mysql | 2026-09-29 16:02 | PASS | 15분 32초 | FFPFP | 15분 53초 |
| database.mariadb | 2026-09-29 16:03 | PASS | 14분 17초 | FPFP | 15분 0초 |
| database.epas | 2026-09-29 16:17 | PASS | 15분 5초 | FPFP | 15분 39초 |
| database.cachestore | 2026-09-29 16:17 | PASS | 16분 11초 | FFPFP | 15분 46초 |
| application-service.queue | 2026-09-29 16:51 | PASS | 1분 27초 | PPPP | 2분 3초 |
| management.notification-group | 2026-09-29 16:51 | PASS | 1분 41초 | PFP | 1분 29초 |
| compute.cloud-function | 2026-09-29 16:52 | PASS | 2분 4초 | FPPP | 3분 0초 |
| container.container-registry | 2026-09-29 17:06 | PASS | 5분 40초 | FFPFP | 5분 59초 |
| iam.role | 2026-09-29 16:50 | PASS | 1분 21초 | PP | 2분 57초 |
| security.certificate | 2026-09-29 16:52 | PASS | 1분 23초 | PP | 1분 17초 |
| container.repository | 2026-09-29 16:45 | PASS | 7분 11초 | FPPP | 7분 20초 |
| database.searchengine | 2026-09-28 16:04 | FAIL(unclassified) | 1분 20초 | F | - |

실행 기록은 `npm run test:stacks` 가 spec 하나를 마칠 때마다 `reports/runs/<YYYYMMDD-HHMM>-<spec id>.json` 으로 남긴다. 결과의 FAIL(class) 는 실패 분류(unclassified/environment/product/test), FAIL(known: KI-xxx) 는 알려진 이슈에 매칭된 실패.

## 2. 최근 실패 (최대 10건)

| 실행 | spec | class | 오류 | 첨부 |
| --- | --- | --- | --- | --- |
| 2026-09-29 16:52 | storage.file-storage | unclassified | TimeoutError: locator.waitFor: Timeout 10000ms exceeded. | `test-results/artifacts/storage.file-storage/storage.file-storage-File--723e1--해지-File-Storage-볼륨-생성-후-해지-regression/test-failed-7.png`, `test-results/artifacts/storage.file-storage/storage.file-storage-File--723e1--해지-File-Storage-볼륨-생성-후-해지-regression/test-failed-9.png`, `test-results/artifacts/storage.file-storage/storage.file-storage-File--723e1--해지-File-Storage-볼륨-생성-후-해지-regression/test-failed-11.png`, `test-results/artifacts/storage.file-storage/storage.file-storage-File--723e1--해지-File-Storage-볼륨-생성-후-해지-regression/test-failed-4.png`, `test-results/artifacts/storage.file-storage/storage.file-storage-File--723e1--해지-File-Storage-볼륨-생성-후-해지-regression/test-failed-6.png`, `test-results/artifacts/storage.file-storage/storage.file-storage-File--723e1--해지-File-Storage-볼륨-생성-후-해지-regression/test-failed-8.png`, `test-results/artifacts/storage.file-storage/storage.file-storage-File--723e1--해지-File-Storage-볼륨-생성-후-해지-regression/test-failed-3.png`, `test-results/artifacts/storage.file-storage/storage.file-storage-File--723e1--해지-File-Storage-볼륨-생성-후-해지-regression/test-failed-10.png`, `test-results/artifacts/storage.file-storage/storage.file-storage-File--723e1--해지-File-Storage-볼륨-생성-후-해지-regression/test-failed-2.png`, `test-results/artifacts/storage.file-storage/storage.file-storage-File--723e1--해지-File-Storage-볼륨-생성-후-해지-regression/test-failed-1.png`, `test-results/artifacts/storage.file-storage/storage.file-storage-File--723e1--해지-File-Storage-볼륨-생성-후-해지-regression/test-failed-5.png`, `test-results/artifacts/storage.file-storage/storage.file-storage-File--723e1--해지-File-Storage-볼륨-생성-후-해지-regression/screenshot-simple-crud.ts.png`, `test-results/artifacts/storage.file-storage/storage.file-storage-File--723e1--해지-File-Storage-볼륨-생성-후-해지-regression/error-context.md`, `test-results/artifacts/storage.file-storage/storage.file-storage-File--723e1--해지-File-Storage-볼륨-생성-후-해지-regression/trace.zip` |
| 2026-09-29 16:49 | container.container-registry | unclassified | Error: cr09291650b80d 상태 /Running\|Active\|Ready\|Available/i 대기 600초 초과. 마지막: (행 없음) | `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/test-failed-4.png`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/test-failed-5.png`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/test-failed-3.png`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/test-failed-1.png`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/test-failed-8.png`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/test-failed-2.png`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/test-failed-6.png`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/test-failed-7.png`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/screenshot-container.container-registry.png`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/error-context.md`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/trace.zip` |
| 2026-09-29 16:23 | compute.vm-stack | unclassified | Error: 정리 중 실패 (남은 리소스를 확인하세요): | `test-results/artifacts/compute.vm-stack/compute.vm-stack-VPC-→-Sub-a6f0c-→-Virtual-Server-생성-후-역순-삭제-regression/screenshot-compute.vm-stack.png`, `test-results/artifacts/compute.vm-stack/compute.vm-stack-VPC-→-Sub-a6f0c-→-Virtual-Server-생성-후-역순-삭제-regression/test-failed-11.png`, `test-results/artifacts/compute.vm-stack/compute.vm-stack-VPC-→-Sub-a6f0c-→-Virtual-Server-생성-후-역순-삭제-regression/test-failed-6.png`, `test-results/artifacts/compute.vm-stack/compute.vm-stack-VPC-→-Sub-a6f0c-→-Virtual-Server-생성-후-역순-삭제-regression/test-failed-5.png`, `test-results/artifacts/compute.vm-stack/compute.vm-stack-VPC-→-Sub-a6f0c-→-Virtual-Server-생성-후-역순-삭제-regression/test-failed-2.png`, `test-results/artifacts/compute.vm-stack/compute.vm-stack-VPC-→-Sub-a6f0c-→-Virtual-Server-생성-후-역순-삭제-regression/test-failed-4.png`, `test-results/artifacts/compute.vm-stack/compute.vm-stack-VPC-→-Sub-a6f0c-→-Virtual-Server-생성-후-역순-삭제-regression/test-failed-3.png`, `test-results/artifacts/compute.vm-stack/compute.vm-stack-VPC-→-Sub-a6f0c-→-Virtual-Server-생성-후-역순-삭제-regression/test-failed-7.png`, `test-results/artifacts/compute.vm-stack/compute.vm-stack-VPC-→-Sub-a6f0c-→-Virtual-Server-생성-후-역순-삭제-regression/test-failed-9.png`, `test-results/artifacts/compute.vm-stack/compute.vm-stack-VPC-→-Sub-a6f0c-→-Virtual-Server-생성-후-역순-삭제-regression/test-failed-8.png`, `test-results/artifacts/compute.vm-stack/compute.vm-stack-VPC-→-Sub-a6f0c-→-Virtual-Server-생성-후-역순-삭제-regression/test-failed-10.png`, `test-results/artifacts/compute.vm-stack/compute.vm-stack-VPC-→-Sub-a6f0c-→-Virtual-Server-생성-후-역순-삭제-regression/test-failed-1.png`, `test-results/artifacts/compute.vm-stack/compute.vm-stack-VPC-→-Sub-a6f0c-→-Virtual-Server-생성-후-역순-삭제-regression/error-context.md`, `test-results/artifacts/compute.vm-stack/compute.vm-stack-VPC-→-Sub-a6f0c-→-Virtual-Server-생성-후-역순-삭제-regression/trace.zip` |
| 2026-09-29 14:20 | container.repository | unclassified | Error: 정리 중 실패 (남은 리소스를 확인하세요): | `test-results/artifacts/container.repository/container.repository-Regis-249ea-ry-위에-Repository-생성-후-역순-삭제-regression/screenshot-container.repository.png`, `test-results/artifacts/container.repository/container.repository-Regis-249ea-ry-위에-Repository-생성-후-역순-삭제-regression/test-failed-3.png`, `test-results/artifacts/container.repository/container.repository-Regis-249ea-ry-위에-Repository-생성-후-역순-삭제-regression/test-failed-2.png`, `test-results/artifacts/container.repository/container.repository-Regis-249ea-ry-위에-Repository-생성-후-역순-삭제-regression/test-failed-4.png`, `test-results/artifacts/container.repository/container.repository-Regis-249ea-ry-위에-Repository-생성-후-역순-삭제-regression/test-failed-1.png`, `test-results/artifacts/container.repository/container.repository-Regis-249ea-ry-위에-Repository-생성-후-역순-삭제-regression/error-context.md`, `test-results/artifacts/container.repository/container.repository-Regis-249ea-ry-위에-Repository-생성-후-역순-삭제-regression/trace.zip` |
| 2026-09-29 13:55 | container.container-registry | unclassified | Error: cr092913558915 소멸 대기 600초 초과 | `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/screenshot-container.container-registry.png`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/test-failed-3.png`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/test-failed-4.png`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/test-failed-1.png`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/test-failed-2.png`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/error-context.md`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/trace.zip` |
| 2026-09-29 13:50 | compute.vm-stack-net | unclassified | Error: worker process exited unexpectedly (code=1, signal=null) |  |
| 2026-09-29 13:49 | iam.user-group | unclassified | Error: worker process exited unexpectedly (code=1, signal=null) |  |
| 2026-09-29 13:48 | management.resource-group | unclassified | Error: worker process exited unexpectedly (code=1, signal=null) |  |
| 2026-09-29 13:42 | security.address-group | unclassified | TimeoutError: locator.click: Timeout 15000ms exceeded. | `test-results/artifacts/security.address-group/security.address-group-Add-f70db--후-삭제-Address-Group-생성-후-삭제-regression/test-failed-10.png`, `test-results/artifacts/security.address-group/security.address-group-Add-f70db--후-삭제-Address-Group-생성-후-삭제-regression/test-failed-2.png`, `test-results/artifacts/security.address-group/security.address-group-Add-f70db--후-삭제-Address-Group-생성-후-삭제-regression/test-failed-9.png`, `test-results/artifacts/security.address-group/security.address-group-Add-f70db--후-삭제-Address-Group-생성-후-삭제-regression/test-failed-7.png`, `test-results/artifacts/security.address-group/security.address-group-Add-f70db--후-삭제-Address-Group-생성-후-삭제-regression/test-failed-1.png`, `test-results/artifacts/security.address-group/security.address-group-Add-f70db--후-삭제-Address-Group-생성-후-삭제-regression/test-failed-8.png`, `test-results/artifacts/security.address-group/security.address-group-Add-f70db--후-삭제-Address-Group-생성-후-삭제-regression/test-failed-3.png`, `test-results/artifacts/security.address-group/security.address-group-Add-f70db--후-삭제-Address-Group-생성-후-삭제-regression/screenshot-simple-crud.ts.png` |
| 2026-09-29 13:39 | compute.auto-scaling-group | unclassified | Error: locator.count: Target page, context or browser has been closed | `test-results/artifacts/compute.auto-scaling-group-79505-Scaling-Group-0대-생성-후-역순-삭제-regression/screenshot-compute.auto-scaling-group.png` |

## 3. 알려진 이슈

등록 1개 (활성 0개) — data/known-issues.yaml

적용된 항목 없음 (알려진 이슈로 분류된 실패가 없다)

## 4. 커버리지 (service-map/coverage.yaml)

level: 0 없음 · 1 진입(스모크) · 2 CRUD · 3 동작 · 4 통합 의존 체인. 갱신 규칙은 README "회귀 스택 스위트" 절.

- 서비스 89 · 화면 276 (Service Home 83, 그 외 193) · 스모크 진입 282
- 목록 화면 100, 그중 리소스 키 있음 112 = 장부 리소스 112개
- level ≥ 2 (CRUD 이상): **33/112** (29%) · level ≥ 3 (동작 이상): **21/112** (19%)

| 카테고리 | 리소스 | L1 | L2 | L3 | L4 |
| --- | ---: | ---: | ---: | ---: | ---: |
| AI-ML | 3 | 3 | 0 | 0 | 0 |
| Application Service | 4 | 3 | 1 | 0 | 0 |
| Compute | 15 | 9 | 2 | 1 | 3 |
| Container | 3 | 0 | 2 | 0 | 1 |
| Data Analytics | 3 | 3 | 0 | 0 | 0 |
| Database | 6 | 1 | 0 | 0 | 5 |
| DevOps Tools | 1 | 1 | 0 | 0 | 0 |
| Financial Management | 1 | 1 | 0 | 0 | 0 |
| Hybrid Cloud | 3 | 3 | 0 | 0 | 0 |
| Management | 14 | 10 | 4 | 0 | 0 |
| Networking | 44 | 33 | 0 | 2 | 9 |
| Security | 7 | 6 | 1 | 0 | 0 |
| Storage | 8 | 6 | 2 | 0 | 0 |
| **합계** | **112** | **79** | **12** | **3** | **18** |
