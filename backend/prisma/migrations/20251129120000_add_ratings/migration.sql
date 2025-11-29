-- Add ratings table
CREATE TABLE `OrderRating` (
  `id` varchar(191) NOT NULL,
  `orderId` varchar(191) NOT NULL,
  `customerId` varchar(191) NOT NULL,
  `driverId` varchar(191) NULL,
  `storeId` varchar(191) NULL,
  `driverRating` int NULL,
  `storeRating` int NULL,
  `comment` text NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `OrderRating_orderId_key`(`orderId`),
  INDEX `OrderRating_driverId_idx`(`driverId`),
  INDEX `OrderRating_storeId_idx`(`storeId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `OrderRating`
ADD CONSTRAINT `OrderRating_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `CustomerOrder`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT `OrderRating_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT `OrderRating_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT `OrderRating_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
