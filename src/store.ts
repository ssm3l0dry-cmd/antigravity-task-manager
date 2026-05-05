import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Task, ColumnId, TagDef } from './types';

const STORAGE_KEY = 'antigravity-tasks';
const TAGS_KEY = 'antigravity-tags';
const LAST_CLEARED_KEY = 'antigravity-last-cleared';

function todayDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function purgeDoneTasksIfNewDay(): void {
  const today = todayDateString();
  const last = localStorage.getItem(LAST_CLEARED_KEY);
  if (last === today) return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const tasks = JSON.parse(raw) as Task[];
      const kept = tasks.filter((t) => t.columnId !== 'done');
      localStorage.setItem(STORAGE_KEY, JSON.stringify(kept));
    }
  } catch { /* ignore */ }
  localStorage.setItem(LAST_CLEARED_KEY, today);
}

purgeDoneTasksIfNewDay();

export const TAG_PALETTE = [
  '#ffdad9', // rose
  '#fde68a', // amber
  '#bbf7d0', // mint
  '#bfdbfe', // sky
  '#e9d5ff', // lavender
  '#fed7aa', // peach
  '#d1fae5', // sage
  '#fce7f3', // pink
  '#cffafe', // cyan
  '#f3f4f6', // neutral
];

export function tagTextColor(bg: string): string {
  // simple luminance check to pick dark or dark-tinted text
  const hex = bg.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.55 ? '#1c1c17' : '#fff';
}

const DEFAULT_TAGS: TagDef[] = [
  { name: 'Design',    color: '#bfdbfe' },
  { name: 'Dev',       color: '#bbf7d0' },
  { name: 'Research',  color: '#e9d5ff' },
  { name: 'Marketing', color: '#fde68a' },
  { name: 'Review',    color: '#fed7aa' },
  { name: 'Bug',       color: '#ffdad9' },
];

export function loadTags(): TagDef[] {
  try {
    const raw = localStorage.getItem(TAGS_KEY);
    if (!raw) return DEFAULT_TAGS;
    const parsed = JSON.parse(raw);
    // migrate old string[] format
    if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
      const migrated: TagDef[] = (parsed as string[]).map((name, i) => ({
        name,
        color: TAG_PALETTE[i % TAG_PALETTE.length],
      }));
      localStorage.setItem(TAGS_KEY, JSON.stringify(migrated));
      return migrated;
    }
    return parsed as TagDef[];
  } catch {
    return DEFAULT_TAGS;
  }
}

export function saveTags(tags: TagDef[]) {
  localStorage.setItem(TAGS_KEY, JSON.stringify(tags));
}

function loadTasks(): Task[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Task[]) : [];
  } catch {
    return [];
  }
}

function saveTasks(tasks: Task[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

export function useTaskStore() {
  const [tasks, setTasks] = useState<Task[]>(loadTasks);

  useEffect(() => {
    saveTasks(tasks);
  }, [tasks]);

  const addTask = useCallback(
    (data: { title: string; description?: string; priority: Task['priority']; tag?: string; columnId: ColumnId; subtasks?: import('./types').Subtask[] }) => {
      const task: Task = {
        id: uuidv4(),
        createdAt: Date.now(),
        ...data,
      };
      setTasks((prev) => [...prev, task]);
      return task;
    },
    []
  );

  const moveTask = useCallback((taskId: string, targetColumn: ColumnId) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, columnId: targetColumn } : t))
    );
  }, []);

  const reorderTask = useCallback(
    (activeId: string, overId: string, targetColumn: ColumnId) => {
      setTasks((prev) => {
        const activeIndex = prev.findIndex((t) => t.id === activeId);
        const overIndex = prev.findIndex((t) => t.id === overId);
        if (activeIndex === -1) return prev;

        const updated = prev.map((t) =>
          t.id === activeId ? { ...t, columnId: targetColumn } : t
        );

        const fromIdx = updated.findIndex((t) => t.id === activeId);
        const toIdx = overIndex !== -1 ? overIndex : fromIdx;

        const reordered = [...updated];
        const [moved] = reordered.splice(fromIdx, 1);
        reordered.splice(toIdx, 0, moved);
        return reordered;
      });
    },
    []
  );

  const deleteTask = useCallback((taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }, []);

  const updateTask = useCallback((taskId: string, patch: Partial<Task>) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, ...patch } : t))
    );
  }, []);

  const clearAll = useCallback(() => setTasks([]), []);

  return { tasks, addTask, moveTask, reorderTask, deleteTask, updateTask, clearAll };
}
