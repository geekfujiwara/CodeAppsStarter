import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Combobox } from "@/components/ui/combobox"
import { CodeBlock } from "@/components/code-block"
import { useLearnCatalog } from "@/hooks/use-learn-catalog"
import { LinkConfirmModal, useLinkModal } from "@/components/link-confirm-modal"
import { LoadingSkeletonGrid } from "@/components/loading-skeleton"
import { TaskPriorityList } from "@/components/task-priority-list"
import { GanttChart } from "@/components/gantt-chart"
import { KanbanBoard } from "@/components/kanban-board"
import { ChartDashboard } from "@/components/chart-dashboard"
import { AlertCircle, BookOpen, Clock, ExternalLink, Layers, RefreshCw, Target, List, X } from "lucide-react"
import type { LearnAuxiliaryItem } from "@/lib/learn-client"

const ITEMS_PER_PAGE = 9

// Badge の色を決定するヘルパー関数
function getBadgeColorClass(text: string): string {
  const lowerText = text.toLowerCase()
  
  // レベルに基づく色分け
  if (lowerText.includes('beginner') || lowerText.includes('初級')) {
    return 'bg-[var(--badge-beginner)] text-[var(--badge-beginner-foreground)] hover:bg-[var(--badge-beginner)]/80'
  }
  if (lowerText.includes('intermediate') || lowerText.includes('中級')) {
    return 'bg-[var(--badge-intermediate)] text-[var(--badge-intermediate-foreground)] hover:bg-[var(--badge-intermediate)]/80'
  }
  if (lowerText.includes('advanced') || lowerText.includes('上級') || lowerText.includes('expert')) {
    return 'bg-[var(--badge-advanced)] text-[var(--badge-advanced-foreground)] hover:bg-[var(--badge-advanced)]/80'
  }
  
  // ロールに基づく色分け
  if (lowerText.includes('administrator') || lowerText.includes('管理者')) {
    return 'bg-[var(--badge-administrator)] text-[var(--badge-administrator-foreground)] hover:bg-[var(--badge-administrator)]/80'
  }
  if (lowerText.includes('developer') || lowerText.includes('開発者')) {
    return 'bg-[var(--badge-developer)] text-[var(--badge-developer-foreground)] hover:bg-[var(--badge-developer)]/80'
  }
  
  // デフォルト
  return ''
}

function flattenItems(items: LearnAuxiliaryItem[]): LearnAuxiliaryItem[] {
  const result: LearnAuxiliaryItem[] = []

  const traverse = (nodeList: LearnAuxiliaryItem[]) => {
    for (const node of nodeList) {
      result.push({ id: node.id, name: node.name })
      if (node.children?.length) {
        traverse(node.children)
      }
    }
  }

  traverse(items)
  return result
}

export default function DesignShowcasePage() {
  const queryOptions = useMemo(() => ({ top: 300 }), [])
  const { data, isLoading, isError, error, refetch, summary } = useLearnCatalog(queryOptions)
  const { modalData, openModal, closeModal } = useLinkModal()

  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [productFilter, setProductFilter] = useState("all")
  const [levelFilter, setLevelFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [isTocOpen, setIsTocOpen] = useState(true)

  const modules = useMemo(() => data?.modules ?? [], [data?.modules])
  const certifications = useMemo(() => data?.certifications ?? [], [data?.certifications])

  const flattenedProducts = useMemo(() => flattenItems(data?.products ?? []), [data?.products])
  const flattenedRoles = useMemo(() => flattenItems(data?.roles ?? []), [data?.roles])

  const productNameMap = useMemo(() => {
    return new Map(flattenedProducts.map((item) => [item.id, item.name]))
  }, [flattenedProducts])

  const roleNameMap = useMemo(() => {
    return new Map(flattenedRoles.map((item) => [item.id, item.name]))
  }, [flattenedRoles])

  const levelOptions = useMemo(() => {
    if (!data?.levels) return []
    const levels = data.levels.map((level) =>
      typeof level === "string" ? level : (level as { id?: string; name?: string }).id ?? (level as { id?: string; name?: string }).name ?? String(level)
    )
    return Array.from(new Set(levels))
  }, [data?.levels])

  const roleOptions = useMemo(() => {
    const fromModules = modules.flatMap((module) => module.roles)
    const ids = fromModules.map((r) =>
      typeof r === "string" ? r : (r as { id?: string }).id ?? String(r)
    )
    return Array.from(new Set(ids))
  }, [modules])

  const productOptions = useMemo(() => {
    const fromModules = modules.flatMap((module) => module.products)
    const ids = fromModules.map((p) =>
      typeof p === "string" ? p : (p as { id?: string }).id ?? String(p)
    )
    return Array.from(new Set(ids))
  }, [modules])

  const filteredModules = useMemo(() => {
    return modules.filter((module) => {
      const matchesSearch = searchQuery
        ? module.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          module.summary.toLowerCase().includes(searchQuery.toLowerCase())
        : true

      const matchesRole =
        roleFilter === "all" ||
        module.roles.some((r) => {
          const id = typeof r === "string" ? r : (r as { id?: string }).id ?? String(r)
          return id === roleFilter
        })
      const matchesProduct =
        productFilter === "all" ||
        module.products.some((p) => {
          const id = typeof p === "string" ? p : (p as { id?: string }).id ?? String(p)
          return id === productFilter
        })
      const matchesLevel = levelFilter === "all" || module.levels.includes(levelFilter)

      return matchesSearch && matchesRole && matchesProduct && matchesLevel
    })
  }, [modules, searchQuery, roleFilter, productFilter, levelFilter])

  const totalPages = Math.max(1, Math.ceil(filteredModules.length / ITEMS_PER_PAGE))

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, roleFilter, productFilter, levelFilter])

  const paginatedModules = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredModules.slice(startIndex, startIndex + ITEMS_PER_PAGE)
  }, [filteredModules, currentPage])

  const handleOpenModule = (url: string, title: string, summary: string) => {
    openModal(url, title, summary)
  }

  const featuredCertifications = useMemo(() => certifications.slice(0, 6), [certifications])

  const handleOpenCertification = (url: string, title: string, summary: string) => {
    openModal(url, title, summary)
  }

  // ページネーション番号を生成（1,2,3,4,5...最後）
  const getPaginationNumbers = () => {
    const pages: (number | string)[] = []
    const maxVisible = 5 // 最大表示ページ数

    if (totalPages <= maxVisible + 1) {
      // ページ数が少ない場合は全て表示
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // 1,2,3,4,5を表示
      for (let i = 1; i <= Math.min(maxVisible, totalPages); i++) {
        pages.push(i)
      }
      // 省略記号
      if (totalPages > maxVisible) {
        pages.push("...")
      }
      // 最後のページ
      if (totalPages > maxVisible) {
        pages.push(totalPages)
      }
    }

    return pages
  }

  return (
    <div className="w-full max-w-full px-4 pb-8 pt-6">
      {/* ヘッダーセクション - グリッドレイアウト */}
      <div className={`grid grid-cols-1 gap-8 mb-8 w-full max-w-full ${isTocOpen ? 'lg:grid-cols-[280px_1fr]' : 'lg:grid-cols-[32px_1fr]'}`}>
        {/* 左側空白（目次用スペース確保） */}
        <div className="hidden lg:block"></div>
        
        {/* ヘッダーコンテンツ */}
        <header className="min-w-0 w-full">
          <div className="space-y-1 min-w-0">
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">実装サンプル</h1>
            <p className="text-sm text-muted-foreground sm:text-base">
              デザインテンプレート集です。ギャラリー表示、検索、フィルタリング、ページネーションやカンバンビュー、ガントチャート、フォームの実装例です。開発のテンプレートとしてご利用いただけます。
            </p>
          </div>
        </header>
      </div>

      {/* メインコンテンツ - グリッドレイアウト */}
      <div className={`grid grid-cols-1 gap-8 w-full max-w-full ${isTocOpen ? 'lg:grid-cols-[280px_1fr]' : 'lg:grid-cols-[32px_1fr]'}`}>
        {/* 目次サイドバー */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto">
            <button
              onClick={() => setIsTocOpen(!isTocOpen)}
              className={`flex items-center gap-2 font-semibold hover:text-primary transition-colors ${isTocOpen ? 'text-lg mb-4' : 'p-1 mb-2'}`}
              title={isTocOpen ? '目次を閉じる' : '目次を開く'}
            >
              {isTocOpen ? <X className="h-5 w-5" /> : <List className="h-5 w-5" />}
              {isTocOpen && '目次'}
            </button>
            {isTocOpen && (
              <nav className="space-y-2">
                <a href="#dashboard" className="block text-sm text-muted-foreground hover:text-white hover:bg-accent rounded-md px-3 py-2 transition-colors">
                  データ可視化ダッシュボード
                </a>
                <a href="#stats" className="block text-sm text-muted-foreground hover:text-white hover:bg-accent rounded-md px-3 py-2 transition-colors">
                  統計カード
                </a>
                <a href="#gallery" className="block text-sm text-muted-foreground hover:text-white hover:bg-accent rounded-md px-3 py-2 transition-colors">
                  ギャラリー
                </a>
                <a href="#priority" className="block text-sm text-muted-foreground hover:text-white hover:bg-accent rounded-md px-3 py-2 transition-colors">
                  優先順位管理
                </a>
                <a href="#kanban" className="block text-sm text-muted-foreground hover:text-white hover:bg-accent rounded-md px-3 py-2 transition-colors">
                  カンバンボード
                </a>
                <a href="#gantt" className="block text-sm text-muted-foreground hover:text-white hover:bg-accent rounded-md px-3 py-2 transition-colors">
                  ガントチャート
                </a>
              </nav>
            )}
          </div>
        </aside>

        {/* メインコンテンツ */}
        <main className="space-y-8 min-w-0">
      {/* デザインテンプレート: グラフダッシュボード */}
      <div className="space-y-3" id="dashboard">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">📈 データ可視化ダッシュボード</h2>
          <p className="text-sm text-muted-foreground">
            複数のグラフを組み合わせたデータ分析ダッシュボード
          </p>
          <details className="text-sm">
            <summary className="cursor-pointer font-medium text-primary hover:underline">
              GitHub Copilot への指示例
            </summary>
            <div className="mt-2 space-y-2">
              <CodeBlock
                code="recharts と shadcn/ui の ChartContainer を使って、[あなたのデータ]を BarChart、PieChart、LineChart で可視化するダッシュボードを作成して。ChartTooltip でデータ詳細を表示"
                language="text"
                description="複数のグラフでデータを多角的に分析したい場合に使用します"
              />
              <CodeBlock
                code="Card コンポーネント内に recharts のグラフを配置し、2列グリッドレイアウトで表示。各グラフに ChartTooltipContent を追加してカスタムツールチップを実装"
                language="text"
                description="データ分析ダッシュボードを構築する際に活用できます"
              />
            </div>
          </details>
        </div>
      </div>

      <ChartDashboard />

      {/* デザインテンプレート: 統計カード */}
      <div className="space-y-3" id="stats">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">📊 統計カード</h2>
          <p className="text-sm text-muted-foreground">
            アイコン付きのサマリーカードで重要な指標を表示
          </p>
          <details className="text-sm">
            <summary className="cursor-pointer font-medium text-primary hover:underline">
              GitHub Copilot への指示例
            </summary>
            <div className="mt-2 space-y-2">
              <CodeBlock
                code="shadcn/ui の Card コンポーネントを使って、[あなたのデータ項目]のアイコン、タイトル、大きな数値、説明文を含む統計カードを4列のグリッドで作成して"
                language="text"
                description="重要な指標を視覚的に表示したい場合に使用します"
              />
              <CodeBlock
                code="CardHeader と CardContent コンポーネントを使って、[あなたのAPI]から取得した[データ種別]の統計情報を表示するサマリーカードを作成"
                language="text"
                description="ダッシュボードのサマリーセクションを構築する際に活用できます"
              />
            </div>
          </details>
        </div>
      </div>

      {/* Summary cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">モジュール</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.moduleCount ?? "--"}</div>
            <p className="text-xs text-muted-foreground">サンプルとして取得したモジュール数</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ラーニング パス</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.learningPathCount ?? "--"}</div>
            <p className="text-xs text-muted-foreground">分析対象のラーニング パス数</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">認定資格</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.certificationCount ?? "--"}</div>
            <p className="text-xs text-muted-foreground">取得対象の認定資格数</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均学習時間</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.averageDuration ?? "--"}分</div>
            <p className="text-xs text-muted-foreground">モジュール単位の平均所要時間</p>
          </CardContent>
        </Card>
      </section>

      {/* デザインテンプレート: カード */}
      {!isLoading && featuredCertifications.length > 0 && (
        <div className="space-y-3">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">🎓 カード</h2>
            <p className="text-sm text-muted-foreground">
              情報をカード形式で表示し、詳細ページへのリンクを提供
            </p>
            <details className="text-sm">
              <summary className="cursor-pointer font-medium text-primary hover:underline">
                GitHub Copilot への指示例
              </summary>
              <div className="mt-2 space-y-2">
                <CodeBlock
                  code="Card、CardHeader、CardContent、Badge、Button コンポーネントを使って、[あなたのデータ項目]のタイトル、説明、[カテゴリ]バッジ、アクションボタンを含むカードを3列グリッドで作成して"
                  language="text"
                  description="製品や認定資格などの一覧表示に適しています"
                />
                <CodeBlock
                  code="Badge コンポーネントで[属性]タグを表示し、Button コンポーネントで詳細ページへのリンクを持つ[あなたのデータ名]カードギャラリーを作成"
                  language="text"
                  description="詳細情報へのリンク付きカードギャラリーを実装する際に使用します"
                />
              </div>
            </details>
          </div>
        </div>
      )}

      {!isLoading && featuredCertifications.length > 0 && (
        <section id="certifications" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featuredCertifications.map((certification) => (
            <Card key={certification.uid} className="border-secondary/30">
              <CardHeader className="space-y-2">
                <CardTitle className="text-base font-semibold text-foreground">
                  {certification.title}
                </CardTitle>
                <CardDescription className="text-sm leading-6 text-muted-foreground line-clamp-3">
                  {certification.summary}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {certification.products.slice(0, 3).map((product) => (
                    <Badge key={`${certification.uid}-product-${product}`} className={getBadgeColorClass(productNameMap.get(product) ?? product)}>
                      {productNameMap.get(product) ?? product}
                    </Badge>
                  ))}
                </div>
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => handleOpenCertification(certification.url, certification.title, certification.summary)}
                >
                  <Target className="h-4 w-4" />
                  Learn 認定資格を見る
                </Button>
              </CardContent>
            </Card>
          ))}
        </section>
      )}

      {/* デザインテンプレート: 検索・フィルター */}
      <div className="space-y-3">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">🔍 検索とフィルター</h2>
          <p className="text-sm text-muted-foreground">
            検索バーと複数のドロップダウンフィルターを組み合わせたデータ絞り込み機能
          </p>
          <details className="text-sm">
            <summary className="cursor-pointer font-medium text-primary hover:underline">
              GitHub Copilot への指示例
            </summary>
            <div className="mt-2 space-y-2">
              <CodeBlock
                code="Input コンポーネントで検索フィールドを作成し、Combobox コンポーネントで[フィルター項目数]つのドロップダウンフィルターを含むフィルターセクションを作成。各 Combobox は検索可能に"
                language="text"
                description="大量のデータから条件に合う項目を絞り込む機能が必要な場合に使用します"
              />
              <CodeBlock
                code="Card コンポーネント内に Input と Combobox を配置して検索・フィルター機能を実装。[フィルター条件1]、[フィルター条件2]、[フィルター条件3]で絞り込み可能にして"
                language="text"
                description="複数の条件を組み合わせた高度な検索機能を実装する際に活用できます"
              />
            </div>
          </details>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">検索とフィルター</CardTitle>
          <CardDescription>要件に合わせてモジュールを絞り込みます。</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2 lg:col-span-2">
              <Input
                placeholder="モジュール名・概要を検索"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
            <Combobox
              value={roleFilter}
              onValueChange={setRoleFilter}
              options={[
                { value: "all", label: "すべてのロール" },
                ...roleOptions.map((role) => ({
                  value: role,
                  label: roleNameMap.get(role) ?? role,
                })),
              ]}
              searchPlaceholder="ロールを検索..."
              placeholder="ロールを選択"
              emptyMessage="ロールが見つかりません"
            />
            <Combobox
              value={levelFilter}
              onValueChange={setLevelFilter}
              options={[
                { value: "all", label: "すべてのレベル" },
                ...levelOptions.map((level) => ({
                  value: level,
                  label: level,
                })),
              ]}
              searchPlaceholder="レベルを検索..."
              placeholder="レベルを選択"
              emptyMessage="レベルが見つかりません"
            />
            <Combobox
              value={productFilter}
              onValueChange={setProductFilter}
              options={[
                { value: "all", label: "すべての製品" },
                ...productOptions.map((product) => ({
                  value: product,
                  label: productNameMap.get(product) ?? product,
                })),
              ]}
              searchPlaceholder="製品を検索..."
              placeholder="製品を選択"
              emptyMessage="製品が見つかりません"
            />
          </div>
        </CardContent>
      </Card>

      {/* デザインテンプレート: ギャラリー表示 */}
      {!isLoading && !isError && filteredModules.length > 0 && (
        <div className="space-y-3" id="gallery">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">🎨 ギャラリー</h2>
            <p className="text-sm text-muted-foreground">
              カード形式のギャラリー表示とページネーション機能
            </p>
            <details className="text-sm">
              <summary className="cursor-pointer font-medium text-primary hover:underline">
                GitHub Copilot への指示例
              </summary>
              <div className="mt-2 space-y-2">
                <CodeBlock
                  code="Card コンポーネントを使って[あなたのデータ]のタイトル、概要、Badge コンポーネントで属性を表示し、Button コンポーネントでアクションを含むカードを3列グリッドで表示。ページネーション付き"
                  language="text"
                  description="大量のアイテムをページごとに分けて表示したい場合に使用します"
                />
                <CodeBlock
                  code="CardHeader、CardDescription、CardContent コンポーネントを使って[あなたのAPI]データをカード形式で表示するギャラリー。フィルター結果に応じて動的にページネーションを更新"
                  language="text"
                  description="検索・フィルター機能と連携したカードギャラリーを実装する際に活用できます"
                />
              </div>
            </details>
          </div>
        </div>
      )}

      {/* Loading state */}
      {isLoading && <LoadingSkeletonGrid columns={3} count={ITEMS_PER_PAGE} variant="detailed" />}

      {/* Error state */}
      {isError && (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardHeader className="flex flex-row items-start gap-4">
            <AlertCircle className="h-6 w-6 text-destructive" />
            <div className="space-y-1">
              <CardTitle className="text-lg">データの読み込みに失敗しました</CardTitle>
              <CardDescription>{error?.message}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => refetch()} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              リトライ
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {!isLoading && !isError && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {filteredModules.length} 件のモジュールが見つかりました
            </p>
            {filteredModules.length > 0 && (
              <p className="text-xs text-muted-foreground">
                表示件数: {paginatedModules.length} / {filteredModules.length}
              </p>
            )}
          </div>

          {filteredModules.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                条件に一致するモジュールが見つかりませんでした
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {paginatedModules.map((module) => (
                <Card key={module.uid} className="flex h-full flex-col justify-between">
                  <CardHeader className="space-y-3">
                    <CardTitle className="line-clamp-2 text-xl leading-7 text-foreground">
                      {module.title}
                    </CardTitle>
                    <CardDescription className="line-clamp-3 text-sm leading-6 text-muted-foreground">
                      {module.summary}
                    </CardDescription>
                    <div className="flex flex-wrap gap-2">
                      {module.levels.map((level) => (
                        <Badge key={`${module.uid}-${level}`} className={getBadgeColorClass(level)}>
                          {level}
                        </Badge>
                      ))}
                      {module.roles.slice(0, 3).map((role) => (
                        <Badge key={`${module.uid}-role-${role}`} className={getBadgeColorClass(roleNameMap.get(role) ?? role)}>
                          {roleNameMap.get(role) ?? role}
                        </Badge>
                      ))}
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4">
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {module.products.map((product) => (
                        <span key={`${module.uid}-product-${product}`} className="rounded-full bg-muted px-3 py-1">
                          {productNameMap.get(product) ?? product}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>学習時間: 約 {module.durationInMinutes} 分</span>
                      {module.lastModified && <span>更新: {module.lastModified.substring(0, 10)}</span>}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        className="flex-1 gap-2"
                        onClick={() => handleOpenModule(module.url, module.title, module.summary)}
                      >
                        <ExternalLink className="h-4 w-4" />
                        Learn で開く
                      </Button>
                      <Button asChild variant="outline">
                        <Link to={`/guide?module=${encodeURIComponent(module.uid)}`} className="gap-2">
                          <BookOpen className="h-4 w-4" />
                          ガイド連携
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {filteredModules.length > ITEMS_PER_PAGE && (
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button
                variant="outline"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
                className="w-full sm:w-auto"
              >
                前へ
              </Button>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {getPaginationNumbers().map((pageNumber, index) => {
                  if (pageNumber === "...") {
                    return (
                      <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">
                        ...
                      </span>
                    )
                  }
                  return (
                    <Button
                      key={pageNumber}
                      variant={pageNumber === currentPage ? "default" : "outline"}
                      onClick={() => setCurrentPage(pageNumber as number)}
                      className="h-10 w-10"
                    >
                      {pageNumber}
                    </Button>
                  )
                })}
              </div>
              <Button
                variant="outline"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
                className="w-full sm:w-auto"
              >
                次へ
              </Button>
            </div>
          )}
        </div>
      )}

      {/* デザインテンプレート: ドラッグ&ドロップ タスク管理 */}
      <div className="space-y-3" id="priority">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">🎯 優先順位管理</h2>
          <p className="text-sm text-muted-foreground">
            ドラッグ&ドロップでタスクの並び順を変更できるインタラクティブなリスト
          </p>
          <details className="text-sm">
            <summary className="cursor-pointer font-medium text-primary hover:underline">
              GitHub Copilot への指示例
            </summary>
            <div className="mt-2 space-y-2">
              <CodeBlock
                code="@dnd-kit/core と useSortable フックを使って、Badge コンポーネントで[属性]を表示する[あなたのアイテム]をドラッグ&ドロップで並び替えられるリストを作成して"
                language="text"
                description="タスクやアイテムの優先順位を直感的に変更できる機能が必要な場合に使用します"
              />
              <CodeBlock
                code="SortableContext と verticalListSortingStrategy を使って優先度付き[アイテム名]リスト。各[アイテム]に GripVertical アイコンと Badge コンポーネントで[属性]バッジを表示。ドラッグで順序変更可能に"
                language="text"
                description="インタラクティブな並び替え機能を持つリストコンポーネントを実装する際に活用できます"
              />
            </div>
          </details>
        </div>
      </div>

      <TaskPriorityList />

      {/* デザインテンプレート: カンバンボード */}
      <div className="space-y-3" id="kanban">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">📋 カンバンボード</h2>
          <p className="text-sm text-muted-foreground">
            タスクをドラッグ&ドロップでステータス間を移動できるカンバンビュー
          </p>
          <details className="text-sm">
            <summary className="cursor-pointer font-medium text-primary hover:underline">
              GitHub Copilot への指示例
            </summary>
            <div className="mt-2 space-y-2">
              <CodeBlock
                code="@dnd-kit/core の DndContext と SortableContext を使って、Card と Badge コンポーネントで表示する[あなたのタスク]を[ステータス1]、[ステータス2]、[ステータス3]の3列に分けたカンバンボードを作成して"
                language="text"
                description="タスクの進捗状況を視覚的に管理したい場合に使用します"
              />
              <CodeBlock
                code="useSortable フックと DragOverlay を使ってドラッグ&ドロップ対応のカンバンビュー。各カラムに Card コンポーネントでタスクカードを表示し、GripVertical アイコンでドラッグ可能に。カラム間でタスクを移動できるように"
                language="text"
                description="アジャイル開発やタスク管理ツールを実装する際に活用できます"
              />
            </div>
          </details>
        </div>
      </div>

      <KanbanBoard />

      {/* デザインテンプレート: ガントチャート */}
      <div className="space-y-3" id="gantt">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">📅 ガントチャート</h2>
          <p className="text-sm text-muted-foreground">
            タスクをドラッグで移動、ハンドルで期間変更できるインタラクティブなガントチャート
          </p>
          <details className="text-sm">
            <summary className="cursor-pointer font-medium text-primary hover:underline">
              GitHub Copilot への指示例
            </summary>
            <div className="mt-2 space-y-2">
              <CodeBlock
                code="@dnd-kit/core を使って[あなたのタスク]をドラッグで移動できるガントチャートを作成。Card コンポーネントで各タスクを表示し、開始日と終了日を視覚的に表示"
                language="text"
                description="プロジェクトのスケジュールやタイムラインを視覚化したい場合に使用します"
              />
              <CodeBlock
                code="DndContext と useSortable フックを使ったガントチャートコンポーネント。各タスクバーの両端にハンドルを配置し、ドラッグで[期間]を変更できるように。Badge コンポーネントで優先度を表示"
                language="text"
                description="インタラクティブなプロジェクト管理ツールを実装する際に活用できます"
              />
            </div>
          </details>
        </div>
      </div>

      <GanttChart />

      </main>
      </div>

      <LinkConfirmModal
        isOpen={modalData.isOpen}
        onClose={closeModal}
        url={modalData.url}
        title={modalData.title}
        description={modalData.description}
      />
    </div>
  )
}
