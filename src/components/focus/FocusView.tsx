import React, { useState, useEffect, useRef } from 'react';
import {
  Timer,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  CheckCircle2,
  Flame,
  BookOpen,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../../lib/api';
import { Subject, Task } from '../../types';
import { useToast } from '../../context/ToastContext';

interface FocusViewProps {
  initialTaskId?: string | null;
}

export const FocusView: React.FC<FocusViewProps> = ({ initialTaskId }) => {
  const { success, error, info } = useToast();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState(initialTaskId || '');

  // Timer Modes
  const [mode, setMode] = useState<'pomodoro' | 'deep' | 'custom'>('pomodoro');
  const [sessionMinutes, setSessionMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [isBreak, setIsBreak] = useState(false);

  // Timer State
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Soundscape (Synthesized Web Audio API white noise / gentle tone)
  const [ambientSound, setAmbientSound] = useState<'none' | 'whitenoise' | 'rain'>('none');
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioNodeRef = useRef<AudioNode | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    Promise.all([api.getSubjects(), api.getTasks()]).then(([subsRes, tasksRes]) => {
      setSubjects(subsRes.subjects || []);
      setTasks(tasksRes.tasks || []);
      if (subsRes.subjects && subsRes.subjects.length > 0) {
        setSelectedSubjectId(subsRes.subjects[0].id);
      }
    }).catch(() => {});
  }, []);

  // Update timer duration when mode changes
  const applyMode = (newMode: 'pomodoro' | 'deep' | 'custom', customMins?: number) => {
    setIsRunning(false);
    setIsBreak(false);
    setMode(newMode);

    if (newMode === 'pomodoro') {
      setSessionMinutes(25);
      setBreakMinutes(5);
      setTimeLeft(25 * 60);
    } else if (newMode === 'deep') {
      setSessionMinutes(50);
      setBreakMinutes(10);
      setTimeLeft(50 * 60);
    } else if (customMins) {
      setSessionMinutes(customMins);
      setBreakMinutes(5);
      setTimeLeft(customMins * 60);
    }
  };

  // Timer ticker
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleSessionComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, isBreak, sessionMinutes, selectedSubjectId, selectedTaskId]);

  const handleSessionComplete = async () => {
    setIsRunning(false);

    if (!isBreak) {
      // Completed Study Focus Interval!
      try {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 },
        });
      } catch {}

      try {
        await api.logStudySession({
          subjectId: selectedSubjectId || '',
          taskId: selectedTaskId || null,
          durationMinutes: sessionMinutes,
          sessionType: mode === 'deep' ? 'deep_work' : 'pomodoro',
          notes: `Completed ${sessionMinutes}m focus session`,
        });
        success(`Focus session logged! ${sessionMinutes} mins added to your streak.`);
      } catch (err) {
        console.error('Failed to log session:', err);
      }

      // Switch to break
      setIsBreak(true);
      setTimeLeft(breakMinutes * 60);
    } else {
      // Break Finished
      setIsBreak(false);
      setTimeLeft(sessionMinutes * 60);
      info('Break over! Ready for your next focus round?');
    }
  };

  const handleToggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const handleResetTimer = () => {
    setIsRunning(false);
    setTimeLeft(isBreak ? breakMinutes * 60 : sessionMinutes * 60);
  };

  // Web Audio Synthesizer for gentle white noise or soft rain sound
  const toggleSound = (soundType: 'none' | 'whitenoise' | 'rain') => {
    if (audioNodeRef.current) {
      audioNodeRef.current.disconnect();
      audioNodeRef.current = null;
    }

    if (soundType === 'none') {
      setAmbientSound('none');
      return;
    }

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      // Buffer white noise generator
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = buffer;
      whiteNoise.loop = true;

      // Lowpass filter for soothing rain or brown noise
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = soundType === 'rain' ? 800 : 400;

      const gainNode = ctx.createGain();
      gainNode.gain.value = 0.05; // Gentle volume

      whiteNoise.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);
      whiteNoise.start(0);

      audioNodeRef.current = whiteNoise;
      setAmbientSound(soundType);
    } catch (err) {
      console.warn('Web Audio synthesis error:', err);
      setAmbientSound('none');
    }
  };

  useEffect(() => {
    return () => {
      if (audioNodeRef.current) {
        audioNodeRef.current.disconnect();
      }
    };
  }, []);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const totalSecs = isBreak ? breakMinutes * 60 : sessionMinutes * 60;
  const progressPercent = Math.round(((totalSecs - timeLeft) / totalSecs) * 100);

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);
  const selectedTask = tasks.find((t) => t.id === selectedTaskId);

  return (
    <div
      className={`p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-200 ${
        isFullscreen ? 'fixed inset-0 z-50 bg-zinc-950 p-6 flex flex-col justify-center' : ''
      }`}
    >
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Timer className="w-7 h-7 text-indigo-500" />
            <span>Deep Focus & Pomodoro</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Build sustained attention, eliminate distractions, and automatically log study hours.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Ambient Soundscape Picker */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs">
            <button
              onClick={() => toggleSound('none')}
              className={`px-2 py-1 rounded-lg font-medium transition-colors ${
                ambientSound === 'none' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white font-bold' : 'text-zinc-400'
              }`}
            >
              Mute
            </button>
            <button
              onClick={() => toggleSound('rain')}
              className={`px-2 py-1 rounded-lg font-medium transition-colors ${
                ambientSound === 'rain' ? 'bg-indigo-600 text-white font-bold' : 'text-zinc-400'
              }`}
            >
              Rain
            </button>
            <button
              onClick={() => toggleSound('whitenoise')}
              className={`px-2 py-1 rounded-lg font-medium transition-colors ${
                ambientSound === 'whitenoise' ? 'bg-indigo-600 text-white font-bold' : 'text-zinc-400'
              }`}
            >
              White Noise
            </button>
          </div>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Focus'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Focus Card */}
      <div className="max-w-2xl mx-auto rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 shadow-2xl p-6 sm:p-10 flex flex-col items-center text-center space-y-8 backdrop-blur-md">
        {/* Mode Selector Tabs */}
        <div className="flex items-center p-1 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/80 text-xs font-semibold">
          <button
            onClick={() => applyMode('pomodoro')}
            className={`px-4 py-2 rounded-xl transition-all ${
              mode === 'pomodoro'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            25/5 Pomodoro
          </button>
          <button
            onClick={() => applyMode('deep')}
            className={`px-4 py-2 rounded-xl transition-all ${
              mode === 'deep'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            50/10 Deep Work
          </button>
          <button
            onClick={() => applyMode('custom', 45)}
            className={`px-4 py-2 rounded-xl transition-all ${
              mode === 'custom'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            45m Custom
          </button>
        </div>

        {/* Circular Animated Timer Display */}
        <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
          {/* SVG Progress Circle */}
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="50%"
              cy="50%"
              r="44%"
              className="stroke-zinc-200 dark:stroke-zinc-800"
              strokeWidth="8"
              fill="transparent"
            />
            <circle
              cx="50%"
              cy="50%"
              r="44%"
              className={`transition-all duration-1000 ${
                isBreak ? 'stroke-emerald-500' : 'stroke-indigo-600'
              }`}
              strokeWidth="8"
              strokeDasharray={2 * Math.PI * 125}
              strokeDashoffset={2 * Math.PI * 125 * (1 - progressPercent / 100)}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>

          {/* Time Text Center */}
          <div className="absolute flex flex-col items-center justify-center">
            <span
              className={`text-xs font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full mb-1 ${
                isBreak
                  ? 'bg-emerald-500/10 text-emerald-500'
                  : 'bg-indigo-500/10 text-indigo-500'
              }`}
            >
              {isBreak ? 'Break Time' : 'Focus Interval'}
            </span>
            <div className="text-5xl sm:text-6xl font-extrabold tracking-tight font-mono text-zinc-900 dark:text-white">
              {formatTime(timeLeft)}
            </div>
            <span className="text-xs text-zinc-400 mt-1">
              {selectedSubject ? selectedSubject.name : 'General Focus'}
            </span>
          </div>
        </div>

        {/* Play / Pause / Reset Controls */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleResetTimer}
            className="p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
            title="Reset Session"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          <button
            onClick={handleToggleTimer}
            className="px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-base shadow-xl shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95 flex items-center gap-2.5"
          >
            {isRunning ? (
              <>
                <Pause className="w-5 h-5 fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" />
                <span>Start Focus</span>
              </>
            )}
          </button>
        </div>

        {/* Connect to Subject & Task */}
        <div className="w-full pt-4 border-t border-zinc-100 dark:border-zinc-800/80 grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
          <div>
            <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
              Bind to Subject
            </label>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none"
            >
              <option value="">No Subject Linked</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
              Bind to Task (Optional)
            </label>
            <select
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none"
            >
              <option value="">No Specific Task</option>
              {tasks.filter((t) => t.status !== 'completed').map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
