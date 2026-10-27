import { env } from "cloudflare:workers";
import { exportData } from "@/src/server/store";
import type { Database } from "@/src/server/store";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    if (!env.DB) throw new Error("Unavailable");
    const data = await exportData(env.DB as unknown as Database);
    return new Response(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="pds-diary-${data.today}.json"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return Response.json(
      { error: "내보내기에 실패했습니다. 잠시 뒤 다시 시도해 주세요." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
