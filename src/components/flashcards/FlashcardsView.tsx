import React, { useState, useEffect } from 'react';
import {
  Layers,
  Plus,
  Sparkles,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Shuffle,
  Trash2,
  BookOpen,
  ArrowLeft,
  Flame,
  Award,
} from 'lucide-react';
import { api } from '../../lib/api';
import { FlashcardDeck, FlashcardItem, Subject, Note } from '../../types';
import { useToast } from '../../context/ToastContext';

interface FlashcardsViewProps {
  initialDeckId?: string | null;
  initialNoteId?: string | null;
}

export const FlashcardsView: React.FC<FlashcardsViewProps> = ({
  initialDeckId,
  initialNoteId,
}) => {
  const { success, error, info } = useToast();

  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<FlashcardDeck | null>(null);

  // Study Runner State
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [easyCount, setEasyCount] = useState(0);
  const [difficultCount, setDifficultCount] = useState(0);
  const [studyCompleted, setStudyCompleted] = useState(false);

  // AI Modal
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiSourceText, setAiSourceText] = useState('');
  const [aiNoteId, setAiNoteId] = useState(initialNoteId || '');
  const [aiSubjectId, setAiSubjectId] = useState('');
  const [aiCardCount, setAiCardCount] = useState(6);
  const [aiLoading, setAiLoading] = useState(false);

  // Manual Deck Create Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newDeckTitle, setNewDeckTitle] = useState('');
  const [newDeckSubjectId, setNewDeckSubjectId] = useState('');
  const [newCards, setNewCards] = useState<{ question: string; answer: string }[]>([
    { question: '', answer: '' },
    { question: '', answer: '' },
  ]);

  const loadData = async () => {
    try {
      const [decksRes, subsRes, notesRes] = await Promise.all([
        api.getFlashcardDecks(),
        api.getSubjects(),
        api.getNotes(),
      ]);
      setDecks(decksRes.decks || []);
      setSubjects(subsRes.subjects || []);
      setNotes(notesRes.notes || []);

      if (initialDeckId) {
        const found = decksRes.decks.find((d) => d.id === initialDeckId);
        if (found) startStudySession(found);
      }
    } catch (err) {
      console.error('Failed to load flashcards:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // When initialNoteId changes, open the AI flashcards modal with that note pre-selected
  useEffect(() => {
    if (initialNoteId) {
      setAiNoteId(initialNoteId);
      setIsAIModalOpen(true);
    }
  }, [initialNoteId]);

  const startStudySession = (deck: FlashcardDeck) => {
    setSelectedDeck(deck);
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setEasyCount(0);
    setDifficultCount(0);
    setStudyCompleted(false);
  };

  const handleNext = () => {
    if (!selectedDeck) return;
    if (currentCardIndex < selectedDeck.cards.length - 1) {
      setCurrentCardIndex((prev) => prev + 1);
      setIsFlipped(false);
    } else {
      setStudyCompleted(true);
    }
  };

  const handlePrev = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex((prev) => prev - 1);
      setIsFlipped(false);
    }
  };

  const handleMarkDifficulty = async (difficulty: 'easy' | 'difficult') => {
    if (!selectedDeck) return;
    if (difficulty === 'easy') setEasyCount((prev) => prev + 1);
    if (difficulty === 'difficult') setDifficultCount((prev) => prev + 1);

    // Save difficulty rating to the card in deck
    const updatedCards = [...selectedDeck.cards];
    updatedCards[currentCardIndex] = {
      ...updatedCards[currentCardIndex],
      difficulty,
    };

    try {
      await api.updateFlashcardDeck(selectedDeck.id, { cards: updatedCards });
    } catch {}

    handleNext();
  };

  const handleRestart = () => {
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setEasyCount(0);
    setDifficultCount(0);
    setStudyCompleted(false);
  };

  const handleShuffle = () => {
    if (!selectedDeck) return;
    const shuffled = [...selectedDeck.cards].sort(() => Math.random() - 0.5);
    setSelectedDeck({ ...selectedDeck, cards: shuffled });
    handleRestart();
    info('Deck shuffled');
  };

  const handleDeleteDeck = async (deckId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this deck?')) return;
    try {
      await api.deleteFlashcardDeck(deckId);
      setDecks((prev) => prev.filter((d) => d.id !== deckId));
      if (selectedDeck?.id === deckId) setSelectedDeck(null);
      success('Flashcard deck deleted');
    } catch (err) {
      error('Failed to delete deck');
    }
  };

  // AI Generation
  const handleAIGenerateDeck = async () => {
    if (!aiTopic.trim() && !aiNoteId && !aiSourceText.trim()) {
      error('Please provide a topic or select a note');
      return;
    }

    setAiLoading(true);
    try {
      let chosenTitle = aiTopic.trim();
      if (!chosenTitle && aiNoteId) {
        const n = notes.find((note) => note.id === aiNoteId);
        chosenTitle = n ? `${n.title} Flashcards` : 'Study Flashcards';
      }

      const res = await api.generateFlashcards({
        topic: aiTopic.trim(),
        sourceText: aiSourceText.trim(),
        noteId: aiNoteId || undefined,
        count: aiCardCount,
      });

      const cards: FlashcardItem[] = res.cards.map((c, idx) => ({
        id: `card_${Date.now()}_${idx}`,
        question: c.question,
        answer: c.answer,
      }));

      const newDeckRes = await api.createFlashcardDeck({
        title: chosenTitle || 'AI Study Deck',
        subjectId: aiSubjectId || subjects[0]?.id || '',
        noteId: aiNoteId || null,
        cards,
      });

      setDecks((prev) => [newDeckRes.deck, ...prev]);
      setIsAIModalOpen(false);
      startStudySession(newDeckRes.deck);
      success('Generated & saved flashcard deck!');
    } catch (err: any) {
      error(err.message || 'Failed to generate flashcards');
    } finally {
      setAiLoading(false);
    }
  };

  // Manual Deck Create
  const handleSaveManualDeck = async () => {
    if (!newDeckTitle.trim()) {
      error('Please enter a deck title');
      return;
    }
    const validCards = newCards.filter((c) => c.question.trim() && c.answer.trim());
    if (validCards.length === 0) {
      error('Please add at least 1 card with question and answer');
      return;
    }

    try {
      const cards: FlashcardItem[] = validCards.map((c, idx) => ({
        id: `c_${Date.now()}_${idx}`,
        question: c.question.trim(),
        answer: c.answer.trim(),
      }));

      const res = await api.createFlashcardDeck({
        title: newDeckTitle.trim(),
        subjectId: newDeckSubjectId || subjects[0]?.id || '',
        cards,
      });

      setDecks((prev) => [res.deck, ...prev]);
      setIsCreateModalOpen(false);
      setNewDeckTitle('');
      setNewCards([
        { question: '', answer: '' },
        { question: '', answer: '' },
      ]);
      startStudySession(res.deck);
      success('Flashcard deck created');
    } catch (err) {
      error('Failed to create deck');
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Layers className="w-7 h-7 text-purple-500" />
            <span>Active Recall Flashcards</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Retain formulas, key definitions, and mechanisms through spaced repetition.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsAIModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md shadow-purple-600/20 transition-all hover:scale-[1.02]"
          >
            <Sparkles className="w-4 h-4" />
            <span>Generate with AI</span>
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold border border-zinc-200 dark:border-zinc-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create Custom Deck</span>
          </button>
        </div>
      </div>

      {/* Main View: Runner or Library */}
      {selectedDeck ? (
        /* STUDY RUNNER */
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Deck Top Nav */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSelectedDeck(null)}
              className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Decks</span>
            </button>

            <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200 truncate max-w-[280px]">
              {selectedDeck.title}
            </span>

            <button
              onClick={handleShuffle}
              className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 transition-colors"
              title="Shuffle Cards"
            >
              <Shuffle className="w-4 h-4" />
            </button>
          </div>

          {!studyCompleted ? (
            <>
              {/* Progress Bar & Counter */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-zinc-500">
                  <span>Card {currentCardIndex + 1} of {selectedDeck.cards.length}</span>
                  <span>{Math.round(((currentCardIndex + 1) / selectedDeck.cards.length) * 100)}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-600 to-indigo-500 rounded-full transition-all duration-300"
                    style={{
                      width: `${((currentCardIndex + 1) / selectedDeck.cards.length) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* 3D Flip Card Container */}
              <div
                onClick={() => setIsFlipped(!isFlipped)}
                className="w-full min-h-[320px] sm:min-h-[360px] cursor-pointer perspective-1000 group"
              >
                <div
                  className={`w-full min-h-[320px] sm:min-h-[360px] rounded-3xl p-8 flex flex-col justify-between border transition-all duration-500 shadow-xl relative select-none ${
                    isFlipped
                      ? 'bg-zinc-900 border-purple-500/50 shadow-purple-500/10'
                      : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-zinc-900/5'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-zinc-400">
                    <span className={isFlipped ? 'text-purple-400' : 'text-indigo-400'}>
                      {isFlipped ? 'Answer' : 'Question'}
                    </span>
                    <span className="text-[10px] text-zinc-500 flex items-center gap-1 font-normal">
                      <RotateCw className="w-3 h-3" /> Click card to flip
                    </span>
                  </div>

                  <div className="my-auto py-6 text-center">
                    <p
                      className={`text-lg sm:text-2xl font-bold leading-relaxed whitespace-pre-wrap ${
                        isFlipped
                          ? 'text-purple-200 dark:text-purple-100'
                          : 'text-zinc-900 dark:text-zinc-100'
                      }`}
                    >
                      {isFlipped
                        ? selectedDeck.cards[currentCardIndex]?.answer
                        : selectedDeck.cards[currentCardIndex]?.question}
                    </p>
                  </div>

                  <div className="text-center text-xs text-zinc-500">
                    {isFlipped
                      ? 'Rate your recall accuracy below'
                      : 'Think of the solution before flipping'}
                  </div>
                </div>
              </div>

              {/* Study Response Controls */}
              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  onClick={handlePrev}
                  disabled={currentCardIndex === 0}
                  className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-3 flex-1 justify-center">
                  <button
                    onClick={() => handleMarkDifficulty('difficult')}
                    className="flex-1 py-3 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-semibold text-xs border border-rose-500/20 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <X className="w-4 h-4" />
                    <span>Hard / Review</span>
                  </button>

                  <button
                    onClick={() => setIsFlipped(!isFlipped)}
                    className="py-3 px-5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold text-xs border border-zinc-200 dark:border-zinc-700 transition-colors flex items-center gap-1.5"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Flip</span>
                  </button>

                  <button
                    onClick={() => handleMarkDifficulty('easy')}
                    className="flex-1 py-3 px-4 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold text-xs border border-emerald-500/20 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Check className="w-4 h-4" />
                    <span>Easy / Mastered</span>
                  </button>
                </div>

                <button
                  onClick={handleNext}
                  className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </>
          ) : (
            /* Study Completed Summary */
            <div className="p-8 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-center space-y-6">
              <div className="w-16 h-16 rounded-3xl bg-purple-500/10 border border-purple-500/20 text-purple-500 flex items-center justify-center mx-auto">
                <Award className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-2xl font-extrabold text-zinc-900 dark:text-white">
                  Deck Review Complete!
                </h3>
                <p className="text-xs sm:text-sm text-zinc-500 mt-1">
                  Active recall session finished for "{selectedDeck.title}"
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto">
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
                  <div className="text-2xl font-extrabold">{easyCount}</div>
                  <div className="text-xs font-semibold">Mastered</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500">
                  <div className="text-2xl font-extrabold">{difficultCount}</div>
                  <div className="text-xs font-semibold">Needs Review</div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={handleRestart}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-md transition-colors"
                >
                  Study Again
                </button>
                <button
                  onClick={() => setSelectedDeck(null)}
                  className="px-5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  Back to All Decks
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* DECK LIBRARY */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {decks.length === 0 ? (
            <div className="col-span-full py-16 text-center text-zinc-400 space-y-3">
              <Layers className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-700" />
              <p className="text-sm font-medium">No flashcard decks yet.</p>
              <p className="text-xs text-zinc-500">
                Generate flashcards from your notes or create a custom deck to start testing your recall.
              </p>
              <button
                onClick={() => setIsAIModalOpen(true)}
                className="mt-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-colors"
              >
                Generate First AI Deck
              </button>
            </div>
          ) : (
            decks.map((deck) => {
              const sub = subjects.find((s) => s.id === deck.subjectId);
              return (
                <div
                  key={deck.id}
                  onClick={() => startStudySession(deck)}
                  className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 hover:border-purple-500/50 shadow-xs hover:shadow-lg hover:shadow-purple-500/5 cursor-pointer transition-all group flex flex-col justify-between min-h-[180px]"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      {sub ? (
                        <span
                          className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider"
                          style={{ backgroundColor: `${sub.color}20`, color: sub.color }}
                        >
                          {sub.name}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-zinc-400 uppercase">General</span>
                      )}

                      <button
                        onClick={(e) => handleDeleteDeck(deck.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-rose-500 rounded transition-opacity"
                        title="Delete Deck"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <h3 className="text-base font-bold text-zinc-900 dark:text-white group-hover:text-purple-500 transition-colors line-clamp-2">
                      {deck.title}
                    </h3>
                  </div>

                  <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500">
                    <span>{deck.cards.length} cards</span>
                    <span className="text-purple-600 dark:text-purple-400 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                      <span>Study Now</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* AI Generate Modal */}
      {isAIModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-700/80 rounded-3xl shadow-2xl p-6 relative">
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
                <h3 className="text-lg font-bold text-white">AI Flashcards Generator</h3>
                <p className="text-xs text-zinc-400">Generate high-yield active recall cards</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Generate From Note (Optional)
                </label>
                <select
                  value={aiNoteId}
                  onChange={(e) => {
                    setAiNoteId(e.target.value);
                    if (e.target.value) {
                      const n = notes.find((note) => note.id === e.target.value);
                      if (n) setAiTopic(n.title);
                    }
                  }}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:outline-none focus:border-purple-500"
                >
                  <option value="">Select from your saved notes...</option>
                  {notes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Topic / Concept
                </label>
                <input
                  type="text"
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  placeholder="e.g. Dijkstra's Algorithm, Photosynthesis, Organic Chemistry"
                  className="w-full px-3.5 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Cards Count
                  </label>
                  <select
                    value={aiCardCount}
                    onChange={(e) => setAiCardCount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:outline-none focus:border-purple-500"
                  >
                    <option value={4}>4 Cards</option>
                    <option value={6}>6 Cards</option>
                    <option value={8}>8 Cards</option>
                    <option value={10}>10 Cards</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Subject
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
                onClick={handleAIGenerateDeck}
                disabled={aiLoading}
                className="w-full mt-2 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {aiLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Extracting Active Recall Pairs...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate & Build Deck</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Deck Create Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-zinc-900 border border-zinc-700/80 rounded-3xl shadow-2xl p-6 relative max-h-[85vh] flex flex-col">
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-4">Create Custom Flashcard Deck</h3>

            <div className="space-y-4 overflow-y-auto pr-1">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Deck Title *</label>
                <input
                  type="text"
                  value={newDeckTitle}
                  onChange={(e) => setNewDeckTitle(e.target.value)}
                  placeholder="e.g. Neuroscience Core Terms"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Subject</label>
                <select
                  value={newDeckSubjectId}
                  onChange={(e) => setNewDeckSubjectId(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500"
                >
                  <option value="">General</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Cards Inputs */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-300">Cards ({newCards.length})</span>
                  <button
                    onClick={() => setNewCards([...newCards, { question: '', answer: '' }])}
                    className="text-xs text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Card</span>
                  </button>
                </div>

                {newCards.map((c, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-zinc-800/60 border border-zinc-700 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-400">
                      <span>Card #{idx + 1}</span>
                      {newCards.length > 1 && (
                        <button
                          onClick={() => setNewCards(newCards.filter((_, i) => i !== idx))}
                          className="text-rose-400 hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={c.question}
                      onChange={(e) => {
                        const copy = [...newCards];
                        copy[idx].question = e.target.value;
                        setNewCards(copy);
                      }}
                      placeholder="Question / Front"
                      className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-xs focus:outline-none"
                    />
                    <input
                      type="text"
                      value={c.answer}
                      onChange={(e) => {
                        const copy = [...newCards];
                        copy[idx].answer = e.target.value;
                        setNewCards(copy);
                      }}
                      placeholder="Answer / Back"
                      className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-xs focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleSaveManualDeck}
              className="w-full mt-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-colors"
            >
              Save Flashcard Deck
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
