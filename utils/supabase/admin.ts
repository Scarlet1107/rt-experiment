import { createBrowserClient } from '@supabase/ssr'

// 管理者用クライアント（Service Role Key使用）
export function createAdminClient() {
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}

// 管理者画面でのみ使用
export const supabaseAdmin = createAdminClient();
