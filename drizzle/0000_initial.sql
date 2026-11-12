-- Idempotent baseline: adopt the existing pre-Drizzle tables without replacing data.
CREATE TABLE IF NOT EXISTS `posts` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`types` text NOT NULL,
	`hand` text DEFAULT '[]' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`gameLink` text DEFAULT '' NOT NULL,
	`image` text DEFAULT '' NOT NULL,
	`platform` text DEFAULT 'Other' NOT NULL,
	`createdAt` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `posts_date` ON `posts` ("createdAt" desc);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `posts_user` ON `posts` (`userId`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `sessions` (
	`token` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`expires` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`name` text NOT NULL,
	`password` text NOT NULL,
	`bio` text DEFAULT '' NOT NULL,
	`avatar` text DEFAULT '' NOT NULL,
	`createdAt` text NOT NULL,
	`demo` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `users_username_unique` ON `users` (`username`);
