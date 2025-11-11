import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({
        hasOpenAIKey: !!process.env.OPENAI_API_KEY,
        keyPrefix: process.env.OPENAI_API_KEY?.substring(0, 10) + '...',
        nodeEnv: process.env.NODE_ENV,
        allEnvKeys: Object.keys(process.env).filter(key =>
            key.includes('OPENAI') || key.includes('NEXT_') || key.includes('NODE_')
        )
    });
}
