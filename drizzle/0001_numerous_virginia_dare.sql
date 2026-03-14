CREATE TABLE `cafeteriaMarketerRelationships` (
	`id` varchar(36) NOT NULL,
	`cafeteriaId` varchar(36) NOT NULL,
	`marketerId` varchar(36) NOT NULL,
	`commissionStartDate` timestamp NOT NULL DEFAULT (now()),
	`commissionExpiryDate` timestamp NOT NULL,
	`isExpired` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cafeteriaMarketerRelationships_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cafeteriaStaff` (
	`id` varchar(36) NOT NULL,
	`cafeteriaId` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`role` varchar(50),
	`status` varchar(50) DEFAULT 'active',
	`canLogin` boolean DEFAULT false,
	`loginPermissionGrantedAt` timestamp,
	`loginPermissionGrantedBy` varchar(36),
	`lastLoginAt` timestamp,
	`country` varchar(2),
	`currency` varchar(3),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cafeteriaStaff_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cafeteriaTables` (
	`id` varchar(36) NOT NULL,
	`cafeteriaId` varchar(36) NOT NULL,
	`sectionId` varchar(36),
	`tableNumber` int NOT NULL,
	`capacity` int,
	`status` varchar(50) DEFAULT 'available',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cafeteriaTables_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cafeterias` (
	`id` varchar(36) NOT NULL,
	`marketerId` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`location` varchar(255),
	`pointsBalance` decimal(10,2) DEFAULT '0',
	`graceMode` boolean DEFAULT false,
	`referenceCode` varchar(50),
	`country` varchar(2),
	`currency` varchar(3),
	`currencyOverrideBy` varchar(36),
	`freeOperationEndDate` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cafeterias_id` PRIMARY KEY(`id`),
	CONSTRAINT `cafeterias_referenceCode_unique` UNIQUE(`referenceCode`)
);
--> statement-breakpoint
CREATE TABLE `commissionConfigs` (
	`id` varchar(36) NOT NULL,
	`marketerId` varchar(36) NOT NULL,
	`rate` decimal(5,2) DEFAULT '0',
	`expiryOverrideMonths` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `commissionConfigs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `commissionDistributions` (
	`id` varchar(36) NOT NULL,
	`rechargeRequestId` varchar(36) NOT NULL,
	`marketerId` varchar(36) NOT NULL,
	`level` int NOT NULL,
	`commissionAmount` decimal(15,2) NOT NULL,
	`status` enum('pending','available','withdrawn') DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `commissionDistributions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `freeOperationPeriods` (
	`id` varchar(36) NOT NULL,
	`cafeteriaId` varchar(36) NOT NULL,
	`periodType` enum('global_first_time','special_grant') NOT NULL,
	`startDate` timestamp NOT NULL,
	`endDate` timestamp NOT NULL,
	`reason` text,
	`createdBy` varchar(36),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `freeOperationPeriods_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ledgerEntries` (
	`id` varchar(36) NOT NULL,
	`type` varchar(50) NOT NULL,
	`ledgerType` enum('points_deduction','points_credit','commission_pending','commission_available','commission_withdrawn','recharge_approval'),
	`description` text,
	`cafeteriaId` varchar(36),
	`marketerId` varchar(36),
	`amount` decimal(10,2),
	`refId` varchar(36),
	`relatedMarketerIds` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ledgerEntries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `marketerBalances` (
	`id` varchar(36) NOT NULL,
	`marketerId` varchar(36) NOT NULL,
	`pendingBalance` decimal(15,2) DEFAULT '0',
	`availableBalance` decimal(15,2) DEFAULT '0',
	`totalWithdrawn` decimal(15,2) DEFAULT '0',
	`lastUpdated` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `marketerBalances_id` PRIMARY KEY(`id`),
	CONSTRAINT `marketerBalances_marketerId_unique` UNIQUE(`marketerId`)
);
--> statement-breakpoint
CREATE TABLE `marketers` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(320),
	`parentId` varchar(36),
	`isRoot` boolean DEFAULT false,
	`referenceCode` varchar(50),
	`country` varchar(2),
	`currency` varchar(3),
	`currencyOverrideBy` varchar(36),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `marketers_id` PRIMARY KEY(`id`),
	CONSTRAINT `marketers_referenceCode_unique` UNIQUE(`referenceCode`)
);
--> statement-breakpoint
CREATE TABLE `menuCategories` (
	`id` varchar(36) NOT NULL,
	`cafeteriaId` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`displayOrder` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `menuCategories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `menuItems` (
	`id` varchar(36) NOT NULL,
	`categoryId` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`price` decimal(10,2),
	`available` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `menuItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` varchar(36) NOT NULL,
	`cafeteriaId` varchar(36) NOT NULL,
	`tableId` varchar(36),
	`waiterId` varchar(36),
	`totalAmount` decimal(10,2),
	`status` varchar(50) DEFAULT 'open',
	`pointsConsumed` decimal(10,2) DEFAULT '0',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`closedAt` timestamp,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rechargeRequests` (
	`id` varchar(36) NOT NULL,
	`cafeteriaId` varchar(36) NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`imageUrl` text,
	`status` enum('pending','approved','rejected') DEFAULT 'pending',
	`processedAt` timestamp,
	`processedBy` varchar(255),
	`notes` text,
	`commissionCalculated` boolean DEFAULT false,
	`commissionDistributionId` varchar(36),
	`pointsAddedToBalance` decimal(10,2) DEFAULT '0',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `rechargeRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sections` (
	`id` varchar(36) NOT NULL,
	`cafeteriaId` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`displayOrder` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `staffCategoryAssignments` (
	`id` varchar(36) NOT NULL,
	`staffId` varchar(36) NOT NULL,
	`categoryId` varchar(36) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `staffCategoryAssignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `staffSectionAssignments` (
	`id` varchar(36) NOT NULL,
	`staffId` varchar(36) NOT NULL,
	`sectionId` varchar(36) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `staffSectionAssignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `systemConfigs` (
	`id` varchar(36) NOT NULL,
	`key` varchar(255) NOT NULL,
	`value` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `systemConfigs_id` PRIMARY KEY(`id`),
	CONSTRAINT `systemConfigs_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE INDEX `idx_cafeteriaId` ON `cafeteriaMarketerRelationships` (`cafeteriaId`);--> statement-breakpoint
CREATE INDEX `idx_marketerId` ON `cafeteriaMarketerRelationships` (`marketerId`);--> statement-breakpoint
CREATE INDEX `idx_expiryDate` ON `cafeteriaMarketerRelationships` (`commissionExpiryDate`);--> statement-breakpoint
CREATE INDEX `unique_cafeteria_marketer` ON `cafeteriaMarketerRelationships` (`cafeteriaId`,`marketerId`);--> statement-breakpoint
CREATE INDEX `idx_cafeteriaId` ON `cafeteriaStaff` (`cafeteriaId`);--> statement-breakpoint
CREATE INDEX `idx_canLogin` ON `cafeteriaStaff` (`canLogin`);--> statement-breakpoint
CREATE INDEX `idx_cafeteriaId` ON `cafeteriaTables` (`cafeteriaId`);--> statement-breakpoint
CREATE INDEX `idx_sectionId` ON `cafeteriaTables` (`sectionId`);--> statement-breakpoint
CREATE INDEX `idx_marketerId` ON `cafeterias` (`marketerId`);--> statement-breakpoint
CREATE INDEX `idx_referenceCode` ON `cafeterias` (`referenceCode`);--> statement-breakpoint
CREATE INDEX `idx_createdAt` ON `cafeterias` (`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_marketerId` ON `commissionConfigs` (`marketerId`);--> statement-breakpoint
CREATE INDEX `idx_rechargeRequestId` ON `commissionDistributions` (`rechargeRequestId`);--> statement-breakpoint
CREATE INDEX `idx_marketerId` ON `commissionDistributions` (`marketerId`);--> statement-breakpoint
CREATE INDEX `idx_status` ON `commissionDistributions` (`status`);--> statement-breakpoint
CREATE INDEX `idx_cafeteriaId` ON `freeOperationPeriods` (`cafeteriaId`);--> statement-breakpoint
CREATE INDEX `idx_endDate` ON `freeOperationPeriods` (`endDate`);--> statement-breakpoint
CREATE INDEX `idx_type` ON `ledgerEntries` (`type`);--> statement-breakpoint
CREATE INDEX `idx_cafeteriaId` ON `ledgerEntries` (`cafeteriaId`);--> statement-breakpoint
CREATE INDEX `idx_marketerId` ON `ledgerEntries` (`marketerId`);--> statement-breakpoint
CREATE INDEX `idx_createdAt` ON `ledgerEntries` (`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_marketerId` ON `marketerBalances` (`marketerId`);--> statement-breakpoint
CREATE INDEX `idx_parentId` ON `marketers` (`parentId`);--> statement-breakpoint
CREATE INDEX `idx_referenceCode` ON `marketers` (`referenceCode`);--> statement-breakpoint
CREATE INDEX `idx_createdAt` ON `marketers` (`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_cafeteriaId` ON `menuCategories` (`cafeteriaId`);--> statement-breakpoint
CREATE INDEX `idx_categoryId` ON `menuItems` (`categoryId`);--> statement-breakpoint
CREATE INDEX `idx_cafeteriaId` ON `orders` (`cafeteriaId`);--> statement-breakpoint
CREATE INDEX `idx_status` ON `orders` (`status`);--> statement-breakpoint
CREATE INDEX `idx_createdAt` ON `orders` (`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_closedAt` ON `orders` (`closedAt`);--> statement-breakpoint
CREATE INDEX `idx_cafeteriaId` ON `rechargeRequests` (`cafeteriaId`);--> statement-breakpoint
CREATE INDEX `idx_status` ON `rechargeRequests` (`status`);--> statement-breakpoint
CREATE INDEX `idx_createdAt` ON `rechargeRequests` (`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_cafeteriaId` ON `sections` (`cafeteriaId`);--> statement-breakpoint
CREATE INDEX `idx_staffId` ON `staffCategoryAssignments` (`staffId`);--> statement-breakpoint
CREATE INDEX `idx_categoryId` ON `staffCategoryAssignments` (`categoryId`);--> statement-breakpoint
CREATE INDEX `unique_staff_category` ON `staffCategoryAssignments` (`staffId`,`categoryId`);--> statement-breakpoint
CREATE INDEX `idx_staffId` ON `staffSectionAssignments` (`staffId`);--> statement-breakpoint
CREATE INDEX `idx_sectionId` ON `staffSectionAssignments` (`sectionId`);--> statement-breakpoint
CREATE INDEX `unique_staff_section` ON `staffSectionAssignments` (`staffId`,`sectionId`);--> statement-breakpoint
CREATE INDEX `idx_key` ON `systemConfigs` (`key`);--> statement-breakpoint
CREATE INDEX `idx_openId` ON `users` (`openId`);--> statement-breakpoint
CREATE INDEX `idx_role` ON `users` (`role`);--> statement-breakpoint
CREATE INDEX `idx_createdAt` ON `users` (`createdAt`);