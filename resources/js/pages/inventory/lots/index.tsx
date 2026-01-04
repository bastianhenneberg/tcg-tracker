import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { index as lotsIndex, show as lotShow, store as lotStore } from '@/routes/lots';
import { type BreadcrumbItem } from '@/types';
import { type PaginatedData } from '@/types/cards';
import { type Box, type Lot } from '@/types/inventory';
import { Head, router, useForm } from '@inertiajs/react';
import { type ColumnDef } from '@tanstack/react-table';
import { Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

interface Props {
    lots: PaginatedData<Lot>;
    boxes: Box[];
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Lots',
        href: lotsIndex().url,
    },
];

export default function LotsIndex({ lots, boxes }: Props) {
    const [dialogOpen, setDialogOpen] = useState(false);

    // Reload data when the page becomes visible (tab switching)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                router.reload({ only: ['lots', 'boxes'] });
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    const form = useForm({
        box_id: '',
        card_range_start: '',
        card_range_end: '',
        notes: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post(lotStore().url, {
            onSuccess: () => {
                setDialogOpen(false);
                form.reset();
            },
        });
    };

    const handleRowClick = (lot: Lot) => {
        router.visit(lotShow(lot).url);
    };

    const columns: ColumnDef<Lot>[] = useMemo(
        () => [
            {
                accessorKey: 'lot_number',
                header: 'Lot #',
                cell: ({ row }) => (
                    <span className="font-medium">#{row.original.lot_number}</span>
                ),
            },
            {
                accessorKey: 'box.name',
                header: 'Karton',
                cell: ({ row }) => row.original.box?.name ?? '-',
            },
            {
                id: 'range',
                header: 'Kartenbereich',
                cell: ({ row }) =>
                    row.original.card_range_start && row.original.card_range_end ? (
                        <Badge variant="outline">
                            {row.original.card_range_start} - {row.original.card_range_end}
                        </Badge>
                    ) : (
                        '-'
                    ),
            },
            {
                accessorKey: 'inventory_items_count',
                header: 'Karten',
                cell: ({ row }) => (
                    <Badge>{row.original.inventory_items_count ?? 0}</Badge>
                ),
            },
            {
                accessorKey: 'scanned_at',
                header: 'Gescannt',
                cell: ({ row }) =>
                    row.original.scanned_at
                        ? new Date(row.original.scanned_at).toLocaleDateString('de-DE')
                        : '-',
            },
            {
                accessorKey: 'notes',
                header: 'Notizen',
                cell: ({ row }) => (
                    <span className="text-muted-foreground max-w-xs truncate">
                        {row.original.notes ?? '-'}
                    </span>
                ),
            },
        ],
        []
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Lots" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <h1 className="text-2xl font-bold">Lots</h1>

                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                            <Button disabled={boxes.length === 0}>
                                <Plus className="mr-2 h-4 w-4" />
                                Neues Lot
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Neues Lot erstellen</DialogTitle>
                                <DialogDescription>
                                    Erstelle ein neues Lot für eine Scan-Session.
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="box_id">Karton</Label>
                                    <Select
                                        value={form.data.box_id}
                                        onValueChange={(value) => form.setData('box_id', value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Karton auswählen" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {boxes.map((box) => (
                                                <SelectItem key={box.id} value={box.id.toString()}>
                                                    {box.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {form.errors.box_id && (
                                        <p className="text-destructive text-sm">{form.errors.box_id}</p>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="card_range_start">Von Karte</Label>
                                        <Input
                                            id="card_range_start"
                                            type="number"
                                            min="1"
                                            value={form.data.card_range_start}
                                            onChange={(e) => form.setData('card_range_start', e.target.value)}
                                            placeholder="z.B. 1"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="card_range_end">Bis Karte</Label>
                                        <Input
                                            id="card_range_end"
                                            type="number"
                                            min="1"
                                            value={form.data.card_range_end}
                                            onChange={(e) => form.setData('card_range_end', e.target.value)}
                                            placeholder="z.B. 50"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="notes">Notizen (optional)</Label>
                                    <Input
                                        id="notes"
                                        value={form.data.notes}
                                        onChange={(e) => form.setData('notes', e.target.value)}
                                        placeholder="z.B. Erste Hälfte Majestic Set"
                                    />
                                </div>
                                <div className="flex justify-end gap-2">
                                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                                        Abbrechen
                                    </Button>
                                    <Button type="submit" disabled={form.processing}>
                                        Erstellen
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                {boxes.length === 0 && (
                    <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-950">
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                            Du musst zuerst einen Karton erstellen, bevor du Lots anlegen kannst.{' '}
                            <a href="/boxes" className="font-medium underline">
                                Karton erstellen
                            </a>
                        </p>
                    </div>
                )}

                <DataTable columns={columns} data={lots} onRowClick={handleRowClick} />
            </div>
        </AppLayout>
    );
}
