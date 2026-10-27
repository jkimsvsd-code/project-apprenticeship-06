# DB 계약

`pds-schema-v2.json`은 실제 구현의 테이블·필드·관계·제약·날짜·집계 규칙을 담습니다.

- 스키마: `db/schema.ts`
- SQL 및 스냅샷: `drizzle`
- 계약 확인: `npm run db:check`
- 스키마 변경 후: `npm run db:generate` → 생성 SQL 검토 → `node scripts/schema-contract.mjs --write` → 검증

이미 적용한 마이그레이션과 스냅샷은 수정하지 않고 새 마이그레이션을 추가합니다. 실제 배포 리소스의 인증값은 계약 파일에 포함하지 않습니다.
