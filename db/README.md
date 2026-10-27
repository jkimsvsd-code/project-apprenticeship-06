# 데이터베이스

Cloudflare D1(SQLite)를 사용합니다. `schema.ts`가 Drizzle 선언이고, 실제 SQL 마이그레이션은 Sites 표준 경로인 루트 `drizzle`에 있습니다.

- `npm run db:generate`: 스키마 변경으로 새 마이그레이션 생성
- `npm run db:migrate`: 로컬 D1에 미적용 마이그레이션만 적용
- `npm run db:check`: 최종 스키마 계약과 생성 스냅샷 대조

로컬 자료는 `.wrangler/state`에 보존되며 Git에서 제외됩니다. 배포 시 Sites가 별도의 서버 DB에 마이그레이션을 적용합니다. 로컬 테스트 자료는 배포되지 않습니다.
