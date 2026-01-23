'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';

import {
  defaultDropAnimation,
  defaultDropAnimationSideEffects,
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  DropAnimation,
  KeyboardSensor,
  PointerSensor,
  UniqueIdentifier,
  useSensor,
  useSensors,
  type DraggableAttributes,
  type DraggableSyntheticListeners,
} from '@dnd-kit/core';
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Slot } from '@radix-ui/react-slot';

import { cn } from '@/lib/utils';

interface KanbanContextProps<T> {
  columns: Record<string, T[]>;
  setColumns: (columns: Record<string, T[]>) => void;
  getItemId: (item: T) => string;
  columnIds: string[];
  activeId: UniqueIdentifier | null;
  setActiveId: (id: UniqueIdentifier | null) => void;
  findContainer: (id: UniqueIdentifier) => string | undefined;
  isColumn: (id: UniqueIdentifier) => boolean;
}

const KanbanContext = React.createContext<KanbanContextProps<unknown>>({
  columns: {},
  setColumns: () => {},
  getItemId: () => '',
  columnIds: [],
  activeId: null,
  setActiveId: () => {},
  findContainer: () => undefined,
  isColumn: () => false,
});

const ColumnContext = React.createContext<{
  attributes: DraggableAttributes;
  listeners: DraggableSyntheticListeners | undefined;
  isDragging?: boolean;
  disabled?: boolean;
}>({
  attributes: {} as DraggableAttributes,
  listeners: undefined,
  isDragging: false,
  disabled: false,
});

const ItemContext = React.createContext<{
  listeners: DraggableSyntheticListeners | undefined;
  isDragging?: boolean;
  disabled?: boolean;
}>({
  listeners: undefined,
  isDragging: false,
  disabled: false,
});

const dropAnimationConfig: DropAnimation = {
  ...defaultDropAnimation,
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: '0.4',
      },
    },
  }),
};

export interface KanbanMoveEvent {
  event: DragEndEvent;
  activeContainer: string;
  activeIndex: number;
  overContainer: string;
  overIndex: number;
}

export interface KanbanRootProps<T> {
  value: Record<string, T[]>;
  onValueChange: (value: Record<string, T[]>) => void;
  getItemValue: (item: T) => string;
  children: React.ReactNode;
  className?: string;
  onMove?: (event: KanbanMoveEvent) => void;
}

function Kanban<T>({
  value,
  onValueChange,
  getItemValue,
  children,
  className,
  onMove,
}: KanbanRootProps<T>) {
  const columns = value;
  const setColumns = onValueChange;
  const [activeId, setActiveId] = React.useState<UniqueIdentifier | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const columnIds = React.useMemo(() => Object.keys(columns), [columns]);

  const isColumn = React.useCallback(
    (id: UniqueIdentifier) => columnIds.includes(id as string),
    [columnIds],
  );

  const findContainer = React.useCallback(
    (id: UniqueIdentifier) => {
      if (isColumn(id)) return id as string;
      // FIX: Added optional chaining (?.)
      return columnIds.find(key => columns[key]?.some(item => getItemValue(item) === id));
    },
    [columns, columnIds, getItemValue, isColumn],
  );
  const handleDragStart = React.useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id);
  }, []);

  const handleDragOver = React.useCallback(
    (event: DragOverEvent) => {
      if (onMove) {
        return;
      }

      const { active, over } = event;
      if (!over) return;

      if (isColumn(active.id)) return;

      const activeContainer = findContainer(active.id);
      const overContainer = findContainer(over.id);

      if (!activeContainer || !overContainer || activeContainer === overContainer) {
        return;
      }

      const activeItems = columns[activeContainer];
      const overItems = columns[overContainer];

      if (!activeItems || !overItems) return;

      const activeIndex = activeItems.findIndex((item: T) => getItemValue(item) === active.id);
      let overIndex = overItems.findIndex((item: T) => getItemValue(item) === over.id);

      if (isColumn(over.id)) {
        overIndex = overItems.length;
      }

      const newOverItems = [...overItems];
      const [movedItem] = activeItems.splice(activeIndex, 1);

      // -----------------------------------------------------------------
      // FIX: Check if movedItem exists.
      // This satisfies the "T | undefined is not assignable to T" error.
      // -----------------------------------------------------------------
      if (!movedItem) {
        return;
      }

      newOverItems.splice(overIndex, 0, movedItem);

      setColumns({
        ...columns,
        [activeContainer]: [...activeItems],
        [overContainer]: newOverItems,
      });
    },
    [findContainer, getItemValue, isColumn, setColumns, columns, onMove],
  );

  const handleDragEnd = React.useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (!over) return;

      if (onMove && !isColumn(active.id)) {
        const activeContainer = findContainer(active.id);
        const overContainer = findContainer(over.id);

        if (activeContainer && overContainer) {
          // FIX: Added optional chaining and checks
          const activeItems = columns[activeContainer];
          const overItems = columns[overContainer];

          if (!activeItems || !overItems) return;

          const activeIndex = activeItems.findIndex((item: T) => getItemValue(item) === active.id);
          const overIndex = isColumn(over.id)
            ? overItems.length
            : overItems.findIndex((item: T) => getItemValue(item) === over.id);

          onMove({
            event,
            activeContainer,
            activeIndex,
            overContainer,
            overIndex,
          });
        }
        return;
      }

      if (isColumn(active.id) && isColumn(over.id)) {
        const activeIndex = columnIds.indexOf(active.id as string);
        const overIndex = columnIds.indexOf(over.id as string);
        if (activeIndex !== overIndex) {
          const newOrder = arrayMove(Object.keys(columns), activeIndex, overIndex);
          const newColumns: Record<string, T[]> = {};
          newOrder.forEach(key => {
            // FIX: Ensure undefined fallback
            newColumns[key] = columns[key] ?? [];
          });
          setColumns(newColumns);
        }
        return;
      }

      const activeContainer = findContainer(active.id);
      const overContainer = findContainer(over.id);

      if (activeContainer && overContainer && activeContainer === overContainer) {
        const container = activeContainer;
        // FIX: Added checks for container existence
        const currentItems = columns[container];
        if (!currentItems) return;

        const activeIndex = currentItems.findIndex((item: T) => getItemValue(item) === active.id);
        const overIndex = currentItems.findIndex((item: T) => getItemValue(item) === over.id);

        if (activeIndex !== overIndex) {
          setColumns({
            ...columns,
            [container]: arrayMove(currentItems, activeIndex, overIndex),
          });
        }
      }
    },
    [columnIds, columns, findContainer, getItemValue, isColumn, setColumns, onMove],
  );

  const contextValue = React.useMemo(
    () => ({
      columns,
      setColumns,
      getItemId: getItemValue,
      columnIds,
      activeId,
      setActiveId,
      findContainer,
      isColumn,
    }),
    [columns, setColumns, getItemValue, columnIds, activeId, findContainer, isColumn],
  );

  return (
    <KanbanContext.Provider value={contextValue as unknown as KanbanContextProps<unknown>}>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div
          data-slot="kanban"
          data-dragging={activeId !== null}
          className={cn(className)}
        >
          {children}
        </div>
      </DndContext>
    </KanbanContext.Provider>
  );
}
export interface KanbanBoardProps {
  className?: string;
  children: React.ReactNode;
}

function KanbanBoard({ children, className }: KanbanBoardProps) {
  const { columnIds } = React.useContext(KanbanContext);

  return (
    <SortableContext
      items={columnIds}
      strategy={rectSortingStrategy}
    >
      <div
        data-slot="kanban-board"
        className={cn('grid auto-rows-fr gap-4 sm:grid-cols-3', className)}
      >
        {children}
      </div>
    </SortableContext>
  );
}

export interface KanbanColumnProps {
  value: string;
  className?: string;
  children: React.ReactNode;
  disabled?: boolean;
}

function KanbanColumn({ value, className, children, disabled }: KanbanColumnProps) {
  const {
    setNodeRef,
    transform,
    transition,
    attributes,
    listeners,
    isDragging: isSortableDragging,
  } = useSortable({
    id: value,
    disabled: !!disabled, // FIX: Convert to boolean
  });

  const { activeId, isColumn } = React.useContext(KanbanContext);
  const isColumnDragging = activeId ? isColumn(activeId) : false;

  const style = {
    transition,
    transform: CSS.Translate.toString(transform),
  } as React.CSSProperties;

  return (
    <ColumnContext.Provider
      // FIX: Convert disabled to boolean
      value={{ attributes, listeners, isDragging: isColumnDragging, disabled: !!disabled }}
    >
      <div
        data-slot="kanban-column"
        data-value={value}
        data-dragging={isSortableDragging}
        data-disabled={disabled}
        ref={setNodeRef}
        style={style}
        className={cn(
          'group/kanban-column flex flex-col',
          isSortableDragging && 'opacity-50',
          disabled && 'opacity-50',
          className,
        )}
      >
        {children}
      </div>
    </ColumnContext.Provider>
  );
}

export interface KanbanColumnHandleProps {
  asChild?: boolean;
  className?: string;
  children?: React.ReactNode;
  cursor?: boolean;
}

function KanbanColumnHandle({
  asChild,
  className,
  children,
  cursor = true,
}: KanbanColumnHandleProps) {
  const { attributes, listeners, isDragging, disabled } = React.useContext(ColumnContext);

  const Comp = asChild ? Slot : 'div';

  return (
    <Comp
      data-slot="kanban-column-handle"
      data-dragging={isDragging}
      data-disabled={disabled}
      {...attributes}
      {...listeners}
      className={cn(
        'opacity-0 transition-opacity group-hover/kanban-column:opacity-100',
        cursor && (isDragging ? '!cursor-grabbing' : '!cursor-grab'),
        className,
      )}
    >
      {children}
    </Comp>
  );
}

export interface KanbanItemProps {
  value: string;
  asChild?: boolean;
  className?: string;
  children: React.ReactNode;
  disabled?: boolean;
}

function KanbanItem({ value, asChild = false, className, children, disabled }: KanbanItemProps) {
  const {
    setNodeRef,
    transform,
    transition,
    attributes,
    listeners,
    isDragging: isSortableDragging,
  } = useSortable({
    id: value,
    disabled: !!disabled, // FIX: Convert to boolean
  });

  const { activeId, isColumn } = React.useContext(KanbanContext);
  const isItemDragging = activeId ? !isColumn(activeId) : false;

  const style = {
    transition,
    transform: CSS.Translate.toString(transform),
  } as React.CSSProperties;

  const Comp = asChild ? Slot : 'div';

  return (
    // FIX: Convert disabled to boolean
    <ItemContext.Provider value={{ listeners, isDragging: isItemDragging, disabled: !!disabled }}>
      <Comp
        data-slot="kanban-item"
        data-value={value}
        data-dragging={isSortableDragging}
        data-disabled={disabled}
        ref={setNodeRef}
        style={style}
        {...attributes}
        className={cn(isSortableDragging && 'opacity-50', disabled && 'opacity-50', className)}
      >
        {children}
      </Comp>
    </ItemContext.Provider>
  );
}

export interface KanbanItemHandleProps {
  asChild?: boolean;
  className?: string;
  children?: React.ReactNode;
  cursor?: boolean;
}

function KanbanItemHandle({ asChild, className, children, cursor = true }: KanbanItemHandleProps) {
  const { listeners, isDragging, disabled } = React.useContext(ItemContext);

  const Comp = asChild ? Slot : 'div';

  return (
    <Comp
      data-slot="kanban-item-handle"
      data-dragging={isDragging}
      data-disabled={disabled}
      {...listeners}
      className={cn(cursor && (isDragging ? '!cursor-grabbing' : '!cursor-grab'), className)}
    >
      {children}
    </Comp>
  );
}

export interface KanbanColumnContentProps {
  value: string;
  className?: string;
  children: React.ReactNode;
}

function KanbanColumnContent({ value, className, children }: KanbanColumnContentProps) {
  const { columns, getItemId } = React.useContext(KanbanContext);

  // FIX: Added optional chaining (columns[value]?.map) and fallback to []
  const itemIds = React.useMemo(
    () => columns[value]?.map(getItemId) ?? [],
    [columns, getItemId, value],
  );

  return (
    <SortableContext
      items={itemIds}
      strategy={verticalListSortingStrategy}
    >
      <div
        data-slot="kanban-column-content"
        className={cn('flex flex-col gap-2', className)}
      >
        {children}
      </div>
    </SortableContext>
  );
}

export interface KanbanOverlayProps {
  className?: string;
  children?:
    | React.ReactNode
    | ((params: { value: UniqueIdentifier; variant: 'column' | 'item' }) => React.ReactNode);
}

function KanbanOverlay({ children, className }: KanbanOverlayProps) {
  const { activeId, isColumn } = React.useContext(KanbanContext);
  const [dimensions, setDimensions] = React.useState<{ width: number; height: number } | null>(
    null,
  );

  React.useEffect(() => {
    if (activeId) {
      const element = document.querySelector(
        `[data-slot="kanban-${isColumn(activeId) ? 'column' : 'item'}"][data-value="${activeId}"]`,
      );
      if (element) {
        const rect = element.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
      }
    } else {
      setDimensions(null);
    }
  }, [activeId, isColumn]);

  const style = {
    width: dimensions?.width,
    height: dimensions?.height,
  } as React.CSSProperties;

  const content = React.useMemo(() => {
    if (!activeId) return null;
    if (typeof children === 'function') {
      return children({
        value: activeId,
        variant: isColumn(activeId) ? 'column' : 'item',
      });
    }
    return children;
  }, [activeId, children, isColumn]);

  return (
    <DragOverlay dropAnimation={dropAnimationConfig}>
      <div
        data-slot="kanban-overlay"
        data-dragging={true}
        style={style}
        className={cn('pointer-events-none', className, activeId ? '!cursor-grabbing' : '')}
      >
        {content}
      </div>
    </DragOverlay>
  );
}

// Sortable Item Context
const SortableItemContext = React.createContext<{
  listeners: DraggableSyntheticListeners | undefined;
  isDragging?: boolean;
  disabled?: boolean;
}>({
  listeners: undefined,
  isDragging: false,
  disabled: false,
});

// Multipurpose Sortable Component
export interface SortableRootProps<T> {
  value: T[];
  onValueChange: (value: T[]) => void;
  getItemValue: (item: T) => string;
  children: React.ReactNode;
  className?: string;
  onMove?: (event: { event: DragEndEvent; activeIndex: number; overIndex: number }) => void;
  strategy?: 'horizontal' | 'vertical' | 'grid';
  onDragStart?: (event: DragStartEvent) => void;
  onDragEnd?: (event: DragEndEvent) => void;
}

function Sortable<T>({
  value,
  onValueChange,
  getItemValue,
  children,
  className,
  onMove,
  strategy = 'vertical',
  onDragStart,
  onDragEnd,
}: SortableRootProps<T>) {
  const [activeId, setActiveId] = React.useState<UniqueIdentifier | null>(null);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragStart = React.useCallback(
    (event: DragStartEvent) => {
      setActiveId(event.active.id);
      onDragStart?.(event);
    },
    [onDragStart],
  );

  const handleDragEnd = React.useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);
      onDragEnd?.(event);

      if (!over) return;

      // Handle item reordering
      const activeIndex = value.findIndex((item: T) => getItemValue(item) === active.id);
      const overIndex = value.findIndex((item: T) => getItemValue(item) === over.id);

      if (activeIndex !== overIndex) {
        if (onMove) {
          onMove({ event, activeIndex, overIndex });
        } else {
          const newValue = arrayMove(value, activeIndex, overIndex);
          onValueChange(newValue);
        }
      }
    },
    [value, getItemValue, onValueChange, onMove, onDragEnd],
  );

  const getStrategy = () => {
    switch (strategy) {
      case 'horizontal':
        return rectSortingStrategy;
      case 'grid':
        return rectSortingStrategy;
      case 'vertical':
      default:
        return verticalListSortingStrategy;
    }
  };

  const itemIds = React.useMemo(() => value.map(getItemValue), [value, getItemValue]);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={itemIds}
        strategy={getStrategy()}
      >
        <div
          data-slot="sortable"
          data-dragging={activeId !== null}
          className={cn(className)}
        >
          {children}
        </div>
      </SortableContext>

      {mounted
        ? createPortal(
            <DragOverlay>
              {activeId ? (
                <div className="z-50">
                  {React.Children.map(children, child => {
                    if (
                      React.isValidElement(child) &&
                      (child.props as { value?: UniqueIdentifier }).value === activeId
                    ) {
                      return React.cloneElement(
                        child as React.ReactElement<{ className?: string; isOverlay?: boolean }>,
                        {
                          className: cn(
                            (child.props as { className?: string }).className,
                            'z-50 shadow-lg',
                          ),
                          isOverlay: true,
                        },
                      );
                    }
                    return null;
                  })}
                </div>
              ) : null}
            </DragOverlay>,
            document.body,
          )
        : null}
    </DndContext>
  );
}

export interface SortableItemProps {
  value: string;
  asChild?: boolean;
  className?: string;
  children: React.ReactNode;
  disabled?: boolean;
  isOverlay?: boolean;
}

function SortableItem({
  value,
  asChild = false,
  className,
  children,
  disabled,
  isOverlay,
}: SortableItemProps) {
  const {
    setNodeRef,
    transform,
    transition,
    attributes,
    listeners,
    isDragging: isSortableDragging,
  } = useSortable({
    id: value,
    disabled: !!disabled || !!isOverlay,
  });

  const style = {
    transition,
    transform: isOverlay ? undefined : CSS.Translate.toString(transform),
  } as React.CSSProperties;

  const Comp = asChild ? Slot : 'div';

  return (
    // FIX: Convert disabled to boolean
    <SortableItemContext.Provider
      value={{ listeners, isDragging: isSortableDragging, disabled: !!disabled }}
    >
      <Comp
        data-slot="sortable-item"
        data-value={value}
        data-dragging={isSortableDragging}
        data-disabled={disabled}
        ref={isOverlay ? undefined : setNodeRef}
        style={style}
        {...attributes}
        className={cn(isSortableDragging && 'z-50 opacity-50', disabled && 'opacity-50', className)}
      >
        {children}
      </Comp>
    </SortableItemContext.Provider>
  );
}

export interface SortableItemHandleProps {
  asChild?: boolean;
  className?: string;
  children?: React.ReactNode;
  cursor?: boolean;
}

function SortableItemHandle({
  asChild,
  className,
  children,
  cursor = true,
}: SortableItemHandleProps) {
  const { listeners, isDragging, disabled } = React.useContext(SortableItemContext);

  const Comp = asChild ? Slot : 'div';

  return (
    <Comp
      data-slot="sortable-item-handle"
      data-dragging={isDragging}
      data-disabled={disabled}
      {...listeners}
      className={cn(cursor && (isDragging ? '!cursor-grabbing' : '!cursor-grab'), className)}
    >
      {children}
    </Comp>
  );
}

export {
  Kanban,
  KanbanBoard,
  KanbanColumn,
  KanbanColumnHandle,
  KanbanItem,
  KanbanItemHandle,
  KanbanColumnContent,
  KanbanOverlay,
  // New multipurpose sortable components
  Sortable,
  SortableItem,
  SortableItemHandle,
};
