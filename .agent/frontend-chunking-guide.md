# Frontend Chunking Guide (General)

This guide explains how to split large UI files into smaller, reusable parts without changing UI/UX or behavior. Use it whenever you refactor a page, dialog, or table.

## Goals

- Keep UI/UX and functionality identical.
- Reduce file size and cognitive load.
- Promote reuse (menus, dialogs, form sections).
- Keep logic and UI responsibilities clear.

## Target Structure (per feature)

Use a predictable layout inside the feature folder:

- `components/` for presentational sections (mostly props, minimal logic).
- `hooks/` for state + data orchestration (form state, derived totals, search state).
- `constants.ts` for labels, options, limits, static lists.
- `types.ts` for local types used across feature files.
- `utils.ts` for pure helpers (formatting, mappers).

## Naming Conventions

- Components: `PascalCase` export names, kebab-case filenames (example: `purchase-order-summary.tsx` exports `PurchaseOrderSummary`).
- Hooks: `useXxx` in camelCase filenames (example: `usePurchaseOrderForm.ts`).
- Constants: `UPPER_SNAKE_CASE` for exported constants in `constants.ts`.
- Types: `PascalCase` types in `types.ts` (example: `PurchaseOrderLineDraft`).

## Import Strategy

- Prefer direct imports for clarity; avoid barrels unless the folder has many exports.
- If you add a barrel (`index.ts`), keep it minimal and only for stable APIs.
- Avoid re-exporting deep internals.

## Step-by-Step Chunking Workflow

1. Identify sections
   - Mark visual/functional blocks (header, filters, table, summary, notes).
2. Extract constants
   - Move titles, select options, limits, and static labels to `constants.ts`.
3. Extract pure helpers
   - Move computed logic (totals, formatting) into `utils.ts` if reused or complex.
4. Create a feature hook
   - Use `useFeatureForm` or `useFeatureState` to own state and derived values.
   - Keep side-effects minimal; do not set state inside effects unless required.
5. Create section components
   - Move each block into its own component inside `components/`.
   - Keep markup and class names the same to preserve UI.
6. Reassemble in the parent
   - The parent component should read cleanly: layout + composition only.
7. Verify behavior
   - Check that data flows and handlers are unchanged.
   - Ensure all fields remain controlled and validated as before.

## Rules While Chunking

- Do not change UI/UX (no layout changes, no new labels).
- Do not change behavior (same submit conditions, same validations).
- Avoid over-splitting tiny blocks that add more indirection.
- Keep props explicit and typed; avoid passing large objects when not needed.

## When to Extract a Hook

Use a hook when:

- There is repeated state logic (filters, search, form fields).
- Derived values are calculated from multiple fields.
- Multiple queries or mutations coordinate in one place.
- The UI component would be too large without it.

## Verification Steps (Quick)

- Open/close dialogs and confirm no flicker or animation regressions.
- Validate required fields and submit behavior is unchanged.
- Check empty/error table states render the same.
- Confirm actions (edit/approve/cancel/delete) still call the same handlers.

## Shared UI Patterns to Reuse

### Dialog Open/Close (Avoid Flicker + Preserve Close Animation)

When opening edit dialogs that depend on async data:

- Keep the dialog mounted and control visibility via the `open` prop.
- Delay opening until required data is ready to avoid content flicker.
- Avoid clearing the edit id on close if it prevents the exit animation.

Recommended pattern:

```tsx
const { data: editingItem } = useGetItem(editingId);
const isDialogReady = !editingId || !!editingItem;
const dialogOpen = isDialogOpen && isDialogReady;

<MyDialog
  open={dialogOpen}
  onOpenChange={setIsDialogOpen}
  item={editingId ? (editingItem ?? null) : null}
/>;
```

### Table Actions Menu

Use `TableActionsMenu` for consistent row actions across tables:

- File: `milemoto-clientside/src/ui/table-actions-menu.tsx`
- Items shape:
  - `label` (string)
  - `icon` (ReactNode)
  - `href` OR `onClick` (one of them)
  - `destructive` (optional)
  - `disabled` (optional)

Example:

```tsx
<TableActionsMenu
  items={[
    {
      label: "View",
      icon: <Eye className="mr-2 h-4 w-4" />,
      href: `/admin/items/${id}`,
    },
    {
      label: "Edit",
      icon: <Edit className="mr-2 h-4 w-4" />,
      onClick: () => onEdit(row),
    },
    {
      label: "Delete",
      icon: <Trash2 className="mr-2 h-4 w-4" />,
      onClick: onDelete,
      destructive: true,
    },
  ]}
/>
```

### Confirm Dialog

Use `ConfirmDialog` for delete/approve/cancel confirmations:

- File: `milemoto-clientside/src/ui/confirm-dialog.tsx`
- Props:
  - `open`, `onOpenChange`
  - `title`, `description`
  - `confirmLabel`, `cancelLabel` (optional)
  - `confirmVariant` (optional, use `destructive` for delete)
  - `confirmDisabled`, `cancelDisabled` (optional)
  - `closeOnOutsideClick`, `closeOnEscape` (optional)

Example:

```tsx
<ConfirmDialog
  open={isConfirmOpen}
  onOpenChange={setIsConfirmOpen}
  title="Delete item?"
  description="This action cannot be undone."
  confirmLabel="Delete"
  confirmVariant="destructive"
  onConfirm={handleDelete}
/>
```

### Table Empty/Error/Loading States

Use the existing table state components consistently:

- `TableStateMessage` for empty/error states.
- `Skeleton` rows for loading placeholders.

Pattern:

```tsx
<TableBody>
  {isLoading ? (
    Array.from({ length: 5 }).map((_, i) => (
      <TableRow key={i}>
        <TableCell>
          <Skeleton className="h-5 w-24" />
        </TableCell>
      </TableRow>
    ))
  ) : isError ? (
    <TableRow>
      <TableCell
        colSpan={visibleColumnCount}
        className="h-24 text-center text-red-500"
      >
        <TableStateMessage
          variant="error"
          message="Failed to load data. Please try again."
          onRetry={refetch}
        />
      </TableCell>
    </TableRow>
  ) : items.length === 0 ? (
    <TableRow>
      <TableCell
        colSpan={visibleColumnCount}
        className="text-muted-foreground h-32 text-center"
      >
        <TableStateMessage variant="empty" message="No items found." />
      </TableCell>
    </TableRow>
  ) : (
    items.map((item) => <TableRow key={item.id}>{/* rows */}</TableRow>)
  )}
</TableBody>
```

### Table Pagination Footer

Use `TablePaginationFooter` for a consistent footer summary + pagination controls:

- File: `milemoto-clientside/src/ui/table-pagination-footer.tsx`
- Optional `summaryText` to override the default summary string.

Example:

```tsx
<TablePaginationFooter
  page={page}
  pageSize={pageSize}
  totalCount={totalCount}
  totalPages={totalPages}
  onPageChange={onPageChange}
  onPageSizeChange={onPageSizeChange}
/>
```

## Common Triggers for Refactor

- Same dropdown or confirm dialog repeated in multiple pages.
- Same table actions across many tables.
- Multi-step forms with repeated field groups.
- Pages with 3+ responsibilities inside one component.

Use this guide each time you split files so the structure stays consistent across the codebase.
