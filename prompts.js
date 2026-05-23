// ── nb.quiz 프롬프트 모듈 ──

const PROMPTS = {

  // Phase 1: 출제 가능한 줄 pool 생성 (파일당 1회)
  poolInstruction: `## 지시: 딥러닝/ML 실습 코드 퀴즈 출제용 줄 추출

각 코드 셀에서 학습자가 **직접 작성 연습해야 할 줄**만 추출하세요.

### 출제 대상 (반드시 포함):
- 클래스 정의문: \`class MyModel(nn.Module):\`
- 메서드/함수 호출 + 인자: \`nn.Linear(hidden_size, output_size)\`, \`optim.Adam(model.parameters(), lr=0.001)\`
- 레이어 구성, 모델 조립: \`self.fc = nn.Linear(...)\`, \`self.rnn = nn.LSTM(...)\`
- 핵심 연산: \`torch.matmul(Q, K.transpose(-2,-1))\`, \`F.softmax(scores, dim=-1)\`
- 손실함수/옵티마이저 설정: \`criterion = nn.CrossEntropyLoss()\`
- 학습 루프 핵심: \`loss.backward()\`, \`optimizer.step()\`

### 출제 제외 (반드시 제거):
- import 문 전체
- print/display/plt/logging/시각화
- 빈 줄, pass, break, continue 단독
- 단순 변수 할당 (x=1, name="abc") — 단, API 호출의 결과 할당은 포함
- 변수명만 있는 좌변 (model = , optimizer = 등 \`=\` 왼쪽 변수명은 퀴즈 가치 없음)
- CUDA/device 설정, pip install, Drive 마운트
- 독스트링(""") 줄
- os, sys 등 기본 라이브러리 유틸 코드
- \`return 변수\`, \`return 변수1, 변수2\` 등 단순 return문 (이미 만든 값을 반환하는 것뿐)
- 프롬프트/템플릿 문자열: PromptTemplate, f-string, .format() 안의 텍스트 줄 — 문자열만 있는 줄 (\`"..."\`, \`'...'\`)은 코드 로직이 아닌 데이터이므로 제외
- 구분선/포맷 문자열 ("-----", "===", "\\n" 등만 있는 줄)

### 핵심 원칙:
> 학습자가 외워야 할 것: **어떤 클래스/메서드를 쓰는지, 어떤 인자를 넣는지**
> 학습자가 외울 필요 없는 것: **결과를 어떤 변수에 담는지** (변수명은 자유)

### 난이도 태깅:
- "easy": 단순 파라미터/값 (lr=0.001, batch_size=32)
- "medium": 핵심 API 호출 (nn.Linear, optim.Adam, loss.backward)
- "hard": 복잡한 구현 (attention score 계산, custom forward 로직)

순수 JSON만 응답:
{"pool":[{"cell_idx":<int>,"line":"<들여쓰기 포함 전체 줄>","diff":"easy"|"medium"|"hard"}]}`,

  // Phase 3: 보통/어려움 모드 annotation (reason + hint)
  annotateInstruction: `아래 Python 코드 줄들에 대해 학습자에게 보여줄 reason과 hint를 생성하세요.

### reason 작성 규칙:
- "이 줄이 왜 중요한지"가 아니라 **"이 메서드/클래스가 무엇을 하는지"** 설명
- helper 함수처럼: 어떤 입력을 받고 어떤 출력을 내는지
- 예시: "nn.Linear(in, out): 입력 차원 in을 출력 차원 out으로 선형 변환하는 레이어"
- 예시: "optim.Adam(params, lr): 파라미터를 Adam 알고리즘으로 업데이트, lr은 학습률"

### hint 작성 규칙:
- 정답을 직접 알려주지 말 것
- 어떤 종류의 메서드/클래스인지 단서만 제공
- 예시: "순환 신경망 레이어를 만드는 PyTorch 클래스"
- 예시: "역전파를 수행하는 텐서 메서드"

순수 JSON만 응답:
{"annotations":[{"idx":<1부터>,"reason":"<메서드/클래스 설명>","hint":"<단서>"}]}`,

  // 쉬움 모드 annotation
  easyAnnotateInstruction: `아래 Python 코드 줄들에서 특정 토큰이 빈칸으로 제시됩니다.

### reason 작성 규칙:
- 빈칸 토큰이 속한 메서드/클래스의 역할을 helper 함수처럼 설명
- 어떤 입력 → 어떤 출력인지, 인자의 의미 포함
- 예시: "nn.RNN(input_size, hidden_size): 입력을 순환 처리하여 시퀀스 특징을 추출"

### hint 작성 규칙:
- 정답 토큰을 직접 알려주지 말 것
- 역할 단서만 제공
- 예시: "PyTorch의 순환 신경망 모듈"

순수 JSON만 응답:
{"annotations":[{"idx":<1부터>,"reason":"<메서드/클래스 설명>","hint":"<단서>"}]}`

};
