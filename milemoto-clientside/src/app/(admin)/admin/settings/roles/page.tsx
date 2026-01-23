'use client';

import { useState } from 'react';
import Link from 'next/link';

import { Edit, MoreHorizontal, Plus, Search, Shield, Trash } from 'lucide-react';

import { Skeleton } from '@/features/feedback/Skeleton';
import { useDebounce } from '@/hooks/useDebounce';
import { Role, useDeleteRole, useGetRoles } from '@/hooks/useRbacQueries';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card';
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

export default function RolesPage() {
  const [page, setPage] = useState(1);
  const limit = 10;

  const deleteMutation = useDeleteRole();
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const {
    data: roles,
    isLoading,
    isError,
    refetch,
  } = useGetRoles({
    search: debouncedSearch,
    page,
    limit,
  });

  const handleDeleteClick = (role: Role) => {
    setRoleToDelete(role);
  };

  const confirmDelete = async () => {
    if (roleToDelete) {
      await deleteMutation.mutateAsync(roleToDelete.id);
      setRoleToDelete(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>System Roles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="relative max-w-sm flex-1">
              <Search className="text-muted-foreground absolute left-2.5 top-2.5 h-4 w-4" />
              <Input
                placeholder="Search roles..."
                className="pl-9"
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <Button
              href="/admin/settings/roles/new"
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Create Role
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>System</TableHead>
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
                      <Skeleton className="h-5 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-8 w-8" />
                    </TableCell>
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-8 text-center text-red-500"
                  >
                    <TableStateMessage
                      variant="error"
                      message="Failed to load roles."
                      onRetry={refetch}
                    />
                  </TableCell>
                </TableRow>
              ) : roles?.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-muted-foreground py-8 text-center"
                  >
                    <TableStateMessage
                      variant="empty"
                      message="No roles found."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                roles?.map(role => (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Shield className="text-muted-foreground h-4 w-4" />
                        {role.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{role.description}</TableCell>
                    <TableCell>{role.isSystem && <StatusBadge>System</StatusBadge>}</TableCell>
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
                            <Link href={`/admin/settings/roles/${role.id}`}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          {!role.isSystem && (
                            <DropdownMenuItem
                              onClick={() => handleDeleteClick(role)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          )}
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
        open={!!roleToDelete}
        onOpenChange={open => !open && setRoleToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the role &quot;{roleToDelete?.name}&quot;. Users assigned
              to this role may lose access.
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
