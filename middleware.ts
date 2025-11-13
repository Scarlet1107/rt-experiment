import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
    // 管理者パス(/admin)のみBasic認証を適用
    if (request.nextUrl.pathname.startsWith('/admin') || request.nextUrl.pathname === '/') {
        const basicAuth = request.headers.get('authorization');

        if (!basicAuth) {
            return new NextResponse('Authentication required', {
                status: 401,
                headers: {
                    'WWW-Authenticate': 'Basic realm="Admin Area"',
                },
            });
        }

        try {
            const [username, password] = Buffer
                .from(basicAuth.split(' ')[1], 'base64')
                .toString()
                .split(':');

            if (
                username !== process.env.ADMIN_USERNAME ||
                password !== process.env.ADMIN_PASSWORD
            ) {
                return new NextResponse('Invalid credentials', {
                    status: 401,
                    headers: {
                        'WWW-Authenticate': 'Basic realm="Admin Area"',
                    },
                });
            }
        } catch {
            console.error('Authentication failed');
            return new NextResponse('Invalid credentials', { status: 401 });
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/admin/:path*', '/'],
};
