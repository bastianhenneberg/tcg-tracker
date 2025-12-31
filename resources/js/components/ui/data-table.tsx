import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Link } from '@inertiajs/react';
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from './button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginatedData<T> {
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

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: PaginatedData<TData>;
    onRowClick?: (row: TData) => void;
}

export function DataTable<TData, TValue>({ columns, data, onRowClick }: DataTableProps<TData, TValue>) {
    const table = useReactTable({
        data: data.data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        manualPagination: true,
        pageCount: data.last_page,
    });

    return (
        <div className="space-y-4">
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id}>
                                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
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
                                        <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center">
                                    Keine Ergebnisse.
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
                    <p className="text-sm font-medium">Pro Seite</p>
                    <Select
                        value={`${data.per_page}`}
                        onValueChange={(value) => {
                            const url = new URL(window.location.href);
                            url.searchParams.set('per_page', value);
                            url.searchParams.delete('page');
                            window.location.href = url.toString();
                        }}
                    >
                        <SelectTrigger className="h-8 w-[70px]">
                            <SelectValue placeholder={data.per_page} />
                        </SelectTrigger>
                        <SelectContent side="top">
                            {[12, 24, 48, 96].map((pageSize) => (
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
