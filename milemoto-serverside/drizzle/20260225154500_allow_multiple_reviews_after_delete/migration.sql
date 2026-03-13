ALTER TABLE `productreviews`
  DROP INDEX `uniqProductReviewsUserProduct`,
  ADD INDEX `idxProductReviewsUserProduct` (`userId`, `productId`);

