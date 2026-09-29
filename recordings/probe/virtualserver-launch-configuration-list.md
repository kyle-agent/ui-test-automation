# #/virtualserver/launch-configuration/list
title: Launch Configuration 목록 | Virtual Server | kr-west1 | Console
list buttons: ["삭제(dis)","Launch Configuration 생성","Launch Configuration 생성"]
headers:  | Launch | Configuration명 | Image | 서버 | 타입 | Block | Storage | Auto-Scaling | Group | 수
rows: 0

## "Launch Configuration 생성" → /virtualserver/launch-configuration/request — Launch Configuration 생성 | Virtual Server | kr-west1 | Console
-  | div.dropdown "Alma 9.6", div.dropdown "2025-05-22" | 표준 Custom Alma Linux Oracle Linux RHEL Rocky Linux Ubuntu Windows Image 버전 이미지 버전의 EOS/EOL 정보는 사용자 가이드 > Image 버전 에서 확인하
- Launch Configuration명 | input[text] | 영문, 숫자와 특수문자(-_)를 사용하여 63자 이내로 입력하세요. 0/63
- 서비스 유형 | div.dropdown "선택하세요.", div.dropdown "선택하세요." | 서버 타입 서버 타입마다 지원하는 Availability Zone이 다를 수 있으니 확인 후 선택하세요. 선택하세요. 선택하세요.
- 서버 타입 | div.dropdown "선택하세요.", div.dropdown "선택하세요." | 서버 타입마다 지원하는 Availability Zone이 다를 수 있으니 확인 후 선택하세요. 선택하세요. 선택하세요.
- Block Storage 디스크의 유형과 용량 정보를 입력합니다. - SSD_Provisioned : IOP | div.dropdown "SSD_Provisioned", input[text], input[text], input[text], input[text], div.checkbox "사용" | 기본 OS SSD_Provisioned Units GB Max IOPS* IOPS Max Throughput* MB/s 추가 사용
- 기본 OS | div.dropdown "SSD_Provisioned", input[text], input[text], input[text], input[text] | SSD_Provisioned Units GB Max IOPS* IOPS Max Throughput* MB/s
- 추가 | div.checkbox "사용" | 사용
- Keypair명 Keypair는 Virtual Server에 연결할 때 사용하는 사용자 증명 방법입니다. O | div.dropdown "선택하세요." | 선택하세요.
- File Storage 설정 | div.checkbox "사용" | 사용
- Init script Init script는 선택 이미지에 따라 윈도우의 경우 배치 스크립트, 리눅스의 경우 | textarea[textarea] | 45,000byte 이내로 입력하세요. 0/45,000 bytes
- 태그 | button[submit] "태그 추가" | 태그 추가 50개 태그를 더 추가할 수 있습니다. (최대 50개)
buttons: ["태그 추가","취소","생성(dis)"]
  dropdown "": ["SSD","SSD_KMS","SSD_Provisioned"]
  dropdown "서비스": ["Standard-1 AZ: kr-west1-b","Standard-2 AZ: kr-west1-b","High Capacity-2 AZ: kr-west1-b","High Capacity-3 AZ: kr-west1-b"]
  dropdown "서버": ["Standard-1 AZ: kr-west1-b","Standard-2 AZ: kr-west1-b","High Capacity-2 AZ: kr-west1-b","High Capacity-3 AZ: kr-west1-b"]
  dropdown "Block": ["Alma 9.6","Alma 8.10"]
  dropdown "기본": ["SSD","SSD_KMS","SSD_Provisioned"]
  dropdown "Keypair명": ["qa-shared-keypair"]
