# 회귀 결과 정리

> 생성 파일입니다. 직접 고치지 말고 `npm run results` 로 다시 만듭니다 (원본: `reports/runs/*.json`, `service-map/coverage.yaml`, `data/known-issues.yaml`). 생성 시각 2026-10-14 08:58, 실행 기록 677건.

## 1. spec 별 최근 상태

| spec | 마지막 실행 | 결과 | 소요 | 최근 5회 | 통과 평균 |
| --- | --- | --- | ---: | --- | ---: |
| networking.vpc.create-delete | 2026-10-14 08:52 | PASS | 55초 | PPPPP | 55초 |
| compute.vm-stack | 2026-10-08 10:46 | PASS | 25분 31초 | PPPPP | 19분 16초 |
| compute.vm-volume | 2026-10-08 11:11 | PASS | 18분 52초 | PPFPP | 18분 20초 |
| compute.vm-stack-net | 2026-10-08 11:00 | PASS | 27분 24초 | PPFPP | 22분 10초 |
| compute.server-group | 2026-10-13 09:29 | PASS | 2분 13초 | PPPPP | 1분 44초 |
| security.address-group | 2026-10-13 10:11 | PASS | 2분 19초 | PPPFP | 2분 6초 |
| storage.object-storage-bucket | 2026-10-13 09:30 | PASS | 2분 56초 | FPPPP | 2분 6초 |
| management.resource-group | 2026-10-13 09:15 | PASS | 3분 30초 | PPPPP | 1분 49초 |
| iam.user-group | 2026-10-13 09:31 | PASS | 1분 16초 | PPPPP | 1분 5초 |
| compute.launch-configuration | 2026-10-13 09:30 | PASS | 1분 12초 | PPPPP | 1분 35초 |
| networking.vpc-port | 2026-10-13 10:25 | PASS | 20분 36초 | PPPPP | 14분 49초 |
| networking.private-dns | 2026-10-13 09:16 | PASS | 6분 17초 | FPPPP | 6분 16초 |
| storage.file-storage | 2026-10-13 09:27 | PASS | 1분 44초 | PPPPP | 3분 6초 |
| networking.dns-hosted-zone | 2026-10-13 10:25 | PASS | 10분 48초 | PPPFP | 7분 53초 |
| security.security-group-rule | 2026-10-13 09:58 | PASS | 4분 47초 | PPPPP | 3분 16초 |
| networking.nat-gateway | 2026-10-13 11:03 | PASS | 14분 12초 | PPPFP | 14분 30초 |
| compute.auto-scaling-group | 2026-10-08 11:27 | PASS | 19분 49초 | PPFPP | 15분 0초 |
| networking.vpc-peering | 2026-10-13 10:35 | PASS | 14분 32초 | PPPPP | 13분 24초 |
| container.ske-cluster | 2026-10-13 14:26 | PASS | 40분 41초 | FFFFP | 30분 19초 |
| database.postgresql | 2026-10-08 10:00 | PASS | 63분 27초 | FFFPP | 34분 34초 |
| database.mysql | 2026-10-08 10:00 | PASS | 35분 12초 | FPPPP | 26분 43초 |
| database.mariadb | 2026-10-08 10:00 | PASS | 33분 25초 | PPPPP | 25분 40초 |
| database.epas | 2026-10-08 10:01 | PASS | 33분 52초 | PPPPP | 25분 36초 |
| database.cachestore | 2026-10-08 10:34 | PASS | 32분 6초 | PPPPP | 21분 12초 |
| application-service.queue | 2026-10-13 09:15 | PASS | 2분 18초 | FFFPP | 2분 4초 |
| management.notification-group | 2026-10-13 09:17 | PASS | 1분 49초 | PPPPP | 1분 43초 |
| compute.cloud-function | 2026-10-13 08:57 | PASS | 8분 18초 | FFFPP | 4분 27초 |
| container.container-registry | 2026-10-08 11:30 | PASS | 12분 14초 | PFPPP | 9분 28초 |
| iam.role | 2026-10-13 09:13 | PASS | 2분 59초 | PPPPP | 2분 21초 |
| security.certificate | 2026-10-13 09:18 | PASS | 2분 26초 | PFPPP | 1분 48초 |
| container.repository | 2026-10-08 11:12 | PASS | 12분 47초 | PPFPP | 9분 58초 |
| security.kms-key | 2026-10-13 09:19 | PASS | 2분 50초 | PFFPP | 2분 55초 |
| security.secrets-manager | 2026-10-13 09:19 | PASS | 3분 34초 | FPPPP | 2분 23초 |
| iam.policy | 2026-10-13 09:19 | PASS | 3분 51초 | PPPPP | 3분 19초 |
| storage.file-storage-snapshot | 2026-10-13 09:14 | PASS | 3분 59초 | PFPPP | 3분 30초 |
| management.servicewatch-dashboard | 2026-10-13 09:21 | PASS | 2분 58초 | PPFPP | 2분 1초 |
| management.servicewatch-log-group | 2026-10-13 09:21 | PASS | 2분 2초 | FPPPP | 1분 44초 |
| management.servicewatch-event-rule | 2026-10-13 09:23 | PASS | 1분 54초 | PPPPP | 1분 44초 |
| management.servicewatch-alert | 2026-10-13 09:23 | PASS | 2분 57초 | FPFPP | 2분 12초 |
| compute.volume-snapshot | 2026-10-13 09:08 | PASS | 5분 40초 | PFFPP | 4분 21초 |
| management.network-logging | 2026-10-13 09:23 | PASS | 2분 56초 | FPPPP | 2분 31초 |
| networking.load-balancer | 2026-10-13 11:02 | PASS | 29분 44초 | FPPPP | 24분 22초 |
| financial-management.budget | 2026-10-13 09:24 | PASS | 2분 38초 | FPPPP | 2분 23초 |
| application-service.api-gateway | 2026-10-08 11:34 | PASS | 12분 14초 | FFFPP | 9분 15초 |
| application-service.messagehub-domain | 2026-10-13 09:24 | PASS | 1분 28초 | FPPPP | 1분 23초 |
| application-service.messagehub-email | 2026-10-13 09:25 | PASS | 1분 43초 | PPPPP | 1분 59초 |
| networking.firewall | 2026-10-14 08:52 | PASS | 5분 19초 | PPPPP | 5분 32초 |
| networking.transit-gateway | 2026-10-13 10:49 | PASS | 13분 7초 | PPPPP | 12분 38초 |
| networking.vpn | 2026-10-13 08:57 | PASS | 11분 2초 | FPPPP | 9분 33초 |
| networking.vpc-endpoint | 2026-10-13 09:10 | PASS | 4분 35초 | PPPPP | 4분 49초 |
| networking.direct-connect | 2026-10-13 10:25 | PASS | 9분 19초 | PFPPP | 6분 24초 |
| data-analytics.event-streams | 2026-10-08 10:35 | PASS | 24분 53초 | FPPPP | 21분 10초 |
| networking.cdn | 2026-10-13 10:36 | PASS | 32분 30초 | FPPPP | 29분 43초 |
| networking.gslb | 2026-10-13 10:14 | PASS | 4분 35초 | PPPFP | 2분 57초 |
| networking.privatelink-service | 2026-10-08 11:11 | PASS | 21분 37초 | FFPPP | 19분 25초 |
| networking.cloud-wan-network | 2026-10-13 09:26 | PASS | 2분 35초 | FPPPP | 1분 50초 |
| networking.cloud-fabric-connect | 2026-10-13 09:14 | PASS | 5분 2초 | FPFPP | 3분 4초 |
| networking.cloud-lan-data-center | 2026-10-13 08:57 | PASS | 9분 8초 | FPPPP | 7분 16초 |
| iam.saml-provider | 2026-10-13 09:26 | PASS | 1분 36초 | PPFPP | 1분 23초 |
| management.trail | 2026-10-13 09:26 | PASS | 3분 8초 | PPPPP | 2분 50초 |
| devops-tools.devops-service | 2026-10-13 09:27 | PASS | 2분 17초 | PPFPP | 1분 44초 |
| container.ske-upgrade | 2026-10-07 12:29 | PASS | 39분 29초 | FFPP | 41분 46초 |
| database.searchengine | 2026-09-28 16:04 | FAIL(unclassified) | 1분 20초 | F | - |

실행 기록은 `npm run test:stacks` 가 spec 하나를 마칠 때마다 `reports/runs/<YYYYMMDD-HHMM>-<spec id>.json` 으로 남긴다. 결과의 FAIL(class) 는 실패 분류(unclassified/environment/product/test), FAIL(known: KI-xxx) 는 알려진 이슈에 매칭된 실패.

## 2. 최근 실패 (최대 10건)

| 실행 | spec | class | 오류 | 첨부 |
| --- | --- | --- | --- | --- |
| 2026-10-13 13:38 | container.ske-cluster | unclassified | Error: 수정 모달이 90초 안에 닫히지 않았습니다: Security Group 선택 서버에 적용할 Security Group을 검색하여 선택하세요. 최대 4개까지 선택이 가능합니다. 적용할 Security Group이 없는 경우 별도로 Security Group을 생성 후 새로고침 | `test-results/artifacts/container.ske-cluster/container.ske-cluster-VPC--610b7-etes-Engine-클러스터-생성-후-역순-해지-regression/test-failed-2.png`, `test-results/artifacts/container.ske-cluster/container.ske-cluster-VPC--610b7-etes-Engine-클러스터-생성-후-역순-해지-regression/test-failed-1.png`, `test-results/artifacts/container.ske-cluster/container.ske-cluster-VPC--610b7-etes-Engine-클러스터-생성-후-역순-해지-regression/screenshot-container.ske-cluster.png`, `test-results/artifacts/container.ske-cluster/container.ske-cluster-VPC--610b7-etes-Engine-클러스터-생성-후-역순-해지-regression/error-context.md` |
| 2026-10-13 12:14 | container.ske-cluster | unclassified | Error: Security Group 수정 모달에 sgb-1013-1214-a7d7 행이 없습니다 | `test-results/artifacts/container.ske-cluster/container.ske-cluster-VPC--610b7-etes-Engine-클러스터-생성-후-역순-해지-regression/test-failed-2.png`, `test-results/artifacts/container.ske-cluster/container.ske-cluster-VPC--610b7-etes-Engine-클러스터-생성-후-역순-해지-regression/test-failed-1.png`, `test-results/artifacts/container.ske-cluster/container.ske-cluster-VPC--610b7-etes-Engine-클러스터-생성-후-역순-해지-regression/screenshot-container.ske-cluster.png`, `test-results/artifacts/container.ske-cluster/container.ske-cluster-VPC--610b7-etes-Engine-클러스터-생성-후-역순-해지-regression/error-context.md`, `test-results/artifacts/container.ske-cluster/container.ske-cluster-VPC--610b7-etes-Engine-클러스터-생성-후-역순-해지-regression/trace.zip` |
| 2026-10-13 11:25 | container.ske-cluster | unclassified | Error: 수정 모달이 90초 안에 닫히지 않았습니다: 알림 Kubernetes API 에 대한 외부 접근이 가능합니다. 외부 접근이 필요하지 않다면, '사용' 체크를 해지하여 보안 위협을 최소화해주세요. 진행하시겠습니까? 취소 확인 | `test-results/artifacts/container.ske-cluster/container.ske-cluster-VPC--610b7-etes-Engine-클러스터-생성-후-역순-해지-regression/test-failed-2.png`, `test-results/artifacts/container.ske-cluster/container.ske-cluster-VPC--610b7-etes-Engine-클러스터-생성-후-역순-해지-regression/test-failed-1.png`, `test-results/artifacts/container.ske-cluster/container.ske-cluster-VPC--610b7-etes-Engine-클러스터-생성-후-역순-해지-regression/screenshot-container.ske-cluster.png`, `test-results/artifacts/container.ske-cluster/container.ske-cluster-VPC--610b7-etes-Engine-클러스터-생성-후-역순-해지-regression/error-context.md`, `test-results/artifacts/container.ske-cluster/container.ske-cluster-VPC--610b7-etes-Engine-클러스터-생성-후-역순-해지-regression/trace.zip` |
| 2026-10-13 10:46 | networking.nat-gateway | unclassified | Error: NAT Gateway 상세로 이동하지 못했습니다 (https://console.kr-west1.e.samsungsdscloud.com/console/#/vpc/nat-gateway/list) | `test-results/artifacts/networking.nat-gateway/networking.nat-gateway-VPC-33f68-IP-→-NAT-Gateway-생성-후-역순-삭제-regression/test-failed-4.png`, `test-results/artifacts/networking.nat-gateway/networking.nat-gateway-VPC-33f68-IP-→-NAT-Gateway-생성-후-역순-삭제-regression/test-failed-2.png`, `test-results/artifacts/networking.nat-gateway/networking.nat-gateway-VPC-33f68-IP-→-NAT-Gateway-생성-후-역순-삭제-regression/test-failed-5.png`, `test-results/artifacts/networking.nat-gateway/networking.nat-gateway-VPC-33f68-IP-→-NAT-Gateway-생성-후-역순-삭제-regression/test-failed-1.png`, `test-results/artifacts/networking.nat-gateway/networking.nat-gateway-VPC-33f68-IP-→-NAT-Gateway-생성-후-역순-삭제-regression/test-failed-3.png`, `test-results/artifacts/networking.nat-gateway/networking.nat-gateway-VPC-33f68-IP-→-NAT-Gateway-생성-후-역순-삭제-regression/screenshot-networking.nat-gateway.png`, `test-results/artifacts/networking.nat-gateway/networking.nat-gateway-VPC-33f68-IP-→-NAT-Gateway-생성-후-역순-삭제-regression/error-context.md`, `test-results/artifacts/networking.nat-gateway/networking.nat-gateway-VPC-33f68-IP-→-NAT-Gateway-생성-후-역순-삭제-regression/trace.zip` |
| 2026-10-13 10:35 | container.ske-cluster | environment | Error: 수정 모달이 90초 안에 닫히지 않았습니다: 알림 Kubernetes API 에 대한 외부 접근이 가능합니다. 외부 접근이 필요하지 않다면, '사용' 체크를 해지하여 보안 위협을 최소화해주세요. 진행하시겠습니까? 취소 확인 | `test-results/artifacts/container.ske-cluster/container.ske-cluster-VPC--610b7-etes-Engine-클러스터-생성-후-역순-해지-regression/test-failed-4.png`, `test-results/artifacts/container.ske-cluster/container.ske-cluster-VPC--610b7-etes-Engine-클러스터-생성-후-역순-해지-regression/test-failed-1.png`, `test-results/artifacts/container.ske-cluster/container.ske-cluster-VPC--610b7-etes-Engine-클러스터-생성-후-역순-해지-regression/test-failed-2.png`, `test-results/artifacts/container.ske-cluster/container.ske-cluster-VPC--610b7-etes-Engine-클러스터-생성-후-역순-해지-regression/test-failed-3.png`, `test-results/artifacts/container.ske-cluster/container.ske-cluster-VPC--610b7-etes-Engine-클러스터-생성-후-역순-해지-regression/screenshot-container.ske-cluster.png` |
| 2026-10-13 10:02 | networking.gslb | unclassified | Error: 수정 모달이 90초 안에 닫히지 않았습니다: Health Check 수정 Health Check용으로 사용할 통신 프로토콜은 ICMP, TCP, HTTP, HTTPS를 사용할 수 있습니다. 통신 프로토콜별 Interval(Health check 주기), Timeout(서비스 | `test-results/artifacts/networking.gslb/networking.gslb-GSLB-생성-후-해지-GSLB-생성-후-해지-regression/test-failed-3.png`, `test-results/artifacts/networking.gslb/networking.gslb-GSLB-생성-후-해지-GSLB-생성-후-해지-regression/test-failed-1.png`, `test-results/artifacts/networking.gslb/networking.gslb-GSLB-생성-후-해지-GSLB-생성-후-해지-regression/test-failed-2.png`, `test-results/artifacts/networking.gslb/networking.gslb-GSLB-생성-후-해지-GSLB-생성-후-해지-regression/screenshot-simple-crud.ts.png`, `test-results/artifacts/networking.gslb/networking.gslb-GSLB-생성-후-해지-GSLB-생성-후-해지-regression/error-context.md`, `test-results/artifacts/networking.gslb/networking.gslb-GSLB-생성-후-해지-GSLB-생성-후-해지-regression/trace.zip` |
| 2026-10-13 10:01 | networking.dns-hosted-zone | unclassified | Error: 레코드 탭에 수정 버튼이 없습니다: ["Hosted Zone 삭제","삭제","상세 검색","레코드 추가"] | `test-results/artifacts/networking.dns-hosted-zone/networking.dns-hosted-zone-fa6c6-ted-Zone-Private-생성-후-역순-삭제-regression/test-failed-2.png`, `test-results/artifacts/networking.dns-hosted-zone/networking.dns-hosted-zone-fa6c6-ted-Zone-Private-생성-후-역순-삭제-regression/test-failed-1.png`, `test-results/artifacts/networking.dns-hosted-zone/networking.dns-hosted-zone-fa6c6-ted-Zone-Private-생성-후-역순-삭제-regression/test-failed-3.png`, `test-results/artifacts/networking.dns-hosted-zone/networking.dns-hosted-zone-fa6c6-ted-Zone-Private-생성-후-역순-삭제-regression/screenshot-networking.dns-hosted-zone.png`, `test-results/artifacts/networking.dns-hosted-zone/networking.dns-hosted-zone-fa6c6-ted-Zone-Private-생성-후-역순-삭제-regression/test-failed-4.png`, `test-results/artifacts/networking.dns-hosted-zone/networking.dns-hosted-zone-fa6c6-ted-Zone-Private-생성-후-역순-삭제-regression/error-context.md`, `test-results/artifacts/networking.dns-hosted-zone/networking.dns-hosted-zone-fa6c6-ted-Zone-Private-생성-후-역순-삭제-regression/trace.zip` |
| 2026-10-13 09:55 | security.address-group | unclassified | TimeoutError: locator.click: Timeout 15000ms exceeded. | `test-results/artifacts/security.address-group/security.address-group-Add-f70db--후-삭제-Address-Group-생성-후-삭제-regression/test-failed-2.png`, `test-results/artifacts/security.address-group/security.address-group-Add-f70db--후-삭제-Address-Group-생성-후-삭제-regression/test-failed-1.png`, `test-results/artifacts/security.address-group/security.address-group-Add-f70db--후-삭제-Address-Group-생성-후-삭제-regression/screenshot-simple-crud.ts.png`, `test-results/artifacts/security.address-group/security.address-group-Add-f70db--후-삭제-Address-Group-생성-후-삭제-regression/error-context.md`, `test-results/artifacts/security.address-group/security.address-group-Add-f70db--후-삭제-Address-Group-생성-후-삭제-regression/trace.zip` |
| 2026-10-07 18:41 | container.repository | unclassified | Error: PROBE END | `test-results/artifacts/container.repository/container.repository-Regis-249ea-ry-위에-Repository-생성-후-역순-삭제-regression/test-failed-14.png`, `test-results/artifacts/container.repository/container.repository-Regis-249ea-ry-위에-Repository-생성-후-역순-삭제-regression/test-failed-5.png`, `test-results/artifacts/container.repository/container.repository-Regis-249ea-ry-위에-Repository-생성-후-역순-삭제-regression/test-failed-4.png`, `test-results/artifacts/container.repository/container.repository-Regis-249ea-ry-위에-Repository-생성-후-역순-삭제-regression/test-failed-11.png`, `test-results/artifacts/container.repository/container.repository-Regis-249ea-ry-위에-Repository-생성-후-역순-삭제-regression/test-failed-6.png`, `test-results/artifacts/container.repository/container.repository-Regis-249ea-ry-위에-Repository-생성-후-역순-삭제-regression/test-failed-3.png`, `test-results/artifacts/container.repository/container.repository-Regis-249ea-ry-위에-Repository-생성-후-역순-삭제-regression/test-failed-9.png`, `test-results/artifacts/container.repository/container.repository-Regis-249ea-ry-위에-Repository-생성-후-역순-삭제-regression/test-failed-2.png`, `test-results/artifacts/container.repository/container.repository-Regis-249ea-ry-위에-Repository-생성-후-역순-삭제-regression/test-failed-8.png`, `test-results/artifacts/container.repository/container.repository-Regis-249ea-ry-위에-Repository-생성-후-역순-삭제-regression/test-failed-1.png`, `test-results/artifacts/container.repository/container.repository-Regis-249ea-ry-위에-Repository-생성-후-역순-삭제-regression/test-failed-10.png`, `test-results/artifacts/container.repository/container.repository-Regis-249ea-ry-위에-Repository-생성-후-역순-삭제-regression/test-failed-13.png`, `test-results/artifacts/container.repository/container.repository-Regis-249ea-ry-위에-Repository-생성-후-역순-삭제-regression/test-failed-12.png`, `test-results/artifacts/container.repository/container.repository-Regis-249ea-ry-위에-Repository-생성-후-역순-삭제-regression/test-failed-7.png`, `test-results/artifacts/container.repository/container.repository-Regis-249ea-ry-위에-Repository-생성-후-역순-삭제-regression/screenshot-container.repository.png`, `test-results/artifacts/container.repository/container.repository-Regis-249ea-ry-위에-Repository-생성-후-역순-삭제-regression/error-context.md`, `test-results/artifacts/container.repository/container.repository-Regis-249ea-ry-위에-Repository-생성-후-역순-삭제-regression/trace.zip` |
| 2026-10-07 18:36 | compute.vm-volume | unclassified | TimeoutError: locator.click: Timeout 15000ms exceeded. | `test-results/artifacts/compute.vm-volume/compute.vm-volume-Virtual--ddb2f-lock-Storage-볼륨-생성·연결·분리·삭제-regression/test-failed-3.png`, `test-results/artifacts/compute.vm-volume/compute.vm-volume-Virtual--ddb2f-lock-Storage-볼륨-생성·연결·분리·삭제-regression/test-failed-2.png`, `test-results/artifacts/compute.vm-volume/compute.vm-volume-Virtual--ddb2f-lock-Storage-볼륨-생성·연결·분리·삭제-regression/test-failed-1.png`, `test-results/artifacts/compute.vm-volume/compute.vm-volume-Virtual--ddb2f-lock-Storage-볼륨-생성·연결·분리·삭제-regression/test-failed-7.png`, `test-results/artifacts/compute.vm-volume/compute.vm-volume-Virtual--ddb2f-lock-Storage-볼륨-생성·연결·분리·삭제-regression/test-failed-14.png`, `test-results/artifacts/compute.vm-volume/compute.vm-volume-Virtual--ddb2f-lock-Storage-볼륨-생성·연결·분리·삭제-regression/test-failed-4.png`, `test-results/artifacts/compute.vm-volume/compute.vm-volume-Virtual--ddb2f-lock-Storage-볼륨-생성·연결·분리·삭제-regression/test-failed-9.png`, `test-results/artifacts/compute.vm-volume/compute.vm-volume-Virtual--ddb2f-lock-Storage-볼륨-생성·연결·분리·삭제-regression/test-failed-5.png`, `test-results/artifacts/compute.vm-volume/compute.vm-volume-Virtual--ddb2f-lock-Storage-볼륨-생성·연결·분리·삭제-regression/test-failed-6.png`, `test-results/artifacts/compute.vm-volume/compute.vm-volume-Virtual--ddb2f-lock-Storage-볼륨-생성·연결·분리·삭제-regression/test-failed-13.png`, `test-results/artifacts/compute.vm-volume/compute.vm-volume-Virtual--ddb2f-lock-Storage-볼륨-생성·연결·분리·삭제-regression/test-failed-8.png`, `test-results/artifacts/compute.vm-volume/compute.vm-volume-Virtual--ddb2f-lock-Storage-볼륨-생성·연결·분리·삭제-regression/test-failed-11.png`, `test-results/artifacts/compute.vm-volume/compute.vm-volume-Virtual--ddb2f-lock-Storage-볼륨-생성·연결·분리·삭제-regression/test-failed-12.png`, `test-results/artifacts/compute.vm-volume/compute.vm-volume-Virtual--ddb2f-lock-Storage-볼륨-생성·연결·분리·삭제-regression/test-failed-10.png`, `test-results/artifacts/compute.vm-volume/compute.vm-volume-Virtual--ddb2f-lock-Storage-볼륨-생성·연결·분리·삭제-regression/screenshot-compute.vm-volume.png`, `test-results/artifacts/compute.vm-volume/compute.vm-volume-Virtual--ddb2f-lock-Storage-볼륨-생성·연결·분리·삭제-regression/error-context.md`, `test-results/artifacts/compute.vm-volume/compute.vm-volume-Virtual--ddb2f-lock-Storage-볼륨-생성·연결·분리·삭제-regression/trace.zip` |

## 3. 알려진 이슈

등록 1개 (활성 0개) — data/known-issues.yaml

적용된 항목 없음 (알려진 이슈로 분류된 실패가 없다)

## 4. 커버리지 (service-map/coverage.yaml)

level: 0 없음 · 1 진입(스모크) · 2 CRUD · 3 동작 · 4 통합 의존 체인. 갱신 규칙은 README "회귀 스택 스위트" 절.

- 서비스 89 · 화면 276 (Service Home 83, 그 외 193) · 스모크 진입 282
- 목록 화면 100, 그중 리소스 키 있음 112 = 장부 리소스 111개
- level ≥ 2 (CRUD 이상): **64/111** (58%) · level ≥ 3 (동작 이상): **61/111** (55%)

| 카테고리 | 리소스 | L1 | L2 | L3 | L4 |
| --- | ---: | ---: | ---: | ---: | ---: |
| AI-ML | 3 | 3 | 0 | 0 | 0 |
| Application Service | 4 | 2 | 0 | 2 | 0 |
| Compute | 15 | 8 | 0 | 4 | 3 |
| Container | 3 | 0 | 0 | 2 | 1 |
| Data Analytics | 2 | 1 | 0 | 1 | 0 |
| Database | 6 | 1 | 0 | 0 | 5 |
| DevOps Tools | 1 | 0 | 0 | 1 | 0 |
| Financial Management | 1 | 1 | 0 | 0 | 0 |
| Hybrid Cloud | 3 | 3 | 0 | 0 | 0 |
| Management | 14 | 7 | 0 | 7 | 0 |
| Networking | 44 | 11 | 3 | 21 | 9 |
| Security | 7 | 4 | 0 | 3 | 0 |
| Storage | 8 | 6 | 0 | 2 | 0 |
| **합계** | **111** | **47** | **3** | **43** | **18** |

## 5. 콘솔 전용 쓰기 동작 (API 카탈로그에 없는 경로)

통과한 실행이 보낸 쓰기 요청(실행 기록 api_writes, 2026-10-14 이후 모든 spec 이 기록) 중 data/api-coverage.json 의 경로와 맞지 않는 것. 동작 단위 모수(API 쓰기 동작)에는 넣지 않고 따로 센다. ? = 카탈로그 {…} 자리에 글자 세그먼트가 온 느슨한 일치(확인 필요).

| 상품 | 메서드 | 경로 | spec | 마지막 |
| --- | --- | --- | --- | --- |
| Firewall | POST | `/v1/firewalls/rules/bulk` | networking.firewall | 2026-10-14 |
| Firewall | PUT | `/v1/firewalls/rules/bulk` ? | networking.firewall | 2026-10-14 |

POST 지만 조회로 보이는 경로(세지 않음) 1개: `POST /v1/cost-analysis/budget`
