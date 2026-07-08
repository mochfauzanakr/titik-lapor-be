-- CreateTable
CREATE TABLE `kategori_laporan` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `nama_kategori` VARCHAR(255) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `laporan` (
    `id` VARCHAR(191) NOT NULL,
    `nomor_resi` VARCHAR(255) NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `kategori_id` BIGINT NOT NULL,
    `judul` VARCHAR(191) NOT NULL,
    `deskripsi` TEXT NULL,
    `lat` DOUBLE NOT NULL,
    `lng` DOUBLE NOT NULL,
    `alamat` TEXT NULL,
    `media_urls` JSON NOT NULL,
    `status` ENUM('pending', 'diproses', 'selesai', 'ditolak') NOT NULL DEFAULT 'pending',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `laporan_nomor_resi_key`(`nomor_resi`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tanggapan` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `petugas_id` VARCHAR(191) NOT NULL,
    `isi_tanggapan` TEXT NOT NULL,
    `media_urls` JSON NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `laporan_id` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `uuid` VARCHAR(191) NOT NULL,
    `username` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `p_number` VARCHAR(255) NOT NULL DEFAULT '',
    `role` ENUM('user', 'petugas', 'admin') NOT NULL DEFAULT 'user',
    `password` VARCHAR(255) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `users_email_key`(`email`),
    UNIQUE INDEX `users_p_number_key`(`p_number`),
    PRIMARY KEY (`uuid`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `comments` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `laporan_id` VARCHAR(191) NOT NULL,
    `tanggapan_id` BIGINT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `body` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `laporan` ADD CONSTRAINT `laporan_kategori_id_fkey` FOREIGN KEY (`kategori_id`) REFERENCES `kategori_laporan`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `laporan` ADD CONSTRAINT `laporan_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`uuid`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `tanggapan` ADD CONSTRAINT `tanggapan_laporan_id_fkey` FOREIGN KEY (`laporan_id`) REFERENCES `laporan`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tanggapan` ADD CONSTRAINT `tanggapan_petugas_id_fkey` FOREIGN KEY (`petugas_id`) REFERENCES `users`(`uuid`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `comments` ADD CONSTRAINT `comments_tanggapan_id_fkey` FOREIGN KEY (`tanggapan_id`) REFERENCES `tanggapan`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `comments` ADD CONSTRAINT `comments_laporan_id_fkey` FOREIGN KEY (`laporan_id`) REFERENCES `laporan`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `comments` ADD CONSTRAINT `comments_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`uuid`) ON DELETE CASCADE ON UPDATE CASCADE;
