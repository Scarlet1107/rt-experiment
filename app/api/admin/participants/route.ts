import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
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
                // no-op for API routes
            },
        },
    });
};

export async function GET() {
    try {
        const supabase = getAdminClient();
        const { data, error } = await supabase
            .from('participants')
            .select('*, experiments(*, blocks(*))')
            .order('created_at', { ascending: false });

        if (error) throw error;

        const participants = (data ?? []).map(participant => ({
            ...participant,
            experiments: participant.experiments ?? [],
        }));

        return NextResponse.json({ participants });
    } catch (error) {
        console.error('Failed to fetch participants:', error);
        return NextResponse.json({ error: 'Failed to fetch participants' }, { status: 500 });
    }
}

export async function POST() {
    try {
        const supabase = getAdminClient();
        const participantId = randomUUID();

        const { data, error } = await supabase
            .from('participants')
            .insert({ id: participantId, language: 'ja' })
            .select('*, experiments(*, blocks(*))')
            .single();

        if (error) throw error;

        return NextResponse.json({
            participant: {
                ...data,
                experiments: data?.experiments ?? [],
            },
        });
    } catch (error) {
        console.error('Failed to create participant:', error);
        return NextResponse.json({ error: 'Failed to create participant' }, { status: 500 });
    }
}
