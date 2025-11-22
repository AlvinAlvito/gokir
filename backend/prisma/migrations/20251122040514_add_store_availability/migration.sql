-- CreateTable
CREATE TABLE `StoreAvailability` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'INACTIVE',
    `region` ENUM('KAMPUS_SUTOMO', 'KAMPUS_TUNTUNGAN', 'KAMPUS_PANCING', 'WILAYAH_LAINNYA') NOT NULL DEFAULT 'WILAYAH_LAINNYA',
    `locationUrl` VARCHAR(191) NULL,
    `latitude` DOUBLE NULL,
    `longitude` DOUBLE NULL,
    `note` VARCHAR(191) NULL,
    `openDays` VARCHAR(191) NULL,
    `openTime` VARCHAR(191) NULL,
    `closeTime` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `StoreAvailability_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `StoreAvailability` ADD CONSTRAINT `StoreAvailability_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
