# 상세 화면 동작(L3) 프로브 — 에이전트 3C (2026-10-06)

자기 탭에서 run_id `1006-1500-3c3c` 리소스를 만들어 상세 화면의 버튼·탭·수정 아이콘을 확인했다(프로브 리소스는 끝에 모두 정리).
공통: 상세 라벨의 연필은 `i.i-edit`(같은 라벨에 안내 `i.i-info` 가 있을 수 있다 — Object Storage "버전 관리"). 태그 탭 "태그 (n)"/"태그(n)" →
"태그 수정" → 별도 화면 `…/tag/edit` (Key·Value 쌍, 행 삭제 `i.i-del`, "태그 추가") → 저장 → "태그를 수정하시겠습니까?" 또는 "수정한 정보를 저장하시겠습니까?".

| 화면 | 상세 버튼 | 수정 가능(연필/화면) | 탭 | 채택한 동작 | 하지 않은 것(이유) |
| --- | --- | --- | --- | --- | --- |
| Queue `#/queueservice/queueservices/detail/info` | 서비스 해지 · 삭제 · IP Address 추가 | 메시지 설정(크기·보존·지연·표시 제한·수신 대기 모달), 암호화, 리드라이브, 설명 | 없음 | 보존 기간 4→5일, IP 접근 허용 추가(모달, 안쪽 "추가" 는 빈 행을 더할 뿐) → 행 삭제 | 메시지 보내기/받기·purge(콘솔에 없음) |
| 알림 그룹 `#/notification/group/RECEIVER-GROUP-…` | 삭제 · 수정(→ `/modify`) | 이름·설명·사용자 표·외부 수신자 textarea | 없음 | 설명 + 외부 수신자 qa-…@example.com 저장 → 비우기 | 사용자 추가(로그인 이력 있는 실제 사용자만) |
| Server Group `#/virtualserver/server-group/detail/info` | Server Group 삭제 | 없음 | 상세 정보 · 태그 (0) · 작업 이력 | 태그 추가·삭제, 작업 이력 "Server-group Create End 성공" | 멤버(서버 생성 때만) |
| Resource Group `#/resourcegroups/resource-group/detail/<id>/info` | Resource Group 삭제 | 설명 | 기본 정보 · 그룹 자원 (n) · 태그 (n) | "그룹 자원 수정"(`/update/<id>`) 조건 칩 추가·제거(`i.remove-button`), 태그 | 그룹에 실제 자원 넣기(다른 자원 태그 필요, 그룹 자신에 조건 태그를 달아도 0) |
| IAM 역할 `#/iam/role/<id>/info` | 역할 삭제 | 최대 세션 지속 시간(드롭다운), 설명 | 기본 정보 · 수행 주체(n) · 정책(n) · 태그(n) | 정책 연결(`/policy/attach`)·해제, 수행 주체 수정(`/principal/edit`: 구분 현재 Account·다른 Account·사용자 SRN·자격 증명 공급자·서비스) 서비스 cloudscope 추가·제거(`i.i-btn-del`), 세션 1→2시간, 태그 | — |
| KMS `#/kms/kms/detail/info` | 키 회전 · 키 비활성화/키 활성화 · 서비스 해지 | 설명 (라벨 아이콘 다수는 안내) | 상세 정보 · 태그 (0) · 작업 이력 | 회전(현재 버전 1→2), 비활성화(Stop, 회전 비활성) → 활성화(Active), 설명, 태그 | — |
| Certificate `#/certificate-manager/certificate-manager/detail/info` | 서비스 해지 | 만료 알림 | 상세 정보 · 연결된 자원 (0) · 태그 (0) · 작업 이력 | 태그 | 만료 알림(켜면 수신자 = 실제 사용자·그룹, 만료 45/30/15/7/1일 전 메일), 갱신·재발급(버튼 없음) |
| Object Storage `#/objectstorage/objectstorage/detail/info` | 서비스 해지 | 암호화 · 버전 관리 · 접근 제어 | 상세 정보 · 폴더 리스트 · 복제 · 원본 파일 복사 · 태그 (0) | 새폴더, 파일 업로드(드롭존 `input.dz-hidden-input` setInputFiles) → 삭제, 버전 관리 사용→미사용, 태그 | 수명 주기 정책(화면 없음), 다운로드(Edge) |
| Container Registry `#/scr/registry/detail/info` | 이용 가이드 · 서비스 해지 | 엔드포인트(프라이빗 / 프라이빗&퍼블릭), 프라이빗 엔드포인트 접근 제어 | 상세정보 · 태그 (0) · 작업 이력 | 엔드포인트 프라이빗&퍼블릭(Editing ≈1~2분) → 프라이빗, 태그 | 가시성(생성 때만) |
| Repository `#/scr/repository/detail/info` | 이용 가이드 · Repository 삭제 | 설명 · 이미지 스캔 · 이미지 pull 제한 · 이미지 잠금 여부 · 이미지 태그 삭제 | 상세정보 · 태그 (0) · 작업 이력 | 태그 삭제 정책(Untagged 90일 + 활성화) 켜기→끄기, Lock→Unlock, 설명, 태그 | 자동 스캔(push 시 과금), 이미지 push(docker) |
| CDN `#/cdn/cdn/detail/info` | 시작 · 중지 · Purge 적용 · 서비스 해지 · 수정 (배포 Pending 중 모두 비활성) | 설명 | 상세 정보 · 태그 (0) · 작업 이력 | (아래 spec 주석 참고) | |

주의: Registry 가 Editing 인 동안 Repository 목록의 레지스트리 드롭다운에 그 레지스트리가 나오지 않는다.
비어 있지 않은 버킷은 해지가 거절되어 남는다 → 버킷 spec 은 동작 실패 시 폴더 리스트를 비운다.
