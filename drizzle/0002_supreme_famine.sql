CREATE TABLE `cafeteriaReports` (
	`id` varchar(36) NOT NULL,
	`cafeteriaId` varchar(36) NOT NULL,
	`reportType` enum('daily','weekly','monthly') NOT NULL,
	`reportDate` timestamp NOT NULL,
	`totalSales` decimal(15,2) DEFAULT '0',
	`totalOrders` int DEFAULT 0,
	`totalItemsSold` int DEFAULT 0,
	`totalPointsDeducted` decimal(15,2) DEFAULT '0',
	`averageOrderValue` decimal(10,2) DEFAULT '0',
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cafeteriaReports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orderItems` (
	`id` varchar(36) NOT NULL,
	`orderId` varchar(36) NOT NULL,
	`menuItemId` varchar(36) NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`unitPrice` decimal(10,2) NOT NULL,
	`totalPrice` decimal(10,2) NOT NULL,
	`status` enum('pending','sent_to_kitchen','in_preparation','ready','served','cancelled') DEFAULT 'pending',
	`sentToKitchenAt` timestamp,
	`readyAt` timestamp,
	`servedAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `orderItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shiftSales` (
	`id` varchar(36) NOT NULL,
	`shiftId` varchar(36) NOT NULL,
	`orderId` varchar(36) NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`pointsDeducted` decimal(10,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `shiftSales_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shifts` (
	`id` varchar(36) NOT NULL,
	`cafeteriaId` varchar(36) NOT NULL,
	`staffId` varchar(36) NOT NULL,
	`startTime` timestamp NOT NULL,
	`endTime` timestamp,
	`status` enum('active','completed','cancelled') DEFAULT 'active',
	`totalSales` decimal(15,2) DEFAULT '0',
	`totalOrders` int DEFAULT 0,
	`totalItemsSold` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `shifts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `staffPerformance` (
	`id` varchar(36) NOT NULL,
	`staffId` varchar(36) NOT NULL,
	`cafeteriaId` varchar(36) NOT NULL,
	`reportDate` timestamp NOT NULL,
	`totalShifts` int DEFAULT 0,
	`totalSales` decimal(15,2) DEFAULT '0',
	`totalOrders` int DEFAULT 0,
	`averageOrderValue` decimal(10,2) DEFAULT '0',
	`totalItemsSold` int DEFAULT 0,
	`totalHoursWorked` decimal(8,2) DEFAULT '0',
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `staffPerformance_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_cafeteriaId` ON `cafeteriaReports` (`cafeteriaId`);--> statement-breakpoint
CREATE INDEX `idx_reportType` ON `cafeteriaReports` (`reportType`);--> statement-breakpoint
CREATE INDEX `idx_reportDate` ON `cafeteriaReports` (`reportDate`);--> statement-breakpoint
CREATE INDEX `idx_orderId` ON `orderItems` (`orderId`);--> statement-breakpoint
CREATE INDEX `idx_menuItemId` ON `orderItems` (`menuItemId`);--> statement-breakpoint
CREATE INDEX `idx_status` ON `orderItems` (`status`);--> statement-breakpoint
CREATE INDEX `idx_shiftId` ON `shiftSales` (`shiftId`);--> statement-breakpoint
CREATE INDEX `idx_orderId` ON `shiftSales` (`orderId`);--> statement-breakpoint
CREATE INDEX `idx_cafeteriaId` ON `shifts` (`cafeteriaId`);--> statement-breakpoint
CREATE INDEX `idx_staffId` ON `shifts` (`staffId`);--> statement-breakpoint
CREATE INDEX `idx_status` ON `shifts` (`status`);--> statement-breakpoint
CREATE INDEX `idx_startTime` ON `shifts` (`startTime`);--> statement-breakpoint
CREATE INDEX `idx_staffId` ON `staffPerformance` (`staffId`);--> statement-breakpoint
CREATE INDEX `idx_cafeteriaId` ON `staffPerformance` (`cafeteriaId`);--> statement-breakpoint
CREATE INDEX `idx_reportDate` ON `staffPerformance` (`reportDate`);