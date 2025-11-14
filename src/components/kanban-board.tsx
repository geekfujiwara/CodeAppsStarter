import { useState } from "react"
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { KanbanColumn } from "./kanban-column"
import { KanbanTaskCard } from "./kanban-task-card"

export interface KanbanTask {
  id: string
  title: string
  description: string
  priority: "high" | "medium" | "low"
  category: "development" | "design" | "testing" | "documentation"
  status: "todo" | "in-progress" | "done"
}

export function KanbanBoard() {
  const [tasks, setTasks] = useState<KanbanTask[]>([
    {
      id: "1",
      title: "Power Apps フォームの実装",
      description: "ユーザー入力フォームのデザインと実装",
      priority: "high",
      category: "development",
      status: "in-progress",
    },
    {
      id: "2",
      title: "認証機能の追加",
      description: "Microsoft Entra ID を使用した認証機能",
      priority: "high",
      category: "development",
      status: "todo",
    },
    {
      id: "3",
      title: "デザインシステムの統一",
      description: "shadcn/ui コンポーネントの統合",
      priority: "medium",
      category: "design",
      status: "in-progress",
    },
    {
      id: "4",
      title: "API 連携のテスト",
      description: "外部 API との接続確認とエラーハンドリング",
      priority: "medium",
      category: "testing",
      status: "todo",
    },
    {
      id: "5",
      title: "ドキュメントの更新",
      description: "README とユーザーガイドの更新",
      priority: "low",
      category: "documentation",
      status: "todo",
    },
    {
      id: "6",
      title: "コードレビュー対応",
      description: "指摘事項の修正と改善",
      priority: "low",
      category: "development",
      status: "done",
    },
    {
      id: "7",
      title: "レスポンシブデザイン対応",
      description: "モバイル・タブレット表示の最適化",
      priority: "medium",
      category: "design",
      status: "done",
    },
  ])

  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const columns = [
    { id: "todo", title: "未着手", status: "todo" as const },
    { id: "in-progress", title: "進行中", status: "in-progress" as const },
    { id: "done", title: "完了", status: "done" as const },
  ]

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    const activeTask = tasks.find((task) => task.id === activeId)
    if (!activeTask) return

    // ドロップ先がカラムかタスクかを判定
    const overColumn = columns.find((col) => col.id === overId)
    const overTask = tasks.find((task) => task.id === overId)

    if (overColumn) {
      // カラムにドロップした場合
      setTasks((tasks) =>
        tasks.map((task) =>
          task.id === activeId ? { ...task, status: overColumn.status } : task
        )
      )
    } else if (overTask) {
      // タスクの上にドロップした場合
      const activeIndex = tasks.findIndex((task) => task.id === activeId)
      const overIndex = tasks.findIndex((task) => task.id === overId)

      if (activeTask.status !== overTask.status) {
        // 異なるカラム間の移動
        setTasks((tasks) => {
          const newTasks = tasks.map((task) =>
            task.id === activeId ? { ...task, status: overTask.status } : task
          )
          const newActiveIndex = newTasks.findIndex((task) => task.id === activeId)
          const newOverIndex = newTasks.findIndex((task) => task.id === overId)
          return arrayMove(newTasks, newActiveIndex, newOverIndex)
        })
      } else {
        // 同じカラム内での並び替え
        setTasks((tasks) => arrayMove(tasks, activeIndex, overIndex))
      }
    }
  }

  const activeTask = activeId ? tasks.find((task) => task.id === activeId) : null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">カンバンボード</CardTitle>
        <CardDescription>
          ドラッグ＆ドロップでタスクのステータスを変更できます
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {columns.map((column) => {
              const columnTasks = tasks.filter((task) => task.status === column.status)
              return (
                <KanbanColumn key={column.id} column={column} tasks={columnTasks} />
              )
            })}
          </div>
          <DragOverlay>
            {activeTask ? (
              <div className="rotate-3 opacity-80">
                <KanbanTaskCard task={activeTask} isDragging />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </CardContent>
    </Card>
  )
}
