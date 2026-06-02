# 백원콜 — Play Store 자료 키트

이 폴더는 Google Play Console 등록에 필요한 모든 자료입니다.

| 파일 | 용도 |
|---|---|
| `listing_korean.md` | 스토어 제목·짧은설명·자세한설명 텍스트 |
| `icon_512.png` | 앱 아이콘 (512×512) |
| `icon_512.svg` | 아이콘 원본 벡터 (수정 시) |
| `feature_graphic_1024x500.png` | 피처 그래픽 |
| `generate_pngs.py` | 아이콘·피처그래픽 재생성 스크립트 (Pillow) |
| `privacy_policy.html` | 개인정보처리방침 (www에도 함께 호스팅됨) |
| `data_safety_answers.md` | 데이터 보안 양식 답변 |
| `content_rating_answers.md` | 콘텐츠 등급 IARC 설문 답변 |
| `target_audience.md` | 타겟층·앱 액세스 답변 |
| `screenshot_guide.md` | 스크린샷 캡처 가이드 |
| `submission_checklist.md` | 단계별 체크리스트 |

## 빠른 시작
1. 프로젝트 루트의 `HOW_TO_PUBLISH.md`를 따라가세요.
2. 이미지 수정이 필요하면 `python generate_pngs.py` 실행.

## 앱 개요
- 이름: 백원콜 — 100원·행복택시 호출
- 패키지: `kr.baekwoncall.app`
- 성격: 농어촌 고령자용 100원·행복택시 전화 호출 도우미 (큰 글씨·음성안내·보호자 위치문자)
- 데이터: 100% 기기 내부 저장, 외부 전송 없음
