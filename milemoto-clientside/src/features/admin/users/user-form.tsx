'use client';

import { useMemo, useState } from 'react';

import { toast } from 'sonner';

import { useGetRoles } from '@/hooks/useRbacQueries';
import { useCreateUser, User, useUpdateUser } from '@/hooks/useUserQueries';
import { Button } from '@/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';
import { PhoneField } from '@/ui/phone-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select';

type UserFormProps = {
  initialData?: User | null;
  onSuccess?: () => void;
  onCancel?: () => void;
};

export function UserForm({ initialData, onSuccess, onCancel }: UserFormProps) {
  const isEdit = !!initialData;
  const isLockedUser = initialData?.roleName === 'Super Admin';
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();

  const { data: roles, isLoading: isLoadingRoles } = useGetRoles();

  const initialForm = useMemo(
    () => ({
      fullName: initialData?.fullName || '',
      email: initialData?.email || '',
      username: initialData?.username || '',
      phone: initialData?.phone || '',
      password: '',
      roleId:
        initialData?.roleId !== null && initialData?.roleId !== undefined
          ? String(initialData.roleId)
          : 'no_role',
      status: (initialData?.status as 'active' | 'inactive' | 'blocked' | undefined) || 'active',
    }),
    [initialData],
  );

  const [formData, setFormData] = useState(initialForm);
  const [phoneValid, setPhoneValid] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.phone && !phoneValid) {
      toast.error('Please enter a valid phone number for the selected country.');
      return;
    }

    type UserPayload = {
      fullName: string;
      email: string;
      username: string | null;
      phone: string | null;
      status: 'active' | 'inactive' | 'blocked';
      roleId: number | null;
      password?: string;
    };

    const payload: UserPayload = {
      fullName: formData.fullName,
      email: formData.email,
      username: formData.username || null,
      phone: formData.phone || null,
      status: formData.status,
      roleId: formData.roleId && formData.roleId !== 'no_role' ? Number(formData.roleId) : null, // Send null to clear role
    };

    if (formData.password) {
      payload.password = formData.password;
    }

    try {
      if (isEdit && initialData) {
        await updateMutation.mutateAsync({ id: initialData.id, data: payload });
      } else {
        await createMutation.mutateAsync(payload);
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
          <CardTitle>User Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name*</Label>
              <Input
                id="fullName"
                placeholder="John Doe"
                value={formData.fullName}
                onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address*</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <PhoneField
                id="phone"
                label="Phone Number"
                value={formData.phone}
                onChange={(nextValue, meta) => {
                  setFormData({ ...formData, phone: nextValue });
                  setPhoneValid(meta.isValid);
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username (Optional)</Label>
              <Input
                id="username"
                placeholder="jdoe"
                value={formData.username || ''}
                onChange={e => setFormData({ ...formData, username: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="password">{isEdit ? 'New Password (Optional)' : 'Password*'}</Label>
              <Input
                id="password"
                type="password"
                placeholder={isEdit ? 'Leave blank to keep current' : 'Enter password'}
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                required={!isEdit}
                minLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={formData.roleId || 'no_role'}
                onValueChange={val => setFormData({ ...formData, roleId: val })}
                disabled={isLoadingRoles || isLoading || isLockedUser}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no_role">No Role (Default User)</SelectItem>
                  {roles?.map(role => (
                    <SelectItem
                      key={role.id}
                      value={String(role.id)}
                    >
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="w-full space-y-2 md:w-1/2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(val: 'active' | 'inactive' | 'blocked') =>
                setFormData({ ...formData, status: val })
              }
              disabled={isLoading || isLockedUser}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
              disabled={isLoading}
            >
              {isEdit ? 'Update User' : 'Create User'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
