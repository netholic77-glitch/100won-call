# 백원콜 — Google Play Store 등록 가이드

> **이 문서 한 장만 따라 하시면 됩니다.** 신규 등록까지 평균 **2~10일** 소요.
> 가장 쉬운 경로는 PWABuilder.com을 활용한 AAB 자동 생성입니다. (오라팜과 동일한 절차)

---

## 📦 파일 구성

```
백원콜_mobile/
├── www/                        ← PWA 본체 (이 폴더를 통째로 Netlify에 올림)
│   ├── index.html, style.css, app.js
│   ├── manifest.webmanifest, sw.js, _headers
│   ├── icon.svg, icon_192.png, icon_512.png
│   ├── privacy_policy.html
│   └── data/regions.json       ← 전국 시·군 행복택시 운영 안내
├── play_store_kit/             ← Play Console 등록 자료 일체
├── capacitor.config.json, package.json
└── HOW_TO_PUBLISH.md           ← (이 문서)
```

---

## 🚦 등록 절차 한눈에 보기

```
[STEP 1] Netlify Drop으로 PWA 배포  →  공개 HTTPS URL 발급  (10분, 무료)
   ↓
[STEP 2] PWABuilder.com에서 AAB 생성  →  AAB + 키스토어 다운로드  (10분, 무료)
   ↓
[STEP 3] Google Play Console 가입  →  25 USD 결제 + 본인확인  (1~3일)
   ↓
[STEP 4] 앱 등록 + 자료 업로드  →  AAB·아이콘·스크린샷·정책  (1시간)
   ↓
[STEP 5] Google 심사 대기  →  승인 후 출시  (1~7일)
```

---

## STEP 1. Netlify Drop으로 PWA 공개 호스팅 (10분)

**왜 필요한가?** PWABuilder는 공개된 HTTPS 주소가 있는 PWA만 AAB로 변환할 수 있습니다.

1. 브라우저로 **https://app.netlify.com/drop** 접속 (로그인 불필요)
2. **`www` 폴더를 통째로** 페이지 가운데에 드래그&드롭
3. 30초~1분 후 `https://random-words-xxxxx.netlify.app` 형태 URL 발급 → **메모**
4. URL을 열어 🚕 백원콜 인트로가 뜨고 "시작하기"가 작동하는지 확인
5. `URL/privacy_policy.html` 이 정상 표시되는지 확인 (Play Console 정책 URL로 사용)

---

## STEP 2. PWABuilder로 AAB 자동 생성 (10분)

1. **https://www.pwabuilder.com** 접속
2. 입력칸에 STEP 1의 Netlify URL 입력 → **"Start"**
3. 분석 완료 후 **"Android"** 카드 → **"Generate Package"** → 기본값으로 **"Generate"**
4. 다음 파일 자동 다운로드:
   - **`app-release-signed.aab`** ← Play Console 업로드용
   - **`signing.keystore`** + **`signing-key-info.txt`** ← 서명 키
5. ⚠⚠⚠ **키스토어를 안전한 곳(Google Drive·USB)에 백업.** 잃어버리면 앱 업데이트 영원히 불가.

> 패키지명은 `kr.baekwoncall.app` 으로 자동 설정됩니다(manifest 기준). 다르게 표시되면 직접 입력하세요.

---

## STEP 3. Google Play Console 개발자 가입 (1~3일)

1. **https://play.google.com/console** 접속
2. Google 계정 로그인 (만 18세 이상, 본인 명의)
3. **개발자 등록비 25 USD 결제** (1회)
4. 개발자 정보 입력 + **신원 확인**(신분증 업로드)
5. 심사 대기 (1~3일) → 승인 이메일

---

## STEP 4. 앱 등록 + 자료 업로드 (1시간)

`play_store_kit` 폴더의 자료를 그대로 사용합니다.

### 4-1. 앱 생성
| 항목 | 입력값 |
|---|---|
| 앱 이름 | **백원콜 — 100원·행복택시 호출** |
| 기본 언어 | 한국어 - ko-KR |
| 앱·게임 | 앱 |
| 무료·유료 | 무료 |

### 4-2. 스토어 등록정보
| 항목 | 출처 |
|---|---|
| 제목 / 짧은 설명 / 자세한 설명 | `listing_korean.md` |
| 앱 아이콘 (512×512) | `icon_512.png` |
| 피처 그래픽 (1024×500) | `feature_graphic_1024x500.png` |
| 휴대폰 스크린샷 2~8장 | `screenshot_guide.md` 참고해 본인 캡처 |
| 카테고리 | 지도/내비게이션 또는 라이프스타일 |
| 연락처 이메일 | 본인 이메일 |

### 4-3. 앱 콘텐츠
| 항목 | 출처 |
|---|---|
| 개인정보처리방침 URL | `https://[netlify]/privacy_policy.html` |
| 앱 액세스 | 제한 없음 (`target_audience.md`) |
| 광고 포함 | **아니요** |
| 콘텐츠 등급 IARC | `content_rating_answers.md` |
| 타겟층 | 18세 이상 (`target_audience.md`) |
| 데이터 보안 | 수집·공유 없음 (`data_safety_answers.md`) |
| 정부/금융/뉴스/건강 앱 | 모두 **아니요** |

### 4-4. 출시
- **권장: 내부 테스트 → 프로덕션**
- 내부 테스트로 `app-release-signed.aab` 업로드 → 본인 폰에서 동작 확인 (택시 전화·보호자 문자·음성)
- 프로덕션 → 새 버전 → 동일 AAB 업로드 → 출시 노트 입력 → 제출

---

## STEP 5. Google 심사 대기 (1~7일)

- 거부 사유는 Play Console 알림 + 이메일로 안내
- 가장 흔한 거부 사유는 **개인정보처리방침 URL 누락** (이미 4-3에서 해결)
- 승인되면 자동 출시

승인 후 URL:
```
https://play.google.com/store/apps/details?id=kr.baekwoncall.app
```

---

## ⚠ 이 앱의 성격(중요)

백원콜은 실제 택시를 **자동 배차하는 앱이 아니라**, 우리 동네 100원·행복택시 콜센터로 **전화를 쉽게 거는 도우미**입니다. 실제 배차는 사용자가 저장한 번호로 전화가 연결된 뒤 콜센터에서 처리합니다. 그래서:
- 콜센터 번호는 사용자가 직접 한 번 저장합니다(지자체마다 번호가 다르고 매년 바뀌므로 임의 번호를 넣지 않았습니다).
- 정확한 번호는 읍·면사무소 또는 시·군청 교통과에 확인하세요.

이 점을 스토어 설명(`listing_korean.md`)과 앱 안내문에 명시해 심사 시 "허위/오작동" 오해를 방지했습니다.

---

## 🆘 자주 묻는 질문

**Q. PWABuilder가 동작 안 되면?** Netlify URL이 HTTPS인지, "Test before you ship"이 모두 ✓인지 확인.

**Q. 키스토어를 잃어버렸어요.** 앱 업데이트 불가. 패키지명을 바꿔 새 앱으로 등록해야 합니다.

**Q. 위치 권한 때문에 심사가 거부될까요?** 위치는 "내 위치 문자보내기"를 누를 때만 일시 사용하고 저장·전송하지 않습니다. `data_safety_answers.md`의 위치 설명을 그대로 답변하면 됩니다.

**Q. 25 USD 외 추가 비용 있나요?** 없음. 1회 결제로 평생 등록 가능.

---

## ⏱️ 예상 총 소요

| 단계 | 시간 |
|---|---|
| Netlify Drop 배포 | 10분 |
| PWABuilder AAB 생성 | 10분 |
| Play Console 가입 + 본인확인 | 1~3일 |
| 자료 입력 + 스크린샷 | 1시간 |
| Google 심사 | 1~7일 |
| **합계** | **2~10일** |

— 백원콜 (baekwon-call) · v0.1
