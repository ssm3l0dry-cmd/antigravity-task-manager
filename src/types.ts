export type ColumnId = 'todo' | 'inProgress' | 'done';

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface TagDef {
  name: string;
  color: string; // hex background color
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  columnId: ColumnId;
  priority: 'low' | 'medium' | 'high';
  createdAt: number;
  tag?: string;
  subtasks?: Subtask[];
}

export interface Column {
  id: ColumnId;
  label: string;
  accent: string;
}

export const COLUMNS: Column[] = [
  { id: 'todo', label: 'To Do', accent: '#e6e2da' },
  { id: 'inProgress', label: 'In Progress', accent: '#fd8586' },
  { id: 'done', label: 'Done', accent: '#580000' },
];
