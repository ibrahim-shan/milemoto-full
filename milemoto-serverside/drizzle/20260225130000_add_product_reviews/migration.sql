CREATE TABLE `productreviews` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `productId` bigint unsigned NOT NULL,
  `userId` bigint unsigned NOT NULL,
  `rating` tinyint unsigned NOT NULL,
  `comment` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('pending','approved','rejected','deleted_by_user') NOT NULL DEFAULT 'pending',
  `approvedAt` datetime NULL,
  `approvedByUserId` bigint unsigned NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniqProductReviewsUserProduct` (`userId`,`productId`),
  KEY `idxProductReviewsProductStatus` (`productId`,`status`),
  KEY `idxProductReviewsStatusCreatedAt` (`status`,`createdAt`),
  CONSTRAINT `fkProductReviewsProduct`
    FOREIGN KEY (`productId`) REFERENCES `products` (`id`)
    ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `fkProductReviewsUser`
    FOREIGN KEY (`userId`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `fkProductReviewsApprovedBy`
    FOREIGN KEY (`approvedByUserId`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

