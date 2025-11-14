import { useState } from "react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { GripVertical } from "lucide-react"

interface Task {
  id: string
  title: string
  priority: "high" | "medium" | "low"
  status: string
  category: "development" | "design" | "testing" | "documentation"
}

interface SortableTaskItemProps {
  task: Task
}

function SortableTaskItem({ task }: SortableTaskItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const priorityColors = {
    high: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    low: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  }

  const categoryConfig = {
    development: { label: "開発", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" },
    design: { label: "デザイン", color: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300" },
    testing: { label: "テスト", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
    documentation: { label: "ドキュメント", color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300" },
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-lg border bg-card p-4 hover:bg-accent/50 transition-colors"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing touch-none"
      >
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </button>
      <div className="flex-1 space-y-1">
        <p className="font-medium text-foreground">{task.title}</p>
        <p className="text-sm text-muted-foreground">{task.status}</p>
      </div>
      <div className="flex items-center gap-2">
        <Badge className={categoryConfig[task.category].color}>
          {categoryConfig[task.category].label}
        </Badge>
        <Badge className={priorityColors[task.priority]}>
          {task.priority === "high" ? "高" : task.priority === "medium" ? "中" : "低"}
        </Badge>
      </div>
    </div>
  )
}

export function TaskPriorityList() {
  const [tasks, setTasks] = useState<Task[]>([
    { id: "1", title: "Power Apps フォームの実装", priority: "high", status: "進行中", category: "development" },
    { id: "2", title: "認証機能の追加", priority: "high", status: "未着手", category: "development" },
    { id: "3", title: "デザインシステムの統一", priority: "medium", status: "進行中", category: "design" },
    { id: "4", title: "API 連携のテスト", priority: "medium", status: "未着手", category: "testing" },
    { id: "5", title: "ドキュメントの更新", priority: "low", status: "未着手", category: "documentation" },
    { id: "6", title: "コードレビュー対応", priority: "low", status: "未着手", category: "development" },
  ])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setTasks((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over.id)

        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">タスク優先順位管理</CardTitle>
        <CardDescription>
          ドラッグ＆ドロップでタスクの優先順位を変更できます
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={tasks.map((task) => task.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {tasks.map((task) => (
                <SortableTaskItem key={task.id} task={task} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </CardContent>
    </Card>
  )
}
