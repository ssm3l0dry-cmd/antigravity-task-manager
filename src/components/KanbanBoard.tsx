import { useState, useEffect, useCallback } from 'react';
import {
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import { motion } from 'framer-motion';
import { Menu, Plus } from 'lucide-react';
import confetti from 'canvas-confetti';
import { KanbanColumn } from './KanbanColumn';
import { TaskCard } from './TaskCard';
import { Sidebar } from './Sidebar';
import { AddTaskModal } from './AddTaskModal';
import { EditTaskModal } from './EditTaskModal';
import { COLUMNS } from '../types';
import type { ColumnId, Task } from '../types';
import { useTaskStore } from '../store';

export function KanbanBoard() {
  const { tasks, addTask, moveTask, reorderTask, deleteTask, updateTask, clearAll } = useTaskStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const openModal = (_columnId: ColumnId = 'todo') => {
    setModalOpen(true);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !modalOpen && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        openModal();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [modalOpen]);

  const fireConfetti = useCallback(() => {
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.55 },
      colors: ['#580000', '#fd8586', '#ffdad9', '#fef3c7', '#d1fae5'],
      scalar: 1.1,
    });
  }, []);

  const handleToggleDone = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    if (task.columnId === 'done') {
      updateTask(taskId, { columnId: 'todo' });
    } else {
      const completedSubtasks = (task.subtasks ?? []).map((s) => ({ ...s, done: true }));
      updateTask(taskId, { columnId: 'done', subtasks: completedSubtasks });
      fireConfetti();
    }
  };

  const handleMoveToInProgress = (taskId: string) => {
    updateTask(taskId, { columnId: 'inProgress' });
  };

  const handleUpdateSubtasks = (taskId: string, subtasks: import('../types').Subtask[]) => {
    updateTask(taskId, { subtasks });
  };

  const handleSaveEdit = (taskId: string, patch: Partial<Task>) => {
    updateTask(taskId, patch);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task ?? null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    setOverId(event.over?.id?.toString() ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    setOverId(null);

    if (!over) return;

    const activeId = active.id.toString();
    const overIdStr = over.id.toString();

    // Determine which column we dropped into:
    // - if over a column droppable → that column
    // - if over another card → that card's column
    const isOverColumn = COLUMNS.some((c) => c.id === overIdStr);
    const targetColumnId = isOverColumn
      ? (overIdStr as ColumnId)
      : tasks.find((t) => t.id === overIdStr)?.columnId;

    if (!targetColumnId) return;

    const activeTask = tasks.find((t) => t.id === activeId);
    const wasAlreadyDone = activeTask?.columnId === 'done';

    if (isOverColumn) {
      moveTask(activeId, targetColumnId);
    } else {
      reorderTask(activeId, overIdStr, targetColumnId);
    }

    if (targetColumnId === 'done' && !wasAlreadyDone) {
      fireConfetti();
    }
  };

  const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

  const getColumnTasks = (columnId: ColumnId) =>
    tasks
      .filter((t) => t.columnId === columnId)
      .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);

  return (
    <div className="board-wrapper">
      {/* Top bar */}
      <motion.header
        className="topbar"
        initial={{ opacity: 0, y: -24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24, delay: 0.05 }}
      >
        <div className="topbar__left">
          <motion.button
            className="topbar__hamburger"
            onClick={() => setSidebarOpen(true)}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 500, damping: 22 }}
            aria-label="Open settings"
          >
            <Menu size={20} />
          </motion.button>
          <div className="topbar__title-block">
            <h1 className="topbar__title">Task Board</h1>
            <span className="topbar__sub">
              {tasks.length} task{tasks.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <motion.button
          className="topbar__add-btn"
          onClick={() => openModal()}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          aria-label="Add new task"
        >
          <Plus size={16} />
          <span>New Task</span>
        </motion.button>
      </motion.header>

      {/* Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <main className="board">
          {COLUMNS.map((column, i) => (
            <KanbanColumn
              key={column.id}
              column={column}
              tasks={getColumnTasks(column.id)}
              isOver={
                overId === column.id ||
                tasks.some((t) => t.columnId === column.id && t.id === overId)
              }
              onAddTask={openModal}
              onDelete={deleteTask}
              onToggleDone={handleToggleDone}
              onMoveToInProgress={handleMoveToInProgress}
              onUpdateSubtasks={handleUpdateSubtasks}
              onEdit={setEditingTask}
              index={i}
            />
          ))}
        </main>

        {/* Drag overlay */}
        <DragOverlay dropAnimation={{ duration: 220, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
          {activeTask && (
            <div style={{ transform: 'rotate(2deg)', opacity: 0.92, cursor: "url('/cursor-hand.png') 24 24, grabbing" }}>
              <TaskCard
                task={activeTask}
                onDelete={() => {}}
                onToggleDone={() => {}}
                isDone={activeTask.columnId === 'done'}
              />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onClearAll={clearAll}
        taskCount={tasks.length}
      />

      {/* Add Task Modal */}
      <AddTaskModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdd={addTask}
      />

      {/* Edit Task Modal */}
      <EditTaskModal
        task={editingTask}
        onClose={() => setEditingTask(null)}
        onSave={handleSaveEdit}
      />
    </div>
  );
}
