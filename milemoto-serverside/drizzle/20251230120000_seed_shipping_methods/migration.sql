INSERT INTO shippingmethods (code, name, status, cost, updatedAt)
VALUES
  ('productWise', 'Product Wise', 'inactive', NULL, CURRENT_TIMESTAMP),
  ('flatRate', 'Flat Rate', 'inactive', NULL, CURRENT_TIMESTAMP),
  ('areaWise', 'Area Wise', 'inactive', NULL, CURRENT_TIMESTAMP)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  status = VALUES(status),
  cost = VALUES(cost),
  updatedAt = VALUES(updatedAt);
