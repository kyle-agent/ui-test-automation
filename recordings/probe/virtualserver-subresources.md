# Virtual Server 하위 리소스 프로브 (2026-09-30, 에이전트 C)

프로브 자원: vpc/sub/vm-c0930-prb (Ubuntu 24.04, s1v1m2), 볼륨 snap-0930-1610-c0c0. 모두 지움.

## 서버 상세 `#/virtualserver/virtualserver/detail/info?virtualServerId=…`
- 상단 버튼: 시작 · 중지 · 재시작 · Image 생성 · 콘솔 로그 · Dump 생성 · 서비스 해지
- 네트워크 절: 기본 포트 상자(.gray_box) + "신규 네트워크 포트로 추가" / "기존 네트워크 포트로 추가". 로컬 Subnet 절도 같은 두 버튼.
- Block Storage 절: Delete on termination 수정 · 추가.

## 커스텀 Image (createvirtualservercustomimage 202 · updateimage · deleteimage 204)
- "Image 생성" → `#/virtualserver/virtualserver/custom-image-request?virtualServerId=…` 폼: Image명(영문·숫자·공백·-_ 200자) 하나.
  안내 "Active 상태의 Virtual Server로 생성된 Image의 파일 시스템은 무결성을 보장할 수 없습니다." → "완료" → "Image를 생성하시겠습니까?" → 확인.
- Image 목록 `#/virtualserver/image/list`: Queued → Active (≈2분, 16GB/1.72GB, 유형 Image-Based, Visibility private).
- Image 상세 버튼: 공유용 Image 생성(비활성: "Visibility가 Private이고 Image 유형이 Snapshot-Based 일 경우에만") ·
  다른 Account로 공유(비활성: "Visibility가 Shared 일 경우") · Image 삭제.
- 라벨 연필: 최소 디스크 · 최소 RAM · Visibility(모달 Private/Shared → "Visibility를 수정하시겠습니까?") · Protected.
- Shared 로 바꾸면 "공유 현황" 표(승인 Account ID)와 "공유 중지" 가 생기고 "다른 Account로 공유" → "다른 Account로 Image를 공유하시겠습니까?" →
  `#/virtualserver/image/sharing-request` 폼: "공유 Account ID"(64자). **대상 Account 가 없어 멤버 추가는 하지 않았다**(임의 ID 로 보내면 남의 계정에 공유 요청).
- 삭제: 상세 "Image 삭제" → "Image명: … Image를 삭제하시겠습니까?" → 확인 → 토스트 "Image 삭제가 성공하였습니다." → 수 초 뒤 목록에서 사라짐.
- Image 목록의 "Image 생성"(`#/virtualserver/image/request`)은 Object Storage 에 올린 qcow2 URL 이 필요(파일 업로드) → 하지 않음.

## 네트워크 포트 (createserverinterface 200 · deleteserverinterface)
- "신규 네트워크 포트로 추가" 모달: 일반 Subnet명(드롭다운, 서버 Subnet 기본 선택) · IP(**필수**, "10.250.0.0/24 범위 내로 입력") → 확인 → "네트워크를 추가하시겠습니까?" → 확인.
- 수 초 뒤 상세에 포트 상자가 하나 더 생기고 목록 IP 칸이 "10.250.0.75, 10.250.0.200". 작업 이력 "Virtual-server Interface Attach End".
- 삭제: 포트 상자 오른쪽 위 `i.i-btn-del` → "네트워크를 삭제하시겠습니까?" → 확인 → 10초 안에 사라짐.
- Public NAT IP 연결은 상자 안 "Public NAT IP" 연필(compute.vm-stack-net 이 기본 포트로 다룸 → 생략).

## Dump (createvirtualserverdump 202)
- "Dump 생성" → "Dump를 생성하시겠습니까? Dump 파일은 Virtual Server 안에 생성됩니다." → 확인 → 토스트 "Dump 생성이 성공하였습니다. 서버명: …". 다운로드 없음. 서버는 Active 유지.

## 볼륨 이전 (createvolumetransfer 202 · deletevolumetransfer 202)
- Block Storage 상세 "볼륨 이전" (In Use 볼륨은 비활성, 서버 없는 Available 볼륨만) → "볼륨명: … 볼륨 이전을 신청하시겠습니까? … 동일한 AZ … 다른 Account에서 '볼륨 이전 받기' 완료 후 기존 Account에서 볼륨이 제거됩니다." → 확인
  → 토스트 "볼륨 이전 요청이 완료되었습니다" + 모달 "볼륨 이전 ID / 승인 Key"(비밀 — 읽지·기록하지 않음) → 목록 상태 **Awaiting Transfer**, 상세 버튼 "볼륨 이전 취소"(스냅샷 생성·연결 비활성).
- **승인 Key 모달의 "확인" 을 누르면 몇 초 뒤 테스트 탭이 닫혔다(2회 연속, Target page closed)** — 키 파일 다운로드로 추정. spec 은 누르지 않고 새로 고친다.
- "볼륨 이전 취소" → "볼륨 이전을 취소하시겠습니까?" → 토스트 "볼륨 이전 취소가 성공하였습니다." → Available.
