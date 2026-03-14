-- Add tableToken to cafeteriaTables
ALTER TABLE `cafeteriaTables` ADD COLUMN `tableToken` varchar(64) UNIQUE;
CREATE INDEX `idx_tableToken` ON `cafeteriaTables` (`tableToken`);

-- Add source field to orders
ALTER TABLE `orders` ADD COLUMN `source` varchar(50) DEFAULT 'staff';
CREATE INDEX `idx_source` ON `orders` (`source`);

-- Add permissions field to cafeteriaStaff
ALTER TABLE `cafeteriaStaff` ADD COLUMN `permissions` json;
