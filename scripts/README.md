# 보조 명령

- `test.mjs`: TypeScript 검증 소스를 로컬 임시 경로에서 실행
- `migrate-local.mjs`: Wrangler의 로컬 마이그레이션 적용
- `schema-contract.mjs`: 최종 스키마 계약 작성·일치 확인
- `build-architecture.mjs`: 설계 모델·DB 계약·추적 소스의 정적/동적 import·export·테스트 항목을 결합해 `docs/architecture-diagram.html` 생성. `--fragment <절대 경로>`로 대화용 다이어그램도 출력. `--site-dir work/architecture-site`로 별도 정적 사이트의 `dist/index.html`과 `.openai/hosting.json` 준비. 변경 명령 전체 포함 여부·노드/연결·원본 파일 경로를 검사하며 DB에는 접근하지 않음
- 나머지 설치·빌드·Vite·Worker 보조 스크립트는 Sites 공식 starter의 런타임 통합입니다.

`.sites-runtime`과 `.wrangler`는 로컬 도구 상태이며 공개 소스에서 제외됩니다. 인증값은 스크립트나 명령 인자로 보관하지 않습니다.
