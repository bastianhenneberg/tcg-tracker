import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Link, router } from '@inertiajs/react';
import {
    flexRender,
    getCoreRowModel,
    useReactTable,
    type ColumnDef,
    type RowSelectionState,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import * as React from 'react';
import { Button } from './button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';

// Re-export ColumnDef for convenience
export type { ColumnDef } from '@tanstack/react-table';

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

export interface PaginatedData<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
    links: PaginationLink[];
    first_page_url: string;
    last_page_url: string;
    next_page_url: string | null;
    prev_page_url: string | null;
}

interface SortConfig {
    field: string;
    direction: 'asc' | 'desc';
}

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: PaginatedData<TData>;
    onRowClick?: (row: TData) => void;
    enableRowSelection?: boolean;
    onSelectionChange?: (selectedRows: TData[]) => void;
    sort?: SortConfig;
    onSortChange?: (sort: SortConfig) => void;
    emptyState?: React.ReactNode;
    getRowId?: (row: TData) => string;
}

export function DataTable<TData, TValue>({
    columns,
    data,
    onRowClick,
    enableRowSelection = false,
    onSelectionChange,
    sort,
    onSortChange,
    emptyState,
    getRowId,
}: DataTableProps<TData, TValue>) {
    const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});

    // Build columns with optional selection column
    const tableColumns = React.useMemo(() => {
        if (!enableRowSelection) return columns;

        const selectionColumn: ColumnDef<TData, TValue> = {
            id: 'select',
            header: ({ table }) => (
                <Checkbox
                    checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
                    onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                    aria-label="Alle auswählen"
                />
            ),
            cell: ({ row }) => (
                <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={(value) => row.toggleSelected(!!value)}
                    aria-label="Zeile auswählen"
                    onClick={(e) => e.stopPropagation()}
                />
            ),
            enableSorting: false,
            enableHiding: false,
        };

        return [selectionColumn, ...columns];
    }, [columns, enableRowSelection]);

    const table = useReactTable({
        data: data.data,
        columns: tableColumns,
        getCoreRowModel: getCoreRowModel(),
        manualPagination: true,
        manualSorting: true,
        pageCount: data.last_page,
        onRowSelectionChange: setRowSelection,
        getRowId: getRowId ? (row) => getRowId(row) : undefined,
        state: {
            rowSelection,
        },
    });

    // Notify parent of selection changes
    React.useEffect(() => {
        if (onSelectionChange) {
            const selectedRows = table.getFilteredSelectedRowModel().rows.map((row) => row.original);
            onSelectionChange(selectedRows);
        }
    }, [rowSelection, onSelectionChange, table]);

    // Reset selection when data changes (e.g., page change)
    React.useEffect(() => {
        setRowSelection({});
    }, [data.current_page]);

    return (
        <div className="space-y-4">
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id} className={header.id === 'select' ? 'w-12 pl-4' : ''}>
                                        {header.isPlaceholder ? null : header.column.id === 'select' ? (
                                            flexRender(header.column.columnDef.header, header.getContext())
                                        ) : header.column.columnDef.enableSorting !== false && onSortChange ? (
                                            <SortableHeader
                                                column={header.column.id}
                                                sort={sort}
                                                onSortChange={onSortChange}
                                            >
                                                {flexRender(header.column.columnDef.header, header.getContext())}
                                            </SortableHeader>
                                        ) : (
                                            flexRender(header.column.columnDef.header, header.getContext())
                                        )}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && 'selected'}
                                    className={onRowClick ? 'cursor-pointer' : ''}
                                    onClick={() => onRowClick?.(row.original)}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell
                                            key={cell.id}
                                            className={cell.column.id === 'select' ? 'pl-4' : ''}
                                        >
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={tableColumns.length} className="h-24 text-center">
                                    {emptyState ?? 'Keine Ergebnisse.'}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <DataTablePagination data={data} />
        </div>
    );
}

interface SortableHeaderProps {
    column: string;
    sort?: SortConfig;
    onSortChange: (sort: SortConfig) => void;
    children: React.ReactNode;
}

function SortableHeader({ column, sort, onSortChange, children }: SortableHeaderProps) {
    const isSorted = sort?.field === column;
    const direction = sort?.direction;

    const handleClick = () => {
        if (!isSorted) {
            onSortChange({ field: column, direction: 'asc' });
        } else if (direction === 'asc') {
            onSortChange({ field: column, direction: 'desc' });
        } else {
            onSortChange({ field: column, direction: 'asc' });
        }
    };

    return (
        <button onClick={handleClick} className="flex items-center gap-1 hover:text-foreground -ml-2 px-2 py-1 rounded hover:bg-muted">
            {children}
            {isSorted ? (
                direction === 'asc' ? (
                    <ArrowUp className="h-4 w-4" />
                ) : (
                    <ArrowDown className="h-4 w-4" />
                )
            ) : (
                <ArrowUpDown className="h-4 w-4 text-muted-foreground/50" />
            )}
        </button>
    );
}

function DataTablePagination<T>({ data }: { data: PaginatedData<T> }) {
    if (data.last_page <= 1) {
        return null;
    }

    return (
        <div className="flex items-center justify-between px-2">
            <div className="text-muted-foreground flex-1 text-sm">
                {data.from && data.to ? (
                    <>
                        {data.from} bis {data.to} von {data.total} Einträgen
                    </>
                ) : (
                    <>0 Einträge</>
                )}
            </div>
            <div className="flex items-center space-x-6 lg:space-x-8">
                <div className="flex items-center space-x-2">
                    <p className="hidden text-sm font-medium sm:block">Pro Seite</p>
                    <Select
                        value={`${data.per_page}`}
                        onValueChange={(value) => {
                            const url = new URL(window.location.href);
                            url.searchParams.set('per_page', value);
                            url.searchParams.delete('page');
                            router.get(url.pathname + url.search, {}, { preserveState: true, preserveScroll: true });
                        }}
                    >
                        <SelectTrigger className="h-8 w-[70px]">
                            <SelectValue placeholder={data.per_page} />
                        </SelectTrigger>
                        <SelectContent side="top">
                            {[10, 25, 50, 100].map((pageSize) => (
                                <SelectItem key={pageSize} value={`${pageSize}`}>
                                    {pageSize}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                    Seite {data.current_page} von {data.last_page}
                </div>
                <div className="flex items-center space-x-2">
                    <Button variant="outline" className="hidden h-8 w-8 p-0 lg:flex" disabled={data.current_page === 1} asChild>
                        <Link href={data.first_page_url} preserveState preserveScroll>
                            <span className="sr-only">Erste Seite</span>
                            <ChevronsLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <Button variant="outline" className="h-8 w-8 p-0" disabled={!data.prev_page_url} asChild>
                        <Link href={data.prev_page_url ?? '#'} preserveState preserveScroll>
                            <span className="sr-only">Vorherige Seite</span>
                            <ChevronLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <Button variant="outline" className="h-8 w-8 p-0" disabled={!data.next_page_url} asChild>
                        <Link href={data.next_page_url ?? '#'} preserveState preserveScroll>
                            <span className="sr-only">Nächste Seite</span>
                            <ChevronRight className="h-4 w-4" />
                        </Link>
                    </Button>
                    <Button variant="outline" className="hidden h-8 w-8 p-0 lg:flex" disabled={data.current_page === data.last_page} asChild>
                        <Link href={data.last_page_url} preserveState preserveScroll>
                            <span className="sr-only">Letzte Seite</span>
                            <ChevronsRight className="h-4 w-4" />
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}

// Helper component for bulk actions toolbar
interface DataTableToolbarProps {
    selectedCount: number;
    children: React.ReactNode;
}

export function DataTableToolbar({ selectedCount, children }: DataTableToolbarProps) {
    if (selectedCount === 0) return null;

    return (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-3">
            <span className="text-sm font-medium">{selectedCount} ausgewählt</span>
            <div className="flex-1" />
            {children}
        </div>
    );
}
