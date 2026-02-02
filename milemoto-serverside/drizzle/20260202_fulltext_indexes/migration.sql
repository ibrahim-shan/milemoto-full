-- FULLTEXT indexes for product search
-- These indexes enable efficient natural language text search using MATCH() AGAINST()

CREATE FULLTEXT INDEX `ftProductName` ON `products` (`name`);
CREATE FULLTEXT INDEX `ftVariantNameSku` ON `productvariants` (`name`, `sku`);
