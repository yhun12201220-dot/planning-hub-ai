# Marketing Desk MVP

Next.js와 Tailwind CSS로 만든 마케팅 기획 업무 툴 MVP입니다.

## 기능

- 브리프 정리
- 기획안 생성
- SNS 멘션 생성
- 회의록 정리
- 보고서 인사이트 생성
- OpenAI Responses API 호출
- Claude Messages API 병렬 호출
- 로그인 없는 팀 공용 사용
- Supabase DB 결과물 저장 및 최근 목록 공유

## 환경변수

`.env.local` 파일을 만들고 아래 값을 설정합니다.

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

OPENAI_API_KEY=
OPENAI_MODEL=gpt-5

ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-sonnet-4-5
```

`SUPABASE_SERVICE_ROLE_KEY`는 서버 전용 키입니다. `NEXT_PUBLIC_` 접두사를 붙이지 말고, 클라이언트 컴포넌트에서 직접 사용하지 마세요.

현재 MVP는 팀원이 별도 아이디 없이 같은 앱을 함께 쓰는 방식입니다. 저장과 최근 목록 조회는 서버 API가 `SUPABASE_SERVICE_ROLE_KEY`로 처리합니다.

## Supabase DB

Supabase SQL Editor에서 `supabase/schema.sql` 내용을 실행하면 저장 테이블과 RLS 정책이 생성됩니다.

저장 테이블:

- `marketing_outputs`
- 팀원이 저장한 최근 결과가 공용 목록에 표시됩니다.

## 실행

```bash
npm install
npm run dev
```
