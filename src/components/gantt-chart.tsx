import { useState, useRef, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Combobox } from "@/components/ui/combobox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronDown, ChevronRight, Plus, Trash2, GripVertical } from "lucide-react"
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

type TaskStatus = "未着手" | "進行中" | "完了"

interface GanttTask {
  id: string
  title: string
  startDate: Date
  endDate: Date
  progress: number
  color: string
  workPackageId: string
  status: TaskStatus
  assignee: string
}

interface GanttWorkPackage {
  id: string
  title: string
  phaseId: string
  collapsed: boolean
}

interface GanttPhase {
  id: string
  title: string
  projectId: string
  collapsed: boolean
}

interface GanttProject {
  id: string
  title: string
  collapsed: boolean
}

interface GanttBarProps {
  task: GanttTask
  startUnitIndex: number
  endUnitIndex: number
  unitWidth: number
  onResizeStart: (taskId: string, newStart: Date) => void
  onResizeEnd: (taskId: string, newEnd: Date) => void
  onMove: (taskId: string, newStart: Date, newEnd: Date) => void
}

function GanttBar({ task, startUnitIndex, endUnitIndex, unitWidth, onResizeStart, onResizeEnd, onMove }: GanttBarProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isResizingStart, setIsResizingStart] = useState(false)
  const [isResizingEnd, setIsResizingEnd] = useState(false)
  const dragInfoRef = useRef<{
    startX: number
    startDate: Date
    endDate: Date
    startUnitIndex: number
  } | null>(null)

  const unitCount = endUnitIndex - startUnitIndex + 1
  const leftPx = startUnitIndex * unitWidth
  const widthPx = unitCount * unitWidth

  const handleMouseDown = (e: React.MouseEvent, type: "move" | "resize-start" | "resize-end") => {
    e.preventDefault()
    e.stopPropagation()
    
    // ドラッグ開始時の情報を保存
    dragInfoRef.current = {
      startX: e.clientX,
      startDate: new Date(task.startDate),
      endDate: new Date(task.endDate),
      startUnitIndex: startUnitIndex,
    }

    if (type === "move") {
      setIsDragging(true)
    } else if (type === "resize-start") {
      setIsResizingStart(true)
    } else if (type === "resize-end") {
      setIsResizingEnd(true)
    }

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!dragInfoRef.current) return
      
      const deltaX = moveEvent.clientX - dragInfoRef.current.startX
      const unitsDiff = Math.round(deltaX / unitWidth)

      if (type === "move") {
        // 移動: 元の日付から相対的に計算
        const newStart = new Date(dragInfoRef.current.startDate)
        newStart.setDate(dragInfoRef.current.startDate.getDate() + unitsDiff)
        const newEnd = new Date(dragInfoRef.current.endDate)
        newEnd.setDate(dragInfoRef.current.endDate.getDate() + unitsDiff)
        onMove(task.id, newStart, newEnd)
      } else if (type === "resize-start" && unitsDiff !== 0) {
        const newStart = new Date(dragInfoRef.current.startDate)
        newStart.setDate(dragInfoRef.current.startDate.getDate() + unitsDiff)
        // 最低1日の期間を確保
        const minDate = new Date(task.endDate)
        minDate.setDate(task.endDate.getDate() - 1)
        if (newStart <= minDate) {
          onResizeStart(task.id, newStart)
        }
      } else if (type === "resize-end" && unitsDiff !== 0) {
        const newEnd = new Date(dragInfoRef.current.endDate)
        newEnd.setDate(dragInfoRef.current.endDate.getDate() + unitsDiff)
        // 最低1日の期間を確保
        const minDate = new Date(task.startDate)
        minDate.setDate(task.startDate.getDate() + 1)
        if (newEnd >= minDate) {
          onResizeEnd(task.id, newEnd)
        }
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      setIsResizingStart(false)
      setIsResizingEnd(false)
      dragInfoRef.current = null
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
  }

  return (
    <div
      className="absolute top-2 bottom-2 rounded-md transition-opacity"
      style={{
        left: `${leftPx}px`,
        width: `${widthPx}px`,
        backgroundColor: task.color,
        opacity: isDragging || isResizingStart || isResizingEnd ? 0.7 : 1,
        cursor: isDragging ? "grabbing" : "grab",
      }}
    >
      {/* 中央のドラッグエリア */}
      <div
        className="absolute inset-0 flex items-center justify-center px-2"
        onMouseDown={(e) => handleMouseDown(e, "move")}
      >
        <span className="text-xs font-medium text-white truncate">{task.title}</span>
      </div>

      {/* 開始ハンドル */}
      <div
        className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize bg-black/20 hover:bg-black/40 rounded-l-md z-10"
        onMouseDown={(e) => handleMouseDown(e, "resize-start")}
      />

      {/* 終了ハンドル */}
      <div
        className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize bg-black/20 hover:bg-black/40 rounded-r-md z-10"
        onMouseDown={(e) => handleMouseDown(e, "resize-end")}
      />
    </div>
  )
}

// Sortableアイテムコンポーネント
interface SortableItemProps {
  id: string
  children: React.ReactNode
  isDragging?: boolean
}

function SortableItem({ id, children }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <div className="flex items-stretch w-full">
        {/* ドラッグハンドル */}
        <div
          {...attributes}
          {...listeners}
          className="flex items-center px-1 cursor-grab active:cursor-grabbing hover:bg-muted/50 flex-shrink-0"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        {/* コンテンツ */}
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  )
}

export function GanttChart() {
  const [selectedProjectId, setSelectedProjectId] = useState<string>("p1")
  const [timeScale, setTimeScale] = useState<"list" | "1month" | "3months" | "months" | "6months" | "1year">("1month")
  const [leftPanelWidth, setLeftPanelWidth] = useState<number>(400) // ガント表示時の左側パネル幅
  const [isResizing, setIsResizing] = useState<boolean>(false)
  const [startX, setStartX] = useState<number>(0)
  const [startWidth, setStartWidth] = useState<number>(400)
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [filterStatus, setFilterStatus] = useState<TaskStatus | "all">("all")
  const [filterAssignee, setFilterAssignee] = useState<string>("all")
  const timelineScrollRef = useRef<HTMLDivElement>(null)
  const resizeRef = useRef<HTMLDivElement>(null)
  
  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px移動したらドラッグ開始
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )
  
  const projects: GanttProject[] = [
    { id: "p1", title: "Webアプリケーション開発", collapsed: false },
    { id: "p2", title: "モバイルアプリ開発", collapsed: false },
  ]

  const assignees = [
    { value: "yamada", label: "山田太郎" },
    { value: "tanaka", label: "田中花子" },
    { value: "sato", label: "佐藤次郎" },
    { value: "suzuki", label: "鈴木美咲" },
    { value: "takahashi", label: "高橋健太" },
    { value: "unassigned", label: "未割当" },
  ]

  const [phases, setPhases] = useState<GanttPhase[]>([
    { id: "ph1", title: "フェーズ1: 計画・設計", projectId: "p1", collapsed: false },
    { id: "ph2", title: "フェーズ2: 開発・実装", projectId: "p1", collapsed: false },
    { id: "ph3", title: "フェーズ3: テスト・リリース", projectId: "p1", collapsed: false },
    { id: "ph4", title: "フェーズ4: UI/UX設計", projectId: "p2", collapsed: false },
    { id: "ph5", title: "フェーズ5: 機能開発", projectId: "p2", collapsed: false },
  ])

  const [workPackages, setWorkPackages] = useState<GanttWorkPackage[]>([
    { id: "wp1", title: "要件分析", phaseId: "ph1", collapsed: false },
    { id: "wp2", title: "システム設計", phaseId: "ph1", collapsed: false },
    { id: "wp3", title: "フロントエンド開発", phaseId: "ph2", collapsed: false },
    { id: "wp4", title: "バックエンド開発", phaseId: "ph2", collapsed: false },
    { id: "wp5", title: "品質保証", phaseId: "ph3", collapsed: false },
    { id: "wp6", title: "デプロイメント", phaseId: "ph3", collapsed: false },
    { id: "wp7", title: "デザインシステム", phaseId: "ph4", collapsed: false },
    { id: "wp8", title: "プロトタイピング", phaseId: "ph4", collapsed: false },
    { id: "wp9", title: "認証機能", phaseId: "ph5", collapsed: false },
  ])

  const [tasks, setTasks] = useState<GanttTask[]>([
    {
      id: "1",
      title: "要件定義",
      startDate: new Date(2025, 0, 6),
      endDate: new Date(2025, 0, 17),
      progress: 100,
      color: "#3b82f6",
      workPackageId: "wp1",
      status: "完了",
      assignee: "yamada",
    },
    {
      id: "2",
      title: "ユーザーストーリー作成",
      startDate: new Date(2025, 0, 10),
      endDate: new Date(2025, 0, 20),
      progress: 90,
      color: "#3b82f6",
      workPackageId: "wp1",
      status: "進行中",
      assignee: "tanaka",
    },
    {
      id: "3",
      title: "アーキテクチャ設計",
      startDate: new Date(2025, 0, 15),
      endDate: new Date(2025, 0, 31),
      progress: 70,
      color: "#8b5cf6",
      workPackageId: "wp2",
      status: "進行中",
      assignee: "sato",
    },
    {
      id: "4",
      title: "データベース設計",
      startDate: new Date(2025, 0, 20),
      endDate: new Date(2025, 1, 5),
      progress: 70,
      color: "#8b5cf6",
      workPackageId: "wp2",
      status: "進行中",
      assignee: "suzuki",
    },
    {
      id: "5",
      title: "UI実装",
      startDate: new Date(2025, 0, 27),
      endDate: new Date(2025, 1, 21),
      progress: 50,
      color: "#10b981",
      workPackageId: "wp3",
      status: "進行中",
      assignee: "takahashi",
    },
    {
      id: "6",
      title: "API実装",
      startDate: new Date(2025, 1, 1),
      endDate: new Date(2025, 1, 28),
      progress: 30,
      color: "#10b981",
      workPackageId: "wp4",
      status: "未着手",
      assignee: "unassigned",
    },
    {
      id: "7",
      title: "テスト計画",
      startDate: new Date(2025, 1, 17),
      endDate: new Date(2025, 2, 7),
      progress: 30,
      color: "#f59e0b",
      workPackageId: "wp5",
      status: "未着手",
      assignee: "unassigned",
    },
    {
      id: "8",
      title: "リリース準備",
      startDate: new Date(2025, 2, 3),
      endDate: new Date(2025, 2, 14),
      progress: 0,
      color: "#ef4444",
      workPackageId: "wp6",
      status: "未着手",
      assignee: "unassigned",
    },
    {
      id: "9",
      title: "デザインシステム構築",
      startDate: new Date(2025, 0, 20),
      endDate: new Date(2025, 1, 10),
      progress: 50,
      color: "#06b6d4",
      workPackageId: "wp7",
      status: "進行中",
      assignee: "yamada",
    },
    {
      id: "10",
      title: "プロトタイプ作成",
      startDate: new Date(2025, 1, 5),
      endDate: new Date(2025, 1, 28),
      progress: 30,
      color: "#8b5cf6",
      workPackageId: "wp8",
      status: "進行中",
      assignee: "tanaka",
    },
    {
      id: "11",
      title: "ログイン機能",
      startDate: new Date(2025, 1, 24),
      endDate: new Date(2025, 2, 14),
      progress: 0,
      color: "#10b981",
      workPackageId: "wp9",
      status: "未着手",
      assignee: "unassigned",
    },
  ])

  // 選択されたプロジェクトのフェーズ、ワークパッケージ、タスクをフィルタリング
  const filteredPhases = phases.filter(p => p.projectId === selectedProjectId)
  const filteredPhaseIds = filteredPhases.map(p => p.id)
  const filteredWorkPackages = workPackages.filter(wp => filteredPhaseIds.includes(wp.phaseId))
  const filteredWorkPackageIds = filteredWorkPackages.map(wp => wp.id)
  
  // タスクのフィルタリング（プロジェクト + 検索 + ステータス + 担当者）
  const filteredTasks = tasks.filter(task => {
    // プロジェクトに属するワークパッケージのタスクのみ
    const belongsToProject = filteredWorkPackageIds.includes(task.workPackageId)
    
    // 検索クエリでフィルタリング
    const matchesSearch = searchQuery === "" || 
      task.title.toLowerCase().includes(searchQuery.toLowerCase())
    
    // ステータスでフィルタリング
    const matchesStatus = filterStatus === "all" || task.status === filterStatus
    
    // 担当者でフィルタリング
    const matchesAssignee = filterAssignee === "all" || task.assignee === filterAssignee
    
    return belongsToProject && matchesSearch && matchesStatus && matchesAssignee
  })

  // 縮尺に応じて表示期間を計算
  const today = new Date()
  let minDate: Date
  let maxDate: Date

  if (timeScale === "1month") {
    // タスクがある場合は最も早いタスクの月を表示
    if (filteredTasks.length > 0) {
      const allDates = filteredTasks.flatMap((t) => [t.startDate, t.endDate])
      const taskMinDate = new Date(Math.min(...allDates.map((d) => d.getTime())))
      minDate = new Date(taskMinDate.getFullYear(), taskMinDate.getMonth(), 1)
      maxDate = new Date(taskMinDate.getFullYear(), taskMinDate.getMonth() + 1, 0)
    } else {
      minDate = new Date(today.getFullYear(), today.getMonth(), 1)
      maxDate = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    }
  } else if (timeScale === "3months") {
    if (filteredTasks.length > 0) {
      const allDates = filteredTasks.flatMap((t) => [t.startDate, t.endDate])
      const taskMinDate = new Date(Math.min(...allDates.map((d) => d.getTime())))
      minDate = new Date(taskMinDate.getFullYear(), taskMinDate.getMonth(), 1)
      maxDate = new Date(taskMinDate.getFullYear(), taskMinDate.getMonth() + 3, 0)
    } else {
      minDate = new Date(today.getFullYear(), today.getMonth(), 1)
      maxDate = new Date(today.getFullYear(), today.getMonth() + 3, 0)
    }
  } else if (timeScale === "months") {
    // 月単位表示（1年間）
    if (filteredTasks.length > 0) {
      const allDates = filteredTasks.flatMap((t) => [t.startDate, t.endDate])
      const taskMinDate = new Date(Math.min(...allDates.map((d) => d.getTime())))
      minDate = new Date(taskMinDate.getFullYear(), taskMinDate.getMonth(), 1)
      maxDate = new Date(taskMinDate.getFullYear(), taskMinDate.getMonth() + 12, 0)
    } else {
      minDate = new Date(today.getFullYear(), today.getMonth(), 1)
      maxDate = new Date(today.getFullYear(), today.getMonth() + 12, 0)
    }
  } else if (timeScale === "6months") {
    if (filteredTasks.length > 0) {
      const allDates = filteredTasks.flatMap((t) => [t.startDate, t.endDate])
      const taskMinDate = new Date(Math.min(...allDates.map((d) => d.getTime())))
      minDate = new Date(taskMinDate.getFullYear(), taskMinDate.getMonth(), 1)
      maxDate = new Date(taskMinDate.getFullYear(), taskMinDate.getMonth() + 6, 0)
    } else {
      minDate = new Date(today.getFullYear(), today.getMonth(), 1)
      maxDate = new Date(today.getFullYear(), today.getMonth() + 6, 0)
    }
  } else {
    // 1year
    if (filteredTasks.length > 0) {
      const allDates = filteredTasks.flatMap((t) => [t.startDate, t.endDate])
      const taskMinDate = new Date(Math.min(...allDates.map((d) => d.getTime())))
      minDate = new Date(taskMinDate.getFullYear(), 0, 1)
      maxDate = new Date(taskMinDate.getFullYear(), 12, 0)
    } else {
      minDate = new Date(today.getFullYear(), 0, 1)
      maxDate = new Date(today.getFullYear(), 12, 0)
    }
  }
  
  // 週の開始を月曜日に調整
  const adjustedMinDate = useMemo(() => {
    const date = new Date(minDate)
    date.setDate(minDate.getDate() - ((minDate.getDay() + 6) % 7))
    return date
  }, [minDate])
  
  const adjustedMaxDate = useMemo(() => {
    const date = new Date(maxDate)
    date.setDate(maxDate.getDate() + (7 - ((maxDate.getDay() + 6) % 7)) % 7)
    return date
  }, [maxDate])
  
  const totalDays = Math.ceil((adjustedMaxDate.getTime() - adjustedMinDate.getTime()) / (1000 * 60 * 60 * 24))

  // 表示期間が変更されたら、最も早いタスクの位置にスクロール
  useEffect(() => {
    if (timelineScrollRef.current && filteredTasks.length > 0) {
      const earliestTask = filteredTasks.reduce((earliest, task) => 
        task.startDate < earliest.startDate ? task : earliest
      )
      
      // 最も早いタスクの開始日からadjustedMinDateまでの日数を計算
      const daysFromStart = Math.ceil(
        (earliestTask.startDate.getTime() - adjustedMinDate.getTime()) / (1000 * 60 * 60 * 24)
      )
      
      // 1日あたり30pxでスクロール位置を計算（少し前から表示するため50pxマージンを追加）
      const scrollPosition = Math.max(0, daysFromStart * 30 - 50)
      
      timelineScrollRef.current.scrollLeft = scrollPosition
    }
  }, [timeScale, selectedProjectId, adjustedMinDate, filteredTasks])

  // 全体表示: タスクの期間から最適な縮尺を自動選択
  const handleShowFullView = () => {
    if (filteredTasks.length === 0) return

    const allDates = filteredTasks.flatMap((t) => [t.startDate, t.endDate])
    const taskMinDate = new Date(Math.min(...allDates.map((d) => d.getTime())))
    const taskMaxDate = new Date(Math.max(...allDates.map((d) => d.getTime())))
    
    // タスクの期間（日数）を計算
    const durationDays = Math.ceil((taskMaxDate.getTime() - taskMinDate.getTime()) / (1000 * 60 * 60 * 24))
    
    // 期間に応じて最適な縮尺を選択
    if (durationDays <= 35) {
      setTimeScale("1month")
    } else if (durationDays <= 100) {
      setTimeScale("3months")
    } else if (durationDays <= 200) {
      setTimeScale("6months")
    } else {
      setTimeScale("1year")
    }
  }

  const handleResizeStart = (taskId: string, newStart: Date) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? { ...task, startDate: newStart }
          : task
      )
    )
  }

  const handleResizeEnd = (taskId: string, newEnd: Date) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? { ...task, endDate: newEnd }
          : task
      )
    )
  }

  const handleMove = (taskId: string, newStart: Date, newEnd: Date) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? { ...task, startDate: newStart, endDate: newEnd }
          : task
      )
    )
  }

  const formatDate = (date: Date) => {
    return `${date.getDate()}`
  }

  const isSaturday = (date: Date) => {
    return date.getDay() === 6
  }

  const isSunday = (date: Date) => {
    return date.getDay() === 0
  }
  
  // タイムライングリッドを生成
  const generateTimelineGrid = () => {
    const days = []
    for (let i = 0; i < totalDays; i++) {
      const currentDate = new Date(adjustedMinDate.getTime())
      currentDate.setDate(adjustedMinDate.getDate() + i)
      days.push(currentDate)
    }
    return days
  }

  const addTask = () => {
    const firstWorkPackage = workPackages[0]
    const newTask: GanttTask = {
      id: `${tasks.length + 1}`,
      title: "新しいタスク",
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7日後
      progress: 0,
      color: "#60a5fa",
      workPackageId: firstWorkPackage?.id || "wp1",
      status: "未着手",
      assignee: "未割り当て",
    }
    setTasks([...tasks, newTask])
  }

  const addTaskToWorkPackage = (workPackageId: string) => {
    const newTask: GanttTask = {
      id: `task-${Date.now()}`,
      title: "新しいタスク",
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7日後
      progress: 0,
      color: "#60a5fa",
      workPackageId: workPackageId,
      status: "未着手",
      assignee: "未割り当て",
    }
    setTasks([...tasks, newTask])
  }

  const togglePhase = (phaseId: string) => {
    setPhases(phases.map(p => 
      p.id === phaseId ? { ...p, collapsed: !p.collapsed } : p
    ))
  }

  const toggleWorkPackage = (workPackageId: string) => {
    setWorkPackages(workPackages.map(wp => 
      wp.id === workPackageId ? { ...wp, collapsed: !wp.collapsed } : wp
    ))
  }

  const addPhaseToProject = (projectId: string) => {
    const newPhase: GanttPhase = {
      id: `phase-${Date.now()}`,
      title: "新しいフェーズ",
      projectId: projectId,
      collapsed: false,
    }
    setPhases([...phases, newPhase])
  }

  const addWorkPackageToPhase = (phaseId: string) => {
    const newWorkPackage: GanttWorkPackage = {
      id: `wp-${Date.now()}`,
      title: "新しいワークパッケージ",
      phaseId: phaseId,
      collapsed: false,
    }
    setWorkPackages([...workPackages, newWorkPackage])
  }

  const updatePhaseTitle = (phaseId: string, newTitle: string) => {
    setPhases(phases.map(p => 
      p.id === phaseId ? { ...p, title: newTitle } : p
    ))
  }

  const updateWorkPackageTitle = (workPackageId: string, newTitle: string) => {
    setWorkPackages(workPackages.map(wp => 
      wp.id === workPackageId ? { ...wp, title: newTitle } : wp
    ))
  }

  const deletePhase = (phaseId: string) => {
    // フェーズに紐づくワークパッケージとタスクも削除
    const phaseWorkPackageIds = workPackages.filter(wp => wp.phaseId === phaseId).map(wp => wp.id)
    setTasks(tasks.filter(t => !phaseWorkPackageIds.includes(t.workPackageId)))
    setWorkPackages(workPackages.filter(wp => wp.phaseId !== phaseId))
    setPhases(phases.filter(p => p.id !== phaseId))
  }

  const deleteWorkPackage = (workPackageId: string) => {
    // ワークパッケージに紐づくタスクも削除
    setTasks(tasks.filter(t => t.workPackageId !== workPackageId))
    setWorkPackages(workPackages.filter(wp => wp.id !== workPackageId))
  }

  const deleteTask = (taskId: string) => {
    setTasks(tasks.filter(t => t.id !== taskId))
  }

  // ドラッグ終了時の処理
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    const activeId = active.id as string
    const overId = over.id as string

    // アイテムのタイプを判定（フェーズ、ワークパッケージ、タスク）
    const activePhase = phases.find(p => p.id === activeId)
    const activeWorkPackage = workPackages.find(wp => wp.id === activeId)
    const activeTask = tasks.find(t => t.id === activeId)

    const overPhase = phases.find(p => p.id === overId)
    const overWorkPackage = workPackages.find(wp => wp.id === overId)
    const overTask = tasks.find(t => t.id === overId)

    // フェーズの並び替え
    if (activePhase && overPhase) {
      const oldIndex = phases.findIndex(p => p.id === activeId)
      const newIndex = phases.findIndex(p => p.id === overId)
      setPhases(arrayMove(phases, oldIndex, newIndex))
    }
    // ワークパッケージの並び替え
    else if (activeWorkPackage && overWorkPackage) {
      const oldIndex = workPackages.findIndex(wp => wp.id === activeId)
      const newIndex = workPackages.findIndex(wp => wp.id === overId)
      const reorderedWorkPackages = arrayMove(workPackages, oldIndex, newIndex)
      
      // overのphaseIdに変更（フェーズをまたぐ移動）
      const updatedWorkPackages = reorderedWorkPackages.map(wp =>
        wp.id === activeId ? { ...wp, phaseId: overWorkPackage.phaseId } : wp
      )
      setWorkPackages(updatedWorkPackages)
    }
    // タスクの並び替え
    else if (activeTask && overTask) {
      const oldIndex = tasks.findIndex(t => t.id === activeId)
      const newIndex = tasks.findIndex(t => t.id === overId)
      const reorderedTasks = arrayMove(tasks, oldIndex, newIndex)
      
      // overのworkPackageIdに変更（ワークパッケージをまたぐ移動）
      const updatedTasks = reorderedTasks.map(t =>
        t.id === activeId ? { ...t, workPackageId: overTask.workPackageId } : t
      )
      setTasks(updatedTasks)
    }
  }

  // 月内の週番号を取得（1-5）
  const getWeekOfMonth = (date: Date) => {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1)
    const dayOfMonth = date.getDate()
    const firstDayOfWeek = firstDay.getDay()
    return Math.ceil((dayOfMonth + firstDayOfWeek) / 7)
  }

  // 四半期を取得
  const getQuarter = (date: Date) => {
    return Math.floor(date.getMonth() / 3) + 1
  }

  // 半期を取得
  const getHalf = (date: Date) => {
    return date.getMonth() < 6 ? 1 : 2
  }

  // タスクの日付をユニットインデックスにマッピング
  const getUnitIndexForDate = (date: Date): number => {
    if (timeScale === "1month") {
      // 日単位
      return Math.floor((date.getTime() - adjustedMinDate.getTime()) / (1000 * 60 * 60 * 24))
    } else if (timeScale === "3months") {
      // 週単位
      const weekGroups = generateWeekHeaderGroups()
      for (let i = 0; i < weekGroups.length; i++) {
        const group = weekGroups[i]
        const groupStart = new Date(adjustedMinDate.getTime())
        groupStart.setDate(adjustedMinDate.getDate() + group.startIndex)
        const groupEnd = new Date(groupStart.getTime())
        groupEnd.setDate(groupStart.getDate() + group.count - 1)
        if (date >= groupStart && date <= groupEnd) {
          return i
        }
      }
      return weekGroups.length - 1
    } else if (timeScale === "months") {
      // 月単位
      const monthGroups = generateMonthHeaderGroups()
      for (let i = 0; i < monthGroups.length; i++) {
        const group = monthGroups[i]
        const groupStart = new Date(group.year, group.month, 1)
        const groupEnd = new Date(group.year, group.month + 1, 0)
        if (date >= groupStart && date <= groupEnd) {
          return i
        }
      }
      return monthGroups.length - 1
    } else if (timeScale === "6months") {
      // 四半期単位
      const quarterGroups = generateQuarterHeaderGroups()
      for (let i = 0; i < quarterGroups.length; i++) {
        const group = quarterGroups[i]
        const groupStart = new Date(adjustedMinDate.getTime())
        groupStart.setDate(adjustedMinDate.getDate() + group.startIndex)
        const groupEnd = new Date(groupStart.getTime())
        groupEnd.setDate(groupStart.getDate() + group.count - 1)
        if (date >= groupStart && date <= groupEnd) {
          return i
        }
      }
      return quarterGroups.length - 1
    } else {
      // 1year: 半期単位
      const halfGroups = generateHalfHeaderGroups()
      for (let i = 0; i < halfGroups.length; i++) {
        const group = halfGroups[i]
        const groupStart = new Date(adjustedMinDate.getTime())
        groupStart.setDate(adjustedMinDate.getDate() + group.startIndex)
        const groupEnd = new Date(groupStart.getTime())
        groupEnd.setDate(groupStart.getDate() + group.count - 1)
        if (date >= groupStart && date <= groupEnd) {
          return i
        }
      }
      return halfGroups.length - 1
    }
  }

  // 週ヘッダーを生成（3ヶ月表示用 - 月内の週）
  const generateWeekHeaderGroups = () => {
    const days = generateTimelineGrid()
    const groups: { week: number; month: number; year: number; startIndex: number; count: number }[] = []
    
    days.forEach((date, index) => {
      const week = getWeekOfMonth(date)
      const month = date.getMonth()
      const year = date.getFullYear()
      
      const lastGroup = groups[groups.length - 1]
      if (lastGroup && lastGroup.week === week && lastGroup.month === month && lastGroup.year === year) {
        lastGroup.count++
      } else {
        groups.push({ week, month, year, startIndex: index, count: 1 })
      }
    })
    
    return groups
  }

  // 四半期ヘッダーを生成（6ヶ月表示用）
  const generateQuarterHeaderGroups = () => {
    const days = generateTimelineGrid()
    const groups: { quarter: number; year: number; startIndex: number; count: number }[] = []
    
    days.forEach((date, index) => {
      const quarter = getQuarter(date)
      const year = date.getFullYear()
      
      const lastGroup = groups[groups.length - 1]
      if (lastGroup && lastGroup.quarter === quarter && lastGroup.year === year) {
        lastGroup.count++
      } else {
        groups.push({ quarter, year, startIndex: index, count: 1 })
      }
    })
    
    return groups
  }

  // 半期ヘッダーを生成（1年表示用）
  const generateHalfHeaderGroups = () => {
    const days = generateTimelineGrid()
    const groups: { half: number; year: number; startIndex: number; count: number }[] = []
    
    days.forEach((date, index) => {
      const half = getHalf(date)
      const year = date.getFullYear()
      
      const lastGroup = groups[groups.length - 1]
      if (lastGroup && lastGroup.half === half && lastGroup.year === year) {
        lastGroup.count++
      } else {
        groups.push({ half, year, startIndex: index, count: 1 })
      }
    })
    
    return groups
  }

  // 月ヘッダーのスタイルを変更（年を削除し月のみ表示）
  const generateMonthHeaderGroups = () => {
    const days = generateTimelineGrid()
    const groups: { month: number; year: number; startIndex: number; count: number }[] = []
    
    days.forEach((date, index) => {
      const month = date.getMonth()
      const year = date.getFullYear()
      
      const lastGroup = groups[groups.length - 1]
      if (lastGroup && lastGroup.month === month && lastGroup.year === year) {
        lastGroup.count++
      } else {
        groups.push({ month, year, startIndex: index, count: 1 })
      }
    })
    
    return groups
  }

  // 年ヘッダーを生成
  const generateYearHeaderGroups = () => {
    const days = generateTimelineGrid()
    const groups: { year: number; startIndex: number; count: number }[] = []
    
    days.forEach((date, index) => {
      const year = date.getFullYear()
      
      const lastGroup = groups[groups.length - 1]
      if (lastGroup && lastGroup.year === year) {
        lastGroup.count++
      } else {
        groups.push({ year, startIndex: index, count: 1 })
      }
    })
    
    return groups
  }

  const monthHeaderGroups = generateMonthHeaderGroups()
  const weekHeaderGroups = generateWeekHeaderGroups()
  const quarterHeaderGroups = generateQuarterHeaderGroups()
  const halfHeaderGroups = generateHalfHeaderGroups()

  // 縮尺に応じたユニット幅
  const getUnitWidth = () => {
    switch (timeScale) {
      case "1month":
        return 30 // 1日 = 30px
      case "3months":
        return 50 // 1週 = 50px
      case "months":
        return 50 // 1月 = 50px
      case "6months":
        return 100 // 1四半期 = 100px
      case "1year":
        return 120 // 1半期 = 120px
      default:
        return 30
    }
  }
  
  const UNIT_WIDTH = getUnitWidth()

  // ユニット配列を生成（各縮尺の最小単位）
  interface TimeUnit {
    index: number
    label: string
    startDate: Date
    endDate: Date
  }

  const getTimeUnits = (): TimeUnit[] => {
    switch (timeScale) {
      case "1month": {
        // 日単位
        const days = generateTimelineGrid()
        return days.map((date, index) => ({
          index,
          label: `${date.getDate()}`,
          startDate: date,
          endDate: date,
        }))
      }
      case "3months": {
        // 週単位
        return weekHeaderGroups.map((group, index) => {
          const startDate = new Date(adjustedMinDate)
          startDate.setDate(startDate.getDate() + group.startIndex)
          const endDate = new Date(startDate)
          endDate.setDate(endDate.getDate() + group.count - 1)
          return {
            index,
            label: `W${group.week}`,
            startDate,
            endDate,
          }
        })
      }
      case "months": {
        // 月単位
        return monthHeaderGroups.map((group, index) => {
          const startDate = new Date(group.year, group.month, 1)
          const endDate = new Date(group.year, group.month + 1, 0)
          return {
            index,
            label: `${group.month + 1}月`,
            startDate,
            endDate,
          }
        })
      }
      case "6months": {
        // 四半期単位
        return quarterHeaderGroups.map((group, index) => {
          const startDate = new Date(adjustedMinDate)
          startDate.setDate(startDate.getDate() + group.startIndex)
          const endDate = new Date(startDate)
          endDate.setDate(endDate.getDate() + group.count - 1)
          return {
            index,
            label: `Q${group.quarter}`,
            startDate,
            endDate,
          }
        })
      }
      case "1year": {
        // 半期単位
        return halfHeaderGroups.map((group, index) => {
          const startDate = new Date(adjustedMinDate)
          startDate.setDate(startDate.getDate() + group.startIndex)
          const endDate = new Date(startDate)
          endDate.setDate(endDate.getDate() + group.count - 1)
          return {
            index,
            label: `H${group.half}`,
            startDate,
            endDate,
          }
        })
      }
      default:
        return []
    }
  }

  const timeUnits = getTimeUnits()
  const totalUnits = timeUnits.length
  const timelineWidth = totalUnits * UNIT_WIDTH

  // リサイズハンドラー
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true)
    setStartX(e.clientX)
    setStartWidth(leftPanelWidth)
    e.preventDefault()
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return
      
      const deltaX = e.clientX - startX
      const newWidth = startWidth + deltaX
      
      if (newWidth >= 300 && newWidth <= 800) {
        setLeftPanelWidth(newWidth)
      }
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, startX, startWidth])

  // 選択されたプロジェクトのみ表示
  const selectedProject = projects.find(p => p.id === selectedProjectId)
  const selectedProjectPhases = filteredPhases

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex-1 space-y-3">
            <CardTitle className="text-lg font-semibold">ガントチャート</CardTitle>
            <CardDescription>
              タスクをドラッグして移動、ハンドルをドラッグして期間を変更できます
            </CardDescription>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">プロジェクト:</label>
                <div className="w-64">
                  <Combobox
                    value={selectedProjectId}
                    onValueChange={setSelectedProjectId}
                    options={projects.map((p) => ({ value: p.id, label: p.title }))}
                    placeholder="プロジェクトを選択"
                    searchPlaceholder="プロジェクトを検索..."
                    emptyMessage="プロジェクトが見つかりません"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">表示モード:</label>
                <div className="flex gap-1">
                  <Button
                    variant={timeScale === "list" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTimeScale("list")}
                  >
                    リスト
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleShowFullView}
                  >
                    自動
                  </Button>
                  <Button
                    variant={timeScale === "1month" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTimeScale("1month")}
                  >
                    日
                  </Button>
                  <Button
                    variant={timeScale === "3months" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTimeScale("3months")}
                  >
                    週
                  </Button>
                  <Button
                    variant={timeScale === "months" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTimeScale("months")}
                  >
                    月
                  </Button>
                  <Button
                    variant={timeScale === "6months" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTimeScale("6months")}
                  >
                    四半期
                  </Button>
                  <Button
                    variant={timeScale === "1year" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTimeScale("1year")}
                  >
                    半期
                  </Button>
                </div>
              </div>
            </div>
            
            {/* 検索・フィルター */}
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">検索:</label>
                <Input
                  type="text"
                  placeholder="タスク名で検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-48 h-8"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">ステータス:</label>
                <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as TaskStatus | "all")}>
                  <SelectTrigger className="w-32 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべて</SelectItem>
                    <SelectItem value="未着手">未着手</SelectItem>
                    <SelectItem value="進行中">進行中</SelectItem>
                    <SelectItem value="完了">完了</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">担当者:</label>
                <Select value={filterAssignee} onValueChange={setFilterAssignee}>
                  <SelectTrigger className="w-32 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべて</SelectItem>
                    {assignees.map((assignee) => (
                      <SelectItem key={assignee.value} value={assignee.value}>
                        {assignee.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* 一括折りたたみボタン */}
              <div className="flex items-center gap-2 ml-4">
                {/* フェーズボタン: すべて折りたたまれている場合は展開ボタンのみ、それ以外は折りたたむボタンのみ */}
                {phases.every(p => p.collapsed) ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPhases(phases.map(p => ({ ...p, collapsed: false })))
                    }}
                    className="h-8"
                  >
                    フェーズを展開
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPhases(phases.map(p => ({ ...p, collapsed: true })))
                    }}
                    className="h-8"
                  >
                    フェーズを折りたたむ
                  </Button>
                )}
                
                {/* ワークパッケージボタン: すべて折りたたまれている場合は展開ボタンのみ、それ以外は折りたたむボタンのみ */}
                {workPackages.every(wp => wp.collapsed) ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setWorkPackages(workPackages.map(wp => ({ ...wp, collapsed: false })))
                    }}
                    className="h-8"
                  >
                    WPを展開
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setWorkPackages(workPackages.map(wp => ({ ...wp, collapsed: true })))
                    }}
                    className="h-8"
                  >
                    WPを折りたたむ
                  </Button>
                )}
              </div>
            </div>
          </div>
          <Button onClick={addTask} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            タスク追加
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex border rounded-lg overflow-hidden relative">
          {/* 左側: タスクリスト */}
          <div 
            className={`${timeScale === "list" ? "flex-1" : "flex-shrink-0"} border-r relative`}
            style={timeScale !== "list" ? { width: `${leftPanelWidth}px` } : undefined}
          >
            {/* 年ヘッダー（スペーサー） */}
            <div className="h-[44px] border-b-2 bg-muted/70 flex items-center px-3">
              <span className="text-base font-bold">{selectedProject?.title}</span>
            </div>

            {/* リスト表示時の列ヘッダー */}
            {timeScale === "list" && (
              <div className="h-12 border-b bg-muted/60 flex items-center px-2 gap-2 text-sm font-semibold overflow-x-auto">
                <div className="flex-1 min-w-[120px] px-2">タスク名</div>
                <div className="w-32 px-2">開始日</div>
                <div className="w-32 px-2">終了日</div>
                <div className="w-20 px-2">期間</div>
                <div className="w-24 px-2">ステータス</div>
                <div className="w-20 px-2">進捗率</div>
                <div className="w-28 px-2">担当者</div>
              </div>
            )}

            {/* ガント表示時の列ヘッダー */}
            {timeScale !== "list" && (
              <>
                {/* 第2ヘッダー（スペーサー） */}
                <div className="h-[36px] border-b bg-muted/40 flex items-center px-3">
                  <span className="text-sm font-semibold text-muted-foreground">
                    {timeScale === "3months" && "月"}
                    {timeScale === "months" && "月"}
                    {timeScale === "6months" && "四半期"}
                    {timeScale === "1year" && "半期"}
                    {timeScale === "1month" && "月"}
                  </span>
                </div>

                {/* 第3ヘッダー（スペーサー）- 3ヶ月表示時のみ */}
                {timeScale === "3months" && (
                  <div className="h-[36px] border-b bg-muted/30 flex items-center px-3">
                    <span className="text-sm font-semibold text-muted-foreground">週</span>
                  </div>
                )}

                {/* 最小単位グリッド（スペーサー）- 1ヶ月表示時のみ */}
                {timeScale === "1month" && (
                  <div className="h-[60px] border-b bg-background" />
                )}
              </>
            )}

            {/* タスクリスト */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={[...phases.map(p => p.id), ...workPackages.map(wp => wp.id), ...tasks.map(t => t.id)]}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-0">
                  {selectedProjectPhases.map((phase) => {
                    const phaseWorkPackages = workPackages.filter(wp => wp.phaseId === phase.id)
                    
                    return (
                      <div key={phase.id}>
                        <SortableItem id={phase.id}>
                          {/* フェーズ行 */}
                          <div className="h-10 border-b bg-muted/20 flex items-center gap-2">
                      <button
                        onClick={() => togglePhase(phase.id)}
                        className="flex items-center gap-1 px-2 hover:bg-accent rounded flex-shrink-0"
                      >
                        {phase.collapsed ? (
                          <ChevronRight className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                      <Input
                        value={phase.title}
                        onChange={(e) => updatePhaseTitle(phase.id, e.target.value)}
                        className="h-7 text-sm font-bold flex-1"
                      />
                      {timeScale === "list" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deletePhase(phase.id)}
                          className="h-7 w-7 p-0 hover:bg-destructive hover:text-destructive-foreground flex-shrink-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </SortableItem>

                  {/* ワークパッケージとタスク（フェーズが展開されている場合のみ表示） */}
                  {!phase.collapsed && phaseWorkPackages.map((workPackage) => {
                    const workPackageTasks = filteredTasks.filter(t => t.workPackageId === workPackage.id)
                    
                    return (
                      <div key={workPackage.id}>
                        <SortableItem id={workPackage.id}>
                          {/* ワークパッケージ行 */}
                          <div className="h-10 border-b bg-muted/10 flex items-center gap-2">
                            <button
                              onClick={() => toggleWorkPackage(workPackage.id)}
                              className="flex items-center gap-1 px-2 pl-6 hover:bg-accent rounded flex-shrink-0"
                            >
                              {workPackage.collapsed ? (
                                <ChevronRight className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </button>
                            <Input
                              value={workPackage.title}
                              onChange={(e) => updateWorkPackageTitle(workPackage.id, e.target.value)}
                              className="h-7 text-sm font-semibold flex-1"
                            />
                            {timeScale === "list" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteWorkPackage(workPackage.id)}
                                className="h-7 w-7 p-0 hover:bg-destructive hover:text-destructive-foreground flex-shrink-0"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>

                          {/* タスク（ワークパッケージが展開されている場合のみ表示） */}
                          {!workPackage.collapsed && workPackageTasks.map((task) => {
                            const durationDays = Math.ceil((task.endDate.getTime() - task.startDate.getTime()) / (1000 * 60 * 60 * 24))
                            
                            return (
                              <SortableItem key={task.id} id={task.id}>
                                <div className="h-12 border-b flex items-center gap-2 text-sm overflow-x-auto" style={{ paddingLeft: timeScale === "list" ? "8px" : "48px", paddingRight: "8px" }}>
                                {timeScale === "list" ? (
                                  <>
                                    {/* リスト表示: 全フィールド表示 */}
                                    {/* タスク名 */}
                                    <Input
                                      value={task.title}
                                      onChange={(e) => {
                                        const newTasks = tasks.map(t => 
                                          t.id === task.id ? { ...t, title: e.target.value } : t
                                        )
                                        setTasks(newTasks)
                                      }}
                                      className="h-8 text-sm flex-1 min-w-[120px]"
                                    />
                                    
                                    {/* 開始日 */}
                                    <Input
                                      type="date"
                                      value={task.startDate.toISOString().split('T')[0]}
                                      onChange={(e) => {
                                        const newStart = new Date(e.target.value)
                                        const duration = Math.ceil((task.endDate.getTime() - task.startDate.getTime()) / (1000 * 60 * 60 * 24))
                                        const newEnd = new Date(newStart.getTime() + duration * 24 * 60 * 60 * 1000)
                                        const newTasks = tasks.map(t => 
                                          t.id === task.id ? { ...t, startDate: newStart, endDate: newEnd } : t
                                        )
                                        setTasks(newTasks)
                                      }}
                                      className="h-8 text-sm w-32 flex-shrink-0"
                                    />
                                    
                                    {/* 終了日 */}
                                    <Input
                                      type="date"
                                      value={task.endDate.toISOString().split('T')[0]}
                                      onChange={(e) => {
                                        const newEnd = new Date(e.target.value)
                                        const newTasks = tasks.map(t => 
                                          t.id === task.id ? { ...t, endDate: newEnd } : t
                                        )
                                        setTasks(newTasks)
                                      }}
                                      className="h-8 text-sm w-32 flex-shrink-0"
                                    />
                                    
                                    {/* 期間 */}
                                    <Input
                                      type="number"
                                      value={durationDays}
                                      onChange={(e) => {
                                        const newDuration = parseInt(e.target.value) || 1
                                        const newEnd = new Date(task.startDate.getTime() + newDuration * 24 * 60 * 60 * 1000)
                                        const newTasks = tasks.map(t => 
                                          t.id === task.id ? { ...t, endDate: newEnd } : t
                                        )
                                        setTasks(newTasks)
                                      }}
                                      className="h-8 text-sm w-20 flex-shrink-0"
                                    />
                                    
                                    {/* ステータス */}
                                    <Select
                                      value={task.status}
                                      onValueChange={(value: TaskStatus) => {
                                        const newTasks = tasks.map(t => 
                                          t.id === task.id ? { ...t, status: value } : t
                                        )
                                        setTasks(newTasks)
                                      }}
                                    >
                                      <SelectTrigger className="h-8 text-sm w-24 flex-shrink-0">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="未着手">未着手</SelectItem>
                                        <SelectItem value="進行中">進行中</SelectItem>
                                        <SelectItem value="完了">完了</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    
                                    {/* 進捗率 */}
                                    <Select
                                      value={task.progress.toString()}
                                      onValueChange={(value) => {
                                        const newTasks = tasks.map(t => 
                                          t.id === task.id ? { ...t, progress: parseInt(value) } : t
                                        )
                                        setTasks(newTasks)
                                      }}
                                    >
                                      <SelectTrigger className="h-8 text-sm w-20 flex-shrink-0">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="0">0%</SelectItem>
                                        <SelectItem value="30">30%</SelectItem>
                                        <SelectItem value="50">50%</SelectItem>
                                        <SelectItem value="70">70%</SelectItem>
                                        <SelectItem value="90">90%</SelectItem>
                                        <SelectItem value="100">100%</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    
                                    {/* 担当者 */}
                                    <div className="w-28 flex-shrink-0">
                                      <Combobox
                                        options={assignees}
                                        value={task.assignee}
                                        onValueChange={(value) => {
                                          const newTasks = tasks.map(t => 
                                            t.id === task.id ? { ...t, assignee: value } : t
                                          )
                                          setTasks(newTasks)
                                        }}
                                        placeholder="担当者選択"
                                        searchPlaceholder="担当者を検索"
                                        emptyMessage="担当者が見つかりません"
                                        className="h-8"
                                      />
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    {/* ガント表示: タスク名、進捗率、担当者のみ */}
                                    {/* タスク名 */}
                                    <Input
                                      value={task.title}
                                      onChange={(e) => {
                                        const newTasks = tasks.map(t => 
                                          t.id === task.id ? { ...t, title: e.target.value } : t
                                        )
                                        setTasks(newTasks)
                                      }}
                                      className="h-8 text-sm flex-1 min-w-0"
                                    />
                                    
                                    {/* 進捗率 */}
                                    <Select
                                      value={task.progress.toString()}
                                      onValueChange={(value) => {
                                        const newTasks = tasks.map(t => 
                                          t.id === task.id ? { ...t, progress: parseInt(value) } : t
                                        )
                                        setTasks(newTasks)
                                      }}
                                    >
                                      <SelectTrigger className="h-8 text-sm w-20">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="0">0%</SelectItem>
                                        <SelectItem value="30">30%</SelectItem>
                                        <SelectItem value="50">50%</SelectItem>
                                        <SelectItem value="70">70%</SelectItem>
                                        <SelectItem value="90">90%</SelectItem>
                                        <SelectItem value="100">100%</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    
                                    {/* 担当者 */}
                                    <div className="w-28">
                                      <Combobox
                                        options={assignees}
                                        value={task.assignee}
                                        onValueChange={(value) => {
                                          const newTasks = tasks.map(t => 
                                            t.id === task.id ? { ...t, assignee: value } : t
                                          )
                                          setTasks(newTasks)
                                        }}
                                        placeholder="担当者選択"
                                        searchPlaceholder="担当者を検索"
                                        emptyMessage="担当者が見つかりません"
                                        className="h-8"
                                      />
                                    </div>
                                  </>
                                )}
                                
                                {/* 削除ボタン（リスト表示時のみ） */}
                                {timeScale === "list" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteTask(task.id)}
                                    className="h-8 w-8 p-0 hover:bg-destructive hover:text-destructive-foreground flex-shrink-0"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </SortableItem>
                          )
                          })}

                          {/* タスク追加ボタン（ワークパッケージが展開されている場合、かつリスト表示時のみ表示） */}
                          {!workPackage.collapsed && timeScale === "list" && (
                            <div className="h-10 border-b flex items-center" style={{ paddingLeft: timeScale === "list" ? "8px" : "48px" }}>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => addTaskToWorkPackage(workPackage.id)}
                                className="text-xs text-muted-foreground hover:text-foreground"
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                タスク追加
                              </Button>
                            </div>
                          )}
                        </SortableItem>
                      </div>
                    )
                    })}

                    {/* ワークパッケージ追加ボタン（フェーズが展開されている場合、かつリスト表示時のみ表示） */}
                    {!phase.collapsed && timeScale === "list" && (
                      <div className="h-10 border-b flex items-center pl-6">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => addWorkPackageToPhase(phase.id)}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          ワークパッケージ追加
                        </Button>
                      </div>
                    )}
                  </div>
                )
              })}

              {/* フェーズ追加ボタン（リスト表示時のみ表示） */}
              {timeScale === "list" && (
                <div className="h-10 border-b flex items-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => addPhaseToProject(selectedProjectId)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    フェーズ追加
                  </Button>
                </div>
              )}
              </div>
            </SortableContext>
          </DndContext>
          </div>

          {/* リサイズハンドル（ガント表示時のみ） */}
          {timeScale !== "list" && (
            <div
              ref={resizeRef}
              onMouseDown={handleMouseDown}
              className="absolute top-0 bottom-0 w-1 bg-border hover:bg-primary cursor-col-resize transition-colors z-10"
              style={{ left: `${leftPanelWidth}px` }}
            />
          )}

          {/* 右側: スクロール可能なタイムライン */}
          {timeScale !== "list" && (
          <div className="flex-1 overflow-x-auto">
            <div className="space-y-0" style={{ minWidth: `${timelineWidth}px` }}>
              {/* 年ヘッダー */}
              <div className="flex border-b-2 h-[44px]">
                {timeScale === "3months" ? (() => {
                  // 週単位の表示なので、年ヘッダーも週の数でカウントする
                  const yearGroups: { year: number; weekCount: number }[] = []
                  weekHeaderGroups.forEach(week => {
                    const lastGroup = yearGroups[yearGroups.length - 1]
                    if (lastGroup && lastGroup.year === week.year) {
                      lastGroup.weekCount++
                    } else {
                      yearGroups.push({ year: week.year, weekCount: 1 })
                    }
                  })
                  return yearGroups.map((group, index) => (
                    <div
                      key={index}
                      className="text-center flex items-center justify-center text-base font-bold border-r last:border-r-0 bg-muted/70"
                      style={{ width: `${group.weekCount * UNIT_WIDTH}px` }}
                    >
                      {group.year}年
                    </div>
                  ))
                })() : timeScale === "months" ? (() => {
                  // 月単位の表示なので、年ヘッダーも月の数でカウントする
                  const yearGroups: { year: number; monthCount: number }[] = []
                  monthHeaderGroups.forEach(month => {
                    const lastGroup = yearGroups[yearGroups.length - 1]
                    if (lastGroup && lastGroup.year === month.year) {
                      lastGroup.monthCount++
                    } else {
                      yearGroups.push({ year: month.year, monthCount: 1 })
                    }
                  })
                  return yearGroups.map((group, index) => (
                    <div
                      key={index}
                      className="text-center flex items-center justify-center text-base font-bold border-r last:border-r-0 bg-muted/70"
                      style={{ width: `${group.monthCount * UNIT_WIDTH}px` }}
                    >
                      {group.year}年
                    </div>
                  ))
                })() : timeScale === "6months" ? (() => {
                  // 四半期単位の表示なので、年ヘッダーも四半期の数でカウントする
                  const yearGroups: { year: number; quarterCount: number }[] = []
                  quarterHeaderGroups.forEach(quarter => {
                    const lastGroup = yearGroups[yearGroups.length - 1]
                    if (lastGroup && lastGroup.year === quarter.year) {
                      lastGroup.quarterCount++
                    } else {
                      yearGroups.push({ year: quarter.year, quarterCount: 1 })
                    }
                  })
                  return yearGroups.map((group, index) => (
                    <div
                      key={index}
                      className="text-center flex items-center justify-center text-base font-bold border-r last:border-r-0 bg-muted/70"
                      style={{ width: `${group.quarterCount * UNIT_WIDTH}px` }}
                    >
                      {group.year}年
                    </div>
                  ))
                })() : timeScale === "1year" ? (() => {
                  // 半期単位の表示なので、年ヘッダーも半期の数でカウントする
                  const yearGroups: { year: number; halfCount: number }[] = []
                  halfHeaderGroups.forEach(half => {
                    const lastGroup = yearGroups[yearGroups.length - 1]
                    if (lastGroup && lastGroup.year === half.year) {
                      lastGroup.halfCount++
                    } else {
                      yearGroups.push({ year: half.year, halfCount: 1 })
                    }
                  })
                  return yearGroups.map((group, index) => (
                    <div
                      key={index}
                      className="text-center flex items-center justify-center text-base font-bold border-r last:border-r-0 bg-muted/70"
                      style={{ width: `${group.halfCount * UNIT_WIDTH}px` }}
                    >
                      {group.year}年
                    </div>
                  ))
                })() : generateYearHeaderGroups().map((group, index) => (
                  <div
                    key={index}
                    className="text-center flex items-center justify-center text-base font-bold border-r last:border-r-0 bg-muted/70"
                    style={{ width: `${group.count * UNIT_WIDTH}px` }}
                  >
                    {group.year}年
                  </div>
                ))}
              </div>

              {/* 第2ヘッダー（縮尺に応じて変更） */}
              <div className="flex border-b h-[36px]">
                {timeScale === "1month" && generateMonthHeaderGroups().map((group, index) => (
                  <div
                    key={index}
                    className="text-center flex items-center justify-center text-sm font-semibold border-r last:border-r-0 bg-muted/40"
                    style={{ width: `${group.count * UNIT_WIDTH}px` }}
                  >
                    {group.month + 1}月
                  </div>
                ))}
                {timeScale === "3months" && (() => {
                  // 週単位の表示なので、月ヘッダーは週の数でカウントする
                  const monthGroups: { month: number; year: number; weekCount: number }[] = []
                  weekHeaderGroups.forEach(week => {
                    const lastGroup = monthGroups[monthGroups.length - 1]
                    if (lastGroup && lastGroup.month === week.month && lastGroup.year === week.year) {
                      lastGroup.weekCount++
                    } else {
                      monthGroups.push({ month: week.month, year: week.year, weekCount: 1 })
                    }
                  })
                  return monthGroups.map((group, index) => (
                    <div
                      key={index}
                      className="text-center flex items-center justify-center text-sm font-semibold border-r last:border-r-0 bg-muted/40"
                      style={{ width: `${group.weekCount * UNIT_WIDTH}px` }}
                    >
                      {group.month + 1}月
                    </div>
                  ))
                })()}
                {timeScale === "months" && timeUnits.map((unit) => (
                  <div
                    key={unit.index}
                    className="text-center flex items-center justify-center text-sm font-semibold border-r last:border-r-0 bg-muted/40"
                    style={{ width: `${UNIT_WIDTH}px` }}
                  >
                    {unit.label}
                  </div>
                ))}
                {timeScale === "6months" && timeUnits.map((unit) => (
                  <div
                    key={unit.index}
                    className="text-center flex items-center justify-center text-sm font-semibold border-r last:border-r-0 bg-muted/40"
                    style={{ width: `${UNIT_WIDTH}px` }}
                  >
                    {unit.label}
                  </div>
                ))}
                {timeScale === "1year" && timeUnits.map((unit) => (
                  <div
                    key={unit.index}
                    className="text-center flex items-center justify-center text-sm font-semibold border-r last:border-r-0 bg-muted/40"
                    style={{ width: `${UNIT_WIDTH}px` }}
                  >
                    {unit.label}
                  </div>
                ))}
              </div>

              {/* 第3ヘッダー（週のみ、6ヶ月・1年では非表示） */}
              {timeScale === "3months" && (
                <div className="flex border-b h-[36px]">
                  {timeUnits.map((unit) => (
                    <div
                      key={unit.index}
                      className="text-center flex items-center justify-center text-sm font-semibold border-r last:border-r-0 bg-muted/30"
                      style={{ width: `${UNIT_WIDTH}px` }}
                    >
                      {unit.label}
                    </div>
                  ))}
                </div>
              )}

              {/* 最小単位グリッド */}
              {timeScale === "1month" && (
                <div className="relative h-[60px]">
                  <div className="flex border-b h-full">
                    {timeUnits.map((unit) => {
                      const date = unit.startDate
                      const saturday = isSaturday(date)
                      const sunday = isSunday(date)
                      const isFirstOfMonth = date.getDate() === 1
                      return (
                        <div
                          key={unit.index}
                          className={`text-center flex flex-col items-center justify-center text-xs ${
                            isFirstOfMonth ? "border-l-2 border-l-primary" : ""
                          } ${
                            saturday
                              ? "bg-gradient-to-b from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/40 font-semibold text-blue-700 dark:text-blue-300"
                              : sunday
                              ? "bg-gradient-to-b from-red-100 to-red-200 dark:from-red-900/30 dark:to-red-800/40 font-semibold text-red-700 dark:text-red-300"
                              : "text-muted-foreground"
                          }`}
                          style={{ width: `${UNIT_WIDTH}px` }}
                        >
                          <div>{formatDate(date)}</div>
                          <div className="text-[10px]">
                            {["日", "月", "火", "水", "木", "金", "土"][date.getDay()]}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* ガントバー */}
              <div className="space-y-0 relative">
                {/* 背景グリッド */}
                {timeScale === "1month" && (
                  <div className="absolute inset-0 flex pointer-events-none">
                    {timeUnits.map((unit) => {
                      const date = unit.startDate
                      const saturday = isSaturday(date)
                      const sunday = isSunday(date)
                      const isFirstOfMonth = date.getDate() === 1
                      return (
                        <div
                          key={unit.index}
                          className={`${
                            isFirstOfMonth ? "border-l-2 border-l-primary" : "border-l"
                          } last:border-r ${
                            saturday
                              ? "bg-gradient-to-b from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/30"
                              : sunday
                              ? "bg-gradient-to-b from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/30"
                              : ""
                          }`}
                          style={{ width: `${UNIT_WIDTH}px` }}
                        />
                      )
                    })}
                  </div>
                )}

                {/* フェーズ、ワークパッケージ、タスク */}
                {selectedProjectPhases.map((phase) => {
                  const phaseWorkPackages = workPackages.filter(wp => wp.phaseId === phase.id)
                  
                  return (
                    <div key={phase.id}>
                      {/* フェーズ行 */}
                      <div className="relative h-10 border-b bg-muted/20" />

                      {/* ワークパッケージとタスク（フェーズが展開されている場合のみ表示） */}
                      {!phase.collapsed && phaseWorkPackages.map((workPackage) => {
                        const workPackageTasks = filteredTasks.filter(t => t.workPackageId === workPackage.id)
                        
                        return (
                          <div key={workPackage.id}>
                            {/* ワークパッケージ行 */}
                            <div className="relative h-10 border-b bg-muted/10" />

                            {/* タスク（ワークパッケージが展開されている場合のみ表示） */}
                            {!workPackage.collapsed && workPackageTasks.map((task) => {
                              const startUnitIndex = getUnitIndexForDate(task.startDate)
                              const endUnitIndex = getUnitIndexForDate(task.endDate)

                              return (
                                <div key={task.id} className="relative h-12 border-b">
                                  <GanttBar
                                    task={task}
                                    startUnitIndex={startUnitIndex}
                                    endUnitIndex={endUnitIndex}
                                    unitWidth={UNIT_WIDTH}
                                    onResizeStart={handleResizeStart}
                                    onResizeEnd={handleResizeEnd}
                                    onMove={handleMove}
                                  />
                                </div>
                              )
                            })}

                            {/* タスク追加ボタン用のスペース（ワークパッケージが展開されている場合のみ表示） */}
                            {!workPackage.collapsed && (
                              <div className="relative h-10 border-b" />
                            )}
                          </div>
                        )
                      })}

                      {/* ワークパッケージ追加ボタン用のスペース（フェーズが展開されている場合のみ表示） */}
                      {!phase.collapsed && (
                        <div className="relative h-10 border-b" />
                      )}
                    </div>
                  )
                })}

                {/* フェーズ追加ボタン用のスペース */}
                <div className="relative h-10 border-b" />
              </div>

              {/* 凡例 */}
              <div className="flex flex-wrap gap-3 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-blue-500" />
                  <span className="text-xs text-muted-foreground">計画</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-purple-500" />
                  <span className="text-xs text-muted-foreground">設計</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-green-500" />
                  <span className="text-xs text-muted-foreground">開発</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-amber-500" />
                  <span className="text-xs text-muted-foreground">テスト</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-red-500" />
                  <span className="text-xs text-muted-foreground">リリース</span>
                </div>
              </div>
            </div>
          </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
