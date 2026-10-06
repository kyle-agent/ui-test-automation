# #/privatezone/private-zone
title: Private Zone 목록 | Private Zone | Global | Console
list buttons: ["Account 연결(dis)","서비스 신청","서비스 신청"]
headers:  | Private | Zone명 | 연결 | 리전 | 서비스 | 유형 | 연결 | Account | 수 | 상태
rows: 0

## "서비스 신청" → /privatezone/private-zone/apply — Private Zone 신청 | Private Zone | Global | Console
-  | (컨트롤 없음) | 신청하신 내용은 내부 검토를 거쳐서 영업을 통해서 별도로 연락드릴 예정입니다. (신청 후 일주일 이내) Private Zone 서비스는 신청 후 고객사 설치 환경 및 필요한 시스템 구성을 위한 자원 규모에 대한 협의
- 서비스 유형 | div.checkbox "일반형", div.checkbox "공공형" | 일반형 공공형
- 서비스 제공 방식 | (컨트롤 없음) | 클라우드 관리 영역(SCP 리전 사용) + 고객 자원 영역(고객사 전용)
- 랙 구성 | (컨트롤 없음) | 기본 (5개) + 추가 옵션
- 연결 리전 | div.dropdown "한국 서부1" | 한국 서부1
- Private Zone명 Private Zone을 구별하기 위한 명칭입니다. | input[text] | kr-west1- 영문 소문자를 사용하여 3자로 입력하세요. 0/3
- 설치 위치 (주소) Private Zone을 구축할 위치의 주소입니다. 해당 정보는 장비 설치 및 SDS 센 | input[text] ph=우편번호를 입력하세요., button[submit] "우편번호 찾기", input[text] ph=한글 주소를 입력하세요., input[text] ph=나머지 한글 주소를 입력하세요. | 우편번호를 입력하세요. 우편번호 찾기 한글 주소를 입력하세요. 나머지 한글 주소를 입력하세요. 0/16
- 서비스 이용 시작일 서비스를 사용하기 원하는 일자를 입력합니다. 해당일부터 과금이 시작됩니다. 일반적으로 서 | input[text] ph=YYYY-MM-DD | 
- 약정 기간 | div.dropdown "3년" | 3년
- Total vCPU | div.checkbox "사용" | 기본 300vCore, 4TB Memory 추가 서버 단위(1대 150vCore, 2TB Memory)로 추가 가능하며 표준 랙 구성에서 제공하는 최댓값을 초과하면 추가랙이 필요할 수 있습니다. 표준 랙 최댓값 : 
- 기본 | (컨트롤 없음) | 300vCore, 4TB Memory
- 추가 서버 단위(1대 150vCore, 2TB Memory)로 추가 가능하며 표준 랙 구성에서 제공하는 최댓 | div.checkbox "사용" | 사용
- Bare Metal Server | div.checkbox "사용" | 사용
- GPU Server | div.checkbox "사용" | 사용
- Block Storage(SSD) | div.checkbox "사용" | 기본 120TB 추가 20TB 단위로 추가 가능하며 기본랙에서는 최대 합계 560TB까지 제공 가능합니다. 560TB를 초과할 경우 추가랙이 필요합니다. 사용
- 기본 | (컨트롤 없음) | 120TB
- 추가 20TB 단위로 추가 가능하며 기본랙에서는 최대 합계 560TB까지 제공 가능합니다. 560TB를 초과 | div.checkbox "사용" | 사용
- File Storage(HDD) | div.checkbox "사용" | 기본 90TB 추가 15TB 단위로 추가 가능하며 기본랙에서는 최대 합계 360TB까지 제공 가능합니다. 360TB를 초과할 경우 추가랙이 필요합니다. 사용
- 기본 | (컨트롤 없음) | 90TB
- 추가 15TB 단위로 추가 가능하며 기본랙에서는 최대 합계 360TB까지 제공 가능합니다. 360TB를 초과 | div.checkbox "사용" | 사용
- Object Storage(HDD) Object Storage는 Object Storage 서비스 및 Bac | div.checkbox "사용", div.checkbox "사용" | 기본 70TB 추가 40TB 단위로 추가 가능하며 기본랙에서는 최대 합계 270TB까지 제공 가능합니다. 270TB를 초과할 경우 추가랙이 필요합니다. 사용 Backup 서비스 Object Storage의 용량 범위
- 기본 | (컨트롤 없음) | 70TB
- 추가 40TB 단위로 추가 가능하며 기본랙에서는 최대 합계 270TB까지 제공 가능합니다. 270TB를 초과 | div.checkbox "사용" | 사용
- Backup 서비스 Object Storage의 용량 범위에서 Backup 서비스를 사용할 수 있으며 설정된 | div.checkbox "사용" | 사용
- 태그 | button[submit] "태그 추가" | 태그 추가 50개 태그를 더 추가할 수 있습니다. (최대 50개)
buttons: ["우편번호 찾기","태그 추가","요금 확인","취소","완료(dis)"]
  dropdown "연결": ["한국 동부1","한국 서부1"]
  dropdown "약정": ["1년","3년","5년"]
