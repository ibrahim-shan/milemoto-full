'use client';

import { useState } from 'react';
import Link from 'next/link';

import { Edit, MoreHorizontal, Plus, Search, Shield, Trash, User as UserIcon } from 'lucide-react';

import { Skeleton } from '@/features/feedback/Skeleton';
import { useDebounce } from '@/hooks/useDebounce';
import { useDeleteUser, useGetUsers, User } from '@/hooks/useUserQueries';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/ui/alert-dialog';
import { Button } from '@/ui/button';
import { Card, CardContent } from '@/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/ui/dropdown-menu';
import { Input } from '@/ui/input';
import { StatusBadge } from '@/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/table';
import { TableStateMessage } from '@/ui/table-state-message';

export default function UsersPage() {
  const [page, setPage] = useState(1);
  const limit = 10;

  const deleteMutation = useDeleteUser();
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const {
    data: users,
    isLoading,
    isError,
    refetch,
  } = useGetUsers({
    search: debouncedSearch,
    page,
    limit,
  });

  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
  };

  const confirmDelete = async () => {
    if (userToDelete) {
      await deleteMutation.mutateAsync(userToDelete.id);
      setUserToDelete(null);
    }
  };

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users Management</h1>
          <p className="text-muted-foreground">Manage user accounts and role assignments.</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="relative max-w-sm flex-1">
              <Search className="text-muted-foreground absolute left-2.5 top-2.5 h-4 w-4" />
              <Input
                placeholder="Search users..."
                className="pl-9"
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <Button
              href="/admin/settings/users/new"
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Add User
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-5 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-48" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-8 w-8" />
                    </TableCell>
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-8 text-center text-red-500"
                  >
                    <TableStateMessage
                      variant="error"
                      message="Failed to load users."
                      onRetry={refetch}
                    />
                  </TableCell>
                </TableRow>
              ) : users?.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-muted-foreground py-8 text-center"
                  >
                    <TableStateMessage
                      variant="empty"
                      message="No users found."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                users?.map(user => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="bg-secondary flex h-8 w-8 items-center justify-center rounded-full">
                          <UserIcon className="text-secondary-foreground h-4 w-4" />
                        </div>
                        {user.fullName}
                      </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {user.roleName ? (
                        <div className="flex items-center gap-1.5">
                          <Shield className="text-primary h-3.5 w-3.5" />
                          <span className="text-sm font-medium">{user.roleName}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">No Role</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge variant={user.status === 'active' ? 'success' : 'neutral'}>
                        {user.status}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            justify="center"
                            className="h-8 w-8"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/settings/users/${user.id}`}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteClick(user)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog
        open={!!userToDelete}
        onOpenChange={open => !open && setUserToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the user &quot;{userToDelete?.fullName}&quot; (
              {userToDelete?.email}). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
