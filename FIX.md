# FIX 기록

---

## 수정 1: 파일 업로드 버튼 동작 안 함

**원인:** 이후 커밋에서 `<input type="file">`을 upload-zone 밖으로 분리하고 `position:fixed;top:-9999px` 오프스크린에 숨긴 뒤, 별도 버튼에서 `fileIn.click()`으로 트리거하는 방식으로 변경함. 이 방식은 브라우저마다 동작이 다름.

**수정:** 초기 커밋 방식으로 복원 — `<input type="file">`을 upload-zone 안에 넣고 `position:absolute;inset:0;opacity:0`으로 영역 전체를 덮는 오버레이로 사용. 별도 버튼(`uz-btn`) 및 `fileIn.click()` 호출 제거.

```html
<div class="upload-zone" id="dzone">
  <input type="file" id="file-in" accept="*/*" multiple/>
  <div class="uz-text">📂 파일 추가</div>
  <div class="uz-sub">.ipynb · 여러 파일 가능 · 드래그 앤 드롭</div>
</div>
```
```css
.upload-zone { position:relative; cursor:pointer; }
.upload-zone input { position:absolute; inset:0; opacity:0; cursor:pointer; width:100%; height:100% }
```

---

## 수정 2: 붙여넣기 모달 안 열림 (데스크탑)

**원인:** 커밋 f224412에서 `openPasteModal()` 내부를 `m.style.setProperty('display', 'flex', 'important')`로 변경함. 이 방식은 인라인 `display:none`이 이미 있는 경우 일부 브라우저에서 덮어쓰지 못함.

**수정:** `style.display = 'flex'` / `style.display = 'none'` 직접 조작으로 원복.

---

## 수정 3: 붙여넣기/Google Drive 모달 안 열림 (공통)

**원인:** 두 모달(`paste-modal`, `gdrive-modal`)이 `sidebar { overflow:hidden }` 내부의 `file-list-wrap`에 있었음. `position:fixed`임에도 일부 브라우저/환경에서 stacking context 문제로 렌더링이 막힘.

**수정:** 두 모달을 `<aside class="sidebar">` 밖, `<body>` 직속으로 이동. z-index도 500 → 1000으로 상향.

---

## 수정 4: iPad에서 모달 버튼 탭 무반응

**원인:** `paste-btn`, `gdrive-btn`이 `overflow-y:auto` 스크롤 컨테이너(`file-list-wrap`) 안에 있어 iOS Safari에서 첫 탭이 스크롤 제스처로 인식될 수 있음.

**수정:** 버튼에 `touch-action:manipulation; -webkit-tap-highlight-color:transparent` 추가.

---

## 수정 5: iPad에서 모달 표시 불안정

**원인:** `style.display = 'flex'` inline style 직접 조작이 iOS Safari에서 불안정. 또한 모달 HTML에 `display:none`이 인라인 스타일로 있어 JS에서 덮어쓰기 충돌 가능성.

**수정:** 모달 inline style에서 `display:none` 제거, CSS class 토글 방식으로 전환.

```css
#paste-modal, #gdrive-modal { display:none; align-items:center; justify-content:center; }
#paste-modal.visible, #gdrive-modal.visible { display:flex; }
body.modal-open { overflow:hidden; }
```
```js
// 열기
$('paste-modal').classList.add('visible');
document.body.classList.add('modal-open');
// 닫기
$('paste-modal').classList.remove('visible');
document.body.classList.remove('modal-open');
```

---

## 수정 6: iPad에서 Google Drive OAuth 팝업 차단

**원인:** `openGoogleDrivePicker()`가 `async` 함수였고, `await loadGIS()` 후에 `requestAccessToken()` 호출. iOS Safari는 `await` 이후 코드를 user gesture context로 인정하지 않아 `window.open()` 기반 OAuth 팝업을 차단.

**수정 1:** GIS 라이브러리를 페이지 로드 시 미리 백그라운드 로드.
```js
window.addEventListener('load', () => { setTimeout(() => loadGIS().catch(()=>{}), 1000); });
```

**수정 2:** `openGoogleDrivePicker()`를 `async` 제거 → 동기 함수로 변경. `requestAccessToken()`을 user gesture(클릭) 직후 동기적으로 호출. 파일 목록 조회는 OAuth 콜백 내부에서 비동기로 처리.
```js
function openGoogleDrivePicker() {  // async 없음
  // ...GIS 준비 확인 후...
  driveTokenClient = google.accounts.oauth2.initTokenClient({ ..., callback: (resp) => {
    // 인증 후 파일 목록 비동기 조회
    fetchDriveFiles(resp.access_token).then(showGDriveModal);
  }});
  driveTokenClient.requestAccessToken(); // user gesture 안에서 동기 호출
}
```

---

## 수정 7: 붙여넣기 파일 이름 구분 불가

**원인:** 파일 이름 미입력 시 `notebook_<timestamp>.ipynb`로 자동 대체되어 어떤 파일인지 구분 불가.

**수정:** 파일 이름 필수 입력. 미입력 시 추가 차단 및 name 필드로 focus 이동.

---

## 신규 기능: Google Drive 연동

**목적:** iPad/모바일에서 Google Drive에 저장된 `.ipynb` 파일을 직접 불러오기.

**구현:**
- GIS 라이브러리(`accounts.google.com/gsi/client`) 페이지 로드 시 백그라운드 로드
- `google.accounts.oauth2.initTokenClient`로 OAuth 토큰 획득
- Drive API v3 `files.list`로 `.ipynb` 파일 목록 조회 (최근 수정순 50개)
- 파일 선택 시 `files/{id}?alt=media`로 다운로드

**UI:** 사이드바에 `🔵 Google Drive에서 열기` 버튼 + OAuth Client ID 입력 필드 (localStorage 저장)

**사용 전제:** Google Cloud Console에서 OAuth 2.0 클라이언트 ID 생성, 해당 도메인을 승인된 JavaScript 출처로 등록. `file://` 프로토콜 불가.

---

## 미해결: iPad 시스템 파일 피커에서 .ipynb 선택 불가

**증상:** `<input type="file">`로 열리는 iOS 시스템 파일 피커에서 Google Drive의 `.ipynb` 파일 라디오버튼이 비활성화됨.

**원인:** iOS 레벨 제한 — Google Drive 앱이 `.ipynb`(Colab 노트북)을 웹 브라우저와 공유 불가 타입으로 처리.

**코드로 해결 불가.** 대안:
1. Google Drive → Files 앱으로 `.ipynb` 다운로드 후 "나의 iPad"에서 선택
2. 붙여넣기 방식 사용 (`cat 파일.ipynb | pbcopy` 후 모달에 붙여넣기)
3. 커스텀 Google Drive 버튼 사용 (OAuth 연동)
