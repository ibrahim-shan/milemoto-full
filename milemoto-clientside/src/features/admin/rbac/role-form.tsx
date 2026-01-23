'use client';

import { useMemo, useState } from 'react';

import { Skeleton } from '@/features/feedback/Skeleton';
import { Role, useCreateRole, useGetPermissions, useUpdateRole } from '@/hooks/useRbacQueries';
import { Button } from '@/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card';
import { Checkbox } from '@/ui/checkbox';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/table';
import { Textarea } from '@/ui/textarea';

type RoleFormProps = {
  initialData?: Role | null;
  onSuccess?: () => void;
  onCancel?: () => void;
};

export function RoleForm({ initialData, onSuccess, onCancel }: RoleFormProps) {
  const isEdit = !!initialData;
  const isLockedRole = !!initialData?.isSystem || initialData?.name === 'Super Admin';
  const createMutation = useCreateRole();
  const updateMutation = useUpdateRole();

  const { data: permissions, isLoading: isLoadingPerms } = useGetPermissions();

  const initialForm = useMemo(
    () => ({
      name: initialData?.name ?? '',
      description: initialData?.description ?? '',
      permissionIds: initialData?.permissions?.map(p => p.id) ?? [],
    }),
    [initialData],
  );

  const [formData, setFormData] = useState(initialForm);

  // Build permission rows grouped by resourceGroup + baseSlug (so we don't lose entries
  // when multiple resources share the same resourceGroup).
  const permissionRows = useMemo(() => {
    if (!permissions) return [];

    const rowsByKey = new Map<
      string,
      {
        group: string;
        baseSlug: string;
        label: string;
        read?: (typeof permissions)[0];
        manage?: (typeof permissions)[0];
      }
    >();

    const toLabel = (baseSlug: string) =>
      baseSlug.replace(/[_\.]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    permissions.forEach(p => {
      const group = p.resourceGroup || 'Other';
      const baseSlug = p.slug.endsWith('.read')
        ? p.slug.slice(0, -'.read'.length)
        : p.slug.endsWith('.manage')
          ? p.slug.slice(0, -'.manage'.length)
          : p.slug;

      const key = `${group}::${baseSlug}`;
      const row = rowsByKey.get(key) ?? {
        group,
        baseSlug,
        label: toLabel(baseSlug),
      };

      if (p.slug.endsWith('.read')) row.read = p;
      else if (p.slug.endsWith('.manage')) row.manage = p;

      rowsByKey.set(key, row);
    });

    return Array.from(rowsByKey.values()).sort((a, b) => {
      const g = a.group.localeCompare(b.group);
      if (g !== 0) return g;
      return a.label.localeCompare(b.label);
    });
  }, [permissions]);

  const togglePermission = (id: number) => {
    setFormData(prev => {
      let newIds = [...prev.permissionIds];
      const isAdding = !newIds.includes(id);

      if (isAdding) {
        newIds.push(id);

        // Logic: checking Manage ?? check Read
        // Find if this permission is a 'manage' one
        const perm = permissions?.find(p => p.id === id);
        if (perm && perm.slug.endsWith('.manage')) {
          // Find corresponding read
          const baseSlug = perm.slug.replace('.manage', '');
          const readPerm = permissions?.find(p => p.slug === `${baseSlug}.read`);
          if (readPerm && !newIds.includes(readPerm.id)) {
            newIds.push(readPerm.id);
          }
        }
      } else {
        newIds = newIds.filter(pid => pid !== id);

        // Logic: unchecking Read ?? uncheck Manage
        const perm = permissions?.find(p => p.id === id);
        if (perm && perm.slug.endsWith('.read')) {
          const baseSlug = perm.slug.replace('.read', '');
          const managePerm = permissions?.find(p => p.slug === `${baseSlug}.manage`);
          if (managePerm) {
            newIds = newIds.filter(pid => pid !== managePerm.id);
          }
        }
      }
      return { ...prev, permissionIds: newIds };
    });
  };

  const toggleRow = (readId?: number, manageId?: number) => {
    setFormData(prev => {
      let newIds = [...prev.permissionIds];
      const readSelected = readId ? newIds.includes(readId) : false;
      const manageSelected = manageId ? newIds.includes(manageId) : false;

      const allSelected = (readId ? readSelected : true) && (manageId ? manageSelected : true);

      if (allSelected) {
        // Deselect both
        if (readId) newIds = newIds.filter(id => id !== readId);
        if (manageId) newIds = newIds.filter(id => id !== manageId);
      } else {
        // Select both
        if (readId && !newIds.includes(readId)) newIds.push(readId);
        if (manageId && !newIds.includes(manageId)) newIds.push(manageId);
      }
      return { ...prev, permissionIds: newIds };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEdit && initialData) {
        await updateMutation.mutateAsync({ id: initialData.id, data: formData });
      } else {
        await createMutation.mutateAsync(formData);
      }
      onSuccess?.();
    } catch {
      // handled by hook
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      <Card>
        <CardHeader>
          <CardTitle>Role Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Role Name*</Label>
              <Input
                id="name"
                placeholder="e.g. Sales Manager"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                required
                disabled={isLockedRole || isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Role description..."
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                rows={1}
                disabled={isLockedRole || isLoading}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Permissions Matrix</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingPerms ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">Page / Resource</TableHead>
                    <TableHead className="w-[100px] text-center">View</TableHead>
                    <TableHead className="w-[100px] text-center">Manage</TableHead>
                    <TableHead className="w-[100px] text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {permissionRows.map(row => {
                    const readChecked = row.read
                      ? formData.permissionIds.includes(row.read.id)
                      : false;
                    const manageChecked = row.manage
                      ? formData.permissionIds.includes(row.manage.id)
                      : false;
                    const allChecked =
                      (row.read ? readChecked : true) && (row.manage ? manageChecked : true);

                    return (
                      <TableRow key={`${row.group}:${row.baseSlug}`}>
                        <TableCell className="font-medium">
                          {row.group} / {row.label}
                        </TableCell>
                        <TableCell className="text-center">
                          {row.read && (
                            <div className="flex justify-center">
                              <Checkbox
                                checked={readChecked}
                                onCheckedChange={() => {
                                  if (isLockedRole || isLoading) return;
                                  togglePermission(row.read!.id);
                                }}
                                disabled={isLockedRole || isLoading}
                              />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {row.manage && (
                            <div className="flex justify-center">
                              <Checkbox
                                checked={manageChecked}
                                onCheckedChange={() => {
                                  if (isLockedRole || isLoading) return;
                                  togglePermission(row.manage!.id);
                                }}
                                disabled={isLockedRole || isLoading}
                              />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleRow(row.read?.id, row.manage?.id)}
                            disabled={isLockedRole || isLoading}
                          >
                            {allChecked ? 'Unselect All' : 'Select All'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="solid"
              isLoading={isLoading}
              disabled={isLoading || (isEdit && isLockedRole)}
            >
              {isEdit ? 'Update Role' : 'Create Role'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
