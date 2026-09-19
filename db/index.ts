import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

/** 获取原始 D1 绑定，供需要批量或单语句 prepared statement 的路由使用。 */
export function getD1() {
  if (!env.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` before using the database.",
    );
  }

  return env.DB;
}

/** 获取带 schema 的 Cloudflare D1 Drizzle 客户端，并提前检查数据库绑定。 */
export function getDb() {
  return drizzle(getD1(), { schema });
}
