CREATE TABLE `ai_cache` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ai_usage` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`task` text NOT NULL,
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`input_tokens` integer DEFAULT 0 NOT NULL,
	`output_tokens` integer DEFAULT 0 NOT NULL,
	`cached_tokens` integer DEFAULT 0 NOT NULL,
	`cost_usd` real DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `applications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`job_id` text NOT NULL,
	`method` text DEFAULT 'form' NOT NULL,
	`cover_letter` text DEFAULT '' NOT NULL,
	`highlights` text DEFAULT '[]' NOT NULL,
	`answers` text DEFAULT '{}' NOT NULL,
	`generated_by` text DEFAULT 'template' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`error` text,
	`log` text DEFAULT '[]' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`approved_at` integer,
	`submitted_at` integer,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `applications_job_idx` ON `applications` (`job_id`);--> statement-breakpoint
CREATE INDEX `applications_status_idx` ON `applications` (`status`);--> statement-breakpoint
CREATE TABLE `contacts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`job_id` text,
	`company` text DEFAULT '' NOT NULL,
	`name` text NOT NULL,
	`role` text DEFAULT '' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`linkedin` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`job_id` text,
	`type` text NOT NULL,
	`message` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `events_job_idx` ON `events` (`job_id`);--> statement-breakpoint
CREATE INDEX `events_created_idx` ON `events` (`created_at`);--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`external_id` text NOT NULL,
	`dedupe_key` text NOT NULL,
	`title` text NOT NULL,
	`company` text NOT NULL,
	`company_logo` text,
	`location` text DEFAULT '' NOT NULL,
	`remote` integer DEFAULT false NOT NULL,
	`countries` text DEFAULT '[]' NOT NULL,
	`url` text NOT NULL,
	`apply_url` text NOT NULL,
	`ats` text DEFAULT 'unknown' NOT NULL,
	`apply_email` text,
	`description` text DEFAULT '' NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`salary_min` real,
	`salary_max` real,
	`salary_currency` text,
	`salary_period` text,
	`seniority` text,
	`employment_type` text,
	`posted_at` integer NOT NULL,
	`fetched_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`skills` text DEFAULT '[]' NOT NULL,
	`nice_skills` text DEFAULT '[]' NOT NULL,
	`score` integer DEFAULT 0 NOT NULL,
	`breakdown` text,
	`ai` text,
	`status` text DEFAULT 'new' NOT NULL,
	`status_changed_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`applied_at` integer,
	`follow_up_at` integer,
	`starred` integer DEFAULT false NOT NULL,
	`notes` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `jobs_score_idx` ON `jobs` (`score`);--> statement-breakpoint
CREATE INDEX `jobs_status_idx` ON `jobs` (`status`);--> statement-breakpoint
CREATE INDEX `jobs_posted_idx` ON `jobs` (`posted_at`);--> statement-breakpoint
CREATE INDEX `jobs_dedupe_idx` ON `jobs` (`dedupe_key`);--> statement-breakpoint
CREATE TABLE `profile` (
	`id` integer PRIMARY KEY NOT NULL,
	`full_name` text DEFAULT '' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`location` text DEFAULT '' NOT NULL,
	`country_code` text DEFAULT '' NOT NULL,
	`headline` text DEFAULT '' NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`linkedin` text DEFAULT '' NOT NULL,
	`github` text DEFAULT '' NOT NULL,
	`portfolio` text DEFAULT '' NOT NULL,
	`years_experience` real DEFAULT 0 NOT NULL,
	`target_roles` text DEFAULT '[]' NOT NULL,
	`skills` text DEFAULT '[]' NOT NULL,
	`learning` text DEFAULT '[]' NOT NULL,
	`resume_text` text DEFAULT '' NOT NULL,
	`resume_path` text DEFAULT '' NOT NULL,
	`work_authorization` text DEFAULT '' NOT NULL,
	`notice_period` text DEFAULT '' NOT NULL,
	`salary_expectation` text DEFAULT '' NOT NULL,
	`answers` text DEFAULT '[]' NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sync_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source` text NOT NULL,
	`started_at` integer NOT NULL,
	`finished_at` integer,
	`fetched` integer DEFAULT 0 NOT NULL,
	`inserted` integer DEFAULT 0 NOT NULL,
	`updated` integer DEFAULT 0 NOT NULL,
	`error` text
);
