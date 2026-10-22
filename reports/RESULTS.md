# 회귀 결과 정리

> 생성 파일입니다. 직접 고치지 말고 `npm run results` 로 다시 만듭니다 (원본: `reports/runs/*.json`, `service-map/coverage.yaml`, `data/known-issues.yaml`). 생성 시각 2026-10-22 10:42, 실행 기록 759건.

## 1. spec 별 최근 상태

| spec | 마지막 실행 | 결과 | 소요 | 최근 5회 | 통과 평균 |
| --- | --- | --- | ---: | --- | ---: |
| networking.vpc.create-delete | 2026-10-16 14:49 | PASS | 1분 56초 | PPPPP | 1분 5초 |
| compute.vm-stack | 2026-10-20 23:06 | PASS | 26분 30초 | PPPPP | 20분 39초 |
| compute.vm-volume | 2026-10-14 10:39 | PASS | 23분 54초 | PFPPP | 18분 57초 |
| compute.vm-stack-net | 2026-10-14 10:37 | PASS | 33분 30초 | PFPPP | 23분 25초 |
| compute.server-group | 2026-10-14 12:06 | PASS | 2분 0초 | PPPPP | 1분 46초 |
| security.address-group | 2026-10-14 12:04 | PASS | 2분 59초 | PPFPP | 2분 11초 |
| storage.object-storage-bucket | 2026-10-14 12:07 | PASS | 2분 22초 | PPPPP | 2분 8초 |
| management.resource-group | 2026-10-16 15:28 | PASS | 4분 17초 | PPPPP | 2분 11초 |
| iam.user-group | 2026-10-14 12:07 | PASS | 1분 6초 | PPPPP | 1분 5초 |
| iam.user | 2026-10-16 15:11 | PASS | 2분 0초 | FP | 2분 0초 |
| compute.launch-configuration | 2026-10-14 12:07 | PASS | 1분 22초 | PPPPP | 1분 34초 |
| networking.vpc-port | 2026-10-14 10:47 | PASS | 25분 29초 | PPPPP | 15분 53초 |
| networking.private-dns | 2026-10-14 11:41 | PASS | 6분 12초 | PPPPP | 6분 16초 |
| storage.file-storage | 2026-10-14 12:05 | PASS | 1분 53초 | PPPPP | 2분 59초 |
| networking.dns-hosted-zone | 2026-10-14 11:28 | PASS | 12분 13초 | PPFPP | 8분 17초 |
| security.security-group-rule | 2026-10-14 11:52 | PASS | 2분 31초 | PPPPP | 3분 11초 |
| networking.nat-gateway | 2026-10-14 11:10 | PASS | 17분 6초 | PPFPP | 14분 49초 |
| compute.auto-scaling-group | 2026-10-14 11:04 | PASS | 20분 17초 | PFPPP | 15분 27초 |
| networking.vpc-peering | 2026-10-14 11:13 | PASS | 15분 20초 | PPPPP | 13분 36초 |
| container.ske-cluster | 2026-10-14 09:34 | PASS | 57분 23초 | FFFPP | 32분 46초 |
| database.postgresql | 2026-10-14 09:34 | PASS | 62분 54초 | FFPPP | 37분 9초 |
| database.mysql | 2026-10-16 16:32 | FAIL(unclassified) | 59분 55초 | PPPPF | 27분 40초 |
| database.mariadb | 2026-10-16 16:32 | FAIL(unclassified) | 61분 29초 | PPPPF | 26분 48초 |
| database.epas | 2026-10-16 16:32 | FAIL(unclassified) | 60분 47초 | PPPPF | 26분 26초 |
| database.cachestore | 2026-10-14 10:07 | PASS | 32분 24초 | PPPPP | 22분 36초 |
| application-service.queue | 2026-10-14 11:55 | PASS | 2분 14초 | FFPPP | 2분 5초 |
| management.notification-group | 2026-10-14 11:55 | PASS | 2분 5초 | PPPPP | 1분 45초 |
| compute.cloud-function | 2026-10-14 11:38 | PASS | 9분 57초 | FFPPP | 4분 57초 |
| container.container-registry | 2026-10-20 23:38 | FAIL(unclassified) | 7분 8초 | FFFFF | 9분 28초 |
| iam.role | 2026-10-16 15:19 | PASS | 2분 30초 | PPPPP | 2분 22초 |
| security.certificate | 2026-10-14 11:56 | PASS | 1분 40초 | FPPPP | 1분 47초 |
| container.repository | 2026-10-14 11:03 | PASS | 12분 30초 | PFPPP | 10분 14초 |
| security.kms-key | 2026-10-14 11:56 | PASS | 2분 37초 | FFPPP | 2분 53초 |
| security.secrets-manager | 2026-10-14 11:56 | PASS | 3분 29초 | PPPPP | 2분 31초 |
| iam.policy | 2026-10-16 16:39 | PASS | 4분 44초 | PPPPP | 3분 32초 |
| storage.file-storage-snapshot | 2026-10-14 11:50 | PASS | 4분 34초 | FPPPP | 3분 37초 |
| management.servicewatch-dashboard | 2026-10-14 11:58 | PASS | 2분 30초 | PFPPP | 2분 5초 |
| management.servicewatch-log-group | 2026-10-14 11:58 | PASS | 1분 58초 | PPPPP | 1분 46초 |
| management.servicewatch-event-rule | 2026-10-14 11:59 | PASS | 1분 21초 | PPPPP | 1분 40초 |
| management.servicewatch-alert | 2026-10-14 12:00 | PASS | 2분 37초 | PFPPP | 2분 15초 |
| compute.volume-snapshot | 2026-10-14 11:44 | PASS | 5분 28초 | FFPPP | 4분 28초 |
| management.network-logging | 2026-10-14 12:00 | PASS | 2분 40초 | PPPPP | 2분 32초 |
| networking.load-balancer | 2026-10-16 17:05 | FAIL(unclassified) | 25분 28초 | PPPPF | 25분 7초 |
| financial-management.budget | 2026-10-14 12:01 | PASS | 2분 36초 | PPPPP | 2분 25초 |
| application-service.api-gateway | 2026-10-16 16:41 | PASS | 14분 25초 | PPPFP | 10분 15초 |
| application-service.messagehub-domain | 2026-10-14 12:01 | PASS | 1분 27초 | PPPPP | 1분 23초 |
| application-service.messagehub-email | 2026-10-14 12:01 | PASS | 1분 46초 | PPPPP | 1분 57초 |
| networking.firewall | 2026-10-14 11:43 | PASS | 6분 25초 | PPPPP | 5분 39초 |
| networking.transit-gateway | 2026-10-14 11:24 | PASS | 13분 55초 | PPPPP | 12분 47초 |
| networking.vpn | 2026-10-14 11:28 | PASS | 12분 27초 | PPPPP | 9분 55초 |
| networking.vpc-endpoint | 2026-10-14 21:39 | PASS | 5분 37초 | PPPPP | 4분 57초 |
| networking.direct-connect | 2026-10-14 11:36 | PASS | 8분 25초 | FPPPP | 6분 36초 |
| data-analytics.event-streams | 2026-10-14 10:09 | PASS | 23분 48초 | PPPPP | 21분 30초 |
| networking.cdn | 2026-10-14 10:10 | PASS | 29분 30초 | PPPPP | 29분 41초 |
| networking.gslb | 2026-10-14 11:49 | PASS | 5분 43초 | PPFPP | 3분 11초 |
| networking.privatelink-service | 2026-10-14 11:03 | PASS | 24분 25초 | FPPPP | 20분 15초 |
| networking.cloud-wan-network | 2026-10-14 12:02 | PASS | 2분 46초 | PPPPP | 1분 56초 |
| networking.cloud-fabric-connect | 2026-10-14 11:50 | PASS | 5분 29초 | PFPPP | 3분 22초 |
| networking.cloud-lan-data-center | 2026-10-14 11:40 | PASS | 11분 56초 | PPPPP | 7분 56초 |
| iam.saml-provider | 2026-10-14 12:03 | PASS | 1분 43초 | PFPPP | 1분 26초 |
| management.trail | 2026-10-14 12:03 | PASS | 3분 20초 | PPPPP | 2분 55초 |
| devops-tools.devops-service | 2026-10-14 12:03 | PASS | 2분 17초 | PFPPP | 1분 51초 |
| container.ske-upgrade | 2026-10-07 12:29 | PASS | 39분 29초 | FFPP | 41분 46초 |
| database.searchengine | 2026-09-28 16:04 | FAIL(unclassified) | 1분 20초 | F | - |

실행 기록은 `npm run test:stacks` 가 spec 하나를 마칠 때마다 `reports/runs/<YYYYMMDD-HHMM>-<spec id>.json` 으로 남긴다. 결과의 FAIL(class) 는 실패 분류(unclassified/environment/product/test), FAIL(known: KI-xxx) 는 알려진 이슈에 매칭된 실패.

## 2. 최근 실패 (최대 10건)

| 실행 | spec | class | 오류 | 첨부 |
| --- | --- | --- | --- | --- |
| 2026-10-20 23:38 | container.container-registry | unclassified | TimeoutError: locator.click: Timeout 15000ms exceeded. | `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/test-failed-2.png`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/test-failed-1.png`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/screenshot-container.container-registry.png`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/test-failed-3.png`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/test-failed-4.png`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/error-context.md`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/trace.zip` |
| 2026-10-20 22:55 | container.container-registry | unclassified | Error: 수정 모달이 90초 안에 닫히지 않았습니다: 알림 프라이빗 엔드포인트 접근 제어 사용을 해제하시겠습니까? 프라이빗 엔드포인트 접근 제어 사용 해제 시, 레지스트리가 SCP내 다른 리소스에 노출될 위험이 존재합니다. 프라이빗 엔드포인트 접근 제어는 레지스트리 생성 이후에도 사 | `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/test-failed-2.png`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/test-failed-1.png`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/screenshot-container.container-registry.png`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/error-context.md`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/trace.zip` |
| 2026-10-16 17:19 | container.container-registry | unclassified | Error: "/프라이빗 엔드포인트 접근 제어/" 값이 60초 안에 바뀌지 않았습니다. 마지막:  | `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/test-failed-3.png`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/test-failed-12.png`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/test-failed-10.png`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/test-failed-7.png`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/test-failed-4.png`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/test-failed-9.png`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/test-failed-5.png`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/test-failed-2.png`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/test-failed-8.png`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/test-failed-1.png`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/test-failed-11.png`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/test-failed-6.png`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/screenshot-container.container-registry.png`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/error-context.md`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/trace.zip` |
| 2026-10-16 17:05 | networking.load-balancer | unclassified | Error: 수정 모달이 90초 안에 닫히지 않았습니다: 부하 분산 수정 부하 분산 부하 분산 알고리즘을 선택합니다. Weighted 부하 분산을 사용할 경우, 멤버 가중치에 비례하여 트래픽을 분산합니다. Round Robin 취소 확인 | `test-results/artifacts/networking.load-balancer/networking.load-balancer-V-e09f9-Public-NAT-IP-연결·해제-→-역순-삭제-regression/test-failed-3.png`, `test-results/artifacts/networking.load-balancer/networking.load-balancer-V-e09f9-Public-NAT-IP-연결·해제-→-역순-삭제-regression/test-failed-12.png`, `test-results/artifacts/networking.load-balancer/networking.load-balancer-V-e09f9-Public-NAT-IP-연결·해제-→-역순-삭제-regression/test-failed-5.png`, `test-results/artifacts/networking.load-balancer/networking.load-balancer-V-e09f9-Public-NAT-IP-연결·해제-→-역순-삭제-regression/test-failed-4.png`, `test-results/artifacts/networking.load-balancer/networking.load-balancer-V-e09f9-Public-NAT-IP-연결·해제-→-역순-삭제-regression/test-failed-8.png`, `test-results/artifacts/networking.load-balancer/networking.load-balancer-V-e09f9-Public-NAT-IP-연결·해제-→-역순-삭제-regression/test-failed-2.png`, `test-results/artifacts/networking.load-balancer/networking.load-balancer-V-e09f9-Public-NAT-IP-연결·해제-→-역순-삭제-regression/test-failed-6.png`, `test-results/artifacts/networking.load-balancer/networking.load-balancer-V-e09f9-Public-NAT-IP-연결·해제-→-역순-삭제-regression/test-failed-1.png`, `test-results/artifacts/networking.load-balancer/networking.load-balancer-V-e09f9-Public-NAT-IP-연결·해제-→-역순-삭제-regression/test-failed-11.png`, `test-results/artifacts/networking.load-balancer/networking.load-balancer-V-e09f9-Public-NAT-IP-연결·해제-→-역순-삭제-regression/test-failed-9.png`, `test-results/artifacts/networking.load-balancer/networking.load-balancer-V-e09f9-Public-NAT-IP-연결·해제-→-역순-삭제-regression/test-failed-10.png`, `test-results/artifacts/networking.load-balancer/networking.load-balancer-V-e09f9-Public-NAT-IP-연결·해제-→-역순-삭제-regression/test-failed-7.png`, `test-results/artifacts/networking.load-balancer/networking.load-balancer-V-e09f9-Public-NAT-IP-연결·해제-→-역순-삭제-regression/screenshot-networking.load-balancer.png`, `test-results/artifacts/networking.load-balancer/networking.load-balancer-V-e09f9-Public-NAT-IP-연결·해제-→-역순-삭제-regression/error-context.md` |
| 2026-10-16 17:02 | container.container-registry | unclassified | Error: expect(received).toMatch(expected) | `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/test-failed-12.png`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/test-failed-3.png`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/test-failed-4.png`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/test-failed-6.png`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/test-failed-11.png`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/test-failed-8.png`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/test-failed-5.png`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/test-failed-2.png`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/test-failed-1.png`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/test-failed-10.png`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/test-failed-7.png`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/test-failed-9.png`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/screenshot-container.container-registry.png`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/error-context.md`, `test-results/artifacts/container.container-registry/container.container-regist-57e13--Container-Registry-생성-후-해지-regression/trace.zip` |
| 2026-10-16 16:32 | database.epas | unclassified | Worker teardown timeout of 90000ms exceeded while tearing down "liveBrowser". |  |
| 2026-10-16 16:32 | database.mariadb | unclassified | Worker teardown timeout of 90000ms exceeded while tearing down "liveBrowser". |  |
| 2026-10-16 16:32 | database.mysql | unclassified | Worker teardown timeout of 90000ms exceeded while tearing down "liveBrowser". |  |
| 2026-10-16 15:19 | application-service.api-gateway | environment | Error: 기본 정책 템플릿 JSON | `test-results/artifacts/application-service.api-gateway/application-service.api-ga-0915e-→-리소스·메서드-추가-→-스테이지-배포-→-해지-regression/test-failed-3.png`, `test-results/artifacts/application-service.api-gateway/application-service.api-ga-0915e-→-리소스·메서드-추가-→-스테이지-배포-→-해지-regression/test-failed-4.png`, `test-results/artifacts/application-service.api-gateway/application-service.api-ga-0915e-→-리소스·메서드-추가-→-스테이지-배포-→-해지-regression/test-failed-2.png`, `test-results/artifacts/application-service.api-gateway/application-service.api-ga-0915e-→-리소스·메서드-추가-→-스테이지-배포-→-해지-regression/test-failed-1.png`, `test-results/artifacts/application-service.api-gateway/application-service.api-ga-0915e-→-리소스·메서드-추가-→-스테이지-배포-→-해지-regression/test-failed-8.png`, `test-results/artifacts/application-service.api-gateway/application-service.api-ga-0915e-→-리소스·메서드-추가-→-스테이지-배포-→-해지-regression/test-failed-6.png`, `test-results/artifacts/application-service.api-gateway/application-service.api-ga-0915e-→-리소스·메서드-추가-→-스테이지-배포-→-해지-regression/test-failed-5.png`, `test-results/artifacts/application-service.api-gateway/application-service.api-ga-0915e-→-리소스·메서드-추가-→-스테이지-배포-→-해지-regression/test-failed-9.png`, `test-results/artifacts/application-service.api-gateway/application-service.api-ga-0915e-→-리소스·메서드-추가-→-스테이지-배포-→-해지-regression/test-failed-11.png`, `test-results/artifacts/application-service.api-gateway/application-service.api-ga-0915e-→-리소스·메서드-추가-→-스테이지-배포-→-해지-regression/test-failed-10.png`, `test-results/artifacts/application-service.api-gateway/application-service.api-ga-0915e-→-리소스·메서드-추가-→-스테이지-배포-→-해지-regression/test-failed-7.png`, `test-results/artifacts/application-service.api-gateway/application-service.api-ga-0915e-→-리소스·메서드-추가-→-스테이지-배포-→-해지-regression/test-failed-12.png`, `test-results/artifacts/application-service.api-gateway/application-service.api-ga-0915e-→-리소스·메서드-추가-→-스테이지-배포-→-해지-regression/screenshot-application-service.api-gateway.png` |
| 2026-10-16 15:00 | iam.user | unclassified | TimeoutError: locator.fill: Timeout 15000ms exceeded. | `test-results/artifacts/iam.user/iam.user-IAM-지정-테스트-사용자-설명-3b233-설명-수정-→-그룹-추가·제외-→-권한-연결·해제-regression/test-failed-13.png`, `test-results/artifacts/iam.user/iam.user-IAM-지정-테스트-사용자-설명-3b233-설명-수정-→-그룹-추가·제외-→-권한-연결·해제-regression/test-failed-2.png`, `test-results/artifacts/iam.user/iam.user-IAM-지정-테스트-사용자-설명-3b233-설명-수정-→-그룹-추가·제외-→-권한-연결·해제-regression/test-failed-7.png`, `test-results/artifacts/iam.user/iam.user-IAM-지정-테스트-사용자-설명-3b233-설명-수정-→-그룹-추가·제외-→-권한-연결·해제-regression/test-failed-9.png`, `test-results/artifacts/iam.user/iam.user-IAM-지정-테스트-사용자-설명-3b233-설명-수정-→-그룹-추가·제외-→-권한-연결·해제-regression/test-failed-3.png`, `test-results/artifacts/iam.user/iam.user-IAM-지정-테스트-사용자-설명-3b233-설명-수정-→-그룹-추가·제외-→-권한-연결·해제-regression/test-failed-1.png`, `test-results/artifacts/iam.user/iam.user-IAM-지정-테스트-사용자-설명-3b233-설명-수정-→-그룹-추가·제외-→-권한-연결·해제-regression/test-failed-8.png`, `test-results/artifacts/iam.user/iam.user-IAM-지정-테스트-사용자-설명-3b233-설명-수정-→-그룹-추가·제외-→-권한-연결·해제-regression/test-failed-6.png`, `test-results/artifacts/iam.user/iam.user-IAM-지정-테스트-사용자-설명-3b233-설명-수정-→-그룹-추가·제외-→-권한-연결·해제-regression/test-failed-12.png`, `test-results/artifacts/iam.user/iam.user-IAM-지정-테스트-사용자-설명-3b233-설명-수정-→-그룹-추가·제외-→-권한-연결·해제-regression/test-failed-10.png`, `test-results/artifacts/iam.user/iam.user-IAM-지정-테스트-사용자-설명-3b233-설명-수정-→-그룹-추가·제외-→-권한-연결·해제-regression/test-failed-5.png`, `test-results/artifacts/iam.user/iam.user-IAM-지정-테스트-사용자-설명-3b233-설명-수정-→-그룹-추가·제외-→-권한-연결·해제-regression/test-failed-11.png`, `test-results/artifacts/iam.user/iam.user-IAM-지정-테스트-사용자-설명-3b233-설명-수정-→-그룹-추가·제외-→-권한-연결·해제-regression/test-failed-4.png`, `test-results/artifacts/iam.user/iam.user-IAM-지정-테스트-사용자-설명-3b233-설명-수정-→-그룹-추가·제외-→-권한-연결·해제-regression/screenshot-iam.user.png`, `test-results/artifacts/iam.user/iam.user-IAM-지정-테스트-사용자-설명-3b233-설명-수정-→-그룹-추가·제외-→-권한-연결·해제-regression/test-failed-14.png`, `test-results/artifacts/iam.user/iam.user-IAM-지정-테스트-사용자-설명-3b233-설명-수정-→-그룹-추가·제외-→-권한-연결·해제-regression/error-context.md`, `test-results/artifacts/iam.user/iam.user-IAM-지정-테스트-사용자-설명-3b233-설명-수정-→-그룹-추가·제외-→-권한-연결·해제-regression/trace.zip` |

## 3. 알려진 이슈

등록 2개 (활성 1개) — data/known-issues.yaml

| id | kind | spec | 적용 횟수 | 마지막 적용 | note |
| --- | --- | --- | ---: | --- | --- |
| KI-001 | product | container.container-registry | 2 | 2026-10-14 12:18 container.container-registry | Container Registry 퍼블릭 엔드포인트 끄기가 조용히 무시된다. 콘솔이 PUT /console/api/scr/v1/container-registries/{id}/enable-public-endpoint {"public_endpoint_enabled": false} 를 보내고 200 을 받지만(trace 12:23:47) 이후 상세 GET 은 modified_at 만 갱신되고 public_endpoint_enabled 가 true 로 남으며 상태도 Editing 을 거치지 않고 Running 그대로다(켤 때는 Editing≈2분 → Running, 값 반영). 10-08 까지 3회 PASS 였고 10-14 스위트 a1·a2 모두 재현(2/2). spec 은 그대로 둔다(결함을 정확히 잡고 있음). 콘솔팀 문의 필요. 근거: reports/runs/20261014-1116-·1218-container.container-registry.json, trace.zip. |

## 4. 커버리지 (service-map/coverage.yaml)

level: 0 없음 · 1 진입(스모크) · 2 CRUD · 3 동작 · 4 통합 의존 체인. 갱신 규칙은 README "회귀 스택 스위트" 절.

- 서비스 89 · 화면 276 (Service Home 83, 그 외 193) · 스모크 진입 282
- 목록 화면 100, 그중 리소스 키 있음 112 = 장부 리소스 111개
- level ≥ 2 (CRUD 이상): **65/111** (59%) · level ≥ 3 (동작 이상): **62/111** (56%)

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
| Management | 14 | 6 | 0 | 8 | 0 |
| Networking | 44 | 11 | 3 | 21 | 9 |
| Security | 7 | 4 | 0 | 3 | 0 |
| Storage | 8 | 6 | 0 | 2 | 0 |
| **합계** | **111** | **46** | **3** | **44** | **18** |

## 5. 콘솔 전용 쓰기 동작 (API 카탈로그에 없는 경로)

통과한 실행이 보낸 쓰기 요청(실행 기록 api_writes, 2026-10-14 이후 모든 spec 이 기록) 중 data/api-coverage.json 의 경로와 맞지 않는 것. 동작 단위 모수(API 쓰기 동작)에는 넣지 않고 따로 센다. ? = 카탈로그 {…} 자리에 글자 세그먼트가 온 느슨한 일치(확인 필요).

| 상품 | 메서드 | 경로 | spec | 마지막 |
| --- | --- | --- | --- | --- |
| Cost Management | DELETE | `/v1/budgets` | financial-management.budget | 2026-10-14 |
| Cost Management | POST | `/v1/budgets` | financial-management.budget | 2026-10-14 |
| Cost Management | PUT | `/v1/budgets/{id}` | financial-management.budget | 2026-10-14 |
| Firewall | POST | `/v1/firewalls/rules/bulk` | networking.firewall | 2026-10-14 |
| Firewall | PUT | `/v1/firewalls/rules/bulk` ? | networking.firewall | 2026-10-14 |
| IAM | DELETE | `/v1/groups/{id}/members/bulk` ? | iam.user | 2026-10-16 |
| IAM | POST | `/v1/groups/{id}/members/bulk` | iam.user | 2026-10-16 |
| IAM | DELETE | `/v1/groups/{id}/policy-bindings` | iam.policy | 2026-10-16 |
| IAM | DELETE | `/v1/groups/bulk` ? | iam.policy, iam.user-group, iam.user | 2026-10-16 |
| IAM | POST | `/v1/policies/compose` | iam.policy | 2026-10-16 |
| IAM | POST | `/v1/policies/decompose` | iam.policy | 2026-10-16 |
| IAM | PUT | `/v1/roles/{id}/trust-policy/principals` | iam.role | 2026-10-16 |
| IAM | PUT | `/v1/users/{id}/assignments` | iam.user | 2026-10-16 |
| Resource Groups | POST | `/v1/resources` | management.resource-group | 2026-10-16 |
| Security Group | POST | `/v1/security-group-rules/bulk` | security.security-group-rule | 2026-10-14 |
| ServiceWatch | PATCH | `/v1/event-rules` | management.servicewatch-event-rule | 2026-10-14 |
| Virtual Server | POST | `/v1/servers/{id}/uploaded-images` | compute.vm-stack | 2026-10-20 |

API 카탈로그에 서비스 자체가 없는 상품(콘솔로만 다루는 상품, 모수 밖):

- Cloud Fabric Connect: `POST /v1/connections`, `DELETE /v1/connections/{id}`, `PUT /v1/connections/{id}`, `POST /v1/fabrics`, `DELETE /v1/fabrics/{id}`, `PUT /v1/fabrics/{id}`, `POST /v1/policies`, `DELETE /v1/policies/{id}`, `PUT /v1/policies/{id}` — networking.cloud-fabric-connect
- Cloud LAN-Data Center: `POST /v1/cable`, `DELETE /v1/cable/{id}`, `POST /v1/device`, `DELETE /v1/device/{id}`, `POST /v1/network`, `DELETE /v1/network/{id}` — networking.cloud-lan-data-center
- Cloud WAN: `POST /v1/networks`, `DELETE /v1/networks/{id}`, `PUT /v1/networks/{id}/description` — networking.cloud-wan-network
- Notification Manager: `DELETE /v1/receiver-groups`, `POST /v1/receiver-groups`, `PUT /v1/receiver-groups/{id}` — management.notification-group
- Object Storage: `POST /v1/buckets`, `DELETE /v1/buckets/{id}`, `POST /v1/buckets/{id}/folder`, `DELETE /v1/buckets/{id}/objects`, `POST /v1/buckets/{id}/presigned-url`, `PUT /v1/buckets/{id}/versioning` — management.network-logging, management.trail, storage.object-storage-bucket

POST 지만 조회로 보이는 경로(세지 않음) 6개: `POST /v1/cost-analysis/budget`, `POST /v1/costs/estimate`, `POST /v1/policies/summary`, `POST /v1/policies/validate`, `POST /v1/resource-policies/validate`, `POST /v1/saml-providers/validate-metadata`
