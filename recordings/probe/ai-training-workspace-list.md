# #/ai-training/workspace/list
title: Training Workspace 목록 | Simple AI Training | kr-west1 | Console
list buttons: ["서비스 해지(dis)","","서비스 생성","서비스 생성"]
headers:  | Training | Workspace명 | 리소스 | 할당 | 노드 | 수 | 약정 | 기간 | 
rows: 0

## "서비스 생성" → /ai-training/workspace/request — Training Workspace 생성 | Simple AI Training | kr-west1 | Console
- Training Workspace명 | input[text] | 영문소문자, 숫자와 특수문자(-)를 사용하여 3 ~ 54자로 입력하세요.(값이 있을 경우 반드시 영문으로 시작하고 영문 또는 숫자로 끝나야 합니다.) 0/54
- 리소스 할당 원활한 서비스와 모델 학습시의 모니터링을 위해 GPU 1장당 최대 1.25vC, 20Gi 미만의 | div.dropdown "선택하세요." | 선택하세요.
- 노드 수 | input[text] | 사용을 원하는 Instance Type의 노드수 1~999사이의 값을 입력하세요. 개
- 약정 기간 | button[submit] "None", button[submit] "1년" | None 1년
buttons: ["None","1년","요금 확인","취소","생성(dis)"]
  dropdown "리소스": ["at.g2v12h1 – vCPU 12 | Memory 234G | H100(80GB)*1","at.g2v24h2 – vCPU 24 | Memory 468G | H100(80GB)*2","at.g2v48h4 – vCPU 48 | Memory 936G | H100(80GB)*4","at.g2v96h8 – vCPU 96 | Memory 1872G | H100(80GB)*8","at.g3v16b1 – vCPU 16 | Memory 480G | B300(268GB)*1","at.g3v32b2 – vCPU 32 | Memory 960G | B300(268GB)*2","at.g3v64b4 – vCPU 64 | Memory 1920G | B300(268GB)*4","at.g3v128b8 – vCPU 128 | Memory 3840G | B300(268GB)*8"]
