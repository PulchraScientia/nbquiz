# FIX 기록

## 수정 1: 붙여넣기 모달 안 열리는 버그 (Critical)

**파일:** `index.html`
**원인:** 최근 커밋(f224412 "Refactor paste modal display properties")에서 `openPasteModal()`과 `closePasteModal()` 함수를 다음과 같이 변경함:
- 기존: `m.style.display = 'flex'` / `m.style.display = 'none'`
- 변경 후: `m.style.setProperty('display', 'flex', 'important')` / `setProperty('display', 'none', 'important')`

**문제:** `style.setProperty(prop, val, 'important')`로 인라인 스타일의 `!important`를 설정하는 방식은 일부 브라우저(특히 iOS Safari)에서 동일 요소의 기존 인라인 `display:none`을 덮어쓰지 못함. 원래 `style.display = 'flex'`는 인라인 스타일을 직접 수정하므로 `!important` 없이도 항상 동작.

**수정:** `setProperty(..., 'important')` → `style.display = ...` 로 원복.

---

## 수정 2: 붙여넣기 파일 이름 구분 불가 문제

**파일:** `index.html`
**원인:** 붙여넣기 확인 시 `paste-name` 입력이 비어 있으면 `notebook_<timestamp>.ipynb`로 자동 대체해서 어떤 파일인지 구분 불가.

**수정:** 파일 이름 미입력 시 추가를 막고 입력 요청. focus를 content 대신 name 필드로 이동.

---

## 신규 기능: Google Drive 연동

**파일:** `index.html`
**목적:** iPad/모바일에서 Google Drive에 저장된 `.ipynb` 파일을 직접 불러오기.

**구현 방식:**
- Google Identity Services(GIS) 라이브러리(`accounts.google.com/gsi/client`)를 버튼 클릭 시 lazy load
- `google.accounts.oauth2.initTokenClient`로 OAuth implicit flow 토큰 획득
- Drive API v3 `files.list`로 `.ipynb` 파일 목록 조회
- 파일 선택 후 `files/{id}?alt=media`로 파일 내용 다운로드

**사용 전제:** 사용자가 Google Cloud Console에서 OAuth 2.0 클라이언트 ID를 생성하고 `http://localhost` (또는 실제 도메인)을 승인된 출처로 등록해야 함. `file://` 프로토콜에서는 작동 안 함.

**UI:**
- 사이드바에 `🔵 Google Drive` 버튼 추가
- Client ID 입력 필드 추가 (localStorage에 저장)
- 파일 목록 모달: 최근 수정순으로 `.ipynb` 파일 50개까지 표시
