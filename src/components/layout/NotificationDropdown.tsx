import React from 'react';
import { Bell, Flame, Calendar, CheckCircle2, Sparkles, X } from 'lucide-react';

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  streak: number;
  upcomingCount: number;
  onNavigate: (view: string) => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  isOpen,
  onClose,
  streak,
  upcomingCount,
  onNavigate,
}) => {
  if (!isOpen) return null;

  const notifications = [
    {
      id: '1',
      icon: <Flame className="w-4 h-4 text-amber-400" />,
      title: `${streak}-Day Streak Active!`,
      description: 'Study for at least 25 minutes today to keep your streak burning bright.',
      action: 'focus',
      time: 'Today',
    },
    {
      id: '2',
      icon: <Calendar className="w-4 h-4 text-rose-400" />,
      title: `${upcomingCount} Deadline${upcomingCount === 1 ? '' : 's'} Approaching`,
      description: 'Review your upcoming tasks in the study planner.',
      action: 'planner',
      time: 'Urgent',
    },
    {
      id: '3',
      icon: <Sparkles className="w-4 h-4 text-purple-400" />,
      title: 'AI Note Revision Suggestion',
      description: 'Create active recall flashcards from your latest notes.',
      action: 'flashcards',
      time: 'Recommendation',
    },
  ];

  return (
    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/90">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-semibold text-zinc-100">Study Notifications</span>
        </div>
        <button
          onClick={onClose}
          className="text-zinc-400 hover:text-zinc-200 p-1 rounded-lg hover:bg-zinc-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="divide-y divide-zinc-800/60 max-h-80 overflow-y-auto">
        {notifications.map((n) => (
          <div
            key={n.id}
            onClick={() => {
              onNavigate(n.action);
              onClose();
            }}
            className="p-3.5 hover:bg-zinc-800/50 cursor-pointer transition-colors flex gap-3 items-start group"
          >
            <div className="p-2 rounded-xl bg-zinc-800/80 border border-zinc-700/50 shrink-0">
              {n.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1 mb-0.5">
                <span className="text-xs font-semibold text-zinc-200 group-hover:text-indigo-400 transition-colors truncate">
                  {n.title}
                </span>
                <span className="text-[10px] font-medium text-zinc-500 shrink-0">{n.time}</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">{n.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="px-4 py-2.5 bg-zinc-900/90 border-t border-zinc-800 text-center">
        <span className="text-xs text-zinc-500 font-medium">All notifications synced</span>
      </div>
    </div>
  );
};
