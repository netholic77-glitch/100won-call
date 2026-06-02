# 백원콜 — Play Store 제출 체크리스트

## STEP 1. PWA 호스팅
- [ ] `www` 폴더를 Netlify Drop(https://app.netlify.com/drop)에 드래그
- [ ] 발급된 HTTPS URL 메모
- [ ] URL 접속 → 인트로 → "시작하기" 동작 확인
- [ ] `URL/privacy_policy.html` 정상 표시 확인

## STEP 2. AAB 생성 (PWABuilder)
- [ ] https://www.pwabuilder.com 에서 Netlify URL 입력 → Start
- [ ] "Test before you ship" 점수 확인 (manifest·sw·아이콘 ✓)
- [ ] Android → Generate Package → Generate
- [ ] `app-release-signed.aab` 다운로드
- [ ] `signing.keystore` + `signing-key-info.txt` 다운로드
- [ ] ⚠ **키스토어 안전한 곳에 백업** (Google Drive/USB)

## STEP 3. Play Console 가입
- [ ] https://play.google.com/console 가입
- [ ] 개발자 등록비 25 USD 결제
- [ ] 신원 확인 서류 제출
- [ ] 승인 대기 (1~3일)

## STEP 4. 앱 등록
- [ ] 앱 만들기: 이름 "백원콜 — 100원·행복택시 호출", 한국어, 앱, 무료
- [ ] 스토어 등록정보: `listing_korean.md` 내용 복사
- [ ] 앱 아이콘 `icon_512.png` 업로드
- [ ] 피처 그래픽 `feature_graphic_1024x500.png` 업로드
- [ ] 스크린샷 2~8장 업로드 (`screenshot_guide.md` 참조)
- [ ] 카테고리: 지도/내비게이션 또는 라이프스타일
- [ ] 개인정보처리방침 URL 입력 (`https://[netlify]/privacy_policy.html`)
- [ ] 앱 액세스: 제한 없음 (`target_audience.md`)
- [ ] 광고: 없음
- [ ] 콘텐츠 등급 IARC 설문: `content_rating_answers.md`
- [ ] 타겟층: 18세 이상 (`target_audience.md`)
- [ ] 데이터 보안: 수집·공유 없음 (`data_safety_answers.md`)
- [ ] 정부/금융/뉴스/건강 앱: 모두 아니요

## STEP 5. 출시
- [ ] (권장) 내부 테스트로 AAB 업로드 → 본인 폰에서 동작 확인
  - [ ] 택시 번호 저장 → 큰 버튼으로 전화 걸림 확인
  - [ ] 보호자 저장 → 전화·위치 문자 확인
  - [ ] 음성 안내 동작 확인
- [ ] 프로덕션 → 새 버전 → AAB 업로드 → 출시 노트 입력 → 제출
- [ ] Google 심사 대기 (1~7일)

## 출시 노트 예시
```
초기 출시. 농어촌 100원·행복택시를 큰 글씨·음성안내로 한 번에 부르는 어르신용 전화 호출 도우미.
```
