ALTER TABLE `productreviews`
  ADD COLUMN `previousRating` tinyint unsigned NULL AFTER `rating`,
  ADD COLUMN `previousComment` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL AFTER `comment`,
  ADD COLUMN `editedAt` datetime NULL AFTER `moderationNote`;

