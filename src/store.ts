import { useState, useEffect, useCallback } from 'react';
import type { Task, ColumnId, TagDef, Subtask } from './types';
import { supabase } from './lib/supabase';

const TAGS_KEY = 'antigravity-tags';

export const TAG_PALETTE = [
  '#ffdad9', '#fde68a', '#bbf7d0', '#bfdbfe', '#e9d5ff',
  '#fed7aa', '#d1fae5', '#fce7f3', '#cffafe', '#f3f4f6',
];

export function tagTextColor(bg: string): string {
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
  void supabase.auth.getUser().then(({ data: { user } }) => {
    if (!user) return;
    void supabase.from('tags').delete().eq('user_id', user.id).then(() => {
      if (tags.length === 0) return;
      void supabase.from('tags').insert(
        tags.map(t => ({ user_id: user.id, name: t.name, color: t.color }))
      );
    });
  });
}

export async function syncTagsFromDB(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data } = await supabase
    .from('tags')
    .select('name, color')
    .eq('user_id', user.id);
  if (data && data.length > 0) {
    localStorage.setItem(TAGS_KEY, JSON.stringify(data as TagDef[]));
  } else {
    const localTags = loadTags();
    void supabase.from('tags').insert(
      localTags.map(t => ({ user_id: user.id, name: t.name, color: t.color }))
    );
  }
}

function dbRowToTask(row: Record<string, unknown>): Task {
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string | null) ?? undefined,
    columnId: row.column_id as ColumnId,
    priority: row.priority as Task['priority'],
    createdAt: new Date(row.created_at as string).getTime(),
    tag: (row.tag_name as string | null) ?? undefined,
    subtasks: (row.subtasks as Subtask[]) ?? [],
  };
}

export function useTaskStore() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('position');

      if (data) {
        // Migrate localStorage tasks to Supabase on first login
        if (data.length === 0) {
          try {
            const raw = localStorage.getItem('antigravity-tasks');
            if (raw) {
              const localTasks = JSON.parse(raw) as Task[];
              if (localTasks.length > 0) {
                const toInsert = localTasks.map((t, i) => ({
                  user_id: user.id,
                  title: t.title,
                  description: t.description ?? null,
                  column_id: t.columnId,
                  priority: t.priority,
                  tag_name: t.tag ?? null,
                  position: i,
                  subtasks: t.subtasks ?? [],
                }));
                const { data: migrated } = await supabase
                  .from('tasks')
                  .insert(toInsert)
                  .select();
                if (migrated) {
                  setTasks(migrated.map(dbRowToTask));
                  localStorage.removeItem('antigravity-tasks');
                  setLoading(false);
                  return;
                }
              }
            }
          } catch { /* ignore migration errors */ }
        }

        const doneIds = data.filter(r => r.column_id === 'done').map(r => r.id as string);
        if (doneIds.length > 0) {
          const { error } = await supabase.from('tasks').delete().in('id', doneIds);
          if (error) console.error('[clearDone]', error);
        }
        setTasks(data.filter(r => r.column_id !== 'done').map(dbRowToTask));
      }
      setLoading(false);
    })();
  }, []);

  const addTask = useCallback(async (
    data: {
      title: string;
      description?: string;
      priority: Task['priority'];
      tag?: string;
      columnId: ColumnId;
      subtasks?: Subtask[];
    }
  ) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const colCount = tasks.filter(t => t.columnId === data.columnId).length;
    const { data: inserted } = await supabase
      .from('tasks')
      .insert({
        user_id: user.id,
        title: data.title,
        description: data.description ?? null,
        column_id: data.columnId,
        priority: data.priority,
        tag_name: data.tag ?? null,
        position: colCount,
        subtasks: data.subtasks ?? [],
      })
      .select()
      .single();
    if (inserted) setTasks(prev => [...prev, dbRowToTask(inserted as Record<string, unknown>)]);
  }, [tasks]);

  const moveTask = useCallback((taskId: string, targetColumn: ColumnId) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, columnId: targetColumn } : t));
    void supabase.from('tasks').update({ column_id: targetColumn }).eq('id', taskId);
  }, []);

  const reorderTask = useCallback((activeId: string, overId: string, targetColumn: ColumnId) => {
    setTasks(prev => {
      const updated = prev.map(t => t.id === activeId ? { ...t, columnId: targetColumn } : t);
      const fromIdx = updated.findIndex(t => t.id === activeId);
      const overIndex = updated.findIndex(t => t.id === overId);
      const toIdx = overIndex !== -1 ? overIndex : fromIdx;
      if (fromIdx === -1) return prev;
      const reordered = [...updated];
      const [moved] = reordered.splice(fromIdx, 1);
      reordered.splice(toIdx, 0, moved);
      void Promise.all(
        reordered.map((task, i) =>
          supabase.from('tasks').update({ position: i, column_id: task.columnId }).eq('id', task.id)
        )
      );
      return reordered;
    });
  }, []);

  const deleteTask = useCallback((taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    supabase.from('tasks').delete().eq('id', taskId).then(({ error }) => {
      if (error) console.error('[deleteTask]', error);
    });
  }, []);

  const updateTask = useCallback((taskId: string, patch: Partial<Task>) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...patch } : t));
    const dbPatch: Record<string, unknown> = {};
    if (patch.title !== undefined) dbPatch.title = patch.title;
    if (patch.description !== undefined) dbPatch.description = patch.description ?? null;
    if (patch.columnId !== undefined) dbPatch.column_id = patch.columnId;
    if (patch.priority !== undefined) dbPatch.priority = patch.priority;
    if ('tag' in patch) dbPatch.tag_name = patch.tag ?? null;
    if (patch.subtasks !== undefined) dbPatch.subtasks = patch.subtasks;
    supabase.from('tasks').update(dbPatch).eq('id', taskId).then(({ error }) => {
      if (error) console.error('[updateTask]', error);
    });
  }, []);

  const clearAll = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setTasks([]);
    void supabase.from('tasks').delete().eq('user_id', user.id);
  }, []);

  return { tasks, loading, addTask, moveTask, reorderTask, deleteTask, updateTask, clearAll };
}
