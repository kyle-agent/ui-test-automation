# #/ai-training/job/list
title: Training Job 목록 | Simple AI Training | kr-west1 | Console
list buttons: ["삭제(dis)","","Training Job 생성","Training Job 생성"]
headers:  | Training | Job명 | 분산 | Framework | 생성 | 일시 | 시작 | 일시 | 수행 | 시간 | 생성자 | 상태 | 
rows: 0

## "Training Job 생성" → /ai-training/job/request — Training Job 생성 | Simple AI Training | kr-west1 | Console
- 학습 형태 | button[submit] "On-Demand Training", button[submit] "Spot Training" | On-Demand Training Spot Training 원할 때 언제든 서버를 선점하여 중단 없이 안정적으로 학습하는 방식입니다.
- Training Job명 | input[text] | 영문소문자, 숫자와 특수문자(-)를 사용하여 3 ~ 63자로 입력하세요.(값이 있을 경우 반드시 영문으로 시작하고 영문 또는 숫자로 끝나야 합니다.) 0/63
- 분산 Framework | div.dropdown "선택하세요." | 선택하세요.
- Job Failover Spot Training 기능을 사용하는 경우 Job Failover 기능은 이용할  | div.checkbox "사용" | 사용
- 리소스 할당 학습에 활용할 GPU수, GPU, 메모리 크기를 선택합니다. | div.dropdown "선택하세요." | 선택하세요.
- 노드 수 분산학습 규모를 정의합니다. 2노드 이상부터 분산학습이 가능합니다. | input[text] | Job실행을 위한 노드 수 1~99 사이의 값을 입력하세요. 개
- Shared Memory 분산학습, 분산데이터 처리를 위해 프로세스간 공유할 메모리를 정의합니다. 미입력시  | input[text] | Job실행을 위한 Shared Memory(Gi) 1~8 사이의 값을 입력하세요. Gi
- AI Training Image URL Python, PyTorch, CUDA, Nvidia GPU 등 학습 | input[text] | 이미지 저장소의 AI Training Image URL을 입력하세요. 0/1,024
- 사용자 ID | input[text] | 이미지 저장소의 사용자 ID를 입력하세요. 0/256
- 비밀번호 | input[password] | 이미지 저장소의 비밀번호를 입력하세요. 0/256
-  | input[text], div.dropdown "선택하세요.", button[submit] "추가", input[text], input[text], input[text] | Volume 추가 Volume 사용 시 원하는 mount 경로(ex. /root)를 입력하고 연결할 Volume을 선택하세요. Mount Path Volume ex) /data 0/255 선택하세요. 추가 학습 스크
- 태그 | button[submit] "태그 추가" | 태그 추가 50개 태그를 더 추가할 수 있습니다. (최대 50개)
buttons: ["On-Demand Training","Spot Training","추가","태그 추가","취소","생성(dis)"]
  dropdown "분산": ["PyTorch","DeepSpeed"]
  dropdown "리소스": []
  dropdown "": ["PyTorch","DeepSpeed"]
