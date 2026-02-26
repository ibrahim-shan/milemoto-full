CREATE TABLE `wishlistitems` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `userId` bigint unsigned NOT NULL,
  `productId` bigint unsigned NOT NULL,
  `addedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniqWishlistUserProduct` (`userId`,`productId`),
  KEY `idxWishlistUser` (`userId`),
  KEY `idxWishlistProduct` (`productId`),
  CONSTRAINT `fkWishlistItemsUser` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `fkWishlistItemsProduct` FOREIGN KEY (`productId`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
);

