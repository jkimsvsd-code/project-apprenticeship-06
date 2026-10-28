# 보조 명령

- `test.mjs`: TypeScript 검증 소스를 로컬 임시 경로에서 실행
- `migrate-local.mjs`: Wrangler의 로컬 마이그레이션 적용
- `schema-contract.mjs`: 최종 스키마 계약 작성·일치 확인
- 나머지 설치·빌드·Vite·Worker 보조 스크립트는 Sites 공식 starter의 런타임 통합입니다.

`.sites-runtime`과 `.wrangler`는 로컬 도구 상태이며 공개 소스에서 제외됩니다. 인증값은 스크립트나 명령 인자로 보관하지 않습니다.

설계도 생성·배포 스크립트는 별도 비공개 저장소의 [프로젝트별 설계도 폴더](https://github.com/jkimsvsd-code/project-architecture-diagram_src/tree/main/projects/project-apprenticeship-06)로 이전했습니다.
