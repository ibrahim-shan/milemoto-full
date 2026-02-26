ALTER TABLE `products`
  ADD COLUMN `isFeatured` tinyint(1) NOT NULL DEFAULT 0 AFTER `status`;

