-- AlterTable
ALTER TABLE `customerorder` ADD COLUMN `dropoffLat` DOUBLE NULL,
    ADD COLUMN `dropoffLng` DOUBLE NULL,
    ADD COLUMN `dropoffMap` VARCHAR(191) NULL,
    ADD COLUMN `pickupLat` DOUBLE NULL,
    ADD COLUMN `pickupLng` DOUBLE NULL,
    ADD COLUMN `pickupMap` VARCHAR(191) NULL;
