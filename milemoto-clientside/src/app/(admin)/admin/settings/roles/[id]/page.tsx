'use client';

import { useParams, useRouter } from 'next/navigation';

import { ArrowLeft } from 'lucide-react';

import { RoleForm } from '@/features/admin/rbac/role-form';
import { Skeleton } from '@/features/feedback/Skeleton';
import { useGetRole } from '@/hooks/useRbacQueries';
import { Button } from '@/ui/button';

export default function EditRolePage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);

  const { data: role, isLoading, isError } = useGetRole(id);

  const handleBack = () => {
    router.push('/admin/settings/roles');
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  if (isError || !role) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 p-10">
        <h2 className="text-xl font-semibold text-red-500">Role Not Found</h2>
        <Button onClick={handleBack}>Back to Roles</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          justify="center"
          onClick={handleBack}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit Role: {role.name}</h1>
          <p className="text-muted-foreground">Manage permissions for this role.</p>
        </div>
      </div>

      <RoleForm
        key={role.id}
        initialData={role}
        onSuccess={handleBack}
        onCancel={handleBack}
      />
    </div>
  );
}
