import { NextResponse } from 'next/server';
import { createServerClient, SupabaseClient } from '@supabase/ssr';
import * as XLSX from 'xlsx';

const MAX_PAGE_SIZE = 1000;

const getAdminClient = () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
        throw new Error('Supabase credentials are not configured.');
    }

    return createServerClient(url, serviceKey, {
        cookies: {
            getAll() {
                return [];
            },
            setAll() {
                // API routes do not need cookie persistence
            },
        },
    });
};

const fetchAllRows = async (supabase: SupabaseClient, table: string, orderBy?: { column: string; ascending?: boolean }) => {
    let from = 0;
    const records: any[] = [];

    while (true) {
        let query = supabase
            .from(table)
            .select('*');

        if (orderBy) {
            query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
        }

        query = query.range(from, from + MAX_PAGE_SIZE - 1);

        const { data, error } = await query;
        if (error) throw error;

        const chunk = data ?? [];
        records.push(...chunk);
        if (chunk.length < MAX_PAGE_SIZE) break;
        from += MAX_PAGE_SIZE;
    }

    return records;
};

export async function GET() {
    try {
        const supabase = getAdminClient();
        const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');

        const tableConfigs: { table: string; orderBy?: { column: string; ascending?: boolean } }[] = [
            { table: 'participants', orderBy: { column: 'created_at' } },
            { table: 'experiments', orderBy: { column: 'started_at' } },
            { table: 'blocks', orderBy: { column: 'block_number' } },
            { table: 'trials', orderBy: { column: 'timestamp' } }, // this table can be large; fetched in pages
            { table: 'feedback_patterns', orderBy: { column: 'updated_at' } },
        ];

        const workbook = XLSX.utils.book_new();
        for (const config of tableConfigs) {
            const rows = await fetchAllRows(supabase, config.table, config.orderBy);
            const sheetData = rows.length > 0 ? rows : [{ note: 'データがありません' }];
            const worksheet = XLSX.utils.json_to_sheet(sheetData);
            XLSX.utils.book_append_sheet(workbook, worksheet, config.table);
        }

        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
        const fileName = `supabase-backup-${timestamp}.xlsx`;

        return new NextResponse(excelBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="${fileName}"`,
                'X-Backup-Filename': fileName,
                'Cache-Control': 'no-store',
            },
        });
    } catch (error) {
        console.error('Failed to create Supabase backup:', error);
        return NextResponse.json({ error: 'Failed to create backup' }, { status: 500 });
    }
}
