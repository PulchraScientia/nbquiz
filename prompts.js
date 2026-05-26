// ── nb.quiz 프롬프트 모듈 ──
// AI 인증시험 출제 포인트(LLM / Data / Vision / RAG / On-device) 반영판
// 출력 JSON 스키마는 기존과 동일 — index.html 파싱 로직 호환 유지

const PROMPTS = {

  // Phase 1: 출제 가능한 줄 pool 생성 (파일당 1회)
  poolInstruction: `## 지시: AI 인증시험 대비 딥러닝/ML 실습 코드 퀴즈 출제용 줄 추출

각 코드 셀에서 학습자가 **직접 작성 연습해야 할 줄**만 추출하세요.
이 시험은 단순 암기가 아니라 **모델의 원리·Tensor 흐름·학습 연결·데이터 구성**을 이해했는지를 평가합니다.

### 최우선 출제 관점 (시험 핵심 — 이 관점에 해당하는 줄을 우선 추출):
1. **Layer/모델 구성 원리**: 각 layer가 무엇을 하고 어떤 인자로 조립되는지
   - \`self.fc = nn.Linear(hidden_size, output_size)\`, \`self.rnn = nn.LSTM(input_size, hidden_size, num_layers)\`, \`self.conv = nn.Conv2d(in_channels, out_channels, kernel_size)\`
2. **Tensor 흐름·차원 변환**: 입력→출력까지 shape가 바뀌는 핵심 연산
   - \`x = x.view(x.size(0), -1)\`, \`x = x.permute(0, 2, 1)\`, \`torch.matmul(Q, K.transpose(-2, -1))\`, \`F.softmax(scores, dim=-1)\`
3. **결과↔정답↔학습 연결**: 손실 계산부터 파라미터 갱신까지의 고리
   - \`loss = criterion(outputs, labels)\`, \`loss.backward()\`, \`optimizer.step()\`, \`optimizer.zero_grad()\`
4. **손실함수/옵티마이저 설정**: \`criterion = nn.CrossEntropyLoss()\`, \`optimizer = optim.Adam(model.parameters(), lr=0.001)\`

### 분야별 추가 출제 대상 (해당 코드가 있으면 반드시 포함):
- **LLM/Transformer**: attention score 계산, scaling, mask 적용, embedding/positional encoding, \`forward\` 내부 핵심 연산
- **Data(ML)**: \`train_test_split(...)\`, sklearn 모델 \`.fit(X, y)\` / \`.predict(...)\`, 평가 metric 호출(\`accuracy_score\`, \`f1_score\`, \`mean_squared_error\` 등)
- **Vision**: \`transforms.Compose([...])\` 내부 변환(\`Resize\`, \`Normalize\`, \`ToTensor\`, augmentation), Conv/Pool layer 구성, 평가 metric
- **RAG**: 인덱싱/검색/생성 흐름의 핵심 호출 (\`VectorStoreIndex.from_documents(...)\`, \`index.as_query_engine()\`, retriever/embedding 구성 등 llama-index·mcp API 호출)
- **On-device**:
  - Quantization: 양자화/역양자화 호출, scale·zero_point 계산
  - Pruning: 가중치 중요도 기준 계산, mask 적용
  - Distillation: teacher 출력(soft label)과 student 출력으로 distillation loss 계산, temperature 적용

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
- 프롬프트/템플릿 문자열: PromptTemplate, f-string, .format() 안의 텍스트 줄 — 문자열만 있는 줄(\`"..."\`, \`'...'\`)은 코드 로직이 아닌 데이터이므로 제외
- 구분선/포맷 문자열 ("-----", "===", "\\n" 등만 있는 줄)

### 핵심 원칙:
> 학습자가 외워야 할 것: **어떤 layer/클래스/메서드를 어떤 인자로 쓰는지, 텐서를 어떻게 변형하는지, 결과를 어떻게 학습에 연결하는지**
> 학습자가 외울 필요 없는 것: **결과를 어떤 변수에 담는지** (변수명은 자유)

### 난이도 태깅:
- "easy": 단순 파라미터/값 (lr=0.001, batch_size=32, kernel_size=3, dim=-1)
- "medium": 핵심 API 호출 — layer 구성, 옵티마이저/손실 설정, metric 호출, 학습 연결(nn.Linear, optim.Adam, loss.backward, model.fit, transforms.Normalize)
- "hard": 복잡한 구현 — attention score 계산, custom forward 로직, Tensor 차원 변환, distillation loss, 양자화/pruning 연산

순수 JSON만 응답:
{"pool":[{"cell_idx":<int>,"line":"<들여쓰기 포함 전체 줄>","diff":"easy"|"medium"|"hard"}]}`,

  // Phase 3: 보통/어려움 모드 annotation (reason + hint)
  annotateInstruction: `아래 Python 코드 줄들에 대해 학습자에게 보여줄 reason과 hint를 생성하세요.
AI 인증시험은 "원리 이해"를 평가하므로, 단순 기능 나열이 아니라 **동작 원리·텐서 흐름·학습 연결** 관점을 담으세요.

### reason 작성 규칙:
- "이 줄이 왜 중요한지"가 아니라 **"이 layer/메서드/클래스가 무엇을 하는지"** 를 helper 함수처럼 설명
- 가능하면 다음 중 해당하는 관점을 1가지 포함:
  (a) **입력→출력 텐서 변환**: 어떤 shape를 받아 어떤 shape로 바꾸는지
  (b) **학습 연결**: 결과·정답과 어떻게 연결되어 학습이 일어나는지 (loss/backward/step 계열일 때)
  (c) **인자의 의미**: 주요 인자가 무엇을 제어하는지
- 예시: "nn.Linear(in, out): 입력 차원 in의 텐서를 출력 차원 out으로 선형 변환하는 fully-connected 레이어"
- 예시: "optim.Adam(params, lr): 파라미터를 Adam 알고리즘으로 업데이트, lr은 갱신 폭(학습률)을 제어"
- 예시: "loss.backward(): 손실로부터 각 파라미터의 gradient를 역전파로 계산 (학습의 핵심 연결 고리)"
- 예시: "F.softmax(scores, dim=-1): 마지막 차원 기준으로 점수를 확률 분포로 정규화 (attention 가중치 계산)"

### hint 작성 규칙:
- 정답을 직접 알려주지 말 것
- 어떤 종류의 layer/메서드/클래스인지, 또는 어떤 텐서 연산인지 단서만 제공
- 예시: "순환 신경망 레이어를 만드는 PyTorch 클래스"
- 예시: "역전파를 수행하는 텐서 메서드"
- 예시: "마지막 차원을 확률로 정규화하는 함수"

순수 JSON만 응답:
{"annotations":[{"idx":<1부터>,"reason":"<원리·흐름·연결 관점의 설명>","hint":"<단서>"}]}`,

  // 쉬움 모드 annotation
  easyAnnotateInstruction: `아래 Python 코드 줄들에서 특정 토큰이 빈칸으로 제시됩니다.
AI 인증시험은 "원리 이해"를 평가하므로, 빈칸 토큰이 속한 동작의 원리를 짚어주세요.

### reason 작성 규칙:
- 빈칸 토큰이 속한 layer/메서드/클래스의 역할을 helper 함수처럼 설명
- 가능하면 다음 중 1가지 포함: (a) 입력→출력 텐서/차원 변화, (b) 학습 연결, (c) 인자의 의미
- 예시: "nn.RNN(input_size, hidden_size): 입력 시퀀스를 순환 처리하여 hidden_size 차원의 시퀀스 특징으로 변환"
- 예시: "criterion(outputs, labels): 모델 출력과 정답을 비교해 손실을 계산 (학습으로 연결되는 지점)"

### hint 작성 규칙:
- 정답 토큰을 직접 알려주지 말 것
- 역할 단서만 제공
- 예시: "PyTorch의 순환 신경망 모듈"
- 예시: "출력과 정답을 비교하는 손실 함수"

순수 JSON만 응답:
{"annotations":[{"idx":<1부터>,"reason":"<원리·흐름·연결 관점의 설명>","hint":"<단서>"}]}`

};
