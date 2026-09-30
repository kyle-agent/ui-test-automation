# 회귀 결과 정리

> 생성 파일입니다. 직접 고치지 말고 `npm run results` 로 다시 만듭니다 (원본: `reports/runs/*.json`, `service-map/coverage.yaml`, `data/known-issues.yaml`). 생성 시각 2026-09-30 14:27, 실행 기록 257건.

## 1. spec 별 최근 상태

| spec | 마지막 실행 | 결과 | 소요 | 최근 5회 | 통과 평균 |
| --- | --- | --- | ---: | --- | ---: |
| networking.vpc.create-delete | 2026-09-30 11:04 | PASS | 56초 | PPPPP | 50초 |
| compute.vm-stack | 2026-09-30 10:17 | PASS | 19분 53초 | FPFPP | 14분 30초 |
| compute.vm-volume | 2026-09-30 09:51 | PASS | 18분 3초 | PPFPP | 16분 29초 |
| compute.vm-stack-net | 2026-09-30 10:13 | PASS | 24분 48초 | FPFPP | 18분 45초 |
| compute.server-group | 2026-09-30 11:02 | PASS | 1분 36초 | PPPP | 1분 38초 |
| security.address-group | 2026-09-30 11:03 | PASS | 2분 14초 | PPFPP | 1분 51초 |
| storage.object-storage-bucket | 2026-09-30 13:53 | PASS | 1분 21초 | PPPPP | 1분 41초 |
| management.resource-group | 2026-09-30 11:05 | PASS | 1분 18초 | PPFPP | 1분 2초 |
| iam.user-group | 2026-09-30 11:05 | PASS | 1분 6초 | PPFPP | 60초 |
| compute.launch-configuration | 2026-09-30 11:04 | PASS | 1분 51초 | PPPPP | 1분 35초 |
| networking.vpc-port | 2026-09-30 11:17 | PASS | 10분 56초 | PPPFP | 10분 52초 |
| networking.private-dns | 2026-09-30 10:24 | PASS | 6분 29초 | PPFPP | 6분 30초 |
| storage.file-storage | 2026-09-30 11:01 | PASS | 2분 32초 | PPFPP | 3분 17초 |
| networking.dns-hosted-zone | 2026-09-30 10:30 | PASS | 6분 3초 | PPFPP | 6분 10초 |
| security.security-group-rule | 2026-09-30 11:01 | PASS | 2분 28초 | FPPPP | 3분 31초 |
| networking.nat-gateway | 2026-09-30 10:23 | PASS | 17분 53초 | FFPPP | 15분 50초 |
| compute.auto-scaling-group | 2026-09-30 10:09 | PASS | 14분 15초 | PPFPP | 14분 37초 |
| networking.vpc-peering | 2026-09-30 10:30 | PASS | 12분 16초 | FPPPP | 12분 9초 |
| container.ske-cluster | 2026-09-30 13:56 | PASS | 29분 53초 | PPFFP | 22분 50초 |
| database.postgresql | 2026-09-30 09:50 | PASS | 16분 10초 | FPFPP | 19분 44초 |
| database.mysql | 2026-09-30 09:51 | PASS | 14분 45초 | FPFPP | 15분 30초 |
| database.mariadb | 2026-09-30 10:05 | PASS | 12분 17초 | FPFPP | 14분 6초 |
| database.epas | 2026-09-30 10:06 | PASS | 17분 17초 | FPFPP | 16분 11초 |
| database.cachestore | 2026-09-30 10:07 | PASS | 15분 3초 | FPFPP | 15분 32초 |
| application-service.queue | 2026-09-30 10:52 | PASS | 2분 34초 | PPPPP | 2분 9초 |
| management.notification-group | 2026-09-30 10:53 | PASS | 2분 7초 | PFPP | 1분 41초 |
| compute.cloud-function | 2026-09-30 10:51 | PASS | 4분 37초 | PFFPP | 3분 11초 |
| container.container-registry | 2026-09-30 11:28 | PASS | 6분 7초 | PFPFP | 6분 2초 |
| iam.role | 2026-09-30 10:49 | PASS | 1분 46초 | PPP | 2분 33초 |
| security.certificate | 2026-09-30 10:55 | PASS | 2분 31초 | PPP | 1분 42초 |
| container.repository | 2026-09-30 10:36 | PASS | 7분 14초 | FPPPP | 7분 19초 |
| security.kms-key | 2026-09-30 10:55 | PASS | 2분 10초 | PP | 1분 43초 |
| security.secrets-manager | 2026-09-30 10:55 | PASS | 3분 10초 | FPP | 2분 15초 |
| iam.policy | 2026-09-30 10:56 | PASS | 4분 8초 | FPP | 2분 59초 |
| storage.file-storage-snapshot | 2026-09-30 11:01 | PASS | 3분 9초 | PP | 2분 46초 |
| management.servicewatch-dashboard | 2026-09-30 10:56 | PASS | 2분 3초 | PP | 1분 42초 |
| management.servicewatch-log-group | 2026-09-30 10:57 | PASS | 1분 57초 | FFPP | 1분 40초 |
| management.servicewatch-event-rule | 2026-09-30 10:58 | PASS | 1분 48초 | PP | 1분 35초 |
| management.servicewatch-alert | 2026-09-30 10:58 | PASS | 2분 16초 | PP | 1분 48초 |
| compute.volume-snapshot | 2026-09-30 13:54 | PASS | 3분 32초 | FPPP | 4분 0초 |
| management.network-logging | 2026-09-30 11:48 | PASS | 2분 12초 | PFFFP | 1분 47초 |
| networking.load-balancer | 2026-09-30 11:17 | PASS | 19분 7초 | FFPFP | 17분 39초 |
| financial-management.budget | 2026-09-30 11:36 | PASS | 1분 56초 | FPFP | 1분 50초 |
| application-service.api-gateway | 2026-09-30 10:42 | PASS | 6분 11초 | PP | 5분 55초 |
| application-service.messagehub-domain | 2026-09-30 11:36 | PASS | 1분 13초 | PFP | 1분 6초 |
| application-service.messagehub-email | 2026-09-30 11:00 | PASS | 2분 39초 | FPP | 2분 4초 |
| networking.firewall | 2026-09-30 11:30 | PASS | 5분 4초 | FFPFP | 4분 51초 |
| networking.transit-gateway | 2026-09-30 10:38 | PASS | 11분 28초 | PP | 10분 45초 |
| networking.vpn | 2026-09-30 11:44 | PASS | 7분 50초 | PFFP | 7분 36초 |
| networking.vpc-endpoint | 2026-09-30 11:18 | PASS | 4분 44초 | PFP | 4분 46초 |
| networking.direct-connect | 2026-09-30 10:49 | PASS | 6분 17초 | PP | 5분 12초 |
| data-analytics.event-streams | 2026-09-30 09:50 | PASS | 14분 42초 | PP | 14분 19초 |
| database.searchengine | 2026-09-28 16:04 | FAIL(unclassified) | 1분 20초 | F | - |

실행 기록은 `npm run test:stacks` 가 spec 하나를 마칠 때마다 `reports/runs/<YYYYMMDD-HHMM>-<spec id>.json` 으로 남긴다. 결과의 FAIL(class) 는 실패 분류(unclassified/environment/product/test), FAIL(known: KI-xxx) 는 알려진 이슈에 매칭된 실패.

## 2. 최근 실패 (최대 10건)

| 실행 | spec | class | 오류 | 첨부 |
| --- | --- | --- | --- | --- |
| 2026-09-30 12:49 | container.ske-cluster | unclassified | Error: np-0930-1249-7d58 소멸 대기 600초 초과. 마지막: np-0930-1249-7d58 Standard-1 s1v1m2(vCPU 1 \| Memory 2G) Ubuntu 24.04 (Kubernetes) v1.36.3 1 / 1 Running | `test-results/artifacts/container.ske-cluster/container.ske-cluster-VPC--610b7-etes-Engine-클러스터-생성-후-역순-해지-regression/test-failed-3.png`, `test-results/artifacts/container.ske-cluster/container.ske-cluster-VPC--610b7-etes-Engine-클러스터-생성-후-역순-해지-regression/test-failed-2.png`, `test-results/artifacts/container.ske-cluster/container.ske-cluster-VPC--610b7-etes-Engine-클러스터-생성-후-역순-해지-regression/test-failed-1.png`, `test-results/artifacts/container.ske-cluster/container.ske-cluster-VPC--610b7-etes-Engine-클러스터-생성-후-역순-해지-regression/screenshot-container.ske-cluster.png`, `test-results/artifacts/container.ske-cluster/container.ske-cluster-VPC--610b7-etes-Engine-클러스터-생성-후-역순-해지-regression/test-failed-4.png`, `test-results/artifacts/container.ske-cluster/container.ske-cluster-VPC--610b7-etes-Engine-클러스터-생성-후-역순-해지-regression/error-context.md`, `test-results/artifacts/container.ske-cluster/container.ske-cluster-VPC--610b7-etes-Engine-클러스터-생성-후-역순-해지-regression/trace.zip` |
| 2026-09-30 11:45 | management.network-logging | unclassified | TimeoutError: locator.click: Timeout 15000ms exceeded. | `test-results/artifacts/management.network-logging/management.network-logging-5ac14--→-해제-Object-Storage-버킷-체인--regression/test-failed-5.png`, `test-results/artifacts/management.network-logging/management.network-logging-5ac14--→-해제-Object-Storage-버킷-체인--regression/test-failed-3.png`, `test-results/artifacts/management.network-logging/management.network-logging-5ac14--→-해제-Object-Storage-버킷-체인--regression/test-failed-1.png`, `test-results/artifacts/management.network-logging/management.network-logging-5ac14--→-해제-Object-Storage-버킷-체인--regression/test-failed-2.png`, `test-results/artifacts/management.network-logging/management.network-logging-5ac14--→-해제-Object-Storage-버킷-체인--regression/test-failed-4.png`, `test-results/artifacts/management.network-logging/management.network-logging-5ac14--→-해제-Object-Storage-버킷-체인--regression/screenshot-management.network-logging.png`, `test-results/artifacts/management.network-logging/management.network-logging-5ac14--→-해제-Object-Storage-버킷-체인--regression/error-context.md`, `test-results/artifacts/management.network-logging/management.network-logging-5ac14--→-해제-Object-Storage-버킷-체인--regression/trace.zip` |
| 2026-09-30 11:44 | container.ske-cluster | unclassified | Error: np-0930-1144-4c68 소멸 대기 1800초 초과. 마지막: np-0930-1144-4c68 Standard-1 s1v1m2(vCPU 1 \| Memory 2G) Ubuntu 24.04 (Kubernetes) v1.36.3 1 / 1 Running | `test-results/artifacts/container.ske-cluster/container.ske-cluster-VPC--610b7-etes-Engine-클러스터-생성-후-역순-해지-regression/test-failed-3.png`, `test-results/artifacts/container.ske-cluster/container.ske-cluster-VPC--610b7-etes-Engine-클러스터-생성-후-역순-해지-regression/test-failed-1.png`, `test-results/artifacts/container.ske-cluster/container.ske-cluster-VPC--610b7-etes-Engine-클러스터-생성-후-역순-해지-regression/test-failed-2.png`, `test-results/artifacts/container.ske-cluster/container.ske-cluster-VPC--610b7-etes-Engine-클러스터-생성-후-역순-해지-regression/screenshot-container.ske-cluster.png`, `test-results/artifacts/container.ske-cluster/container.ske-cluster-VPC--610b7-etes-Engine-클러스터-생성-후-역순-해지-regression/error-context.md`, `test-results/artifacts/container.ske-cluster/container.ske-cluster-VPC--610b7-etes-Engine-클러스터-생성-후-역순-해지-regression/trace.zip` |
| 2026-09-30 11:35 | management.network-logging | unclassified | TimeoutError: locator.click: Timeout 15000ms exceeded. | `test-results/artifacts/management.network-logging/management.network-logging-5ac14--→-해제-Object-Storage-버킷-체인--regression/test-failed-1.png`, `test-results/artifacts/management.network-logging/management.network-logging-5ac14--→-해제-Object-Storage-버킷-체인--regression/test-failed-3.png`, `test-results/artifacts/management.network-logging/management.network-logging-5ac14--→-해제-Object-Storage-버킷-체인--regression/test-failed-2.png`, `test-results/artifacts/management.network-logging/management.network-logging-5ac14--→-해제-Object-Storage-버킷-체인--regression/test-failed-4.png`, `test-results/artifacts/management.network-logging/management.network-logging-5ac14--→-해제-Object-Storage-버킷-체인--regression/test-failed-5.png`, `test-results/artifacts/management.network-logging/management.network-logging-5ac14--→-해제-Object-Storage-버킷-체인--regression/screenshot-management.network-logging.png`, `test-results/artifacts/management.network-logging/management.network-logging-5ac14--→-해제-Object-Storage-버킷-체인--regression/test-failed-6.png`, `test-results/artifacts/management.network-logging/management.network-logging-5ac14--→-해제-Object-Storage-버킷-체인--regression/error-context.md`, `test-results/artifacts/management.network-logging/management.network-logging-5ac14--→-해제-Object-Storage-버킷-체인--regression/trace.zip` |
| 2026-09-30 11:23 | networking.vpn | unclassified | Error: 정리 중 실패 (남은 리소스를 확인하세요): | `test-results/artifacts/networking.vpn/networking.vpn-VPC-→-IGW-→-1e97f-way-→-VPN-Tunnel-생성-후-역순-삭제-regression/screenshot-networking.vpn.png`, `test-results/artifacts/networking.vpn/networking.vpn-VPC-→-IGW-→-1e97f-way-→-VPN-Tunnel-생성-후-역순-삭제-regression/test-failed-1.png`, `test-results/artifacts/networking.vpn/networking.vpn-VPC-→-IGW-→-1e97f-way-→-VPN-Tunnel-생성-후-역순-삭제-regression/test-failed-4.png`, `test-results/artifacts/networking.vpn/networking.vpn-VPC-→-IGW-→-1e97f-way-→-VPN-Tunnel-생성-후-역순-삭제-regression/test-failed-2.png`, `test-results/artifacts/networking.vpn/networking.vpn-VPC-→-IGW-→-1e97f-way-→-VPN-Tunnel-생성-후-역순-삭제-regression/test-failed-3.png`, `test-results/artifacts/networking.vpn/networking.vpn-VPC-→-IGW-→-1e97f-way-→-VPN-Tunnel-생성-후-역순-삭제-regression/error-context.md`, `test-results/artifacts/networking.vpn/networking.vpn-VPC-→-IGW-→-1e97f-way-→-VPN-Tunnel-생성-후-역순-삭제-regression/trace.zip` |
| 2026-09-30 11:00 | application-service.messagehub-domain | unclassified | Error: browserContext.newPage: Target page, context or browser has been closed | `test-results/artifacts/application-service.messagehub-domain/application-service.messag-d13fc-e-Hub-발신-도메인-등록-후-삭제-인증-없이--regression/trace.zip` |
| 2026-09-30 10:59 | financial-management.budget | environment | Error: locator.count: Target page, context or browser has been closed | `test-results/artifacts/financial-management.budget/financial-management.budge-f761b--→-삭제-계정-예산-생성-→-금액-수정-→-삭제-regression/screenshot-financial-management.budget.png`, `test-results/artifacts/financial-management.budget/financial-management.budge-f761b--→-삭제-계정-예산-생성-→-금액-수정-→-삭제-regression/trace.zip` |
| 2026-09-30 10:59 | management.network-logging | unclassified | Error: page.waitForTimeout: Target page, context or browser has been closed | `test-results/artifacts/management.network-logging/management.network-logging-5ac14--→-해제-Object-Storage-버킷-체인--regression/screenshot-management.network-logging.png`, `test-results/artifacts/management.network-logging/management.network-logging-5ac14--→-해제-Object-Storage-버킷-체인--regression/trace.zip` |
| 2026-09-30 10:47 | networking.firewall | unclassified | Error: 목적지 주소가 들어가 있어야 합니다 | `test-results/artifacts/networking.firewall/networking.firewall-VPC-→--e8719-ewall-규칙-추가-→-규칙-삭제-→-역순-삭제-regression/test-failed-18.png`, `test-results/artifacts/networking.firewall/networking.firewall-VPC-→--e8719-ewall-규칙-추가-→-규칙-삭제-→-역순-삭제-regression/test-failed-10.png`, `test-results/artifacts/networking.firewall/networking.firewall-VPC-→--e8719-ewall-규칙-추가-→-규칙-삭제-→-역순-삭제-regression/test-failed-4.png`, `test-results/artifacts/networking.firewall/networking.firewall-VPC-→--e8719-ewall-규칙-추가-→-규칙-삭제-→-역순-삭제-regression/test-failed-11.png`, `test-results/artifacts/networking.firewall/networking.firewall-VPC-→--e8719-ewall-규칙-추가-→-규칙-삭제-→-역순-삭제-regression/test-failed-12.png`, `test-results/artifacts/networking.firewall/networking.firewall-VPC-→--e8719-ewall-규칙-추가-→-규칙-삭제-→-역순-삭제-regression/test-failed-9.png`, `test-results/artifacts/networking.firewall/networking.firewall-VPC-→--e8719-ewall-규칙-추가-→-규칙-삭제-→-역순-삭제-regression/test-failed-7.png`, `test-results/artifacts/networking.firewall/networking.firewall-VPC-→--e8719-ewall-규칙-추가-→-규칙-삭제-→-역순-삭제-regression/test-failed-6.png`, `test-results/artifacts/networking.firewall/networking.firewall-VPC-→--e8719-ewall-규칙-추가-→-규칙-삭제-→-역순-삭제-regression/test-failed-8.png`, `test-results/artifacts/networking.firewall/networking.firewall-VPC-→--e8719-ewall-규칙-추가-→-규칙-삭제-→-역순-삭제-regression/test-failed-13.png`, `test-results/artifacts/networking.firewall/networking.firewall-VPC-→--e8719-ewall-규칙-추가-→-규칙-삭제-→-역순-삭제-regression/test-failed-2.png`, `test-results/artifacts/networking.firewall/networking.firewall-VPC-→--e8719-ewall-규칙-추가-→-규칙-삭제-→-역순-삭제-regression/test-failed-3.png`, `test-results/artifacts/networking.firewall/networking.firewall-VPC-→--e8719-ewall-규칙-추가-→-규칙-삭제-→-역순-삭제-regression/test-failed-14.png`, `test-results/artifacts/networking.firewall/networking.firewall-VPC-→--e8719-ewall-규칙-추가-→-규칙-삭제-→-역순-삭제-regression/test-failed-17.png`, `test-results/artifacts/networking.firewall/networking.firewall-VPC-→--e8719-ewall-규칙-추가-→-규칙-삭제-→-역순-삭제-regression/test-failed-5.png`, `test-results/artifacts/networking.firewall/networking.firewall-VPC-→--e8719-ewall-규칙-추가-→-규칙-삭제-→-역순-삭제-regression/test-failed-16.png`, `test-results/artifacts/networking.firewall/networking.firewall-VPC-→--e8719-ewall-규칙-추가-→-규칙-삭제-→-역순-삭제-regression/screenshot-networking.firewall.png`, `test-results/artifacts/networking.firewall/networking.firewall-VPC-→--e8719-ewall-규칙-추가-→-규칙-삭제-→-역순-삭제-regression/test-failed-19.png`, `test-results/artifacts/networking.firewall/networking.firewall-VPC-→--e8719-ewall-규칙-추가-→-규칙-삭제-→-역순-삭제-regression/error-context.md`, `test-results/artifacts/networking.firewall/networking.firewall-VPC-→--e8719-ewall-규칙-추가-→-규칙-삭제-→-역순-삭제-regression/trace.zip` |
| 2026-09-30 10:42 | container.container-registry | unclassified | Error: cr093010428184 상태 /Running\|Active\|Ready\|Available/i 대기 600초 초과. 마지막: (행 없음) | `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/test-failed-19.png`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/test-failed-13.png`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/test-failed-6.png`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/test-failed-5.png`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/test-failed-4.png`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/test-failed-8.png`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/test-failed-10.png`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/test-failed-9.png`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/test-failed-14.png`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/test-failed-3.png`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/test-failed-12.png`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/test-failed-2.png`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/test-failed-11.png`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/test-failed-15.png`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/test-failed-7.png`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/test-failed-18.png`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/test-failed-1.png`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/test-failed-16.png`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/test-failed-17.png`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/screenshot-container.container-registry.png` |

## 3. 알려진 이슈

등록 1개 (활성 0개) — data/known-issues.yaml

적용된 항목 없음 (알려진 이슈로 분류된 실패가 없다)

## 4. 커버리지 (service-map/coverage.yaml)

level: 0 없음 · 1 진입(스모크) · 2 CRUD · 3 동작 · 4 통합 의존 체인. 갱신 규칙은 README "회귀 스택 스위트" 절.

- 서비스 89 · 화면 276 (Service Home 83, 그 외 193) · 스모크 진입 282
- 목록 화면 100, 그중 리소스 키 있음 112 = 장부 리소스 112개
- level ≥ 2 (CRUD 이상): **47/112** (42%) · level ≥ 3 (동작 이상): **30/112** (27%)

| 카테고리 | 리소스 | L1 | L2 | L3 | L4 |
| --- | ---: | ---: | ---: | ---: | ---: |
| AI-ML | 3 | 3 | 0 | 0 | 0 |
| Application Service | 4 | 2 | 1 | 1 | 0 |
| Compute | 15 | 9 | 1 | 2 | 3 |
| Container | 3 | 0 | 2 | 0 | 1 |
| Data Analytics | 3 | 2 | 1 | 0 | 0 |
| Database | 6 | 1 | 0 | 0 | 5 |
| DevOps Tools | 1 | 1 | 0 | 0 | 0 |
| Financial Management | 1 | 1 | 0 | 0 | 0 |
| Hybrid Cloud | 3 | 3 | 0 | 0 | 0 |
| Management | 14 | 9 | 3 | 2 | 0 |
| Networking | 44 | 24 | 6 | 5 | 9 |
| Security | 7 | 4 | 2 | 1 | 0 |
| Storage | 8 | 6 | 1 | 1 | 0 |
| **합계** | **112** | **65** | **17** | **12** | **18** |
