/**
 * 과제6 「틈」의 실행 코드에 근거한 설계 모델.
 * 브라우저용 데이터는 scripts/build-architecture.mjs가 이 모델과 DB 계약,
 * TypeScript 소스 목록을 합쳐 생성한다. 외부 라이브러리·네트워크 불필요.
 * node scripts/build-architecture.mjs
 *
 * Edge 방향: from → to = 호출 / 사용 / 참조 / 흐름. relation이 의미를 명시한다.
 * ERD 방향: 자식 테이블 → 부모 테이블. FK의 nullable/unique에 따라 다중성이 달라진다.
 */

/** @typedef {{id:string, label:string, sub:string, files:string[], details:string[]}} Node */
/** @typedef {{from:string, to:string, relation:string}} Edge */
/** @typedef {{id:string, label:string, groups:{label:string, ids:string[]}[], edges:Edge[]}} View */
const n = (id, label, sub, files, details) => ({ id, label, sub, files, details });
const e = (from, to, relation) => ({ from, to, relation });

/** @type {Node[]} */
export const nodes = [
  n('entry', '페이지 진입', 'RootLayout → Home → Diary', ['app/layout.tsx', 'app/page.tsx', 'app/globals.css'], [
    'RootLayout: 한국어 문서·메타데이터·전역 CSS. Home이 클라이언트 Diary를 렌더링한다.',
    'React 19.2.6 + TypeScript. Next App Router 형식의 app 디렉터리를 Vinext/Vite가 Cloudflare Worker에서 실행한다.',
  ]),
  n('diary', 'Diary 조정자', '상태 · 화면 · 명령 · 복원', ['src/Diary.tsx'], [
    'DiaryState, loading, busy, exporting, view, Filters, metric, Dialog, mobile, compact, now, message, error, undo, copied 상태를 조정한다.',
    '초기 GET으로 전체 상태를 읽는다. run(action,data)은 POST 후 GET으로 다시 읽어 화면을 갱신한다.',
    'busyRef로 동시 저장을 차단한다. JSON.stringify({action,data})별 UUID를 메모리에 저장하고 실패 시 재사용한다. 성공적인 재조회 후 해당 키를 제거한다.',
    '실패한 action/data와 폼 입력을 유지한다. 전역 재시도 및 폼 재전송을 제공한다. 새로고침 복원은 서버 저장분에 적용되며, 미저장 입력·요청 키는 메모리 상태다.',
    'Dialog 종류: plan, task, execution, history, detail, next, help, share. TaskActions로 완료·편집·삭제·타이머·수동 기록·상세를 각 화면에 전달한다.',
    '서울 날짜는 30초 간격 갱신, 상세 모달의 경과 시간은 1초 간격 갱신. 작은 화면 판정은 max-width:760px이다.',
  ]),
  n('url', '조회 주소', 'URLSearchParams · History API', ['src/Diary.tsx', 'src/shared/domain.ts'], [
    'view=today|plans|review. Filters: plan, from, to, q, status, priority, tag, sort. 기본 sort=due. metric도 주소에 저장한다.',
    'navigate는 pushState 또는 replaceState로 이동한다. 초기 URL과 popstate에서 상태를 복구한다.',
    '공유 모달에서 현재 조회 조건과 기본 주소를 확인하고 복사한다. 검색어가 공개 URL에 포함될 수 있음을 표시한다.',
  ]),
  n('today', '오늘', '오늘 마감 · 지연 · 실행 중', ['src/features/today/TodayView.tsx'], [
    'scopeTasks로 삭제되지 않은 할 일을 선택한다. due_date=Seoul today는 오늘, isDelayed는 지연, timers에 존재하면 실행 중이다.',
    '오늘 수량·완료·예상 시간과 완료율을 표시한다. 완료율=오늘 완료/오늘 할 일; 빈 집합은 0%.',
    '오늘 목록은 상태→생성 시각→ID, 지연 목록은 마감일→ID로 정렬한다. 실행 중 목록에는 완료 여부와 무관하게 활성 타이머가 있는 할 일이 포함될 수 있다.',
  ]),
  n('plans-ui', '계획 화면', '목록 · 상세 · 최초 기준', ['src/features/plans/PlanViews.tsx'], [
    'PlansGrid: 계획별 할 일 수·진척·기간·우선순위를 표시하고 상세로 이동한다.',
    'PlanHeader: 기간·우선순위·성공 기준·계획 예상 시간·이전 회고를 표시한다. 편집과 이력을 연다. 계획 ID는 선택 URL과 상태에서 유지하고 최초 기준은 이력 화면에서 확인한다.',
    '계획 문서의 예상 시간과 할 일별 예상 시간의 합은 별도 값이다. 회고 집계는 할 일 합계를 사용한다.',
  ]),
  n('plan-form', '계획 작성·다음 계획', 'plan.save · review.next', ['src/features/plans/PlanForm.tsx'], [
    '계획 생성·수정: 이름, 시작/종료일, 우선순위, 성공 기준, 예상 분. 수정 시 ID 유지.',
    '다음 계획: 저장된 회고의 개선점을 보여주고 제목·성공 기준·우선순위·예상 시간 가져오기 옵션을 제공한다. 기간은 새로 지정한다.',
    '기존 계획의 삭제되지 않은 할 일을 선택하여 최대 50개 복사한다. 새 ID·todo·cycle 0, 새 계획 종료일을 마감일로 적용한다.',
    '완료 상태·완료 이력·실행 기록·타이머를 복사하지 않는다. 개선점은 reviews.next_plan_id 관계를 통해 새 계획에서 확인한다.',
  ]),
  n('history', '계획 변경 이력', '최초 v1 / 이전 / 선택 버전', ['src/features/plans/History.tsx'], [
    'plan_revisions를 계획별로 필터링하고 version 오름차순 정렬한다.',
    '이름·시작일·종료일·우선순위·성공 기준·예상 시간 6개 필드의 최초/이전/선택 값을 비교하며 변경 필드를 강조한다.',
  ]),
  n('tasks-ui', '할 일 탐색·목록', '검색 · 필터 · 안정 정렬', ['src/features/tasks/TaskList.tsx'], [
    'TaskExplorer: 검색(q), 상태(todo/done/delayed/blocked), 우선순위, 태그, 정렬 조건. 계획·기간 범위는 부모 화면에서 전달한다.',
    '검색은 제목과 태그를 합쳐 대소문자 구분 없이 포함 여부를 검사한다. 태그 필터는 배열 원소의 정확한 일치다.',
    '정렬: due=마감일→우선순위, priority=high→medium→low, estimate=예상 분 오름차순, created=생성 시각 오름차순. 공통 동률은 생성 시각→ID.',
    'TaskList: 현재 상태·마감·우선순위·태그·시간·실행 중 정보를 표시한다. TaskActions를 통해 조정자로 동작을 위임한다.',
  ]),
  n('task-form', '할 일 작성·빠른 추가', 'task.save', ['src/features/tasks/TaskForm.tsx'], [
    '계획 연결, 제목, 마감일, 우선순위, 예상 분, 쉼표 구분 태그를 입력한다. 수정 시 기존 ID 사용.',
    '연속 추가 성공 시 제목만 지우고 포커스를 이동한다. 계획·우선순위·태그뿐 아니라 현재 마감일·예상 시간도 그대로 유지된다.',
    '저장 실패 시 필드를 초기화하지 않는다. 실행 시각·막힌 이유는 별도 실행 폼에 있으며 빠른 추가 대상이 아니다.',
  ]),
  n('detail', '할 일 상세', '실행 이력 · 타이머 · 보정', ['src/features/tasks/TaskDetail.tsx'], [
    '할 일과 연결 계획, 실행 기록별 시작·종료·실제 분·막힌 이유를 확인한다.',
    '서버의 timer.started_at으로 경과 시간을 복원한다. 상세 화면은 시작/중지, 완료/완료 취소, 실행 기록 추가·수정을 TaskActions로 수행한다. 할 일 수정·삭제는 목록에서 제공한다.',
  ]),
  n('execution-form', '실행 기록 작성', 'execution.save', ['src/features/executions/ExecutionForm.tsx'], [
    '서울 기준 datetime-local을 UTC로 변환한다. 시각 변경 시 소요 분을 자동 계산하되 직접 분을 수정한 뒤에는 수동값을 유지한다.',
    '실행 수정에서 화면 시각이 바뀌지 않으면 기존 UTC 원문을 유지하여 초·밀리초 손실을 막는다.',
    '종료≥시작, 실제 분 1~1,000,000 정수. 막힌 이유는 선택이며 최대 2,000자. 실행 기록의 task_id 변경은 서버에서 거절한다.',
    '타이머 중지 후 생성된 실행 기록을 이 폼에서 보정한다. 기록 저장은 계획의 예상값이나 완료 상태를 자동 변경하지 않는다.',
  ]),
  n('review-ui', '돌아보기', '7개 지표 · 근거 · 개선점', ['src/features/reviews/ReviewView.tsx'], [
    '기본 기간은 선택 계획의 시작/종료일이며 명시된 from/to가 우선한다. 역전 기간은 빈 대상과 오류를 표시한다.',
    '계획·기간으로 scopeTasks를 적용한다. 할 일 탐색의 q/status/priority/tag는 회고 집계 조건으로 사용하지 않는다.',
    '계획 수·완료·지연·막힘·예상·실제·차이를 같은 대상 집합으로 계산한다. 지표 선택 시 metricTasks의 근거 목록으로 이동한다.',
    '예상·실제 비교 막대와 차이, 할 일별 예상/실제/차이 표를 제공한다. 근거 할 일에서 상세 실행 기록으로 이동한다.',
    '계획을 선택해야 개선점을 저장할 수 있다. UI는 review.save로 새 회고를 생성하며 서버는 미연결 회고의 수정도 지원한다.',
    '저장된 회고는 다음 계획 만들기 또는 연결된 계획 보기로 이어진다. 집계 숫자는 별도 스냅샷 컬럼으로 저장하지 않고 원본 상태에서 계산한다.',
  ]),
  n('ui', '공통 UI·접근성', 'Modal · Empty · FormError', ['src/components/ui/Modal.tsx', 'app/globals.css', 'src/Diary.tsx'], [
    '네이티브 dialog.showModal(), 입력 초기 포커스, Escape/바깥 클릭 닫기. 저장 중 닫기 제한. 오류 필드로 포커스 이동.',
    '공통 빈 상태·폼 오류, 로딩·저장 중·완료·실패·재시도, 삭제 실행 취소, 본문 바로가기.',
    '모바일 메뉴: inert/aria-hidden, 메뉴 열기 포커스, Tab 순환, Escape 후 열기 버튼 복귀. 지표 근거로 포커스 이동.',
    'React 텍스트 렌더링으로 사용자 입력을 문자로 표시한다. 로그인 없는 공개 조회·수정 안내를 첫 화면에 표시한다.',
  ]),
  n('domain', '공유 도메인', '타입 · 날짜 · 집계 · 정렬', ['src/shared/domain.ts'], [
    '타입: Priority, Plan, Revision, Task, Execution, Timer, Review, DiaryState, Filters, Metric.',
    'DiaryState: plans/revisions/tasks/executions/timers/reviews/today. completions와 commands는 일반 조회 상태에 포함되지 않는다.',
    '함수: seoulDate, localDateTime, toUTC, minutesBetween, formatMinutes, scopeTasks, isBlocked, isDelayed, metrics, metricTasks, filterTasks.',
    '상수: priorities, emptyState, defaultFilters. 날짜·집계·동률 정렬의 세부 규칙은 규칙 보기에 포함한다.',
  ]),
  n('client', '클라이언트 통신', 'request<T> · loadDiary · ApiError', ['src/shared/client.ts', 'src/Diary.tsx'], [
    'fetch 기본 cache:no-store. 네트워크 오류·JSON 파싱 오류·비정상 HTTP 응답을 ApiError(message,field)로 변환한다.',
    'loadDiary=GET /api/diary. RunAction은 action/data를 받아 Promise<{id}>를 반환한다.',
    '내보내기는 별도 GET 응답을 Blob으로 내려받고 임시 object URL을 해제한다.',
  ]),
  n('api', 'Diary API', 'GET /api/diary · POST /api/diary', ['app/api/diary/route.ts'], [
    'env.DB를 Database 인터페이스로 사용한다. DB 미바인딩은 503. dynamic=force-dynamic, Cache-Control:no-store, X-Content-Type-Options:nosniff.',
    'POST: Origin이 있으면 같은 origin인지 검사하고 sec-fetch-site=cross-site를 거절(403)한다. 이 검사는 로그인·사용자 권한 분리를 제공하지 않는다.',
    'application/json 필요(415), request.text()의 JavaScript 문자열 길이 64,000 초과 거절(413). JSON 객체 형식 검사(400). 바이트/스트리밍 크기 제한은 아니다.',
    '입력 {action,requestId,data}; 성공 {id}. AppError는 {error,field}와 해당 HTTP 상태. 알 수 없는 오류는 상세정보 대신 일반 메시지로 503.',
  ]),
  n('export', '전체 JSON 내보내기', 'GET /api/export', ['app/api/export/route.ts', 'src/server/store.ts'], [
    '하나의 D1 batch에서 상태 6개 테이블과 completions를 읽어 일관된 스냅샷을 만든다. 삭제된 할 일·연관 실행·타이머·계획 이력·회고 관계 포함.',
    '메타데이터: version=pds-schema-v2, exported_at, timezone=Asia/Seoul, duration_unit=minute, today.',
    'revisions는 plan_id를 id로 매핑하고 tags는 JSON 문자열에서 배열로 복원한다. commands와 런타임 비밀값은 제외한다.',
    'attachment 파일명 pds-diary-{today}.json, no-store, JSON UTF-8, nosniff. 실패 시 503과 내보내기 오류 메시지.',
  ]),
  n('store', '서버 저장소', 'readState · mutate · exportData', ['src/server/store.ts'], [
    'Database.prepare()/batch(), Statement.bind()/all()/first() 추상화. 앱 요청은 Drizzle query API 대신 매개변수 SQL을 직접 실행한다.',
    'readState는 plans/revisions/tasks/executions/timers/reviews를 한 batch로 읽고 태그 배열과 서울 today를 복원한다.',
    '검증, 참조 존재 확인, 명령별 SQL 구성, commands 가드, 원자적 batch, 저장 후 fingerprint 확인을 수행한다.',
    'UUID 생성은 crypto.randomUUID(). plan.save와 review.next에서 최초/수정 스냅샷을 원자적으로 추가한다.',
  ]),
  n('validation', '입력·관계 검증', '형식 · 범위 · 참조', ['src/server/store.ts', 'app/api/diary/route.ts'], [
    'action 최대 40자. requestId는 영문/숫자/_/- 8~100자. data는 배열이 아닌 객체여야 한다.',
    '제목 필수·최대 200자, 성공 기준 필수·최대 2,000자, 개선점 필수·최대 1,000자. 문자열은 trim한다.',
    '예상 분: 안전한 정수 0~1,000,000. 실제 분: 안전한 정수 1~1,000,000. 우선순위 high/medium/low.',
    '날짜 YYYY-MM-DD 실제 달력 날짜 검사. 시간대가 명시된 유효 시각은 UTC ISO로 정규화. 종료≥시작 검사.',
    '태그 배열 최대 10개, 각 문자열 최대 30자 검사 후 trim·공백 제거·중복 제거하여 DB에는 JSON 문자열 저장.',
    '계획/활성 할 일/실행/회고 존재 확인(404). 삭제된 할 일의 편집·실행·완료·타이머 조작 제한. 다음 계획에 연결된 회고 수정은 409.',
    '할 일 마감일이 계획 기간 안에 있어야 한다는 검사는 구현하지 않는다. 계획의 예상 분과 할 일 합계의 일치도 강제하지 않는다.',
  ]),
  n('idempotency', '재전송·중복 방지', 'UUID + SHA-256 + DB 제약', ['src/Diary.tsx', 'src/server/store.ts', 'db/schema.ts'], [
    '클라이언트: 동일 action/data 재시도에 같은 requestId. 서버: SHA-256(JSON.stringify({action,data}))을 commands에 저장.',
    '같은 키·같은 fingerprint는 기존 결과 ID 반환. 같은 키·다른 내용은 409. SQL마다 NOT EXISTS(commands.id) 가드를 추가한다.',
    '변경 SQL과 INSERT OR IGNORE commands를 하나의 batch에 넣는다. batch 후 저장된 fingerprint가 다르면 충돌 409.',
    '완료는 status=todo인 할 일만 갱신하며 UNIQUE(task_id,cycle)로 완료 이벤트 중복을 막는다. 취소 시 done→todo 및 cycle+1; 과거 이벤트·실행 보존.',
    '타이머 시작은 PK(task_id)+INSERT OR IGNORE. 중지는 시작 시각 조건으로 실행 INSERT와 타이머 DELETE를 원자적으로 묶는다.',
    'review.next는 next_plan_id가 있으면 기존 연결을 반환한다. 여러 요청 키가 같은 회고에 접근해도 next_plan_id IS NULL 조건으로 한 번만 연결한다.',
    '일반 편집의 버전 충돌 해결·사용자별 격리는 별도 구현이 없다. 멱등성은 재전송 처리와 특정 상태 전이의 중복 방지다.',
  ]),
  n('db', 'D1 · SQLite', '서버 영속 저장 · 원자적 batch', ['db/schema.ts', 'drizzle/0000_steep_paladin.sql', 'contracts/pds-schema-v2.json'], [
    '8개 테이블: plans, plan_revisions, tasks, executions, timers, completions, reviews, commands.',
    '외래키는 NO ACTION. 사용자/소유자 테이블 및 사용자별 필터가 없으며, 공개 다이어리의 한 데이터 집합을 공유한다.',
    '운영 env.DB 바인딩. 로컬 Wrangler SQLite는 .wrangler/state에 보존되며 배포 DB와 분리된다. 브라우저 저장소를 기록 보존에 사용하지 않는다.',
    '계약의 모든 필드·기본값·외래키·인덱스·CHECK는 데이터 관계 보기의 테이블 상세에 자동 포함된다.',
  ]),
  n('scope', '집계 대상', 'scopeTasks → 같은 근거 집합', ['src/shared/domain.ts', 'src/features/reviews/ReviewView.tsx'], [
    '삭제되지 않은 할 일 중 선택 계획과 마감일의 from≤due_date≤to를 만족하는 집합 S.',
    '선택 계획 기간이 기본값. 실행 날짜가 아닌 할 일 마감일로 기간을 판단한다. 삭제된 할 일과 그 실행 시간은 집계에서 제외한다.',
    'metricTasks는 완료·지연·막힘일 때 S의 부분집합을 반환한다. 계획 수·예상·실제·차이의 근거는 S 전체다.',
  ]),
  n('metrics', '7개 지표', '원본에서 계산 · DB에 숫자 미저장', ['src/shared/domain.ts', 'src/features/reviews/ReviewView.tsx'], [
    '계획 수=|S| (계획 문서 수 아님). 완료 수=현재 status=done인 S의 개수.',
    '지연 수=status≠done 및 due_date<서울 오늘. 오늘 마감·완료는 지연에 포함하지 않는다.',
    '막힘 수=공백이 아닌 blocked_reason 실행이 하나 이상 있는 S의 고유 할 일 수. 실행 여러 건이어도 할 일당 1.',
    '예상 분=Σ S.estimated_minutes. 실제 분=Σ S에 속하는 할 일의 모든 executions.actual_minutes (실행 날짜 제한 없음).',
    '차이=실제−예상. 빈 집합은 모든 지표 0. 완료 취소·삭제·복원 후 현재 상태로 재계산한다.',
  ]),
  n('time', '날짜·시간 규칙', 'Asia/Seoul · UTC · 정수 분', ['src/shared/domain.ts', 'contracts/pds-schema-v2.json'], [
    '계획 기간·할 일 마감·회고 기간은 YYYY-MM-DD 달력 날짜로 저장하며 시간대 변환하지 않는다.',
    '실행·타이머·생성/수정/삭제 시각은 UTC ISO. 화면 입력·표시는 Asia/Seoul. seoulDate는 Intl.DateTimeFormat의 서울 날짜.',
    'minutesBetween=max(1,ceil((end−start)/60000)). 타이머는 서버 시작 시각을 기준으로 복원한다.',
    '수동 actual_minutes는 양의 정수이며 벽시계 차이와 다를 수 있다. formatMinutes는 부호와 시간/분 표시를 만든다.',
  ]),
  n('timer-flow', '타이머 수명주기', '시작 → 복원 → 중지 → 보정', ['src/Diary.tsx', 'src/server/store.ts', 'src/features/tasks/TaskDetail.tsx'], [
    'timer.start: 활성 할 일 확인 → timers(task_id,server now) INSERT OR IGNORE. 이미 실행 중이면 원래 시작 시각 유지.',
    'GET으로 timers를 읽어 새로고침 후에도 복구한다. 화면 경과 시간은 now−started_at에서 계산한다.',
    'timer.stop: 타이머 없으면 409. 서버 now와 시작 시각에서 정수 분 계산 → 실행 기록 생성 + 해당 타이머 삭제를 한 batch로 수행한다.',
    '중지 후 ExecutionForm으로 실제 시간·막힌 이유 보정. 완료 상태는 자동 변경하지 않는다.',
    '할 일 논리 삭제는 타이머를 보존한다. 삭제 중에는 조작을 막으며 복원 시 원래 실행 문맥을 되살린다.',
  ]),
  n('complete-flow', '완료 수명주기', 'todo ⇄ done · cycle', ['src/server/store.ts', 'db/schema.ts'], [
    'todo→done: completions에 현재 cycle의 이벤트 INSERT OR IGNORE 후 tasks.status=done. 같은/다른 요청 키의 중복 완료도 현재 cycle당 한 이벤트.',
    'done→todo: completion_cycle+1. 다시 완료하면 새 cycle의 이벤트를 남긴다. 이미 todo인 상태에서 취소 재전송 시 cycle을 증가시키지 않는다.',
    '완료 수는 completions 누계가 아니라 tasks 현재 상태로 집계한다. 실행 기록을 자동 생성하거나 삭제하지 않는다.',
  ]),
  n('review-flow', '회고 → 다음 계획', '개선점 보존 · 단일 연결', ['src/server/store.ts', 'src/features/plans/PlanForm.tsx', 'src/features/plans/PlanViews.tsx'], [
    'review.save: 계획 ID + from/to + improvement 저장. next_plan_id가 설정된 회고는 수정 불가.',
    'review.next: 회고 확인 → 새 계획 값 검증 → 선택 task_ids 0~50개·문자열·중복 없음·동일 원래 계획·활성 여부 검사.',
    '원자적 batch: 새 plans v1 → plan_revisions v1 → 선택 tasks 신규 생성 → reviews.next_plan_id 연결 → commands 저장.',
    '복사 필드: title,priority,tags,estimated_minutes. 새 due_date=새 계획 end_date, status=todo, completion_cycle=0.',
    '새 계획은 reviews.next_plan_id의 역조회로 이전 개선점을 표시한다. 과거 실행/완료/타이머는 원래 할 일에만 남는다.',
  ]),
  n('delete-flow', '삭제 → 실행 취소', 'deleted_at · 기록 보존', ['src/Diary.tsx', 'src/server/store.ts', 'src/shared/domain.ts'], [
    'task.delete는 deleted_at/updated_at만 설정하고 삭제 성공 후 조정자가 undo 대상 할 일을 기억한다.',
    'task.restore는 deleted_at=NULL. 연관 실행·완료 이벤트·타이머를 삭제하지 않으므로 복원 시 함께 다시 사용할 수 있다.',
    '삭제된 할 일은 탐색·오늘·회고 범위에서 제외된다. GET 상태와 JSON 내보내기에는 삭제 표시 및 연관 데이터가 남는다.',
  ]),
  n('worker', 'Cloudflare Worker', 'Vinext fetch handler', ['worker/index.ts', 'vite.config.ts'], [
    'fetch(request,env,ctx) → request-scoped connector context → vinext/server/fetch-handler → app 페이지/API.',
    'ctx.props.CONNECTORS를 사용할 수 있게 바인딩한다. DEV 전용 preview는 env.CONNECTORS를 사용하고 문맥을 60초 뒤 만료시킨다.',
    '현재 다이어리의 도메인 API는 connector 호출을 사용하지 않는다. Worker의 connector 코드는 starter 기반 시설이다.',
  ]),
  n('build', '빌드·로컬 실행', 'Vite · Vinext · Wrangler · Sites', ['package.json', 'vite.config.ts', 'scripts/run-framework.mjs', 'scripts/migrate-local.mjs', '.openai/hosting.json'], [
    'npm ci → npm run db:migrate → npm run dev. npm run start는 dist/server/wrangler.json을 로컬 상태 경로와 함께 실행한다.',
    'scripts/run-framework.mjs는 실행 환경별 프레임워크 진입점을 선택한다. vite.config.ts는 Vinext/Sites/connector preview/Cloudflare 플러그인을 연결한다.',
    '.openai/hosting.json은 Site/DB 바인딩 선언. Sites가 drizzle 마이그레이션을 적용한다. 이 설계도는 배포 상태를 실시간 조회하지 않는다.',
    'macOS Seatbelt에서는 파일 변경 polling. 개발 전용 connector auxiliary Worker는 운영 빌드에 포함되지 않는다.',
  ]),
  n('schema', '스키마·계약 검증', 'Drizzle 선언 ↔ SQL ↔ 계약', ['db/schema.ts', 'drizzle.config.ts', 'drizzle/0000_steep_paladin.sql', 'drizzle/meta/0000_snapshot.json', 'contracts/pds-schema-v2.json', 'scripts/schema-contract.mjs'], [
    'Drizzle은 스키마 선언·마이그레이션 생성에 사용한다. db:check는 Drizzle snapshot의 실제 테이블 구조와 JSON 계약을 비교한다.',
    '마이그레이션 SQL은 로컬 및 테스트 SQLite와 운영 D1의 실제 제약을 만든다. tests는 SQL을 적용한 DB에서 트랜잭션·외래키·CHECK를 검증한다.',
    'db/index.ts에는 Drizzle getDb 도우미가 있으나 현재 /api/diary, /api/export는 src/server/store.ts의 직접 SQL 경로를 사용한다.',
  ]),
  n('tests-unit', '도메인 단위 검증', '서울 경계 · 집계 · 필터 · 시간', ['tests/unit/domain.test.ts', 'scripts/test.mjs'], [
    '서울 자정 경계 및 local↔UTC 왕복; 빈 집합의 7개 0; 오늘/완료/삭제의 지연 제외.',
    '마감일 기간 선택·ID 동률 정렬; 검색·태그·우선순위·상태 조합; 타이머 분 올림·최소 1분.',
    'scripts/test.mjs가 TypeScript 소스와 테스트를 .sites-runtime/tests로 변환하여 node --test로 실행한다.',
  ]),
  n('tests-store', '저장소 통합 검증', '실제 SQLite · 실제 마이그레이션', ['tests/integration/store.test.ts', 'drizzle/0000_steep_paladin.sql'], [
    'Node DatabaseSync 어댑터가 Database/Statement 계약과 원자적 batch를 구현한다. 격리된 DB에 실제 마이그레이션을 적용한다.',
    '최초/중간 계획 스냅샷; 같은 키 재시도와 payload 충돌; 같은/다른 키 완료 중복·취소·재완료.',
    '막힘 고유 집계·실제 합계·예상 보존; 삭제/복원/내보내기; 잘못된 날짜·음수·역전 시각의 무변경.',
    '타이머 복구/재시작 멱등성/중지 한 실행; 회고 단일 연결/선택 복사/과거 기록 제외.',
    'SQL/스크립트 모양 문자열의 문자 보존; FK/CHECK 직접 위반 거절; 내보내기의 한 batch 스냅샷.',
  ]),
  n('tests-http', 'HTTP·수동 검증', '실제 경계 · 브라우저 증거', ['tests/integration/http-flow.mjs', 'tests/e2e/README.md', 'docs/verification.md', 'docs/evidence/verification-results.md'], [
    'test:http는 지정 URL에 실제 생성·수정 요청을 보내는 검증이며 기록을 변경한다. 운영 URL에 자동 실행하지 않는다.',
    '흐름: 계획/할 일, 반복 완료·취소, 실행, 삭제/복원, 읽기 안정성, cross-site/잘못된 입력 거절, JSON 내보내기.',
    '모바일·키보드·오류 시 입력 유지·공개 접근·실제 사례는 docs/evidence의 기존 기록/이미지로 남아 있다. tests/e2e에는 브라우저 자동 테스트 구현이 없다.',
    '이 모델의 소스 목록에는 테스트 함수명을 자동 추출하여 전체 검증 항목을 보존한다.',
  ]),
  n('public', '공개·보존 경계', '인증 없는 공동 다이어리', ['README.md', 'docs/requirements.md', 'docs/deployment.md', 'app/api/diary/route.ts'], [
    '현재 앱의 데이터 모델에는 소유자/로그인 분리가 없다. 앱과 API는 링크 접근자의 조회·수정을 허용하는 공개 공동 다이어리로 설계되었다.',
    '동일 origin 검사·JSON 검증·매개변수 SQL·React 문자 렌더링·no-store·일반 오류 메시지가 구현되어 있다.',
    '로그인·회원가입·잠금은 과제7 범위. AI 회고 생성·외부 캘린더·푸시 알림은 현 구현 범위가 아니다.',
    '문서의 공개·배포 설명은 저장소 기록이다. 설계 생성은 공개 DB 조회/변경 또는 배포 상태의 실시간 검증을 수행하지 않는다.',
  ]),
  n('starter', 'Starter 보조 코드', '현재 도메인 경로와 구분', ['app/chatgpt-auth.ts', 'db/index.ts', 'lib/connectors.ts', 'lib/connector-contract.mts', 'lib/connector-errors.mts', 'lib/connector-context.ts', 'lib/utils.ts', 'scripts/connector-preview/worker.mjs'], [
    'app/chatgpt-auth.ts는 인증 헤더·로그인/로그아웃·리다이렉트 도우미를 정의하지만 현재 페이지/API에서 호출하지 않는다. 구현된 로그인 기능으로 해석하지 않는다.',
    'lib의 connector contract/context/errors와 preview worker는 런타임 통합 도우미다. 요청별 context 바인딩은 Worker에 연결되지만 다이어리는 외부 connector를 호출하지 않는다.',
    'db/index.ts의 getDb, lib/utils.ts의 cn, 설치된 UI/차트 라이브러리는 존재만으로 실제 업무 실행 경로의 의존성으로 보지 않는다.',
    '전체 추적 파일과 각 TypeScript 파일의 실제 import/export 목록은 소스 목록 보기에 제공한다.',
  ]),
];

/** API 변경 명령의 실제 입력과 쓰기 대상. id?는 수정 시 기존 식별자. */
export const commands = [
  { action:'plan.save', input:'id?, title, start_date, end_date, priority, success_criteria, estimated_minutes', tables:['plans','plan_revisions'], rule:'생성 v1 / 수정 version+1, 동일 batch로 전체 스냅샷 저장' },
  { action:'task.save', input:'id?, plan_id, title, due_date, priority, tags:string[], estimated_minutes', tables:['tasks'], rule:'활성 할 일 생성·수정; tags 정규화; plan 존재 확인' },
  { action:'task.complete', input:'id, done:boolean', tables:['tasks','completions'], rule:'todo→done 이벤트 1개; done→todo cycle+1; 실행 기록 보존' },
  { action:'task.delete', input:'id', tables:['tasks'], rule:'deleted_at만 설정; 타이머·실행·완료 보존' },
  { action:'task.restore', input:'id', tables:['tasks'], rule:'deleted_at=NULL로 복원' },
  { action:'execution.save', input:'id?, task_id, started_at, ended_at, actual_minutes, blocked_reason', tables:['executions'], rule:'활성 할 일; UTC 정규화; task_id 이동 불가; 예상/완료 상태 별도' },
  { action:'timer.start', input:'task_id', tables:['timers'], rule:'task_id PK로 중복 시작 무시; 시작 시각 서버 생성' },
  { action:'timer.stop', input:'task_id', tables:['executions','timers'], rule:'일치하는 시작 시각 기준 실행 생성+타이머 삭제; 타이머 없음 409' },
  { action:'review.save', input:'id?, plan_id, from_date, to_date, improvement', tables:['reviews'], rule:'기간·개선점 보존; 다음 계획 연결 후 수정 금지' },
  { action:'review.next', input:'review_id, title, start_date, end_date, priority, success_criteria, estimated_minutes, task_ids:string[]', tables:['plans','plan_revisions','tasks','reviews'], rule:'최대 50개 선택 복사; 한 회고 한 연결; 과거 실행·완료 제외' },
];

/** @type {View[]} */
export const views = [
  { id:'architecture', label:'구현 구조', groups:[
    {label:'진입·상태',ids:['entry','diary','url']},
    {label:'화면·상호작용',ids:['today','plans-ui','plan-form','history','tasks-ui','task-form','detail','execution-form','review-ui','ui']},
    {label:'공유·통신',ids:['domain','client']},
    {label:'API·서버',ids:['api','export','store','validation','idempotency']},
    {label:'저장·런타임',ids:['db','worker','build','schema']},
  ], edges:[
    e('entry','diary','렌더링'), e('diary','url','조회 상태 동기화'),
    ...['today','plans-ui','plan-form','history','tasks-ui','task-form','detail','execution-form','review-ui'].map(id=>e('diary',id,'렌더링·props / 콜백')),
    ...['today','plans-ui','tasks-ui','detail','execution-form','review-ui','history'].map(id=>e(id,'domain','타입·공유 규칙 사용')),
    ...['plan-form','task-form','execution-form','history','review-ui'].map(id=>e(id,'ui','공통 UI 사용')),
    e('today','tasks-ui','TaskList 재사용'),e('review-ui','tasks-ui','근거 TaskList 재사용'),
    e('diary','client','loadDiary / request'), e('client','api','GET / POST'),e('diary','export','파일 내보내기 GET'),
    e('api','store','readState / mutate'),e('export','store','exportData'),e('store','validation','입력 검증'),e('store','idempotency','명령 중복 가드'),e('store','domain','서울 날짜·경과 분'),e('store','db','직접 매개변수 SQL·batch'),e('idempotency','db','commands·UNIQUE'),
    e('worker','entry','Vinext 페이지 처리'),e('worker','api','Vinext API 처리'),e('worker','export','Vinext API 처리'),e('build','worker','Worker 번들·바인딩'),e('schema','db','마이그레이션'),
  ]},
  {id:'data',label:'데이터 관계',groups:[
    {label:'계획 기준',ids:['table-plans','table-plan_revisions']},
    {label:'할 일',ids:['table-tasks']},
    {label:'실행·상태 이력',ids:['table-executions','table-timers','table-completions']},
    {label:'회고·명령',ids:['table-reviews','table-commands']},
  ],edges:[
    e('table-plan_revisions','table-plans','plan_id → id · 계획 1 : 이력 N'),
    e('table-tasks','table-plans','plan_id → id · 계획 1 : 할 일 N'),
    e('table-executions','table-tasks','task_id → id · 할 일 1 : 실행 N'),
    e('table-timers','table-tasks','task_id PK/FK → id · 할 일 1 : 타이머 0..1'),
    e('table-completions','table-tasks','task_id → id · 할 일 1 : 완료 이력 N'),
    e('table-reviews','table-plans','plan_id → id · 원래 계획 1 : 회고 N'),
    e('table-reviews','table-plans','next_plan_id? → id · 회고마다 다음 계획 0..1; DB는 역방향 UNIQUE 없음'),
  ]},
  {id:'flow',label:'명령·규칙',groups:[
    {label:'요청·검증',ids:['client','api','validation','idempotency']},
    {label:'쓰기 흐름',ids:['store','complete-flow','delete-flow','timer-flow','review-flow']},
    {label:'조회·계산',ids:['scope','metrics','time','export']},
    {label:'보존',ids:['db','domain']},
  ],edges:[
    e('client','api','{action,requestId,data} → {id}'),e('api','validation','형식·origin·입력'),e('api','store','mutate / readState'),e('store','idempotency','fingerprint·가드'),
    ...['complete-flow','delete-flow','timer-flow','review-flow'].map(id=>e('store',id,'명령 분기')),
    ...['complete-flow','delete-flow','timer-flow','review-flow','idempotency'].map(id=>e(id,'db','원자적 batch')),
    e('client','store','POST 성공 후 GET 재조회(API 경유)'),e('domain','scope','대상 선택'),e('scope','metrics','동일 집합 S'),e('metrics','time','오늘·정수 분'),e('timer-flow','time','시작 시각→경과 분'),e('export','db','일관된 스냅샷'),e('delete-flow','scope','삭제 제외 / 복원 포함'),e('complete-flow','metrics','현재 상태 재계산'),e('review-flow','metrics','숫자는 원본에서 재계산'),
  ]},
  {id:'verification',label:'검증·운영',groups:[
    {label:'검증',ids:['tests-unit','tests-store','tests-http']},
    {label:'검증 대상',ids:['domain','store','api','schema']},
    {label:'실행·경계',ids:['build','worker','public','starter']},
  ],edges:[
    e('tests-unit','domain','날짜·집계·정렬 검증'),e('tests-store','store','상태 전이·멱등성·보존 검증'),e('tests-store','schema','실제 SQL 제약 검증'),e('tests-http','api','실제 HTTP 경계 검증'),e('tests-http','public','공개·문자·접근성 수동 근거'),e('schema','store','SQL 일치 계약'),e('build','worker','번들·D1 연결'),e('worker','api','배포 실행 경로'),e('worker','starter','요청별 connector 문맥'),e('public','api','공개 범위·origin 경계'),
  ]},
];

export const metadata = {
  title:'틈 · Plan Do See Diary',
  repositoryUrl:'https://github.com/jkimsvsd-code/project-apprenticeship-06',
  sourceRef:'main',
  language:'JavaScript ES Modules + HTML/CSS/JavaScript',
  basis:'작업 폴더의 현재 구현 + contracts/pds-schema-v2.json. 배포 DB의 실시간 상태는 포함하지 않음.',
  interpretation:'선은 화살표 방향의 호출·사용·참조를 나타낸다. 데이터 관계 보기는 자식 FK → 부모 PK다. 전체 관계는 선택 요소의 관계 목록에서 이름과 방향으로 확인한다.',
};
