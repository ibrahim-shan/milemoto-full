'use client';

import { useRouter } from 'next/navigation';

import { ArrowLeft } from 'lucide-react';

import { UserForm } from '@/features/admin/users/user-form';
import { Button } from '@/ui/button';

export default function NewUserPage() {
  const router = useRouter();

  const handleBack = () => {
    router.push('/admin/settings/users');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          justify="center"
          size="icon"
          onClick={handleBack}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create New User</h1>
          <p className="text-muted-foreground">Add a new user and assign a role.</p>
        </div>
      </div>

      <UserForm
        onSuccess={handleBack}
        onCancel={handleBack}
      />
    </div>
  );
}
