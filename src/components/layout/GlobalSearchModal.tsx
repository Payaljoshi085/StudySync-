import React, { useState, useEffect, useRef } from 'react';
import { Search, X, BookOpen, CheckSquare, Layers, Brain, BookMarked, ArrowRight } from 'lucide-react';
import { api } from '../../lib/api';
import { Note, Task, FlashcardDeck, Quiz, Subject } from '../../types';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: string, itemId?: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose, onNavigate }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    notes: Note[];
    tasks: Task[];
    flashcards: FlashcardDeck[];
    quizzes: Quiz[];
    subjects: Subject[];
  }>({
    notes: [],
    tasks: [],
    flashcards: [],
    quizzes: [],
    subjects: [],
  });

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults({ notes: [], tasks: [], flashcards: [], quizzes: [], subjects: [] });
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults({ notes: [], tasks: [], flashcards: [], quizzes: [], subjects: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.search(query);
        setResults(data);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  // Keyboard shortcut listener for ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const totalResults =
    results.notes.length +
    results.tasks.length +
    results.flashcards.length +
    results.quizzes.length +
    results.subjects.length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-zinc-800 bg-zinc-900/90 gap-3">
          <Search className="w-5 h-5 text-indigo-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes, tasks, flashcards, quizzes, subjects..."
            className="w-full bg-transparent text-zinc-100 placeholder-zinc-500 text-base focus:outline-none"
          />
          {loading && (
            <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin shrink-0" />
          )}
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results Area */}
        <div className="overflow-y-auto p-3 space-y-4">
          {!query.trim() && (
            <div className="py-12 text-center text-zinc-500">
              <Search className="w-10 h-10 mx-auto mb-3 opacity-30 text-indigo-400" />
              <p className="text-sm font-medium">Type anything to search across your entire StudySync space</p>
              <p className="text-xs text-zinc-600 mt-1">Press ESC anytime to close</p>
            </div>
          )}

          {query.trim() && totalResults === 0 && !loading && (
            <div className="py-12 text-center text-zinc-500">
              <p className="text-sm font-medium text-zinc-400">No matching items found for "{query}"</p>
              <p className="text-xs text-zinc-600 mt-1">Try searching for a different keyword or create a new note</p>
            </div>
          )}

          {/* Notes */}
          {results.notes.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider px-2 mb-1.5 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                Notes ({results.notes.length})
              </div>
              <div className="space-y-1">
                {results.notes.map((note) => (
                  <button
                    key={note.id}
                    onClick={() => {
                      onNavigate('notes', note.id);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-zinc-800/80 text-left transition-colors group"
                  >
                    <div className="truncate">
                      <div className="text-sm font-medium text-zinc-200 group-hover:text-blue-400 transition-colors">
                        {note.title}
                      </div>
                      <div className="text-xs text-zinc-500 truncate">
                        {note.tags.join(', ') || 'No tags'}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-blue-400 transition-colors shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tasks */}
          {results.tasks.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider px-2 mb-1.5 flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                Tasks ({results.tasks.length})
              </div>
              <div className="space-y-1">
                {results.tasks.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => {
                      onNavigate('tasks', task.id);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-zinc-800/80 text-left transition-colors group"
                  >
                    <div className="truncate">
                      <div className="text-sm font-medium text-zinc-200 group-hover:text-emerald-400 transition-colors">
                        {task.title}
                      </div>
                      <div className="text-xs text-zinc-500">
                        Priority: {task.priority} • Due: {task.dueDate}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-emerald-400 transition-colors shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Flashcards */}
          {results.flashcards.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider px-2 mb-1.5 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-purple-400" />
                Flashcard Decks ({results.flashcards.length})
              </div>
              <div className="space-y-1">
                {results.flashcards.map((deck) => (
                  <button
                    key={deck.id}
                    onClick={() => {
                      onNavigate('flashcards', deck.id);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-zinc-800/80 text-left transition-colors group"
                  >
                    <div className="truncate">
                      <div className="text-sm font-medium text-zinc-200 group-hover:text-purple-400 transition-colors">
                        {deck.title}
                      </div>
                      <div className="text-xs text-zinc-500">{deck.cards.length} cards in deck</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-purple-400 transition-colors shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quizzes */}
          {results.quizzes.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider px-2 mb-1.5 flex items-center gap-1.5">
                <Brain className="w-3.5 h-3.5 text-amber-400" />
                Quizzes ({results.quizzes.length})
              </div>
              <div className="space-y-1">
                {results.quizzes.map((quiz) => (
                  <button
                    key={quiz.id}
                    onClick={() => {
                      onNavigate('quizzes', quiz.id);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-zinc-800/80 text-left transition-colors group"
                  >
                    <div className="truncate">
                      <div className="text-sm font-medium text-zinc-200 group-hover:text-amber-400 transition-colors">
                        {quiz.title}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {quiz.questions.length} questions • Difficulty: {quiz.difficulty}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-amber-400 transition-colors shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Subjects */}
          {results.subjects.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider px-2 mb-1.5 flex items-center gap-1.5">
                <BookMarked className="w-3.5 h-3.5 text-rose-400" />
                Subjects ({results.subjects.length})
              </div>
              <div className="space-y-1">
                {results.subjects.map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => {
                      onNavigate('notes');
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-zinc-800/80 text-left transition-colors group"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: sub.color }} />
                      <span className="text-sm font-medium text-zinc-200 group-hover:text-white transition-colors">
                        {sub.name}
                      </span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
