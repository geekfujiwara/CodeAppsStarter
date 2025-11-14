import { useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Bar,
  BarChart,
  Pie,
  PieChart,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import type { LearnModule } from "@/lib/learn-client"

interface ChartsDashboardProps {
  modules: LearnModule[]
}

export function ChartsDashboard({ modules }: ChartsDashboardProps) {
  // レベル別モジュール数
  const levelData = useMemo(() => {
    const levelCounts = new Map<string, number>()
    modules.forEach((module) => {
      module.levels.forEach((level) => {
        levelCounts.set(level, (levelCounts.get(level) || 0) + 1)
      })
    })
    return Array.from(levelCounts.entries()).map(([level, count]) => ({
      level,
      count,
    }))
  }, [modules])

  // ロール別モジュール数（上位10件）
  const roleData = useMemo(() => {
    const roleCounts = new Map<string, number>()
    modules.forEach((module) => {
      module.roles.forEach((role) => {
        roleCounts.set(role, (roleCounts.get(role) || 0) + 1)
      })
    })
    return Array.from(roleCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([role, count]) => ({
        role: role.length > 15 ? role.substring(0, 15) + "..." : role,
        fullRole: role,
        count,
      }))
  }, [modules])

  // 製品別モジュール数（上位8件）
  const productData = useMemo(() => {
    const productCounts = new Map<string, number>()
    modules.forEach((module) => {
      module.products.forEach((product) => {
        productCounts.set(product, (productCounts.get(product) || 0) + 1)
      })
    })
    const sorted = Array.from(productCounts.entries()).sort((a, b) => b[1] - a[1])
    return sorted.slice(0, 8).map(([product, count]) => ({
      product: product.length > 20 ? product.substring(0, 20) + "..." : product,
      fullProduct: product,
      count,
    }))
  }, [modules])

  // 学習時間の分布
  const durationData = useMemo(() => {
    const ranges = [
      { label: "0-30分", min: 0, max: 30, count: 0 },
      { label: "31-60分", min: 31, max: 60, count: 0 },
      { label: "61-120分", min: 61, max: 120, count: 0 },
      { label: "121-180分", min: 121, max: 180, count: 0 },
      { label: "181分以上", min: 181, max: Infinity, count: 0 },
    ]

    modules.forEach((module) => {
      const duration = module.durationInMinutes
      const range = ranges.find((r) => duration >= r.min && duration <= r.max)
      if (range) range.count++
    })

    return ranges
  }, [modules])

  // ペールカラー（淡い色）のカラーパレット
  const COLORS = ["#93c5fd", "#c4b5fd", "#86efac", "#fcd34d", "#fca5a5", "#67e8f9", "#f9a8d4", "#a5b4fc"]

  // カスタムツールチップコンポーネント
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ value: number; name: string; payload: { fullRole?: string; fullProduct?: string } }> }) => {
    if (active && payload && payload.length) {
      return (
        <Card className="shadow-lg border-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              {payload[0].payload.fullRole || payload[0].payload.fullProduct || payload[0].name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-2xl font-bold text-primary">{payload[0].value}</p>
            <p className="text-xs text-muted-foreground">モジュール数</p>
          </CardContent>
        </Card>
      )
    }
    return null
  }

  const PieTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ value: number; payload: { fullProduct: string } }> }) => {
    if (active && payload && payload.length) {
      return (
        <Card className="shadow-lg border-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{payload[0].payload.fullProduct}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-2xl font-bold text-primary">{payload[0].value}</p>
            <p className="text-xs text-muted-foreground">モジュール数</p>
            <div className="pt-1 border-t">
              <p className="text-xs">
                全体の <span className="font-semibold">{((payload[0].value / modules.length) * 100).toFixed(1)}%</span>
              </p>
            </div>
          </CardContent>
        </Card>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* レベル別モジュール数 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">レベル別モジュール数</CardTitle>
            <CardDescription>学習難易度の分布</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={levelData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="level" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="count" name="モジュール数" fill="#93c5fd" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 学習時間の分布 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">学習時間の分布</CardTitle>
            <CardDescription>所要時間別のモジュール数</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={durationData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="label" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="count" name="モジュール数" fill="#86efac" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* ロール別モジュール数（上位10件） */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">ロール別モジュール数</CardTitle>
            <CardDescription>対象ロール上位10件</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={roleData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" className="text-xs" />
                <YAxis dataKey="role" type="category" width={120} className="text-xs" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="モジュール数" fill="#c4b5fd" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 製品別モジュール数（円グラフ） */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">製品別モジュール数</CardTitle>
            <CardDescription>対象製品上位8件</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={productData}
                  dataKey="count"
                  nameKey="product"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={(entry) => entry.product}
                >
                  {productData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
