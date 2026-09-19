import { getChatGPTUser } from "../../chatgpt-auth";

type FavoritePayload = {
  cityId: string;
  name: string;
  latitude: number;
  longitude: number;
  timezone: string;
  country?: string;
  admin1?: string;
};

type FavoriteRow = FavoritePayload & {
  id: number;
  createdAt: string;
};

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function parseFavoritePayload(value: unknown): FavoritePayload | null {
  if (!value || typeof value !== "object") return null;
  const city = (value as { city?: unknown }).city;
  if (!city || typeof city !== "object") return null;

  const candidate = city as Partial<FavoritePayload>;
  const cityId = typeof candidate.cityId === "string" ? candidate.cityId.trim() : "";
  const name = typeof candidate.name === "string" ? candidate.name.trim() : "";
  const timezone = typeof candidate.timezone === "string" ? candidate.timezone.trim() : "";
  const latitude = candidate.latitude;
  const longitude = candidate.longitude;

  if (
    !cityId ||
    cityId.length > 160 ||
    !name ||
    name.length > 120 ||
    !timezone ||
    timezone.length > 120 ||
    typeof latitude !== "number" ||
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    typeof longitude !== "number" ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  return {
    cityId,
    name,
    latitude,
    longitude,
    timezone,
    country: typeof candidate.country === "string" ? candidate.country.trim().slice(0, 120) : undefined,
    admin1: typeof candidate.admin1 === "string" ? candidate.admin1.trim().slice(0, 120) : undefined,
  };
}

function toFavoriteRow(row: Record<string, unknown>): FavoriteRow {
  return {
    id: Number(row.id),
    cityId: String(row.city_id),
    name: String(row.name),
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    timezone: String(row.timezone),
    country: row.country ? String(row.country) : undefined,
    admin1: row.admin1 ? String(row.admin1) : undefined,
    createdAt: String(row.created_at),
  };
}

async function readUser() {
  const user = await getChatGPTUser();
  return user;
}

async function getDatabase() {
  const { getD1 } = await import("../../../db");
  return getD1();
}

export async function GET() {
  const user = await readUser();
  if (!user) return jsonError("请先登录后查看收藏夹", 401);

  try {
    const db = await getDatabase();
    const result = await db
      .prepare(
        "SELECT id, city_id, name, latitude, longitude, timezone, country, admin1, created_at FROM favorite_cities WHERE user_id = ? ORDER BY created_at DESC, id DESC",
      )
      .bind(user.userId)
      .all<Record<string, unknown>>();

    return Response.json({ favorites: result.results.map(toFavoriteRow) });
  } catch (error) {
    console.error("Failed to load favorite cities", error);
    return jsonError("收藏服务暂时不可用，请稍后再试", 503);
  }
}

export async function POST(request: Request) {
  const user = await readUser();
  if (!user) return jsonError("请先登录后保存城市", 401);

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError("收藏城市数据格式不正确", 400);
  }

  const city = parseFavoritePayload(payload);
  if (!city) return jsonError("收藏城市数据不完整", 400);

  try {
    const db = await getDatabase();
    await db
      .prepare(
        "INSERT INTO favorite_cities (user_id, city_id, name, latitude, longitude, timezone, country, admin1) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(user_id, city_id) DO UPDATE SET name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude, timezone = excluded.timezone, country = excluded.country, admin1 = excluded.admin1",
      )
      .bind(
        user.userId,
        city.cityId,
        city.name,
        city.latitude,
        city.longitude,
        city.timezone,
        city.country ?? null,
        city.admin1 ?? null,
      )
      .run();

    const row = await db
      .prepare(
        "SELECT id, city_id, name, latitude, longitude, timezone, country, admin1, created_at FROM favorite_cities WHERE user_id = ? AND city_id = ? LIMIT 1",
      )
      .bind(user.userId, city.cityId)
      .first<Record<string, unknown>>();

    if (!row) return jsonError("收藏城市保存失败，请稍后再试", 503);
    return Response.json({ favorite: toFavoriteRow(row) }, { status: 201 });
  } catch (error) {
    console.error("Failed to save favorite city", error);
    return jsonError("收藏服务暂时不可用，请稍后再试", 503);
  }
}

export async function DELETE(request: Request) {
  const user = await readUser();
  if (!user) return jsonError("请先登录后管理收藏夹", 401);

  const cityId = new URL(request.url).searchParams.get("cityId")?.trim() ?? "";
  if (!cityId || cityId.length > 160) return jsonError("缺少有效的城市 ID", 400);

  try {
    const db = await getDatabase();
    await db
      .prepare("DELETE FROM favorite_cities WHERE user_id = ? AND city_id = ?")
      .bind(user.userId, cityId)
      .run();
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Failed to delete favorite city", error);
    return jsonError("收藏服务暂时不可用，请稍后再试", 503);
  }
}
