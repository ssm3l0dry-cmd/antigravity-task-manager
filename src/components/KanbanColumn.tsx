import { motion, AnimatePresence } from 'framer-motion';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { TaskCard } from './TaskCard';
import type { Column, Task, Subtask } from '../types';

interface Props {
  column: Column;
  tasks: Task[];
  isOver: boolean;
  onAddTask: (columnId: Column['id']) => void;
  onDelete: (id: string) => void;
  onToggleDone: (id: string) => void;
  onMoveToInProgress: (id: string) => void;
  onUpdateSubtasks: (taskId: string, subtasks: Subtask[]) => void;
  onEdit: (task: Task) => void;
  index: number;
}

const columnVariants = {
  hidden: { opacity: 0, y: 32 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 260,
      damping: 24,
      delay: i * 0.1,
    },
  }),
};

export function KanbanColumn({ column, tasks, isOver, onAddTask, onDelete, onToggleDone, onMoveToInProgress, onUpdateSubtasks, onEdit, index }: Props) {
  const { setNodeRef } = useDroppable({ id: column.id });

  const isDoneColumn = column.id === 'done';

  return (
    <motion.div
      className="kanban-column"
      custom={index}
      variants={columnVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Column header */}
      <div className="kanban-column__header">
        <div className="kanban-column__title-row">
          <motion.div
            className="kanban-column__dot"
            style={{ background: column.accent }}
            animate={isOver ? { scale: 1.3 } : { scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 20 }}
          />
          <h2 className="kanban-column__title">{column.label}</h2>
          <motion.span
            className="kanban-column__count"
            key={tasks.length}
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 22 }}
          >
            {tasks.length}
          </motion.span>
        </div>

        <motion.button
          className="kanban-column__add-btn"
          onClick={() => onAddTask(column.id)}
          whileHover={{ scale: 1.08, background: 'rgba(88,0,0,0.08)' }}
          whileTap={{ scale: 0.92 }}
          transition={{ type: 'spring', stiffness: 500, damping: 22 }}
          aria-label={`Add task to ${column.label}`}
        >
          <Plus size={16} />
        </motion.button>
      </div>

      {/* Drop zone */}
      <motion.div
        ref={setNodeRef}
        className="kanban-column__drop-zone"
        animate={{
          background: isOver
            ? 'rgba(88,0,0,0.04)'
            : 'transparent',
          borderColor: isOver
            ? 'rgba(88,0,0,0.2)'
            : 'transparent',
        }}
        transition={{ duration: 0.18 }}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          <AnimatePresence initial={false}>
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onDelete={onDelete}
                onToggleDone={onToggleDone}
                onMoveToInProgress={onMoveToInProgress}
                onUpdateSubtasks={onUpdateSubtasks}
                onEdit={onEdit}
                isDone={isDoneColumn || task.columnId === 'done'}
              />
            ))}
          </AnimatePresence>
        </SortableContext>

        {/* Empty state */}
        <AnimatePresence>
          {tasks.length === 0 && (
            <motion.div
              className="kanban-column__empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <span>Drop tasks here</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
