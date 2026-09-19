CREATE TABLE `favorite_cities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`city_id` text NOT NULL,
	`name` text NOT NULL,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL,
	`timezone` text NOT NULL,
	`country` text,
	`admin1` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_favorite_cities_user_city` ON `favorite_cities` (`user_id`,`city_id`);