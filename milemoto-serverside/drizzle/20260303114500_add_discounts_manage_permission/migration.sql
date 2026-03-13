INSERT INTO permissions (slug, description, resourceGroup)
VALUES ('discounts.manage', 'Manage discounts', 'Marketing')
ON DUPLICATE KEY UPDATE
  description = VALUES(description),
  resourceGroup = VALUES(resourceGroup);

INSERT INTO rolepermissions (roleId, permissionId)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.slug = 'discounts.manage'
WHERE r.name = 'Super Admin'
ON DUPLICATE KEY UPDATE
  permissionId = VALUES(permissionId);

INSERT INTO rolepermissions (roleId, permissionId)
SELECT DISTINCT rp.roleId, p_manage.id
FROM rolepermissions rp
JOIN permissions p_read ON p_read.id = rp.permissionId AND p_read.slug = 'discounts.read'
JOIN permissions p_manage ON p_manage.slug = 'discounts.manage'
ON DUPLICATE KEY UPDATE
  permissionId = VALUES(permissionId);
