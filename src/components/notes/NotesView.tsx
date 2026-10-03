import React, { useState, useEffect, useRef } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  Star,
  Pin,
  Archive,
  Trash2,
  Copy,
  Tag,
  Sparkles,
  Bot,
  Brain,
  Layers,
  Check,
  ChevronDown,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Code,
  Highlighter,
  Undo,
  Redo,
  Clock,
  Filter,
  ArrowUpDown,
  BookMarked,
  X,
  RotateCcw,
} from 'lucide-react';
import { api } from '../../lib/api';
import { Note, Subject } from '../../types';
import { useToast } from '../../context/ToastContext';

interface NotesViewProps {
  initialNoteId?: string | null;
  onAskAIWithNote: (noteId: string) => void;
  onGenerateFlashcardsFromNote: (noteId: string) => void;
  onGenerateQuizFromNote: (noteId: string) => void;
}

export const NotesView: React.FC<NotesViewProps> = ({
  initialNoteId,
  onAskAIWithNote,
  onGenerateFlashcardsFromNote,
  onGenerateQuizFromNote,
}) => {
  const { success, error, info } = useToast();

  const [notes, setNotes] = useState<Note[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters & Sidebar State
  const [activeTab, setActiveTab] = useState<'all' | 'favorites' | 'pinned' | 'recent' | 'archived'>('all');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'updated' | 'title' | 'created'>('updated');

  // Editor State
  const [editorTitle, setEditorTitle] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [editorSubjectId, setEditorSubjectId] = useState('');
  const [editorTags, setEditorTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [editorColor, setEditorColor] = useState('#3B82F6');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');

  // AI Generator Modal
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiSourceText, setAiSourceText] = useState('');
  const [aiMode, setAiMode] = useState<'comprehensive' | 'summary' | 'feynman' | 'revision' | 'exam'>('comprehensive');
  const [aiSubjectId, setAiSubjectId] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const editorRef = useRef<HTMLDivElement>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch subjects & notes on load
  const loadData = async () => {
    try {
      setLoading(true);
      const [subsRes, notesRes] = await Promise.all([
        api.getSubjects(),
        api.getNotes(),
      ]);
      setSubjects(subsRes.subjects || []);
      setNotes(notesRes.notes || []);

      if (initialNoteId) {
        const found = notesRes.notes.find((n) => n.id === initialNoteId);
        if (found) {
          selectNote(found);
          return;
        }
      }
      if (notesRes.notes.length > 0 && !selectedNote) {
        selectNote(notesRes.notes[0]);
      }
    } catch (err) {
      console.error('Failed to load notes data:', err);
      error('Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // When initialNoteId changes externally
  useEffect(() => {
    if (initialNoteId && notes.length > 0) {
      const found = notes.find((n) => n.id === initialNoteId);
      if (found) selectNote(found);
    }
  }, [initialNoteId]);

  const selectNote = (note: Note) => {
    setSelectedNote(note);
    setEditorTitle(note.title);
    setEditorContent(note.content);
    setEditorSubjectId(note.subjectId);
    setEditorTags(note.tags || []);
    setEditorColor(note.color || '#3B82F6');
    setSaveStatus('saved');
    if (editorRef.current) {
      editorRef.current.innerHTML = note.content;
    }
  };

  // Autosave handler
  const triggerAutoSave = (updatedFields: Partial<Note>) => {
    if (!selectedNote) return;
    setSaveStatus('saving');

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        const res = await api.updateNote(selectedNote.id, updatedFields);
        setSelectedNote(res.note);
        setNotes((prev) => prev.map((n) => (n.id === res.note.id ? res.note : n)));
        setSaveStatus('saved');
      } catch (err) {
        console.error('Autosave failed:', err);
      }
    }, 700);
  };

  const handleTitleChange = (val: string) => {
    setEditorTitle(val);
    triggerAutoSave({ title: val });
  };

  const handleContentInput = () => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    setEditorContent(html);
    triggerAutoSave({ content: html });
  };

  const handleSubjectChange = (val: string) => {
    setEditorSubjectId(val);
    triggerAutoSave({ subjectId: val });
  };

  const handleColorChange = (col: string) => {
    setEditorColor(col);
    triggerAutoSave({ color: col });
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim();
      if (!editorTags.includes(newTag)) {
        const next = [...editorTags, newTag];
        setEditorTags(next);
        triggerAutoSave({ tags: next });
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const next = editorTags.filter((t) => t !== tagToRemove);
    setEditorTags(next);
    triggerAutoSave({ tags: next });
  };

  // Rich Text Editor Commands
  const formatDoc = (cmd: string, val: string | undefined = undefined) => {
    document.execCommand(cmd, false, val);
    handleContentInput();
  };

  // Note Action Handlers
  const handleCreateNewNote = async () => {
    try {
      const defaultSub = subjects[0]?.id || '';
      const res = await api.createNote({
        title: 'Untitled Note',
        content: '<p>Start typing your thoughts, lecture takeaways, or study insights...</p>',
        subjectId: selectedSubjectId || defaultSub,
        tags: ['Draft'],
        color: '#3B82F6',
        isPinned: false,
        isFavorite: false,
      });

      setNotes((prev) => [res.note, ...prev]);
      selectNote(res.note);
      success('Created new study note');
    } catch (err) {
      error('Failed to create note');
    }
  };

  const handleDuplicateNote = async (noteId: string) => {
    try {
      const res = await api.duplicateNote(noteId);
      setNotes((prev) => [res.note, ...prev]);
      selectNote(res.note);
      success('Duplicated note successfully');
    } catch (err) {
      error('Failed to duplicate note');
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;
    try {
      await api.deleteNote(noteId);
      const remaining = notes.filter((n) => n.id !== noteId);
      setNotes(remaining);
      if (selectedNote?.id === noteId) {
        if (remaining.length > 0) {
          selectNote(remaining[0]);
        } else {
          setSelectedNote(null);
        }
      }
      success('Note deleted');
    } catch (err) {
      error('Failed to delete note');
    }
  };

  const togglePin = async (note: Note) => {
    const next = !note.isPinned;
    try {
      await api.updateNote(note.id, { isPinned: next });
      setNotes((prev) => prev.map((n) => (n.id === note.id ? { ...n, isPinned: next } : n)));
      if (selectedNote?.id === note.id) {
        setSelectedNote((prev) => (prev ? { ...prev, isPinned: next } : null));
      }
      info(next ? 'Note pinned to top' : 'Note unpinned');
    } catch (err) {
      error('Failed to update pin');
    }
  };

  const toggleFavorite = async (note: Note) => {
    const next = !note.isFavorite;
    try {
      await api.updateNote(note.id, { isFavorite: next });
      setNotes((prev) => prev.map((n) => (n.id === note.id ? { ...n, isFavorite: next } : n)));
      if (selectedNote?.id === note.id) {
        setSelectedNote((prev) => (prev ? { ...prev, isFavorite: next } : null));
      }
    } catch (err) {
      error('Failed to update favorite');
    }
  };

  const toggleArchive = async (note: Note) => {
    const next = !note.isArchived;
    try {
      await api.updateNote(note.id, { isArchived: next });
      setNotes((prev) => prev.map((n) => (n.id === note.id ? { ...n, isArchived: next } : n)));
      if (selectedNote?.id === note.id) {
        setSelectedNote((prev) => (prev ? { ...prev, isArchived: next } : null));
      }
      success(next ? 'Note archived' : 'Note restored from archive');
    } catch (err) {
      error('Failed to update archive status');
    }
  };

  // AI Generate Notes Action
  const handleAIGenerateNotes = async () => {
    if (!aiTopic.trim() && !aiSourceText.trim()) {
      error('Please provide a topic or paste lecture material');
      return;
    }
    setAiLoading(true);
    try {
      const res = await api.generateNotes({
        topic: aiTopic.trim(),
        sourceText: aiSourceText.trim(),
        mode: aiMode,
        subjectId: aiSubjectId || subjects[0]?.id,
      });

      // Save generated note directly into database
      const createdRes = await api.createNote({
        title: res.note.title,
        content: res.note.content,
        subjectId: aiSubjectId || subjects[0]?.id || '',
        tags: res.note.tags,
        color: '#8B5CF6',
        isPinned: false,
        isFavorite: false,
      });

      setNotes((prev) => [createdRes.note, ...prev]);
      selectNote(createdRes.note);
      setIsAIModalOpen(false);
      setAiTopic('');
      setAiSourceText('');
      success('AI Study Notes generated & saved to your space!');
    } catch (err: any) {
      error(err.message || 'AI generation failed');
    } finally {
      setAiLoading(false);
    }
  };

  // Filter notes list
  const filteredNotes = notes.filter((n) => {
    if (activeTab === 'archived') {
      if (!n.isArchived) return false;
    } else {
      if (n.isArchived) return false;
      if (activeTab === 'favorites' && !n.isFavorite) return false;
      if (activeTab === 'pinned' && !n.isPinned) return false;
    }

    if (selectedSubjectId && n.subjectId !== selectedSubjectId) return false;
    if (selectedTag && !n.tags.includes(selectedTag)) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = n.title.toLowerCase().includes(q);
      const matchContent = n.content.toLowerCase().includes(q);
      const matchTags = n.tags.some((t) => t.toLowerCase().includes(q));
      if (!matchTitle && !matchContent && !matchTags) return false;
    }

    return true;
  });

  // Extract all distinct tags across all notes
  const allTags = Array.from(new Set(notes.flatMap((n) => n.tags || [])));

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-white dark:bg-zinc-950">
      {/* 1. LEFT SIDEBAR: Categories, Subjects, Tags */}
      <div className="w-56 lg:w-64 border-r border-zinc-200 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-900/40 p-4 flex flex-col justify-between shrink-0 hidden md:flex">
        <div className="space-y-6 overflow-y-auto">
          {/* Create Button */}
          <div className="space-y-2">
            <button
              onClick={handleCreateNewNote}
              className="w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-sm flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
            >
              <Plus className="w-4 h-4" />
              <span>Create Note</span>
            </button>
            <button
              onClick={() => setIsAIModalOpen(true)}
              className="w-full py-2 px-3 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 font-semibold text-xs border border-purple-500/20 flex items-center justify-center gap-2 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              <span>AI Notes Generator</span>
            </button>
          </div>

          {/* Quick Views */}
          <div>
            <span className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider px-2">
              Folders
            </span>
            <div className="mt-2 space-y-0.5">
              {[
                { id: 'all', label: 'All Notes', icon: BookOpen, count: notes.filter((n) => !n.isArchived).length },
                { id: 'favorites', label: 'Favorites', icon: Star, count: notes.filter((n) => n.isFavorite && !n.isArchived).length },
                { id: 'pinned', label: 'Pinned', icon: Pin, count: notes.filter((n) => n.isPinned && !n.isArchived).length },
                { id: 'archived', label: 'Archived', icon: Archive, count: notes.filter((n) => n.isArchived).length },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id && !selectedSubjectId && !selectedTag;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id as any);
                      setSelectedSubjectId(null);
                      setSelectedTag(null);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white font-bold'
                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span>{tab.label}</span>
                    </div>
                    <span className="text-[10px] text-zinc-400">{tab.count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Subjects Filter */}
          <div>
            <span className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider px-2">
              Subjects
            </span>
            <div className="mt-2 space-y-0.5">
              {subjects.map((sub) => {
                const isSelected = selectedSubjectId === sub.id;
                const count = notes.filter((n) => n.subjectId === sub.id && !n.isArchived).length;
                return (
                  <button
                    key={sub.id}
                    onClick={() => {
                      setSelectedSubjectId(isSelected ? null : sub.id);
                      setSelectedTag(null);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      isSelected
                        ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white font-bold'
                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: sub.color }} />
                      <span className="truncate">{sub.name}</span>
                    </div>
                    <span className="text-[10px] text-zinc-400">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tags */}
          {allTags.length > 0 && (
            <div>
              <span className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider px-2">
                Tags
              </span>
              <div className="mt-2 flex flex-wrap gap-1 px-1">
                {allTags.map((t) => {
                  const isSelected = selectedTag === t;
                  return (
                    <button
                      key={t}
                      onClick={() => {
                        setSelectedTag(isSelected ? null : t);
                        setSelectedSubjectId(null);
                      }}
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-md transition-colors ${
                        isSelected
                          ? 'bg-indigo-600 text-white'
                          : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-300 dark:hover:bg-zinc-700'
                      }`}
                    >
                      #{t}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. MAIN AREA: Note Cards List */}
      <div className="w-80 lg:w-96 border-r border-zinc-200 dark:border-zinc-800/80 flex flex-col shrink-0">
        {/* Search & Sort Controls */}
        <div className="p-3 border-b border-zinc-200 dark:border-zinc-800/80 space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes..."
              className="w-full pl-9 pr-3 py-1.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-500 font-medium">
              {filteredNotes.length} note{filteredNotes.length === 1 ? '' : 's'}
            </span>

            <div className="flex items-center gap-1.5">
              <span className="text-zinc-400 text-[11px]">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-zinc-700 dark:text-zinc-300 text-xs font-semibold focus:outline-none cursor-pointer"
              >
                <option value="updated">Recent</option>
                <option value="title">Title</option>
                <option value="created">Created</option>
              </select>
            </div>
          </div>
        </div>

        {/* Note Cards List */}
        <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/60 p-2 space-y-1">
          {filteredNotes.length === 0 ? (
            <div className="p-8 text-center text-zinc-400 space-y-2">
              <BookOpen className="w-8 h-8 mx-auto text-zinc-300 dark:text-zinc-700" />
              <p className="text-xs font-medium">No notes match your selection.</p>
              <button
                onClick={handleCreateNewNote}
                className="text-xs text-indigo-500 font-semibold hover:underline"
              >
                + Create new note
              </button>
            </div>
          ) : (
            filteredNotes.map((note) => {
              const isSelected = selectedNote?.id === note.id;
              const sub = subjects.find((s) => s.id === note.subjectId);

              return (
                <div
                  key={note.id}
                  onClick={() => selectNote(note)}
                  className={`p-3 rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 shadow-xs'
                      : 'hover:bg-zinc-100 dark:hover:bg-zinc-900 border border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4
                      className={`text-sm font-bold truncate ${
                        isSelected
                          ? 'text-indigo-900 dark:text-indigo-200'
                          : 'text-zinc-800 dark:text-zinc-200'
                      }`}
                    >
                      {note.title || 'Untitled Note'}
                    </h4>
                    <div className="flex items-center gap-1 shrink-0">
                      {note.isPinned && <Pin className="w-3.5 h-3.5 text-indigo-500 fill-indigo-500" />}
                      {note.isFavorite && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />}
                    </div>
                  </div>

                  <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed mb-2">
                    {note.content.replace(/<[^>]*>?/gm, ' ') || 'No content yet...'}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-zinc-400">
                    <div className="flex items-center gap-1.5 truncate">
                      {sub && (
                        <span
                          className="px-1.5 py-0.5 rounded font-semibold truncate text-[9px]"
                          style={{
                            backgroundColor: `${sub.color}20`,
                            color: sub.color,
                          }}
                        >
                          {sub.name}
                        </span>
                      )}
                      {note.tags.slice(0, 2).map((t) => (
                        <span key={t} className="text-zinc-500 truncate">
                          #{t}
                        </span>
                      ))}
                    </div>
                    <span>{new Date(note.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 3. EDITOR: Rich Text Editor & Note Detail */}
      {selectedNote ? (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-zinc-950">
          {/* Top Bar: Subject, Color, Save Status, Note Actions */}
          <div className="px-6 py-3 border-b border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between gap-4 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              {/* Subject selector */}
              <select
                value={editorSubjectId}
                onChange={(e) => handleSubjectChange(e.target.value)}
                className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1 text-xs font-semibold text-zinc-800 dark:text-zinc-200 focus:outline-none"
              >
                <option value="">No Subject</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>

              {/* Color label indicator */}
              <div className="flex items-center gap-1">
                {['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'].map((col) => (
                  <button
                    key={col}
                    onClick={() => handleColorChange(col)}
                    className={`w-3.5 h-3.5 rounded-full transition-transform ${
                      editorColor === col ? 'scale-125 ring-2 ring-zinc-400 ring-offset-1' : 'opacity-60'
                    }`}
                    style={{ backgroundColor: col }}
                  />
                ))}
              </div>

              {/* Save Status Indicator */}
              <span className="text-[11px] font-medium text-zinc-400 flex items-center gap-1">
                {saveStatus === 'saved' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Saved ✓</span>
                  </>
                ) : (
                  <span>Saving...</span>
                )}
              </span>
            </div>

            {/* Note Controls & AI Actions */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onAskAIWithNote(selectedNote.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 text-xs font-semibold border border-purple-500/20 transition-colors"
                title="Open Study AI with this note loaded in context"
              >
                <Bot className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Ask AI about Note</span>
              </button>

              <button
                onClick={() => onGenerateFlashcardsFromNote(selectedNote.id)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-medium transition-colors"
                title="Generate Flashcards from Note"
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Flashcards</span>
              </button>

              <button
                onClick={() => onGenerateQuizFromNote(selectedNote.id)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-medium transition-colors"
                title="Generate Quiz from Note"
              >
                <Brain className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Quiz</span>
              </button>

              <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 mx-1" />

              <button
                onClick={() => togglePin(selectedNote)}
                className={`p-1.5 rounded-lg transition-colors ${
                  selectedNote.isPinned
                    ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60'
                    : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
                title="Pin Note"
              >
                <Pin className="w-4 h-4" />
              </button>

              <button
                onClick={() => toggleFavorite(selectedNote)}
                className={`p-1.5 rounded-lg transition-colors ${
                  selectedNote.isFavorite
                    ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/60'
                    : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
                title="Favorite Note"
              >
                <Star className="w-4 h-4" />
              </button>

              <button
                onClick={() => handleDuplicateNote(selectedNote.id)}
                className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title="Duplicate Note"
              >
                <Copy className="w-4 h-4" />
              </button>

              <button
                onClick={() => toggleArchive(selectedNote)}
                className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title={selectedNote.isArchived ? 'Restore' : 'Archive'}
              >
                {selectedNote.isArchived ? <RotateCcw className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
              </button>

              <button
                onClick={() => handleDeleteNote(selectedNote.id)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                title="Delete Note"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Rich Text Toolbar */}
          <div className="px-6 py-2 border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-900/50 flex items-center gap-1 flex-wrap text-zinc-600 dark:text-zinc-400">
            <button
              onClick={() => formatDoc('bold')}
              className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800"
              title="Bold"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => formatDoc('italic')}
              className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800"
              title="Italic"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => formatDoc('underline')}
              className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800"
              title="Underline"
            >
              <Underline className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => formatDoc('strikeThrough')}
              className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800"
              title="Strikethrough"
            >
              <Strikethrough className="w-3.5 h-3.5" />
            </button>

            <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-700 mx-1" />

            <button
              onClick={() => formatDoc('formatBlock', '<h1>')}
              className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-xs font-bold"
              title="Heading 1"
            >
              <Heading1 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => formatDoc('formatBlock', '<h2>')}
              className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-xs font-bold"
              title="Heading 2"
            >
              <Heading2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => formatDoc('formatBlock', '<h3>')}
              className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-xs font-bold"
              title="Heading 3"
            >
              <Heading3 className="w-3.5 h-3.5" />
            </button>

            <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-700 mx-1" />

            <button
              onClick={() => formatDoc('insertUnorderedList')}
              className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800"
              title="Bullet List"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => formatDoc('insertOrderedList')}
              className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800"
              title="Numbered List"
            >
              <ListOrdered className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => formatDoc('formatBlock', '<blockquote>')}
              className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800"
              title="Quote"
            >
              <Quote className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => formatDoc('formatBlock', '<pre>')}
              className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800"
              title="Code Block"
            >
              <Code className="w-3.5 h-3.5" />
            </button>

            <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-700 mx-1" />

            <button
              onClick={() => formatDoc('undo')}
              className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800"
              title="Undo"
            >
              <Undo className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => formatDoc('redo')}
              className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800"
              title="Redo"
            >
              <Redo className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Editor Body */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 max-w-4xl mx-auto w-full">
            {/* Note Title Input */}
            <input
              type="text"
              value={editorTitle}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Note Title..."
              className="w-full text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white bg-transparent border-none focus:outline-none placeholder-zinc-400"
            />

            {/* Tags input bar */}
            <div className="flex items-center flex-wrap gap-2 text-xs">
              <Tag className="w-3.5 h-3.5 text-zinc-400" />
              {editorTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium"
                >
                  #{tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-rose-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder="+ Add tag (Press Enter)"
                className="bg-transparent text-xs text-zinc-700 dark:text-zinc-300 placeholder-zinc-400 focus:outline-none"
              />
            </div>

            {/* Rich Text Editable Area */}
            <div
              ref={editorRef}
              contentEditable
              onInput={handleContentInput}
              className="prose dark:prose-invert max-w-none min-h-[350px] focus:outline-none leading-relaxed text-zinc-800 dark:text-zinc-200 text-sm sm:text-base font-normal selection:bg-indigo-500 selection:text-white"
            />
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-400">
          <BookOpen className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mb-3" />
          <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200">No Note Selected</h3>
          <p className="text-xs text-zinc-500 max-w-sm mt-1">
            Choose a note from the left sidebar or create a new structured study note.
          </p>
          <button
            onClick={handleCreateNewNote}
            className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors"
          >
            Create New Note
          </button>
        </div>
      )}

      {/* AI Notes Generator Modal */}
      {isAIModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-zinc-900 border border-zinc-700/80 rounded-3xl shadow-2xl p-6 relative">
            <button
              onClick={() => setIsAIModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-purple-950 border border-purple-800/80 flex items-center justify-center text-purple-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">AI Study Notes Generator</h3>
                <p className="text-xs text-zinc-400">Generate structured, high-yield study material</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Topic / Chapter *
                </label>
                <input
                  type="text"
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  placeholder="e.g. Photosynthesis, Binary Search Trees, World War I Causes"
                  className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Raw Lecture Material / Textbook Notes (Optional)
                </label>
                <textarea
                  value={aiSourceText}
                  onChange={(e) => setAiSourceText(e.target.value)}
                  rows={3}
                  placeholder="Paste lecture transcript, syllabus bullets, or rough notes..."
                  className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Generation Mode
                  </label>
                  <select
                    value={aiMode}
                    onChange={(e) => setAiMode(e.target.value as any)}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:outline-none focus:border-purple-500"
                  >
                    <option value="comprehensive">Comprehensive Structured Notes</option>
                    <option value="summary">Concise Summary</option>
                    <option value="feynman">Explain Simply (Feynman)</option>
                    <option value="revision">Quick Revision Cram Sheet</option>
                    <option value="exam">Exam High-Yield Focus</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Save to Subject
                  </label>
                  <select
                    value={aiSubjectId}
                    onChange={(e) => setAiSubjectId(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:outline-none focus:border-purple-500"
                  >
                    <option value="">General</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={handleAIGenerateNotes}
                disabled={aiLoading}
                className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
              >
                {aiLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Synthesizing Academic Notes...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Structured Study Notes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
