import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Check } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import type { Task, Subtask, TagDef } from '../types';
import { loadTags, saveTags, TAG_PALETTE, tagTextColor } from '../store';

interface Props {
  task: Task | null;
  onClose: () => void;
  onSave: (taskId: string, patch: Partial<Task>) => void;
}

const priorityOptions: { value: Task['priority']; label: string; bg: string; text: string; border: string }[] = [
  { value: 'low',    label: 'Low',    bg: '#d1fae5', text: '#065f46', border: '#6ee7b7' },
  { value: 'medium', label: 'Medium', bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
  { value: 'high',   label: 'High',   bg: '#580000', text: '#fff',    border: '#580000' },
];

export function EditTaskModal({ task, onClose, onSave }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Task['priority']>('medium');
  const [tag, setTag] = useState('');
  const [tags, setTags] = useState<TagDef[]>(loadTags);
  const [addingTag, setAddingTag] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const [newTagColor, setNewTagColor] = useState(TAG_PALETTE[0]);
  const [editingColorFor, setEditingColorFor] = useState<string | null>(null);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskInput, setNewSubtaskInput] = useState('');
  const tagInputRef = useRef<HTMLInputElement>(null);
  const subtaskRef = useRef<HTMLInputElement>(null);
  const isOpen = task !== null;

  useEffect(() => {
    if (addingTag) tagInputRef.current?.focus();
  }, [addingTag]);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description ?? '');
      setPriority(task.priority);
      setTag(task.tag ?? '');
      setSubtasks(task.subtasks ? [...task.subtasks] : []);
      setNewSubtaskInput('');
      setAddingTag(false);
      setNewTagInput('');
      setEditingColorFor(null);
      setTags(loadTags());
    }
  }, [task?.id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !title.trim()) return;
    onSave(task.id, {
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      tag: tag || undefined,
      subtasks: subtasks.length > 0 ? subtasks : undefined,
    });
    onClose();
  };

  const commitNewTag = () => {
    const trimmed = newTagInput.trim();
    if (!trimmed) { setAddingTag(false); return; }
    const normalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    let updated = [...tags];
    const existing = updated.find((t) => t.name.toLowerCase() === normalized.toLowerCase());
    if (!existing) {
      updated = [...updated, { name: normalized, color: newTagColor }];
      setTags(updated);
      saveTags(updated);
    }
    setTag(normalized);
    setNewTagInput('');
    setNewTagColor(TAG_PALETTE[0]);
    setAddingTag(false);
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); commitNewTag(); }
    if (e.key === 'Escape') { setAddingTag(false); setNewTagInput(''); }
  };

  const removeTag = (tagName: string) => {
    const updated = tags.filter((t) => t.name !== tagName);
    setTags(updated);
    saveTags(updated);
    if (tag === tagName) setTag('');
  };

  const changeTagColor = (tagName: string, color: string) => {
    const updated = tags.map((t) => t.name === tagName ? { ...t, color } : t);
    setTags(updated);
    saveTags(updated);
    setEditingColorFor(null);
  };

  const addSubtask = () => {
    const trimmed = newSubtaskInput.trim();
    if (!trimmed) return;
    setSubtasks((prev) => [...prev, { id: uuidv4(), title: trimmed, done: false }]);
    setNewSubtaskInput('');
    subtaskRef.current?.focus();
  };

  const handleSubtaskKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); addSubtask(); }
  };

  const toggleSubtask = (id: string) => {
    setSubtasks((prev) => prev.map((s) => s.id === id ? { ...s, done: !s.done } : s));
  };

  const removeSubtask = (id: string) => {
    setSubtasks((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <motion.div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Edit task"
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 24 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal__header">
              <h2 className="modal__title">Edit Task</h2>
              <motion.button
                className="modal__close"
                onClick={onClose}
                whileHover={{ scale: 1.1, background: 'rgba(88,0,0,0.08)' }}
                whileTap={{ scale: 0.9 }}
                aria-label="Close"
              >
                <X size={18} />
              </motion.button>
            </div>

            <form onSubmit={handleSubmit} className="modal__form">
              {/* Title */}
              <div className="modal__field">
                <label className="modal__label" htmlFor="edit-title">Task Title <span aria-hidden>*</span></label>
                <input
                  id="edit-title"
                  className="modal__input"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What needs to be done?"
                  autoFocus
                  required
                />
              </div>

              {/* Description */}
              <div className="modal__field">
                <label className="modal__label" htmlFor="edit-desc">Description</label>
                <textarea
                  id="edit-desc"
                  className="modal__input modal__textarea"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional details..."
                  rows={3}
                />
              </div>

              {/* Priority */}
              <div className="modal__field">
                <label className="modal__label">Priority</label>
                <div className="modal__radio-group">
                  {priorityOptions.map((opt) => (
                    <motion.button
                      key={opt.value}
                      type="button"
                      className="modal__radio-btn"
                      style={{
                        background: priority === opt.value ? opt.bg : 'transparent',
                        color: priority === opt.value ? opt.text : opt.border,
                        borderColor: opt.border,
                        opacity: priority === opt.value ? 1 : 0.7,
                      }}
                      onClick={() => setPriority(opt.value)}
                      whileHover={{ scale: 1.04, opacity: 1 }}
                      whileTap={{ scale: 0.96 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                    >
                      {opt.label}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Tag chips */}
              <div className="modal__field">
                <label className="modal__label">Tag</label>
                <div className="modal__chips">
                  {tags.map((t) => {
                    const isSelected = tag === t.name;
                    const txtColor = tagTextColor(t.color);
                    return (
                      <div key={t.name} style={{ position: 'relative' }}>
                        <motion.button
                          type="button"
                          className="modal__chip"
                          style={{
                            background: isSelected ? t.color : 'transparent',
                            color: isSelected ? txtColor : '#8a8070',
                            borderColor: isSelected ? t.color : '#e6e2da',
                            display: 'inline-flex',
                            alignItems: 'center',
                          }}
                          onClick={() => setTag(isSelected ? '' : t.name)}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                        >
                          <span
                            className="modal__chip-dot"
                            style={{ background: t.color }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingColorFor(editingColorFor === t.name ? null : t.name);
                            }}
                            onPointerDown={(e) => e.stopPropagation()}
                            title="Change color"
                          />
                          {t.name}
                          <span
                            className="modal__chip-remove"
                            role="button"
                            aria-label={`Remove tag ${t.name}`}
                            onClick={(e) => { e.stopPropagation(); removeTag(t.name); }}
                            onPointerDown={(e) => e.stopPropagation()}
                          >
                            <X size={9} />
                          </span>
                        </motion.button>

                        {/* Color palette popover */}
                        <AnimatePresence>
                          {editingColorFor === t.name && (
                            <motion.div
                              className="modal__color-picker"
                              initial={{ opacity: 0, scale: 0.9, y: -4 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.9, y: -4 }}
                              transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {TAG_PALETTE.map((c) => (
                                <button
                                  key={c}
                                  type="button"
                                  className="modal__color-swatch"
                                  style={{ background: c, outline: t.color === c ? '2px solid #580000' : 'none' }}
                                  onClick={() => changeTagColor(t.name, c)}
                                  aria-label={`Set color ${c}`}
                                />
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}

                  {/* Inline new-tag form */}
                  <AnimatePresence>
                    {addingTag && (
                      <motion.div
                        className="modal__chip-new"
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.85 }}
                        transition={{ type: 'spring', stiffness: 420, damping: 26 }}
                        style={{ borderColor: newTagColor, background: newTagColor }}
                      >
                        <div className="modal__chip-new-palette">
                          {TAG_PALETTE.map((c) => (
                            <button
                              key={c}
                              type="button"
                              className="modal__color-swatch modal__color-swatch--sm"
                              style={{ background: c, outline: newTagColor === c ? '2px solid #580000' : 'none' }}
                              onMouseDown={(e) => { e.preventDefault(); setNewTagColor(c); }}
                              aria-label={`Pick color ${c}`}
                            />
                          ))}
                        </div>
                        <div className="modal__chip-input-row">
                          <input
                            ref={tagInputRef}
                            className="modal__chip-input"
                            style={{ color: tagTextColor(newTagColor) }}
                            type="text"
                            value={newTagInput}
                            onChange={(e) => setNewTagInput(e.target.value)}
                            onKeyDown={handleTagKeyDown}
                            onBlur={commitNewTag}
                            placeholder="Tag name..."
                            maxLength={24}
                          />
                          <button
                            type="button"
                            className="modal__chip-confirm"
                            onMouseDown={(e) => { e.preventDefault(); commitNewTag(); }}
                            aria-label="Confirm tag"
                          >
                            <Check size={11} />
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {!addingTag && (
                    <motion.button
                      type="button"
                      className="modal__chip-add"
                      onClick={() => setAddingTag(true)}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      aria-label="Add new tag"
                    >
                      <Plus size={13} />
                    </motion.button>
                  )}
                </div>
              </div>

              {/* Subtasks */}
              <div className="modal__field">
                <label className="modal__label">Subtasks</label>

                <AnimatePresence initial={false}>
                  {subtasks.map((s) => (
                    <motion.div
                      key={s.id}
                      className="modal__subtask-row"
                      initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                      animate={{ opacity: 1, height: 'auto', marginBottom: 6 }}
                      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                      transition={{ duration: 0.18 }}
                    >
                      <span
                        className={`modal__subtask-check-box${s.done ? ' modal__subtask-check-box--done' : ''}`}
                        onClick={() => toggleSubtask(s.id)}
                        role="checkbox"
                        aria-checked={s.done}
                        style={{ cursor: 'pointer' }}
                      />
                      <span
                        className="modal__subtask-title"
                        style={{ textDecoration: s.done ? 'line-through' : 'none', opacity: s.done ? 0.45 : 1 }}
                      >
                        {s.title}
                      </span>
                      <motion.button
                        type="button"
                        className="modal__subtask-remove"
                        onClick={() => removeSubtask(s.id)}
                        aria-label="Remove subtask"
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <Trash2 size={12} />
                      </motion.button>
                    </motion.div>
                  ))}
                </AnimatePresence>

                <div className="modal__tag-add">
                  <input
                    ref={subtaskRef}
                    className="modal__tag-input"
                    type="text"
                    value={newSubtaskInput}
                    onChange={(e) => setNewSubtaskInput(e.target.value)}
                    onKeyDown={handleSubtaskKey}
                    placeholder="Add a subtask..."
                  />
                  <motion.button
                    type="button"
                    className="modal__tag-add-btn"
                    onClick={addSubtask}
                    disabled={!newSubtaskInput.trim()}
                    whileHover={newSubtaskInput.trim() ? { scale: 1.08 } : {}}
                    whileTap={newSubtaskInput.trim() ? { scale: 0.92 } : {}}
                    aria-label="Add subtask"
                  >
                    <Plus size={14} />
                  </motion.button>
                </div>
              </div>

              <motion.button
                type="submit"
                className="modal__submit"
                disabled={!title.trim()}
                whileHover={title.trim() ? { scale: 1.02 } : {}}
                whileTap={title.trim() ? { scale: 0.98 } : {}}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                Save Changes
              </motion.button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
