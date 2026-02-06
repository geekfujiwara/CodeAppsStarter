/**
 * Dataverse サンプルページ
 * 
 * Dataverse 接続とデータ操作のサンプル実装を示すページです。
 * 実際に Dataverse に接続して使用するには、以下の手順が必要です：
 * 
 * 1. pac auth create - Power Platform に接続
 * 2. pac code init - 環境を初期化
 * 3. pac code add-data-source -a dataverse -t <table-name> - テーブルを追加
 * 4. アプリケーションで initialize() を呼び出し
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ExternalLink, Database, Terminal, FileCode, BookOpen } from "lucide-react"

export default function DataversePage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Dataverse 接続</h1>
        <p className="text-muted-foreground">
          XML に依存しない Dataverse 接続の実装サンプル
        </p>
      </div>

      <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4">
        <div className="flex gap-3">
          <Database className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold mb-1">Dataverse 接続について</h3>
            <p className="text-sm text-muted-foreground">
              このページでは、@microsoft/power-apps SDK を使用した Dataverse への接続方法を説明します。
              実装の詳細は docs/dataverse-design.md を参照してください。
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="h-5 w-5" />
              CLI ツール
            </CardTitle>
            <CardDescription>
              コマンドラインから Dataverse 操作を実行
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              以下のコマンドが使用できます：
            </p>
            <div className="space-y-2 font-mono text-sm bg-muted p-4 rounded-md">
              <div>npm run dataverse:help</div>
              <div>npm run dataverse:test</div>
              <div>npm run dataverse:metadata account</div>
              <div>npm run dataverse:guide contact</div>
              <div>npm run dataverse:list</div>
            </div>
            <Button variant="outline" className="w-full" asChild>
              <a href="#cli-usage">
                詳細を見る
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCode className="h-5 w-5" />
              実装ファイル
            </CardTitle>
            <CardDescription>
              Dataverse 接続用の実装ファイル
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              以下のファイルが追加されました：
            </p>
            <ul className="space-y-2 text-sm">
              <li>• src/lib/dataverse-client.ts</li>
              <li>• src/lib/dataverse-metadata.ts</li>
              <li>• src/hooks/use-dataverse.ts</li>
              <li>• scripts/dataverse-cli.ts</li>
              <li>• docs/dataverse-design.md</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            使用方法
          </CardTitle>
          <CardDescription>
            Dataverse に接続してデータを使用する手順
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">1. Power Platform に接続</h3>
              <div className="bg-muted p-3 rounded-md font-mono text-sm">
                pac auth create
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">2. 環境を初期化</h3>
              <div className="bg-muted p-3 rounded-md font-mono text-sm">
                pac code init
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">3. テーブルをデータソースとして追加</h3>
              <div className="bg-muted p-3 rounded-md font-mono text-sm">
                pac code add-data-source -a dataverse -t account
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                ※ account の部分を使用したいテーブルの論理名に置き換えてください
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">4. アプリケーションで使用</h3>
              <div className="bg-muted p-3 rounded-md">
                <pre className="text-sm overflow-x-auto">{`import { initialize } from '@microsoft/power-apps/app';
import { useDataverseRecords } from '@/hooks/use-dataverse';

// 初期化
useEffect(() => {
  const init = async () => {
    await initialize();
  };
  init();
}, []);

// データ取得
const { data, isLoading } = useDataverseRecords('accounts', {
  select: ['name', 'accountnumber'],
  top: 10
});`}</pre>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>参考資料</CardTitle>
          <CardDescription>
            Microsoft Learn とその他のドキュメント
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Button variant="outline" className="w-full justify-start" asChild>
              <a
                href="https://learn.microsoft.com/ja-jp/power-apps/developer/code-apps/how-to/connect-to-dataverse"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Dataverse への接続方法 - Microsoft Learn
              </a>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <a
                href="https://learn.microsoft.com/ja-jp/power-apps/developer/code-apps/how-to/get-table-metadata"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                テーブルメタデータの取得 - Microsoft Learn
              </a>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <a
                href="https://github.com/microsoft/PowerAppsCodeApps"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Power Apps Code Apps - GitHub
              </a>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <a
                href="/docs/dataverse-design.md"
                target="_blank"
              >
                <FileCode className="mr-2 h-4 w-4" />
                設計ドキュメント (docs/dataverse-design.md)
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card id="cli-usage">
        <CardHeader>
          <CardTitle>CLI コマンド詳細</CardTitle>
          <CardDescription>
            各コマンドの説明と使用例
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-1">dataverse:help</h4>
              <p className="text-sm text-muted-foreground mb-2">
                CLI ツールのヘルプを表示します
              </p>
              <div className="bg-muted p-2 rounded-md font-mono text-sm">
                npm run dataverse:help
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-1">dataverse:test</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Dataverse 接続設定をテストします（power.config.json の確認）
              </p>
              <div className="bg-muted p-2 rounded-md font-mono text-sm">
                npm run dataverse:test
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-1">dataverse:metadata</h4>
              <p className="text-sm text-muted-foreground mb-2">
                指定したテーブルのメタデータ情報を表示します
              </p>
              <div className="bg-muted p-2 rounded-md font-mono text-sm">
                npm run dataverse:metadata account
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-1">dataverse:guide</h4>
              <p className="text-sm text-muted-foreground mb-2">
                指定したテーブルの pac CLI 使用ガイドを表示します
              </p>
              <div className="bg-muted p-2 rounded-md font-mono text-sm">
                npm run dataverse:guide contact
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-1">dataverse:list</h4>
              <p className="text-sm text-muted-foreground mb-2">
                利用可能なサンプルテーブル一覧を表示します
              </p>
              <div className="bg-muted p-2 rounded-md font-mono text-sm">
                npm run dataverse:list
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-1">dataverse:commands</h4>
              <p className="text-sm text-muted-foreground mb-2">
                指定したテーブル用の pac CLI コマンドを生成します
              </p>
              <div className="bg-muted p-2 rounded-md font-mono text-sm">
                npm run dataverse:commands account
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
