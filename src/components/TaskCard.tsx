import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Trash2, CheckCircle2, Circle, Plus, Pencil, Zap } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import type { Task, Subtask } from '../types';
import { loadTags, tagTextColor } from '../store';

interface Props {
  task: Task;
  onDelete: (id: string) => void;
  onToggleDone: (id: string) => void;
  onMoveToInProgress?: (id: string) => void;
  onUpdateSubtasks?: (taskId: string, subtasks: Subtask[]) => void;
  onEdit?: (task: Task) => void;
  isDone: boolean;
}

const priorityConfig = {
  low:    { label: 'Low',  color: '#d1fae5', text: '#065f46' },
  medium: { label: 'Med',  color: '#fef3c7', text: '#92400e' },
  high:   { label: 'High', color: '#580000', text: '#fff'    },
};

export function TaskCard({ task, onDelete, onToggleDone, onMoveToInProgress, onUpdateSubtasks, onEdit, isDone }: Props) {
  const [hovered, setHovered] = useState(false);
  const [addingSubtask, setAddingSubtask] = useState(false);
  const tagDef = task.tag ? loadTags().find((t) => t.name === task.tag) : undefined;
  const tagBg = tagDef?.color ?? '#ffdad9';
  const tagTxt = tagTextColor(tagBg);
  const [subtaskInput, setSubtaskInput] = useState('');
  const subtaskRef = useRef<HTMLInputElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  useEffect(() => {
    if (isDragging) {
      document.body.style.cursor = "url('/cursor-hand.png') 24 24, grabbing";
    } else {
      document.body.style.cursor = '';
    }
    return () => { document.body.style.cursor = ''; };
  }, [isDragging]);

  useEffect(() => {
    if (addingSubtask) subtaskRef.current?.focus();
  }, [addingSubtask]);

  const pri = priorityConfig[task.priority];

  const cursorStyle = isDragging
    ? "url('/cursor-hand.png') 24 24, grabbing"
    : hovered
    ? "url('/cursor-hand.png') 24 24, grab"
    : 'default';

  const toggleSubtask = (id: string) => {
    if (!onUpdateSubtasks) return;
    const updated = (task.subtasks ?? []).map((s) =>
      s.id === id ? { ...s, done: !s.done } : s
    );
    onUpdateSubtasks(task.id, updated);
  };

  const commitSubtask = () => {
    const trimmed = subtaskInput.trim();
    setSubtaskInput('');
    setAddingSubtask(false);
    if (!trimmed || !onUpdateSubtasks) return;
    const updated = [...(task.subtasks ?? []), { id: uuidv4(), title: trimmed, done: false }];
    onUpdateSubtasks(task.id, updated);
  };

  const handleSubtaskKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); commitSubtask(); }
    if (e.key === 'Escape') { setSubtaskInput(''); setAddingSubtask(false); }
  };

  const subtasks = task.subtasks ?? [];
  const doneCount = subtasks.filter((s) => s.done).length;

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0 : 1,
        cursor: cursorStyle,
        outline: 'none',
        touchAction: 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); }}
    >
      <motion.div
        className="task-card"
        animate={{
          y: hovered && !isDragging ? -3 : 0,
          boxShadow: hovered && !isDragging
            ? '0px 16px 40px rgba(28,28,23,0.13)'
            : '0px 4px 16px rgba(28,28,23,0.06)',
        }}
        transition={{ type: 'spring', stiffness: 380, damping: 26 }}
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        style={{ cursor: cursorStyle }}
      >
        <div className="task-card__body">
          <div className="task-card__header">
            <div
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onToggleDone(task.id); }}
              className="task-card__check"
              role="button"
              aria-label={isDone ? 'Mark as not done' : 'Mark as done'}
              style={{ cursor: 'pointer' }}
            >
              <AnimatePresence mode="wait" initial={false}>
                {isDone ? (
                  <motion.span
                    key="done"
                    initial={{ scale: 0, rotate: -90 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, rotate: 90 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                  >
                    <CheckCircle2 size={18} color="#580000" />
                  </motion.span>
                ) : (
                  <motion.span
                    key="undone"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                  >
                    <Circle size={18} color="#c4b9a8" />
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            <span
              className="task-card__priority"
              style={{ background: pri.color, color: pri.text }}
            >
              {pri.label}
            </span>

            <AnimatePresence>
              {hovered && !isDragging && (
                <motion.div
                  className="task-card__actions"
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                >
                  {task.columnId !== 'inProgress' && onMoveToInProgress && (
                    <div
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => { e.stopPropagation(); onMoveToInProgress(task.id); }}
                      className="task-card__action-btn task-card__action-btn--progress"
                      role="button"
                      aria-label="Move to In Progress"
                      style={{ cursor: 'pointer' }}
                    >
                      <Zap size={13} />
                    </div>
                  )}
                  <div
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => { e.stopPropagation(); onEdit?.(task); }}
                    className="task-card__action-btn"
                    role="button"
                    aria-label="Edit task"
                    style={{ cursor: 'pointer' }}
                  >
                    <Pencil size={13} />
                  </div>
                  <div
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
                    className="task-card__action-btn task-card__action-btn--danger"
                    role="button"
                    aria-label="Delete task"
                    style={{ cursor: 'pointer' }}
                  >
                    <Trash2 size={13} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <p
            className="task-card__title"
            style={{
              textDecoration: isDone ? 'line-through' : 'none',
              opacity: isDone ? 0.45 : 1,
            }}
          >
            {task.title}
          </p>

          {task.description && (
            <p className="task-card__desc">{task.description}</p>
          )}

          {task.tag && (
            <span
              className="task-card__tag"
              style={{ background: tagBg, color: tagTxt }}
            >
              {task.tag}
            </span>
          )}

          {/* Subtask list */}
          {subtasks.length > 0 && (
            <div className="task-card__subtasks">
              {subtasks.map((s) => (
                <div
                  key={s.id}
                  className="task-card__subtask"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); toggleSubtask(s.id); }}
                  role="checkbox"
                  aria-checked={s.done}
                  style={{ cursor: 'pointer' }}
                >
                  <span className={`task-card__subtask-box${s.done ? ' task-card__subtask-box--done' : ''}`}>
                    {s.done && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 600, damping: 20 }}
                        className="task-card__subtask-check"
                      />
                    )}
                  </span>
                  <span
                    className="task-card__subtask-title"
                    style={{ textDecoration: s.done ? 'line-through' : 'none', opacity: s.done ? 0.45 : 1 }}
                  >
                    {s.title}
                  </span>
                </div>
              ))}
              <div className="task-card__subtask-progress">
                <div
                  className="task-card__subtask-bar"
                  style={{ width: `${subtasks.length > 0 ? (doneCount / subtasks.length) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}

          {/* Add subtask inline — input OR button */}
          <div
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <AnimatePresence mode="wait">
              {addingSubtask ? (
                <motion.div
                  key="input"
                  className="task-card__subtask-add-row"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                >
                  <input
                    ref={subtaskRef}
                    className="task-card__subtask-input"
                    type="text"
                    value={subtaskInput}
                    onChange={(e) => setSubtaskInput(e.target.value)}
                    onKeyDown={handleSubtaskKey}
                    onBlur={commitSubtask}
                    placeholder="New subtask..."
                  />
                </motion.div>
              ) : (
                <motion.button
                  key="btn"
                  type="button"
                  className="task-card__subtask-add-btn"
                  onClick={(e) => { e.stopPropagation(); setAddingSubtask(true); }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: hovered ? 1 : 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  aria-label="Add subtask"
                  style={{ cursor: 'pointer' }}
                >
                  <Plus size={11} />
                  <span>Add subtask</span>
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
