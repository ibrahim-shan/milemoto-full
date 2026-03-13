CREATE TABLE `coupons` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(100) NOT NULL,
  `type` enum('fixed','percentage') NOT NULL,
  `value` decimal(15,2) NOT NULL,
  `minSubtotal` decimal(15,2) NULL,
  `maxDiscount` decimal(15,2) NULL,
  `startsAt` datetime NULL,
  `endsAt` datetime NULL,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `usageLimit` int NULL,
  `perUserLimit` int NULL,
  `usedCount` int NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniqCouponsCode` (`code`),
  KEY `idxCouponsStatus` (`status`),
  KEY `idxCouponsStartsAt` (`startsAt`),
  KEY `idxCouponsEndsAt` (`endsAt`)
);

CREATE TABLE `couponredemptions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `couponId` bigint unsigned NOT NULL,
  `userId` bigint unsigned NOT NULL,
  `orderId` bigint unsigned NOT NULL,
  `discountAmount` decimal(15,2) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniqCouponRedemptionsCouponOrder` (`couponId`, `orderId`),
  KEY `idxCouponRedemptionsCouponUser` (`couponId`, `userId`),
  KEY `idxCouponRedemptionsOrder` (`orderId`),
  CONSTRAINT `fkCouponRedemptionsCoupon` FOREIGN KEY (`couponId`) REFERENCES `coupons` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `fkCouponRedemptionsUser` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `fkCouponRedemptionsOrder` FOREIGN KEY (`orderId`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
);
