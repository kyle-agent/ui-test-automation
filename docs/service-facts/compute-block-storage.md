# Block Storage(볼륨): 생성·연결·분리·삭제 제약 (2026-09-23)

시나리오 `scenarios/compute/vm-volume.yaml` / `tests/regression/compute.vm-volume.spec.ts` 의 근거. 출처 표기는 `compute-vm-stack.md` 와 같다.

## 1. 순서와 대기
- 생성(VPC 불필요, zone 필수) → Available(≤300s) → 서버(ACTIVE)에 연결 → In-use(≤180s) → 분리 → Available(≤180s) → 삭제.
- API: `POST /v1/volumes {name, size, volume_type, zone:"kr-west1-b", tags}` (필드명 `volume_type`, `type` 아님; 응답 `$.id`). 연결 `POST /v1/volumes/{id}/servers {server_id, delete_on_termination:false}`,
  분리 `DELETE /v1/volumes/{id}/servers/{server_id}`, 삭제 `DELETE /v1/volumes/{id}`(409/500 재시도 8×15s). 상태 흐름 Creating → (Downloading) → Available; 연결 시 Attaching → In Use; 분리 시 Detaching → Available.
- **분리 직후 서버 해지가 `InvalidVirtualServerState.DeleteImpossible` 로 잠시 실패**할 수 있다(API 실측) → 분리 후 20초 이상 기다리거나 재시도.

## 2. 필수 항목과 제약
- size 8~12228 GB, **8의 배수**("Volume size of disk should be divisible by 8"). volume_type: SSD, HDD, SSD_Provisioned, SSD_KMS, HDD_KMS, SSD_MultiAttach, HDD_MultiAttach.
  SSD_Provisioned 만 max_iops(5000~20000)·max_throughput(250~1000) 필수. _MultiAttach 만 여러 서버에 동시 연결. 서버당 데이터 볼륨 최대 26개.
- 삭제 가능 상태는 정확히 {Available, Error, Error Extending, Error Restoring, Error Managing}. 연결된 볼륨·OS(boot) 볼륨은 삭제 불가, boot 볼륨은 분리도 불가.
- 부트 볼륨의 `delete_on_termination` 캐스케이드가 서버 소멸 뒤 늦게 도는 경우가 있다 → 서버 소멸 후 볼륨 목록에 잔여 볼륨이 있는지 확인.
- 확장(extend)만 가능(축소 불가), 온라인, 8의 배수. 커스텀 이미지의 원본 볼륨은 이미지 → 스냅샷 → 볼륨 순으로 지워야 한다.
- 알려진 버그: `POST /v1/volume-transfer` 500 (createvolumetransfer). 생성/연결/분리 자체엔 기지 버그 없음.

## 3. 콘솔 (2026-09-23 프로브)
- 목록 `#/virtualserver/block-storage/list`: 열 볼륨 ID | 볼륨명 | 디스크 유형 | 종류 | 용량 | Availability Zone | 생성 일시 | 상태. 버튼 상단 "삭제"(행 선택 후), "Block Storage 생성".
- 생성 폼 `#/virtualserver/block-storage/request`: "볼륨명"(255자, 영문·숫자·공백·-_), "디스크 유형" 드롭다운(SSD / SSD_KMS / SSD_MultiAttach / SSD_Provisioned), "용량"(Units 입력 = 8GB 단위, GB 자동 표시),
  "Max IOPS"/"Max Throughput"(Provisioned 만), "Availability Zone"(kr-west1-b), "스냅샷" 사용 체크, "요금 확인" / "생성".
- 생성 실측: 폼 제출 후 목록에 "SSD 추가 스토리지 8GB … Available" 로 약 30초 안에 나타난다.
- 삭제 모달(행 선택 → 상단 "삭제"): "Block Storage 1대를 삭제하시겠습니까? … 확인을 위해 삭제를 입력해주세요" — **텍스트 입력란에 "삭제" 를 쳐야 "확인" 이 활성화**된다
  (`confirmModal(page, /삭제하시겠습니까/, '확인', { agree: true })` 가 "확인을 위해 <단어>를 입력" 문구를 읽어 자동 입력). 삭제 불가 조건: 서버 연결 중, OS 기본 볼륨, Custom 이미지와 연결, Available/Error* 외 상태.
- 서버 상세의 "Block Storage" 텍스트는 숨은 내비게이션(`div.com-nav-name`)에도 있어 `:visible` 로 한정해야 한다.
- 서버 상세(상세 정보 탭) 하단 "Block Storage" 표: 볼륨 ID | 볼륨명 | 디스크 유형 | 용량 | 연결 정보(/dev/vda) | 종류(OS 기본 스토리지) | Delete on termination | ⋮. 상단 "Delete on termination 수정", 오른쪽 "추가".
  연결 = "추가" 버튼 → 모달 "Block Storage 추가"(볼륨 검색 표: "볼륨명을 입력하세요." 검색란, 볼륨 ID | 볼륨명; **초기엔 비어 있어 이름을 입력하고 Enter 로 검색해야 행이 나온다**) → 행 체크 → "확인".
  연결 후 볼륨 목록 상태는 **"In Use"(띄어쓰기)**, 서버 상세 표에 행이 추가된다(연결 정보 /dev/vdb 등). 실측: 연결 요청 후 In Use 까지 ≈30초.
  분리 = 서버 상세 표의 행 끝 ⋮ 메뉴 → 항목 "Delete on termination 수정" / **"연결 해제"** → 확인 모달 → 볼륨 목록 Available(≈30초) → 행 선택 → 상단 "삭제"("삭제" 입력 확인) → 소멸.
