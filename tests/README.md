# 검증

- `npm test`: 단위 규칙과 Node SQLite에 실제 SQL을 적용한 저장소 통합 테스트
- `npm run typecheck`: TypeScript 검사
- `npm run db:check`: 스키마 계약 검사
- `npm run test:http -- http://127.0.0.1:5173`: 로컬 전용 동시 요청·HTTP 검증. 브라우저에서 `[검증] 전체 흐름` 계획과 스크립트 문자열 할 일을 만든 검증용 DB에서만 실행합니다.

브라우저 검증의 흐름과 관찰 결과는 `docs/evidence/verification-results.md`를 참고합니다. 검증용 자료는 공개 배포 DB에 입력하지 않습니다.
