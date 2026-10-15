상자그림 그리기 — 웹용 정적 사이트

이 폴더 안의 파일을 그대로 정적 웹 서버에 올리면 됩니다.
별도의 npm 설치, Python 실행, 빌드 또는 데이터베이스가 필요하지 않습니다.
배포 대상: GitHub kimbbab/boxplot-activities
웹 주소: https://kimbbab.github.io/boxplot-activities/
저장소: https://github.com/kimbbab/boxplot-activities

첫 화면: index.html — 상자그림 그리기 활동 목록
활동 1: boxplot-1/index.html — 7.1 함께해요
활동 2: boxplot-2/index.html — 7.2 생각넓히기1
활동 3: boxplot-3/index.html — 7.2 생각넓히기2 (히스토그램·상자그림 비교 수업)

각 활동 화면 위에는 ‘활동 목록’ 링크와 활동명이 있습니다.
실제 활동은 content/ 안의 HTML에서 실행됩니다. 기존 업체본과 같은 입력·계산·그래프 기능을 사용합니다.
처음에는 그래프가 비어 있으며 ‘그래프 그리기’를 누르면 나타납니다.

업로드할 내용
  index.html, .nojekyll
  boxplot-1/, boxplot-2/, boxplot-3/
  content/, web-assets/, amanta/, lcms/

GitHub Pages
1. 이 폴더의 ‘내용’을 게시할 저장소의 공개 디렉터리에 업로드합니다.
2. 해당 디렉터리를 Pages 게시 대상으로 설정합니다.
3. Pages에서 제공하는 주소를 열고 활동 목록과 세 활동을 확인합니다.
저장소 이름이 URL 중간에 들어가도 작동하도록 모든 페이지·CSS 자산 경로는 상대 주소입니다.
amanta/·lcms/ 내부 경로와 .nojekyll 파일을 유지해 주세요.

다른 정적 호스팅에서도 같은 파일을 사용할 수 있습니다.
활동 데이터와 답안은 화면에서 처리하며 별도의 계정 로그인이나 서버 저장 기능은 없습니다.
새로고침하면 기본 상태로 돌아갑니다. 학습 이력·완료 상태의 LMS 저장 연동은 포함하지 않습니다.

업체 전달용과의 차이
웹용은 공통 자산과 활동 자산을 한 사이트에 합쳤으며, CDN 주소 설정이 필요 없습니다.
업체 전달용 원본 폴더는 별도로 유지합니다. 이 웹용 폴더는 업체 등록용 CDN 분리 패키지가 아닙니다.
