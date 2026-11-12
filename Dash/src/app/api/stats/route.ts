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

export async function GET(request: NextRequest) {
  try {
    const remoteApiUrl = process.env.REMOTE_API_URL?.trim();
    const apiSecretKey = process.env.API_SECRET_KEY?.trim();

    // Optional API key check when REQUIRE_API_KEY is enabled on local tunnel endpoint
    if (process.env.REQUIRE_API_KEY === "true" && apiSecretKey) {
      const providedKey = request.headers.get("x-api-key");
      if (providedKey !== apiSecretKey) {
        return NextResponse.json({error: "Unauthorized: Invalid x-api-key"}, {status: 401, headers: CORS_HEADERS});
      }
    }

    let data: StatsApiResponse;

    if (remoteApiUrl) {
      // Proxy mode for Vercel cloud deployment -> Local server API tunnel
      const targetUrl = `${remoteApiUrl.replace(/\/$/, "")}/api/stats`;
      const rsaHeaders = getRsaAuthHeaders("GET", "/api/stats");
      const res = await fetch(targetUrl, {
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

      const remoteData = (await res.json()) as StatsApiResponse;
      data = {
        ...remoteData, overview: {
          ...remoteData.overview, sourceMode: "remote-api-proxy",
        },
      };
    } else {
      // Direct local MariaDB query mode
      data = await queryStatsFromLocalMariaDB();
    }

    const search = request.nextUrl.searchParams.get("q")?.trim().toLowerCase();
    if (search) {
      data = {
        ...data,
        players: data.players.filter((p) => p.username.toLowerCase().includes(search) || (p.nickname && p.nickname.toLowerCase().includes(search)) || p.uuid.toLowerCase().includes(search)),
      };
    }

    return NextResponse.json(data, {headers: CORS_HEADERS});
  } catch (error) {
    console.error("[GET /api/stats] Error:", error);
    return NextResponse.json({
      error: "데이터베이스 조회 중 오류가 발생했습니다.", details: error instanceof Error ? error.message : String(error),
    }, {status: 500, headers: CORS_HEADERS});
  }
}
