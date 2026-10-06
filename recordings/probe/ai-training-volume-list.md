# #/ai-training/volume/list
title: Volume 목록 | Simple AI Training | kr-west1 | Console
list buttons: ["해제(dis)","Volume 연결","Volume 연결"]
headers:  | Volume명 | 연결된 | File | Storage | 생성 | 일시 | 
rows: 0

## "Volume 연결" → /ai-training/volume/request — Volume 생성 | Simple AI Training | kr-west1 | Console
- Volume명 Volume명은 ‘입력값+{영문 소문자와 숫자로 구성된 8자리 UUID}’로 생성됩니다. | input[text] | 영문 소문자로 시작하며 소문자,숫자와 특수문자(-)를 사용하여 3~32자로 입력하세요.(소문자 또는 숫자로 끝나야 합니다.) 0/32
- File Storage | div.dropdown "선택하세요." | 선택하세요.
buttons: ["취소","완료"]
  dropdown "File": []
