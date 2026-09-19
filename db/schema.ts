import { sql } from "drizzle-orm";
import {
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

/** 登录用户收藏的城市快照；天气本身仍然从 Open-Meteo 实时读取。 */
export const favoriteCities = sqliteTable(
  "favorite_cities",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id").notNull(),
    cityId: text("city_id").notNull(),
    name: text("name").notNull(),
    latitude: real("latitude").notNull(),
    longitude: real("longitude").notNull(),
    timezone: text("timezone").notNull(),
    country: text("country"),
    admin1: text("admin1"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    userCityUnique: uniqueIndex("idx_favorite_cities_user_city").on(
      table.userId,
      table.cityId,
    ),
  }),
);
