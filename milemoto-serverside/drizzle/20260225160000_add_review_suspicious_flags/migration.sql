ALTER TABLE `productreviews`
  ADD COLUMN `isSuspicious` tinyint(1) NOT NULL DEFAULT 0 AFTER `moderationNote`,
  ADD COLUMN `suspiciousScore` int NOT NULL DEFAULT 0 AFTER `isSuspicious`,
  ADD COLUMN `suspiciousReasonsJson` text NULL AFTER `suspiciousScore`,
  ADD COLUMN `suspiciousFlaggedAt` datetime NULL AFTER `suspiciousReasonsJson`;

CREATE INDEX `idxProductReviewsSuspiciousStatusCreatedAt`
  ON `productreviews` (`isSuspicious`, `status`, `createdAt`);
