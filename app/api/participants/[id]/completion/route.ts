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
                // no-op for API routes
            },
        },
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
            .select('static_completed_at, personalized_completed_at')
            .eq('id', id)
            .maybeSingle();

        if (error) throw error;
        if (!data) {
            return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
        }

        return NextResponse.json({
            staticCompletedAt: data.static_completed_at,
            personalizedCompletedAt: data.personalized_completed_at,
        });
    } catch (error) {
        console.error('Failed to fetch completion status:', error);
        return NextResponse.json({ error: 'Failed to fetch completion status' }, { status: 500 });
    }
}

export async function POST(request: Request, { params }: { params: Promise<RouteParams> }) {
    try {
        const { id } = await params;
        const body = await request.json().catch(() => null);
        if (!body || (body.condition !== 'static' && body.condition !== 'personalized')) {
            return NextResponse.json({ error: 'Invalid condition provided' }, { status: 400 });
        }

        const supabase = getAdminClient();
        const column = body.condition === 'static' ? 'static_completed_at' : 'personalized_completed_at';
        const timestamp = typeof body.completedAt === 'string'
            ? body.completedAt
            : new Date().toISOString();

        const { error } = await supabase
            .from('participants')
            .update({
                [column]: timestamp,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({
            success: true,
            condition: body.condition,
            completedAt: timestamp,
        });
    } catch (error) {
        console.error('Failed to update completion status:', error);
        return NextResponse.json({ error: 'Failed to update completion status' }, { status: 500 });
    }
}
