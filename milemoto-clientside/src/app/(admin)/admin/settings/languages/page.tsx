'use client';

import { useState } from 'react';
import Image from 'next/image';

import { Edit, MoreHorizontal, Plus, Search, Trash } from 'lucide-react';

import { LanguageDialog } from '@/features/admin/settings/languages/language-dialog';
import { Skeleton } from '@/features/feedback/Skeleton';
import { PaginationControls } from '@/features/pagination/pagination-controls';
import { useDebounce } from '@/hooks/useDebounce';
import { useDeleteLanguage, useGetLanguages, type Language } from '@/hooks/useLanguageQueries';
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

export default function LanguagesPage() {
  // Pagination & Search State
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const limit = 10;

  // Fetch Data
  const { data, isLoading, isError, refetch } = useGetLanguages({
    search: debouncedSearch,
    page,
    limit,
  });
  const languages = data?.items || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / limit);

  const deleteMutation = useDeleteLanguage();

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLanguage, setEditingLanguage] = useState<Language | null>(null);

  // Delete Alert State
  const [languageToDelete, setLanguageToDelete] = useState<Language | null>(null);

  const handleOpenAdd = () => {
    setEditingLanguage(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (language: Language) => {
    setEditingLanguage(language);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (language: Language) => {
    setLanguageToDelete(language);
  };

  const confirmDelete = () => {
    if (languageToDelete) {
      deleteMutation.mutate(languageToDelete.id);
      setLanguageToDelete(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Languages</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Toolbar area */}
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="relative max-w-sm flex-1">
              <Search className="text-muted-foreground absolute left-2.5 top-2.5 h-4 w-4" />
              <Input
                placeholder="Search languages..."
                className="pl-9"
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <Button
              variant="solid"
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={handleOpenAdd}
            >
              Add Language
            </Button>
          </div>

          {/* Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Flag</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Display Mode</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={`skeleton-${i}`}>
                    <TableCell>
                      <Skeleton className="h-5 w-5 rounded-full" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-20" />
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
                    className="h-24 text-center text-red-500"
                  >
                    <TableStateMessage
                      variant="error"
                      message="Failed to load languages. Please try again."
                      onRetry={refetch}
                    />
                  </TableCell>
                </TableRow>
              ) : languages.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-muted-foreground h-24 text-center"
                  >
                    <TableStateMessage
                      variant="empty"
                      message="No languages found. Add one to get started."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                languages.map(lang => (
                  <TableRow key={lang.id}>
                    <TableCell>
                      {lang.countryCode ? (
                        <div className="h-5 w-5 overflow-hidden rounded-full border bg-neutral-100">
                          <Image
                            width={20}
                            height={20}
                            src={`https://flagcdn.com/${lang.countryCode.toLowerCase()}.svg`}
                            alt={lang.name}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      ) : (
                        <div className="h-5 w-5 rounded-full border bg-neutral-100" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{lang.name}</TableCell>
                    <TableCell>{lang.code}</TableCell>
                    <TableCell>{lang.displayMode}</TableCell>
                    <TableCell>
                      <StatusBadge variant={lang.status === 'active' ? 'success' : 'neutral'}>
                        {lang.status === 'active' ? 'Active' : 'Inactive'}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            aria-label="Open menu"
                            justify="center"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenEdit(lang)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteClick(lang)}
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

          {/* Reusable Pagination Component */}
          <div className="flex items-center justify-between pt-4">
            <div className="text-muted-foreground text-sm">
              Page {page} of {totalPages} (Total {totalCount} items)
            </div>

            <PaginationControls
              totalCount={totalCount}
              pageSize={limit}
              currentPage={page}
              onPageChange={setPage}
            />
          </div>
        </CardContent>
      </Card>

      <LanguageDialog
        key={editingLanguage?.id ?? 'new'}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        language={editingLanguage}
      />

      <AlertDialog
        open={!!languageToDelete}
        onOpenChange={open => !open && setLanguageToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Language?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete
              <span className="text-foreground font-semibold"> {languageToDelete?.name}</span>. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
