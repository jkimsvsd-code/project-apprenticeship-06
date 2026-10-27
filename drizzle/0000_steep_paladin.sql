CREATE TABLE `commands` (
	`id` text PRIMARY KEY NOT NULL,
	`fingerprint` text NOT NULL,
	`result_id` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `completions` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`cycle` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `completion_once_per_cycle` ON `completions` (`task_id`,`cycle`);--> statement-breakpoint
CREATE TABLE `executions` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`started_at` text NOT NULL,
	`ended_at` text NOT NULL,
	`actual_minutes` integer NOT NULL,
	`blocked_reason` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "execution_minutes" CHECK("executions"."actual_minutes" >= 1),
	CONSTRAINT "execution_period" CHECK("executions"."ended_at" >= "executions"."started_at")
);
--> statement-breakpoint
CREATE INDEX `executions_task` ON `executions` (`task_id`);--> statement-breakpoint
CREATE TABLE `plan_revisions` (
	`revision_id` text PRIMARY KEY NOT NULL,
	`plan_id` text NOT NULL,
	`version` integer NOT NULL,
	`title` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`priority` text NOT NULL,
	`success_criteria` text NOT NULL,
	`estimated_minutes` integer NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `plan_version_unique` ON `plan_revisions` (`plan_id`,`version`);--> statement-breakpoint
CREATE TABLE `plans` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`priority` text NOT NULL,
	`success_criteria` text NOT NULL,
	`estimated_minutes` integer NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT "plan_minutes" CHECK("plans"."estimated_minutes" >= 0),
	CONSTRAINT "plan_period" CHECK("plans"."end_date" >= "plans"."start_date"),
	CONSTRAINT "plan_priority" CHECK("plans"."priority" in ('high','medium','low'))
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_id` text NOT NULL,
	`from_date` text NOT NULL,
	`to_date` text NOT NULL,
	`improvement` text NOT NULL,
	`next_plan_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`next_plan_id`) REFERENCES `plans`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "review_period" CHECK("reviews"."to_date" >= "reviews"."from_date")
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_id` text NOT NULL,
	`title` text NOT NULL,
	`due_date` text NOT NULL,
	`priority` text NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`estimated_minutes` integer NOT NULL,
	`status` text DEFAULT 'todo' NOT NULL,
	`completion_cycle` integer DEFAULT 0 NOT NULL,
	`deleted_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "task_minutes" CHECK("tasks"."estimated_minutes" >= 0),
	CONSTRAINT "task_status" CHECK("tasks"."status" in ('todo','done')),
	CONSTRAINT "task_priority" CHECK("tasks"."priority" in ('high','medium','low'))
);
--> statement-breakpoint
CREATE INDEX `tasks_plan_due` ON `tasks` (`plan_id`,`due_date`);--> statement-breakpoint
CREATE TABLE `timers` (
	`task_id` text PRIMARY KEY NOT NULL,
	`started_at` text NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action
);
