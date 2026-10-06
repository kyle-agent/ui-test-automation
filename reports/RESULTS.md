# 회귀 결과 정리

> 생성 파일입니다. 직접 고치지 말고 `npm run results` 로 다시 만듭니다 (원본: `reports/runs/*.json`, `service-map/coverage.yaml`, `data/known-issues.yaml`). 생성 시각 2026-10-06 16:42, 실행 기록 485건.

## 1. spec 별 최근 상태

| spec | 마지막 실행 | 결과 | 소요 | 최근 5회 | 통과 평균 |
| --- | --- | --- | ---: | --- | ---: |
| networking.vpc.create-delete | 2026-10-06 16:20 | PASS | 1분 7초 | PPPPP | 54초 |
| compute.vm-stack | 2026-10-06 14:47 | PASS | 26분 42초 | PPPPP | 17분 13초 |
| compute.vm-volume | 2026-10-06 15:05 | PASS | 18분 42초 | FPPPP | 17분 25초 |
| compute.vm-stack-net | 2026-10-06 15:20 | PASS | 20분 5초 | FPPPP | 20분 1초 |
| compute.server-group | 2026-10-06 16:17 | PASS | 2분 13초 | PPPPP | 1분 40초 |
| security.address-group | 2026-10-06 16:18 | PASS | 2분 13초 | FPPPP | 2분 3초 |
| storage.object-storage-bucket | 2026-10-06 16:18 | PASS | 3분 18초 | FFPPP | 2분 1초 |
| management.resource-group | 2026-10-06 16:20 | PASS | 2분 2초 | PPPPP | 1분 22초 |
| iam.user-group | 2026-10-06 16:21 | PASS | 1분 22초 | FPPPP | 1분 3초 |
| compute.launch-configuration | 2026-10-06 16:19 | PASS | 1분 48초 | PPPPP | 1분 39초 |
| networking.vpc-port | 2026-10-06 15:13 | PASS | 15분 54초 | FPPPP | 13분 24초 |
| networking.private-dns | 2026-10-06 16:31 | PASS | 6분 10초 | PFPFP | 6분 21초 |
| storage.file-storage | 2026-10-06 16:15 | PASS | 2분 0초 | FPPPP | 2분 56초 |
| networking.dns-hosted-zone | 2026-10-06 15:52 | PASS | 8분 58초 | FFPPP | 7분 14초 |
| security.security-group-rule | 2026-10-06 16:16 | PASS | 2분 20초 | PPPPP | 3분 10초 |
| networking.nat-gateway | 2026-10-06 15:36 | PASS | 13분 35초 | PPPPP | 14분 47초 |
| compute.auto-scaling-group | 2026-10-06 15:18 | PASS | 14분 54초 | FPPPP | 14분 31초 |
| networking.vpc-peering | 2026-10-06 15:35 | PASS | 15분 49초 | FFPPP | 13분 8초 |
| container.ske-cluster | 2026-10-06 14:11 | PASS | 34분 36초 | FFPPP | 25분 33초 |
| database.postgresql | 2026-10-06 14:10 | PASS | 35분 20초 | PFPPP | 26분 15초 |
| database.mysql | 2026-10-06 14:10 | PASS | 36분 7초 | PFPPP | 25분 18초 |
| database.mariadb | 2026-10-06 14:11 | PASS | 36분 32초 | PPPPP | 24분 22초 |
| database.epas | 2026-10-06 14:11 | PASS | 33분 25초 | PPPPP | 24분 13초 |
| database.cachestore | 2026-10-06 15:14 | PASS | 15분 37초 | FPPPP | 15분 39초 |
| application-service.queue | 2026-10-06 16:06 | PASS | 1분 56초 | PPPPP | 1분 58초 |
| management.notification-group | 2026-10-06 16:06 | PASS | 2분 15초 | PPPPP | 1분 42초 |
| compute.cloud-function | 2026-10-06 16:03 | PASS | 4분 21초 | FPPPP | 3분 26초 |
| container.container-registry | 2026-10-06 15:24 | PASS | 15분 15초 | FPFPP | 9분 1초 |
| iam.role | 2026-10-06 16:01 | PASS | 2분 23초 | PPPPP | 2분 17초 |
| security.certificate | 2026-10-06 16:07 | PASS | 1분 54초 | PPFPP | 1분 42초 |
| container.repository | 2026-10-06 15:39 | PASS | 13분 33초 | PPFPP | 8분 47초 |
| security.kms-key | 2026-10-06 16:07 | PASS | 2분 27초 | PPFPP | 1분 47초 |
| security.secrets-manager | 2026-10-06 16:08 | PASS | 2분 3초 | FPPPP | 2분 12초 |
| iam.policy | 2026-10-06 16:08 | PASS | 2분 51초 | FPPPP | 3분 8초 |
| storage.file-storage-snapshot | 2026-10-06 16:03 | PASS | 3분 32초 | FFPPP | 3분 13초 |
| management.servicewatch-dashboard | 2026-10-06 16:09 | PASS | 1분 53초 | PPPP | 1분 49초 |
| management.servicewatch-log-group | 2026-10-06 16:10 | PASS | 2분 9초 | PFFPP | 1분 40초 |
| management.servicewatch-event-rule | 2026-10-06 16:10 | PASS | 1분 49초 | PPPP | 1분 41초 |
| management.servicewatch-alert | 2026-10-06 16:11 | PASS | 2분 24초 | PPPP | 2분 9초 |
| compute.volume-snapshot | 2026-10-06 15:59 | PASS | 4분 18초 | FFPPP | 3분 56초 |
| management.network-logging | 2026-10-06 16:11 | PASS | 3분 0초 | FFPPP | 2분 24초 |
| networking.load-balancer | 2026-10-06 14:46 | PASS | 33분 43초 | PPFPP | 22분 28초 |
| financial-management.budget | 2026-10-06 16:12 | PASS | 2분 42초 | PFPPP | 2분 19초 |
| application-service.api-gateway | 2026-10-06 15:50 | PASS | 9분 58초 | FFPPP | 8분 3초 |
| application-service.messagehub-domain | 2026-10-06 16:12 | PASS | 1분 44초 | PFPPP | 1분 21초 |
| application-service.messagehub-email | 2026-10-06 16:13 | PASS | 2분 4초 | FPPPP | 2분 3초 |
| networking.firewall | 2026-10-06 16:00 | PASS | 5분 58초 | PFPPP | 5분 25초 |
| networking.transit-gateway | 2026-10-06 15:36 | PASS | 15분 49초 | PFPPP | 12분 34초 |
| networking.vpn | 2026-10-06 15:40 | PASS | 11분 43초 | PFPPP | 9분 19초 |
| networking.vpc-endpoint | 2026-10-06 16:00 | PASS | 5분 37초 | FPPPP | 4분 52초 |
| networking.direct-connect | 2026-10-06 15:53 | PASS | 6분 16초 | PPFPP | 6분 0초 |
| data-analytics.event-streams | 2026-10-06 14:45 | PASS | 19분 7초 | PFFPP | 17분 52초 |
| networking.cdn | 2026-10-06 14:45 | PASS | 33분 7초 | PPFPP | 28분 38초 |
| networking.gslb | 2026-10-06 16:17 | PASS | 4분 20초 | FFFPP | 2분 41초 |
| networking.privatelink-service | 2026-10-06 14:47 | PASS | 26분 13초 | PFFPP | 18분 52초 |
| networking.cloud-wan-network | 2026-10-06 16:13 | PASS | 1분 50초 | FPPPP | 1분 33초 |
| networking.cloud-fabric-connect | 2026-10-06 16:14 | PASS | 3분 16초 | FFPPP | 2분 19초 |
| networking.cloud-lan-data-center | 2026-10-06 15:51 | PASS | 8분 32초 | FPFPP | 6분 35초 |
| iam.saml-provider | 2026-10-06 16:14 | PASS | 1분 46초 | FPP | 1분 20초 |
| management.trail | 2026-10-06 16:15 | PASS | 2분 57초 | FPP | 2분 35초 |
| devops-tools.devops-service | 2026-10-06 16:15 | PASS | 1분 43초 | PP | 1분 28초 |
| database.searchengine | 2026-09-28 16:04 | FAIL(unclassified) | 1분 20초 | F | - |

실행 기록은 `npm run test:stacks` 가 spec 하나를 마칠 때마다 `reports/runs/<YYYYMMDD-HHMM>-<spec id>.json` 으로 남긴다. 결과의 FAIL(class) 는 실패 분류(unclassified/environment/product/test), FAIL(known: KI-xxx) 는 알려진 이슈에 매칭된 실패.

## 2. 최근 실패 (최대 10건)

| 실행 | spec | class | 오류 | 첨부 |
| --- | --- | --- | --- | --- |
| 2026-10-06 15:52 | networking.private-dns | environment | Test timeout of 900000ms exceeded. | `test-results/artifacts/networking.private-dns/networking.private-dns-Pri-0dada-생성-후-해지-Private-DNS-생성-후-해지-regression/test-failed-12.png`, `test-results/artifacts/networking.private-dns/networking.private-dns-Pri-0dada-생성-후-해지-Private-DNS-생성-후-해지-regression/test-failed-2.png`, `test-results/artifacts/networking.private-dns/networking.private-dns-Pri-0dada-생성-후-해지-Private-DNS-생성-후-해지-regression/test-failed-1.png`, `test-results/artifacts/networking.private-dns/networking.private-dns-Pri-0dada-생성-후-해지-Private-DNS-생성-후-해지-regression/test-failed-8.png`, `test-results/artifacts/networking.private-dns/networking.private-dns-Pri-0dada-생성-후-해지-Private-DNS-생성-후-해지-regression/test-failed-3.png`, `test-results/artifacts/networking.private-dns/networking.private-dns-Pri-0dada-생성-후-해지-Private-DNS-생성-후-해지-regression/test-failed-6.png`, `test-results/artifacts/networking.private-dns/networking.private-dns-Pri-0dada-생성-후-해지-Private-DNS-생성-후-해지-regression/test-failed-9.png`, `test-results/artifacts/networking.private-dns/networking.private-dns-Pri-0dada-생성-후-해지-Private-DNS-생성-후-해지-regression/test-failed-4.png`, `test-results/artifacts/networking.private-dns/networking.private-dns-Pri-0dada-생성-후-해지-Private-DNS-생성-후-해지-regression/test-failed-11.png`, `test-results/artifacts/networking.private-dns/networking.private-dns-Pri-0dada-생성-후-해지-Private-DNS-생성-후-해지-regression/test-failed-5.png`, `test-results/artifacts/networking.private-dns/networking.private-dns-Pri-0dada-생성-후-해지-Private-DNS-생성-후-해지-regression/test-failed-7.png`, `test-results/artifacts/networking.private-dns/networking.private-dns-Pri-0dada-생성-후-해지-Private-DNS-생성-후-해지-regression/test-failed-10.png`, `test-results/artifacts/networking.private-dns/networking.private-dns-Pri-0dada-생성-후-해지-Private-DNS-생성-후-해지-regression/screenshot-simple-crud.ts.png`, `test-results/artifacts/networking.private-dns/networking.private-dns-Pri-0dada-생성-후-해지-Private-DNS-생성-후-해지-regression/error-context.md` |
| 2026-10-06 12:19 | networking.load-balancer | unclassified | Error: "설명" 수정 아이콘을 눌러도 모달이 열리지 않습니다 | `test-results/artifacts/networking.load-balancer/networking.load-balancer-V-e09f9-Public-NAT-IP-연결·해제-→-역순-삭제-regression/test-failed-1.png`, `test-results/artifacts/networking.load-balancer/networking.load-balancer-V-e09f9-Public-NAT-IP-연결·해제-→-역순-삭제-regression/test-failed-2.png`, `test-results/artifacts/networking.load-balancer/networking.load-balancer-V-e09f9-Public-NAT-IP-연결·해제-→-역순-삭제-regression/test-failed-5.png`, `test-results/artifacts/networking.load-balancer/networking.load-balancer-V-e09f9-Public-NAT-IP-연결·해제-→-역순-삭제-regression/test-failed-6.png`, `test-results/artifacts/networking.load-balancer/networking.load-balancer-V-e09f9-Public-NAT-IP-연결·해제-→-역순-삭제-regression/test-failed-3.png`, `test-results/artifacts/networking.load-balancer/networking.load-balancer-V-e09f9-Public-NAT-IP-연결·해제-→-역순-삭제-regression/test-failed-4.png`, `test-results/artifacts/networking.load-balancer/networking.load-balancer-V-e09f9-Public-NAT-IP-연결·해제-→-역순-삭제-regression/screenshot-networking.load-balancer.png`, `test-results/artifacts/networking.load-balancer/networking.load-balancer-V-e09f9-Public-NAT-IP-연결·해제-→-역순-삭제-regression/error-context.md`, `test-results/artifacts/networking.load-balancer/networking.load-balancer-V-e09f9-Public-NAT-IP-연결·해제-→-역순-삭제-regression/trace.zip` |
| 2026-10-06 11:45 | networking.cdn | unclassified | TimeoutError: locator.click: Timeout 15000ms exceeded. | `test-results/artifacts/networking.cdn/networking.cdn-Global-CDN-생성-후-해지-Global-CDN-생성-후-해지-regression/screenshot-networking.cdn.png`, `test-results/artifacts/networking.cdn/networking.cdn-Global-CDN-생성-후-해지-Global-CDN-생성-후-해지-regression/test-failed-1.png`, `test-results/artifacts/networking.cdn/networking.cdn-Global-CDN-생성-후-해지-Global-CDN-생성-후-해지-regression/test-failed-5.png`, `test-results/artifacts/networking.cdn/networking.cdn-Global-CDN-생성-후-해지-Global-CDN-생성-후-해지-regression/test-failed-2.png`, `test-results/artifacts/networking.cdn/networking.cdn-Global-CDN-생성-후-해지-Global-CDN-생성-후-해지-regression/test-failed-3.png`, `test-results/artifacts/networking.cdn/networking.cdn-Global-CDN-생성-후-해지-Global-CDN-생성-후-해지-regression/test-failed-4.png`, `test-results/artifacts/networking.cdn/networking.cdn-Global-CDN-생성-후-해지-Global-CDN-생성-후-해지-regression/error-context.md`, `test-results/artifacts/networking.cdn/networking.cdn-Global-CDN-생성-후-해지-Global-CDN-생성-후-해지-regression/trace.zip` |
| 2026-10-06 11:40 | data-analytics.event-streams | unclassified | Error: 정리 중 실패 (남은 리소스를 확인하세요): | `test-results/artifacts/data-analytics.event-streams/data-analytics.event-strea-56b91--Kafka-Broker-1대-생성-후-역순-해지-regression/screenshot-dbaas.ts.png`, `test-results/artifacts/data-analytics.event-streams/data-analytics.event-strea-56b91--Kafka-Broker-1대-생성-후-역순-해지-regression/test-failed-3.png`, `test-results/artifacts/data-analytics.event-streams/data-analytics.event-strea-56b91--Kafka-Broker-1대-생성-후-역순-해지-regression/test-failed-1.png`, `test-results/artifacts/data-analytics.event-streams/data-analytics.event-strea-56b91--Kafka-Broker-1대-생성-후-역순-해지-regression/test-failed-2.png`, `test-results/artifacts/data-analytics.event-streams/data-analytics.event-strea-56b91--Kafka-Broker-1대-생성-후-역순-해지-regression/test-failed-4.png`, `test-results/artifacts/data-analytics.event-streams/data-analytics.event-strea-56b91--Kafka-Broker-1대-생성-후-역순-해지-regression/error-context.md`, `test-results/artifacts/data-analytics.event-streams/data-analytics.event-strea-56b91--Kafka-Broker-1대-생성-후-역순-해지-regression/trace.zip` |
| 2026-10-06 11:22 | container.repository | unclassified | Error: "scp-console-tests 1006-1123-f6bd" 텍스트가 보여야 합니다 (모든 프레임 검사) | `test-results/artifacts/container.repository/container.repository-Regis-249ea-ry-위에-Repository-생성-후-역순-삭제-regression/test-failed-6.png`, `test-results/artifacts/container.repository/container.repository-Regis-249ea-ry-위에-Repository-생성-후-역순-삭제-regression/test-failed-1.png`, `test-results/artifacts/container.repository/container.repository-Regis-249ea-ry-위에-Repository-생성-후-역순-삭제-regression/test-failed-2.png`, `test-results/artifacts/container.repository/container.repository-Regis-249ea-ry-위에-Repository-생성-후-역순-삭제-regression/test-failed-5.png`, `test-results/artifacts/container.repository/container.repository-Regis-249ea-ry-위에-Repository-생성-후-역순-삭제-regression/test-failed-4.png`, `test-results/artifacts/container.repository/container.repository-Regis-249ea-ry-위에-Repository-생성-후-역순-삭제-regression/test-failed-3.png`, `test-results/artifacts/container.repository/container.repository-Regis-249ea-ry-위에-Repository-생성-후-역순-삭제-regression/screenshot-container.repository.png`, `test-results/artifacts/container.repository/container.repository-Regis-249ea-ry-위에-Repository-생성-후-역순-삭제-regression/error-context.md`, `test-results/artifacts/container.repository/container.repository-Regis-249ea-ry-위에-Repository-생성-후-역순-삭제-regression/trace.zip` |
| 2026-10-06 11:13 | networking.gslb | unclassified | Error: 연결 대상 Weight 5 | `test-results/artifacts/networking.gslb/networking.gslb-GSLB-생성-후-해지-GSLB-생성-후-해지-regression/test-failed-6.png`, `test-results/artifacts/networking.gslb/networking.gslb-GSLB-생성-후-해지-GSLB-생성-후-해지-regression/test-failed-5.png`, `test-results/artifacts/networking.gslb/networking.gslb-GSLB-생성-후-해지-GSLB-생성-후-해지-regression/test-failed-4.png`, `test-results/artifacts/networking.gslb/networking.gslb-GSLB-생성-후-해지-GSLB-생성-후-해지-regression/test-failed-1.png`, `test-results/artifacts/networking.gslb/networking.gslb-GSLB-생성-후-해지-GSLB-생성-후-해지-regression/test-failed-2.png`, `test-results/artifacts/networking.gslb/networking.gslb-GSLB-생성-후-해지-GSLB-생성-후-해지-regression/test-failed-3.png`, `test-results/artifacts/networking.gslb/networking.gslb-GSLB-생성-후-해지-GSLB-생성-후-해지-regression/screenshot-simple-crud.ts.png`, `test-results/artifacts/networking.gslb/networking.gslb-GSLB-생성-후-해지-GSLB-생성-후-해지-regression/error-context.md`, `test-results/artifacts/networking.gslb/networking.gslb-GSLB-생성-후-해지-GSLB-생성-후-해지-regression/trace.zip` |
| 2026-10-06 11:08 | data-analytics.event-streams | unclassified | TimeoutError: locator.click: Timeout 15000ms exceeded. | `test-results/artifacts/data-analytics.event-streams/data-analytics.event-strea-56b91--Kafka-Broker-1대-생성-후-역순-해지-regression/test-failed-1.png`, `test-results/artifacts/data-analytics.event-streams/data-analytics.event-strea-56b91--Kafka-Broker-1대-생성-후-역순-해지-regression/test-failed-5.png`, `test-results/artifacts/data-analytics.event-streams/data-analytics.event-strea-56b91--Kafka-Broker-1대-생성-후-역순-해지-regression/test-failed-4.png`, `test-results/artifacts/data-analytics.event-streams/data-analytics.event-strea-56b91--Kafka-Broker-1대-생성-후-역순-해지-regression/test-failed-2.png`, `test-results/artifacts/data-analytics.event-streams/data-analytics.event-strea-56b91--Kafka-Broker-1대-생성-후-역순-해지-regression/test-failed-3.png`, `test-results/artifacts/data-analytics.event-streams/data-analytics.event-strea-56b91--Kafka-Broker-1대-생성-후-역순-해지-regression/screenshot-dbaas.ts.png`, `test-results/artifacts/data-analytics.event-streams/data-analytics.event-strea-56b91--Kafka-Broker-1대-생성-후-역순-해지-regression/test-failed-6.png`, `test-results/artifacts/data-analytics.event-streams/data-analytics.event-strea-56b91--Kafka-Broker-1대-생성-후-역순-해지-regression/error-context.md`, `test-results/artifacts/data-analytics.event-streams/data-analytics.event-strea-56b91--Kafka-Broker-1대-생성-후-역순-해지-regression/trace.zip` |
| 2026-10-06 11:08 | networking.gslb | unclassified | Error: 연결 대상 Weight 5 | `test-results/artifacts/networking.gslb/networking.gslb-GSLB-생성-후-해지-GSLB-생성-후-해지-regression/test-failed-5.png`, `test-results/artifacts/networking.gslb/networking.gslb-GSLB-생성-후-해지-GSLB-생성-후-해지-regression/test-failed-1.png`, `test-results/artifacts/networking.gslb/networking.gslb-GSLB-생성-후-해지-GSLB-생성-후-해지-regression/test-failed-4.png`, `test-results/artifacts/networking.gslb/networking.gslb-GSLB-생성-후-해지-GSLB-생성-후-해지-regression/test-failed-2.png`, `test-results/artifacts/networking.gslb/networking.gslb-GSLB-생성-후-해지-GSLB-생성-후-해지-regression/test-failed-3.png`, `test-results/artifacts/networking.gslb/networking.gslb-GSLB-생성-후-해지-GSLB-생성-후-해지-regression/test-failed-6.png`, `test-results/artifacts/networking.gslb/networking.gslb-GSLB-생성-후-해지-GSLB-생성-후-해지-regression/screenshot-simple-crud.ts.png`, `test-results/artifacts/networking.gslb/networking.gslb-GSLB-생성-후-해지-GSLB-생성-후-해지-regression/error-context.md`, `test-results/artifacts/networking.gslb/networking.gslb-GSLB-생성-후-해지-GSLB-생성-후-해지-regression/trace.zip` |
| 2026-10-06 11:03 | networking.gslb | unclassified | Error: expect(locator).toContainText(expected) failed | `test-results/artifacts/networking.gslb/networking.gslb-GSLB-생성-후-해지-GSLB-생성-후-해지-regression/test-failed-6.png`, `test-results/artifacts/networking.gslb/networking.gslb-GSLB-생성-후-해지-GSLB-생성-후-해지-regression/test-failed-5.png`, `test-results/artifacts/networking.gslb/networking.gslb-GSLB-생성-후-해지-GSLB-생성-후-해지-regression/test-failed-1.png`, `test-results/artifacts/networking.gslb/networking.gslb-GSLB-생성-후-해지-GSLB-생성-후-해지-regression/test-failed-4.png`, `test-results/artifacts/networking.gslb/networking.gslb-GSLB-생성-후-해지-GSLB-생성-후-해지-regression/test-failed-3.png`, `test-results/artifacts/networking.gslb/networking.gslb-GSLB-생성-후-해지-GSLB-생성-후-해지-regression/test-failed-2.png`, `test-results/artifacts/networking.gslb/networking.gslb-GSLB-생성-후-해지-GSLB-생성-후-해지-regression/screenshot-simple-crud.ts.png`, `test-results/artifacts/networking.gslb/networking.gslb-GSLB-생성-후-해지-GSLB-생성-후-해지-regression/error-context.md`, `test-results/artifacts/networking.gslb/networking.gslb-GSLB-생성-후-해지-GSLB-생성-후-해지-regression/trace.zip` |
| 2026-10-06 10:27 | container.container-registry | unclassified | Error: cr1006102794f5 상태 /Running\|Active\|Ready\|Available/i 대기 600초 초과. 마지막: (행 없음) | `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/test-failed-1.png`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/test-failed-4.png`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/test-failed-2.png`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/test-failed-3.png`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/test-failed-5.png`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/test-failed-6.png`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/screenshot-container.container-registry.png`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/error-context.md`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/trace.zip` |

## 3. 알려진 이슈

등록 1개 (활성 0개) — data/known-issues.yaml

적용된 항목 없음 (알려진 이슈로 분류된 실패가 없다)

## 4. 커버리지 (service-map/coverage.yaml)

level: 0 없음 · 1 진입(스모크) · 2 CRUD · 3 동작 · 4 통합 의존 체인. 갱신 규칙은 README "회귀 스택 스위트" 절.

- 서비스 89 · 화면 276 (Service Home 83, 그 외 193) · 스모크 진입 282
- 목록 화면 100, 그중 리소스 키 있음 112 = 장부 리소스 112개
- level ≥ 2 (CRUD 이상): **64/112** (57%) · level ≥ 3 (동작 이상): **55/112** (49%)

| 카테고리 | 리소스 | L1 | L2 | L3 | L4 |
| --- | ---: | ---: | ---: | ---: | ---: |
| AI-ML | 3 | 3 | 0 | 0 | 0 |
| Application Service | 4 | 2 | 0 | 2 | 0 |
| Compute | 15 | 8 | 0 | 4 | 3 |
| Container | 3 | 0 | 0 | 2 | 1 |
| Data Analytics | 3 | 2 | 0 | 1 | 0 |
| Database | 6 | 1 | 0 | 0 | 5 |
| DevOps Tools | 1 | 0 | 1 | 0 | 0 |
| Financial Management | 1 | 1 | 0 | 0 | 0 |
| Hybrid Cloud | 3 | 3 | 0 | 0 | 0 |
| Management | 14 | 7 | 1 | 6 | 0 |
| Networking | 44 | 11 | 7 | 17 | 9 |
| Security | 7 | 4 | 0 | 3 | 0 |
| Storage | 8 | 6 | 0 | 2 | 0 |
| **합계** | **112** | **48** | **9** | **37** | **18** |
