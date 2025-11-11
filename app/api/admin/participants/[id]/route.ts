import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

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
                // no-op
            }
        }
    });
};

interface RouteParams {
    id: string;
}

export async function GET(_: Request, { params }: { params: Promise<RouteParams> }) {
    try {
        const { id } = await params;
        const supabase = getAdminClient();
        const { data, error } = await supabase
            .from('participants')
            .select('*, experiments(*, blocks(*))')
            .eq('id', id)
            .single();

        if (error) throw error;

        return NextResponse.json({ participant: data });
    } catch (error) {
        console.error('Failed to fetch participant detail:', error);
        return NextResponse.json({ error: 'Failed to fetch participant detail' }, { status: 500 });
    }
}

export async function DELETE(_: Request, { params }: { params: Promise<RouteParams> }) {
    try {
        const { id } = await params;
        const supabase = getAdminClient();

        const { error: patternError } = await supabase
            .from('feedback_patterns')
            .delete()
            .eq('participant_id', id);

        if (patternError) throw patternError;

        const { error } = await supabase
            .from('participants')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete participant:', error);
        return NextResponse.json({ error: 'Failed to delete participant' }, { status: 500 });
    }
}
