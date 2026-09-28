# Kubernetes Engine (SKE) — 콘솔 사실과 시나리오 후보 (2026-09-28)

출처: Jev 탐색 9회(`recordings/explore/ske-*-20260928*`, 결정 83회, 이상 0, 비용 $0.011) + 클러스터 실제 생성 2회(상세 프로브). 스펙: `tests/regression/container.ske-cluster.spec.ts`.

## 화면과 라우트

| 메뉴(screens.txt) | 라우트 | 실제 동작 |
| --- | --- | --- |
| 클러스터 | `#/ske/cluster` | 목록. 버튼 "서비스 해지"(행 선택 후)·"상세 검색"·"서비스 생성". 열: 클러스터명 · 노드 수 · 버전 · 상태 |
| 노드 | `#/ske/node` | 클러스터 드롭다운 + "조회". 클러스터 있으면 자동 선택. 노드 풀이 없으면 총 0 |
| 네임스페이스 | `#/ske/namespace` | 클러스터 드롭다운 + "조회". 새 클러스터에 기본 네임스페이스 4개. 버튼 "삭제"(행 선택), "오브젝트 생성" |
| 워크로드 / 서비스 및 인그레스 / 스토리지 / 구성 / 권한 | `#/ske/workload` `#/ske/network` `#/ske/storage` `#/ske/configuration` `#/ske/authorization` | **직접 진입 불가 → `#/home/dashboard` 로 리다이렉트** (클러스터 유무와 무관, 5개 화면 모두). 진입 시 콘솔 오류: `TypeError: Cannot read properties of undefined (reading 'length' / 'map')` (scp-kubernetes-user-console 번들) + XHR 404. 메뉴에서 어떻게 여는지는 미확인(클러스터 상세를 거치는 별도 경로일 수 있음) |

`/ske/cluster` 는 `/list` 로 끝나지 않아 2026-09-28 오전까지 커버리지 장부 밖이었다(오후에 모집단을 키 있는 화면 전부로 넓힘).

## 클러스터 생성 폼 (`#/ske/cluster/request`)

- **클러스터명**: 소문자로 시작, 소문자·숫자·`-`, `-` 로 끝나면 안 됨, 3~30자. 실측 거부: 2자("xp"), 21자, `_@#`, 한글, 빈 값 → "입력 조건에 맞지 않습니다" (`.scp-error`).
- **제어 영역 설정**: Kubernetes 버전 드롭다운(기본 최신 v1.36.3; v1.35.5·v1.34.3·v1.33.5 등, 항목에 "YYYY-MM-DD 지원 종료" 표시). 프라이빗 엔드포인트 접근 허용 자원 "추가" 모달(서비스 탭: Virtual Server / Bare Metal Server / GPU Server / Multi-node GPU Cluster / DevOps Service, 각 검색창).
  퍼블릭 엔드포인트 "사용" 체크 → 경고 모달 "Kubernetes API 에 대한 외부 접근이 가능합니다…"(취소/확인). ServiceWatch 로그 수집·Deletion Protection 체크(기본 꺼짐).
- **네트워크 설정**: "VPC명 정보"·"기본 Subnet 정보" 드롭다운(항목 텍스트 `vpc-… AZ: kr-west1-b`, `sub-… 유형: Public, 구분: Primary, IP 대역: …`), "추가 Subnet"(선택 모달, 최대 2), "Security Group"(선택 모달, 최대 4, 검색 → 행 체크 → 확인).
- **StorageClass 설정 → NFS 볼륨 "사용"**: **기본 켜짐인데 볼륨을 고르지 않으면 "생성" 이 활성화되지 않는다** (오류 문구 없음). 끄면 활성. 이것이 첫 spec 작성 때 막힌 원인.
- 클러스터 연결 자원(File Storage/Object Storage) 선택 사항. "요금 확인" → 월 ₩62,780(제어 영역만). "생성" → 확인 모달.
- 폼 "취소" → "현재 화면을 나가시겠습니까?" 모달.

## 상세 (`#/ske/cluster/detail/info?clusterId=…`)

- 탭: 상세 정보 · 노드 풀 (n) · 태그 (n) · 작업 이력 — `role=tab` 이 아니라 텍스트 버튼(`getByText(/^노드 풀 \(\d+\)$/)`). 상단 "서비스 해지"(로딩 중엔 비활성).
- 상세 정보(Running 뒤): 서비스 Kubernetes Engine / 자원 유형 cluster / SRN `srn:e::<account>:kr-west1::ske:cluster/<id>` / 생성자·일시, 클러스터명, 제어 영역(버전, **프라이빗 엔드포인트 주소** `https://<name>-xxxxx.ske.private.kr-west1.e.samsungsdscloud.com:6443`,
  **"관리자 kubeconfig 다운로드"·"사용자 kubeconfig 다운로드"** 버튼 — 다운로드는 CDP 연결 Edge 를 죽일 수 있어(Keypair .pem 사례) 테스트에서 누르지 않는다, 접근 허용 자원 ✎(모달 "프라이빗 엔드포인트 접근 허용 자원 수정"), 퍼블릭 엔드포인트, ServiceWatch, Deletion Protection),
  네트워크(VPC·기본 Subnet·추가 Subnet·Security Group·**Managed Security Group** `ske-managed-<name>-xxxxx` 가 자동 생성됨), StorageClass(NFS 볼륨), 클러스터 연결 자원.
- 노드 풀 탭: "노드 풀 정보 최대 노드 수 0", 버튼 "노드 풀 삭제"(비활성)·"노드 풀 추가"(상단·빈 목록 안 두 곳). 열: 노드 풀명 · 서버 타입 · 서버 OS 버전 · 노드 수 · 상태. `hasText: /노드 풀/` 은 비활성 "노드 풀 삭제" 를 먼저 잡으므로 `getByRole('button', { name: '노드 풀 추가' })`.
- 진입 직후 몇 초간 로더와 "-" 값 → `settleConsole` 뒤 클러스터명이 보일 때까지 기다린다.
- **해지 모달**: "클러스터명: … 클러스터를 해지하시겠습니까? 규모에 따라 수십 분 소요… 노드·모든 Kubernetes 오브젝트·type LoadBalancer 로 생긴 LB 가 영구 삭제… **확인을 위해 클러스터명을 입력**" → `confirmModal(..., { agree: true, resourceName })` 이 이름을 친다.

## 시간 (실측)

| 구간 | 1차 (14:04) | 2차 (15:13, PG 와 동시) | 3차 (16:02) | 4차 (16:26) |
| --- | --- | --- | --- | --- |
| 생성 확인 → Running | ≈7분 | ≈6분 | ≈7분 | 463초 |
| 해지 확인 → 목록에서 소멸 | ≈12분 | ≈8분 | ≈1분 | **42초** |

해지 소요가 크게 흔들린다(42초~12분). `waitForRow(gone)` 은 30분 한도로 둔다. 생성은 안정적으로 6~8분.

## 정리 규칙

- 이름 `ske-<run_id>`. 목록에서 행 선택 → "서비스 해지" → 확인 모달(동의 체크 없음, 이름 입력 없음). Creating 동안은 해지 불가 → Running 대기 후.
- `src/console/inventory.ts` 의 `ske` 종류가 같은 절차로 지운다. Deletion Protection 을 켜면 해지가 막히므로 테스트는 켜지 않는다.

## 시나리오 후보

1. **(있음)** `container.ske-cluster`: VPC → Subnet → SG → 클러스터(노드 없음) → 해지. L4.
2. **노드 풀 생성·삭제(L3 동작)**: 상세 "노드 풀" 탭 → 노드 풀 폼(2차 프로브에서 라벨·컨트롤 확인) → 노드 1대(최소 타입) → Running → 삭제. 서버 과금 + 수 분 추가. `scenarios/container/ske-nodepool.yaml` 초안 참고.
3. **네임스페이스 오브젝트 생성**: `#/ske/namespace` → 클러스터 선택 → "오브젝트 생성"(YAML 입력 폼으로 추정, 2차 프로브 확인) → 네임스페이스 1개 생성 → 삭제. 노드 없이도 가능하면 무과금 L3.
4. **버전 선택 검증(단언 후보)**: 버전 드롭다운의 "지원 종료" 날짜가 오늘 이후여야 한다(정보 표시 회귀).
5. **제품 결함 후보**: 워크로드·네트워크·스토리지·구성·권한 라우트 직접 진입 시 TypeError + 404 후 홈으로 튕김. 메뉴 클릭 경로로 재현되는지 확인 뒤 `data/known-issues.yaml` 등록 여부 결정.

## 탐색 메모

- 리스트 화면 5개(워크로드 등)는 홈으로 리다이렉트되어 탐색기가 홈 화면 컨트롤(My Info·알림 목록 등)만 보고 BLOCKED 6회로 끝났다. 라우트가 열리지 않으면 탐색 자체를 건너뛰는 사전 점검이 필요하다.
- 노드·네임스페이스 화면은 클러스터가 없으면 "선택하세요." 드롭다운이 비어 결정 5~6회로 끝난다 → `--prereq` 에 클러스터를 넣을 수 있게 하면 탐색 가치가 생긴다(생성 7분·해지 1~12분·시간 과금).
