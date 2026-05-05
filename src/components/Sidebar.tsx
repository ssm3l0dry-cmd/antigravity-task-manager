import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, GitBranch, Info, Zap } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onClearAll: () => void;
  taskCount: number;
}

const sidebarVariants = {
  closed: { x: '-100%', opacity: 0 },
  open: {
    x: 0,
    opacity: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 30,
      staggerChildren: 0.07,
      delayChildren: 0.15,
    },
  },
  exit: {
    x: '-100%',
    opacity: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 400,
      damping: 35,
    },
  },
};

const itemVariants = {
  closed: { opacity: 0, x: -20 },
  open: {
    opacity: 1,
    x: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 24 },
  },
};

export function Sidebar({ isOpen, onClose, onClearAll, taskCount }: Props) {
  const handleClearAll = () => {
    if (taskCount === 0) return;
    if (window.confirm('Clear all tasks? This cannot be undone.')) {
      onClearAll();
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="sidebar-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.aside
            className="sidebar"
            variants={sidebarVariants}
            initial="closed"
            animate="open"
            exit="exit"
            aria-label="Settings panel"
          >
            {/* Header */}
            <motion.div className="sidebar__header" variants={itemVariants}>
              <div className="sidebar__logo">
                <Zap size={20} color="#580000" />
                <span className="sidebar__brand">Antigravity</span>
              </div>
              <motion.button
                className="sidebar__close"
                onClick={onClose}
                whileHover={{ scale: 1.1, background: 'rgba(88,0,0,0.08)' }}
                whileTap={{ scale: 0.9 }}
                aria-label="Close settings"
              >
                <X size={18} />
              </motion.button>
            </motion.div>

            {/* Stats */}
            <motion.div className="sidebar__stats" variants={itemVariants}>
              <div className="sidebar__stat">
                <span className="sidebar__stat-num">{taskCount}</span>
                <span className="sidebar__stat-label">Total Tasks</span>
              </div>
              <div className="sidebar__divider" />
              <div className="sidebar__stat">
                <span className="sidebar__stat-num">∞</span>
                <span className="sidebar__stat-label">Possibilities</span>
              </div>
            </motion.div>

            {/* Section */}
            <motion.div className="sidebar__section" variants={itemVariants}>
              <p className="sidebar__section-title">Settings</p>

              <motion.button
                className="sidebar__item sidebar__item--danger"
                onClick={handleClearAll}
                whileHover={{ x: 4, background: 'rgba(88,0,0,0.06)' }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 22 }}
              >
                <Trash2 size={16} />
                <span>Clear All Tasks</span>
              </motion.button>
            </motion.div>

            {/* About */}
            <motion.div className="sidebar__section" variants={itemVariants}>
              <p className="sidebar__section-title">About</p>

              <motion.a
                className="sidebar__item"
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                whileHover={{ x: 4, background: 'rgba(88,0,0,0.04)' }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 22 }}
              >
                <GitBranch size={16} />
                <span>Source Code</span>
              </motion.a>

              <motion.div
                className="sidebar__item"
                whileHover={{ x: 4, background: 'rgba(88,0,0,0.04)' }}
                transition={{ type: 'spring', stiffness: 400, damping: 22 }}
              >
                <Info size={16} />
                <span>v1.0.0</span>
              </motion.div>
            </motion.div>

            {/* Footer */}
            <motion.div className="sidebar__footer" variants={itemVariants}>
              <p className="sidebar__footer-text">
                Built with the <span style={{ color: '#580000', fontWeight: 600 }}>Kinetic Editorial</span> design system.
              </p>
            </motion.div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
