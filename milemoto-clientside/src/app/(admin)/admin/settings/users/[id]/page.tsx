'use client';

import { useParams, useRouter } from 'next/navigation';

import { ArrowLeft } from 'lucide-react';

import { UserForm } from '@/features/admin/users/user-form';
import { Skeleton } from '@/features/feedback/Skeleton';
import { useGetUser } from '@/hooks/useUserQueries';
import { Button } from '@/ui/button';

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);

  const { data: user, isLoading, isError } = useGetUser(id);

  const handleBack = () => {
    router.push('/admin/settings/users');
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
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (isError || !user) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 p-10">
        <h2 className="text-xl font-semibold text-red-500">User Not Found</h2>
        <Button onClick={handleBack}>Back to Users</Button>
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
          <h1 className="text-2xl font-bold tracking-tight">Edit User: {user.fullName}</h1>
          <p className="text-muted-foreground">Manage user details and role.</p>
        </div>
      </div>

      <UserForm
        key={user.id}
        initialData={user}
        onSuccess={handleBack}
        onCancel={handleBack}
      />
    </div>
  );
}
