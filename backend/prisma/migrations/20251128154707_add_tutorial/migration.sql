-- CreateTable
CREATE TABLE `TutorialSupport` (
    `id` VARCHAR(191) NOT NULL,
    `role` ENUM('CUSTOMER', 'DRIVER', 'STORE', 'ADMIN', 'SUPERADMIN') NOT NULL,
    `whatsappLink` VARCHAR(191) NULL,
    `youtubeUrl` VARCHAR(191) NULL,
    `tips` VARCHAR(191) NULL,
    `warning` VARCHAR(191) NULL,
    `terms` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TutorialSupport_role_idx`(`role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
