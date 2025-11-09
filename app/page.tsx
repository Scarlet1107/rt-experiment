import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FlaskConical, Settings, Code2 } from "lucide-react";

export default function Home() {
  // テスト用UUID
  const testUUID = "test-uuid-123e4567-e89b-12d3-a456-426614174000";

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto space-y-8 text-center">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight">RT実験アプリ（本番版）</h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Stroop課題を用いたReaction Time実験アプリケーションです。<br />
              StaticフィードバックとPersonalizedフィードバックの効果を比較研究します。
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            {/* 実験フロー */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FlaskConical className="mr-2 h-5 w-5" />
                  実験フロー
                </CardTitle>
                <CardDescription>
                  参加者が体験する実験の流れ
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-left space-y-3">
                  {[
                    '言語選択',
                    '同意書',
                    '事前ヒアリング',
                    '注意事項・練習',
                    '本番実験（480試行）'
                  ].map((step, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <Badge variant="outline" className="w-6 h-6 p-0 flex items-center justify-center">
                        {index + 1}
                      </Badge>
                      <span className="text-sm">{step}</span>
                    </div>
                  ))}
                </div>

                <Separator />

                <Button asChild className="w-full">
                  <Link href={`/language/${testUUID}`}>
                    <FlaskConical className="mr-2 h-4 w-4" />
                    実験フローテスト
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* 管理・テスト */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="mr-2 h-5 w-5" />
                  管理・テスト
                </CardTitle>
                <CardDescription>
                  実験の管理とシステムテスト
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button asChild variant="outline" className="w-full">
                  <Link href="/admin">
                    <Settings className="mr-2 h-4 w-4" />
                    管理者画面
                  </Link>
                </Button>

                <Card className="bg-muted/50">
                  <CardContent className="p-4">
                    <div className="text-xs space-y-2">
                      <p className="font-medium flex items-center">
                        <Code2 className="mr-1 h-3 w-3" />
                        テスト用UUID:
                      </p>
                      <code className="text-xs break-all bg-background px-2 py-1 rounded">
                        {testUUID}
                      </code>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-muted/30">
            <CardContent className="p-6">
              <div className="text-sm text-muted-foreground space-y-2">
                <p className="font-medium">このアプリケーションについて</p>
                <p>このアプリケーションは研究目的で開発されています。</p>
                <p>参加者データは完全に匿名化され、学術研究にのみ使用されます。</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
