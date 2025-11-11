
import { createBrowserClient } from '@supabase/ssr'

// 通常の参加者用クライアント（匿名アクセス）
export function createClient() {
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
}

// デフォルトクライアントエクスポート
export const supabase = createClient();
