-- Add reviews.manage permission (idempotent)
INSERT INTO permissions (slug, description, resourceGroup)
VALUES ('reviews.manage', 'Manage reviews', 'Catalog')
ON DUPLICATE KEY UPDATE
  description = VALUES(description),
  resourceGroup = VALUES(resourceGroup);

-- Ensure Super Admin has reviews.manage
INSERT INTO rolepermissions (roleId, permissionId)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.slug = 'reviews.manage'
WHERE r.name = 'Super Admin'
ON DUPLICATE KEY UPDATE
  permissionId = VALUES(permissionId);

-- Ensure existing roles that can read reviews can also manage reviews
INSERT INTO rolepermissions (roleId, permissionId)
SELECT DISTINCT rp.roleId, p_manage.id
FROM rolepermissions rp
JOIN permissions p_read ON p_read.id = rp.permissionId AND p_read.slug = 'reviews.read'
JOIN permissions p_manage ON p_manage.slug = 'reviews.manage'
ON DUPLICATE KEY UPDATE
  permissionId = VALUES(permissionId);

