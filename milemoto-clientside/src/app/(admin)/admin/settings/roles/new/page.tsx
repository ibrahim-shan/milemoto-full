'use client';

import { useRouter } from 'next/navigation';

import { ArrowLeft } from 'lucide-react';

import { RoleForm } from '@/features/admin/rbac/role-form';
import { Button } from '@/ui/button';

export default function NewRolePage() {
  const router = useRouter();

  const handleBack = () => {
    router.push('/admin/settings/roles');
  };

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
          <h1 className="text-2xl font-bold tracking-tight">Create New Role</h1>
          <p className="text-muted-foreground">Define a new role and assign its permissions.</p>
        </div>
      </div>

      <RoleForm
        onSuccess={handleBack}
        onCancel={handleBack}
      />
    </div>
  );
}
