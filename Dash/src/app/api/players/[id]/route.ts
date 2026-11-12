import {NextRequest, NextResponse} from "next/server";
import {queryStatsFromLocalMariaDB} from "@/lib/db";
import {StatsApiResponse} from "@/types/stats";
import {getRsaAuthHeaders} from "@/lib/rsa-auth";

export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-api-key, x-api-signature, x-api-timestamp",
};

export async function OPTIONS() {
  return new NextResponse(null, {status: 204, headers: CORS_HEADERS});
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }
) {
  try {
    const {id} = await context.params;
    const target = decodeURIComponent(id).trim().toLowerCase();

    const remoteApiUrl = process.env.REMOTE_API_URL?.trim();
    const apiSecretKey = process.env.API_SECRET_KEY?.trim();

    if (process.env.REQUIRE_API_KEY === "true" && apiSecretKey) {
      const providedKey = request.headers.get("x-api-key");
      if (providedKey !== apiSecretKey) {
        return NextResponse.json(
            {error: "Unauthorized: Invalid x-api-key"},
            {status: 401, headers: CORS_HEADERS}
        );
      }
    }

    let data: StatsApiResponse;
    if (remoteApiUrl) {
      const targetPath = "/api/stats";
      const rsaHeaders = getRsaAuthHeaders("GET", targetPath);
      const res = await fetch(`${remoteApiUrl.replace(/\/$/, "")}${targetPath}`, {
        headers: {
          Accept: "application/json",
          ...rsaHeaders,
          ...(apiSecretKey ? {"x-api-key": apiSecretKey} : {}),
        },
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error(`Remote API responded with status ${res.status}`);
      }
      data = (await res.json()) as StatsApiResponse;
    } else {
      data = await queryStatsFromLocalMariaDB();
    }

    const player = data.players.find((p) => p.uuid.toLowerCase() === target || p.username.toLowerCase() === target);

    if (!player) {
      return NextResponse.json({error: "해당 플레이어를 찾을 수 없습니다."}, {status: 404, headers: CORS_HEADERS});
    }

    return NextResponse.json({
      player, queriedAt: data.overview.queriedAt, sourceMode: remoteApiUrl ? "remote-api-proxy" : "local-mariadb",
    }, {headers: CORS_HEADERS});
  } catch (error) {
    console.error("[GET /api/players/[id]] Error:", error);
    return NextResponse.json({
      error: "플레이어 데이터를 불러오지 못했습니다.", details: error instanceof Error ? error.message : String(error),
    }, {status: 500, headers: CORS_HEADERS});
  }
}
