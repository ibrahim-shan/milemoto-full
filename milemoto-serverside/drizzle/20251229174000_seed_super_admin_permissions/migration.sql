-- Seed role-permissions for Super Admin
INSERT INTO rolepermissions (roleId, permissionId)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Super Admin'
ON DUPLICATE KEY UPDATE
  permissionId = VALUES(permissionId);
