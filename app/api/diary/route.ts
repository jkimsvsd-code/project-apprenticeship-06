import { env } from "cloudflare:workers";
import { AppError, mutate, readState } from "@/src/server/store";
import type { Database } from "@/src/server/store";
export const dynamic = "force-dynamic";
const headers = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};
function database() {
  if (!env.DB)
    throw new AppError(
      "데이터베이스에 연결할 수 없습니다. 잠시 뒤 다시 시도해 주세요.",
      503,
    );
  return env.DB as unknown as Database;
}
function error(e: unknown) {
  return Response.json(
    {
      error:
        e instanceof AppError
          ? e.message
          : "저장소를 불러오지 못했습니다. 입력을 유지한 채 다시 시도해 주세요.",
      field: e instanceof AppError ? e.field : "",
    },
    { status: e instanceof AppError ? e.status : 503, headers },
  );
}
export async function GET() {
  try {
    return Response.json(await readState(database()), { headers });
  } catch (e) {
    return error(e);
  }
}
export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    if (
      (origin && origin !== new URL(request.url).origin) ||
      request.headers.get("sec-fetch-site") === "cross-site"
    )
      throw new AppError("같은 앱에서 다시 요청해 주세요.", 403);
    if (!request.headers.get("content-type")?.includes("application/json"))
      throw new AppError("JSON 요청이 필요합니다.", 415);
    const body = await request.text();
    if (body.length > 64000)
      throw new AppError("입력 내용이 너무 큽니다.", 413);
    let data;
    try {
      data = JSON.parse(body);
    } catch {
      throw new AppError("입력 형식이 올바르지 않습니다.");
    }
    if (!data || typeof data !== "object" || Array.isArray(data))
      throw new AppError("입력 형식을 확인해 주세요.");
    return Response.json(await mutate(database(), data), { headers });
  } catch (e) {
    return error(e);
  }
}
