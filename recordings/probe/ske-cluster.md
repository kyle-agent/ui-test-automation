# #/ske/cluster
title: 클러스터 목록 | Kubernetes Engine | kr-west1 | Console
list buttons: ["서비스 해지(dis)","상세 검색","서비스 생성","서비스 생성"]
headers:  | 클러스터명 | 노드 | 수 | 버전 | 상태 | 
rows: 0

## "서비스 생성" → /ske/cluster/request — 클러스터 생성 | Kubernetes Engine | kr-west1 | Console
- 클러스터명 | input[text] | 영문 소문자로 시작하며 특수문자(-)로 끝나지 않도록 소문자, 숫자와 특수문자(-)를 사용하여 3 ~ 30 자로 입력하세요. 0/30
- 제어 영역 설정 | div.dropdown "v1.36.3", div.dropdown "5개씩 보기", button[submit] "삭제", button[submit] "추가", div.checkbox, div.checkbox "사용", div.checkbox "사용", div.checkbox "사용" | Kubernetes 버전 v1.36.3 프라이빗 엔드포인트 접근 허용 자원 해당 클러스터의 노드가 아닌 다른 자원에서 프라이빗 엔드포인트로 접근을 허용하려면, 접근이 필요한 자원을 등록하세요. 동일 Account, 
- Kubernetes 버전 | div.dropdown "v1.36.3" | v1.36.3
- 프라이빗 엔드포인트 접근 허용 자원 해당 클러스터의 노드가 아닌 다른 자원에서 프라이빗 엔드포인트로 접근을  | div.dropdown "5개씩 보기", button[submit] "삭제", button[submit] "추가", div.checkbox | 총 0 5개씩 보기 삭제 추가 서비스 자원명 데이터가 없습니다.
- 퍼블릭 엔드포인트 Kubernetes API 를 외부에서 접근 가능하도록 엔드포인트를 노출시키고, 접근 허용 | div.checkbox "사용" | 사용
- ServiceWatch 로그 수집 클러스터에 대한 로그를 ServiceWatch > 로그 그룹에서 확인할 수 | div.checkbox "사용" | 사용
- Deletion Protection 클러스터가 실수로 삭제 되는 것을 방지하기 위해, 해당 클러스터에 대해  | div.checkbox "사용" | 사용
- 네트워크 설정 | div.dropdown "선택하세요.", div.dropdown "선택하세요.", button[submit] "선택", button[submit] "선택" | VPC명 정보 선택하세요. 기본 Subnet 정보 선택하세요. 추가 Subnet 정보 선택 선택된 추가 Subnet이 없습니다. 2개 이내의 추가 Subnet을 선택하세요. 0/2 개 Security Group 정보
- VPC명 정보 | div.dropdown "선택하세요." | 선택하세요.
- 기본 Subnet 정보 | div.dropdown "선택하세요." | 선택하세요.
- 추가 Subnet 정보 | button[submit] "선택" | 선택 선택된 추가 Subnet이 없습니다. 2개 이내의 추가 Subnet을 선택하세요. 0/2 개
- Security Group 정보 | button[submit] "선택" | 선택 선택된 Security Group이 없습니다. 4개 이내의 Security Group을 선택하세요. 0/4 개
- StorageClass 설정 선택한 File Storage 볼륨에 연동되는 StorageClass와 Prov | div.checkbox "사용", div.dropdown "선택하세요." | NFS 볼륨 정보 사용 선택하세요.
- NFS 볼륨 정보 | div.checkbox "사용", div.dropdown "선택하세요." | 사용 선택하세요.
- 클러스터 연결 자원 클러스터 내 모든 노드의 접근이 필요한 연결 자원(File Storage / Object | div.dropdown "5개씩 보기", button[submit] "삭제", button[submit] "추가", div.checkbox | 총 0 5개씩 보기 삭제 추가 서비스 자원명 데이터가 없습니다. 클러스터 생성 후, 클러스터 상세 화면의 노드 풀 탭에서 노드 풀을 추가해주세요.
- 태그 | button[submit] "태그 추가" | 태그 추가 50개 태그를 더 추가할 수 있습니다. (최대 50개)
buttons: ["삭제(dis)","추가","선택(dis)","선택","삭제(dis)","추가","태그 추가","요금 확인","취소","생성(dis)"]
  dropdown "제어": ["v1.36.3 2028-06-28 지원 종료","v1.36.3 2028-06-28 지원 종료","v1.35.5 2028-02-28 지원 종료","v1.35.5 2028-02-28 지원 종료","v1.34.3 2027-10-27 지원 종료","v1.34.3 2027-10-27 지원 종료","v1.33.5 2027-06-28 지원 종료","v1.33.5 2027-06-28 지원 종료","v1.32.8 2027-02-28 지원 종료","v1.32.8 2027-02-28 지원 종료","v1.31.8 2026-10-28 지원 종료","v1.31.8 2026-10-28 지원 종료"]
  dropdown "Kubernetes": ["v1.36.3 2028-06-28 지원 종료","v1.36.3 2028-06-28 지원 종료","v1.35.5 2028-02-28 지원 종료","v1.35.5 2028-02-28 지원 종료","v1.34.3 2027-10-27 지원 종료","v1.34.3 2027-10-27 지원 종료","v1.33.5 2027-06-28 지원 종료","v1.33.5 2027-06-28 지원 종료","v1.32.8 2027-02-28 지원 종료","v1.32.8 2027-02-28 지원 종료","v1.31.8 2026-10-28 지원 종료","v1.31.8 2026-10-28 지원 종료"]
  dropdown "네트워크": []
  dropdown "VPC명": []
  dropdown "기본": []
  dropdown "StorageClass": []
  dropdown "NFS": []
  dropdown "클러스터": []
