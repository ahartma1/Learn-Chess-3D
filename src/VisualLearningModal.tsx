import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  LEARNING_STRATEGIES,
  LearningStrategy,
  StrategyMoveStep,
  coordsToSq,
} from './learningStrategies';
import { playTacticalStepChime } from './soundEffects';

interface VisualLearningModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialStrategyId?: string | null;
  onApplyStrategy?: (strategy: LearningStrategy) => void;
  suggestedStrategies?: LearningStrategy[];
}

export const VisualLearningModal: React.FC<VisualLearningModalProps> = ({
  isOpen,
  onClose,
  initialStrategyId,
  onApplyStrategy,
  suggestedStrategies,
}) => {
  const [selectedStrategy, setSelectedStrategy] = useState<LearningStrategy | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.2); // seconds per step
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const playTimerRef = useRef<number | null>(null);

  // Pick initial strategy
  useEffect(() => {
    if (initialStrategyId) {
      const found = LEARNING_STRATEGIES.find((s) => s.id === initialStrategyId);
      if (found) {
        setSelectedStrategy(found);
        setActiveStepIndex(0);
        setIsPlaying(true);
        return;
      }
    }
    if (suggestedStrategies && suggestedStrategies.length > 0 && !selectedStrategy) {
      setSelectedStrategy(suggestedStrategies[0]);
      setActiveStepIndex(0);
      return;
    }
    if (!selectedStrategy) {
      setSelectedStrategy(LEARNING_STRATEGIES[0]);
      setActiveStepIndex(0);
    }
  }, [initialStrategyId, suggestedStrategies, selectedStrategy]);

  // Synchronize 3D board highlights when step changes
  useEffect(() => {
    if (!isOpen || !selectedStrategy) return;
    const step = selectedStrategy.moves[activeStepIndex];
    if (step) {
      const win = window as unknown as {
        wizardChess?: {
          showTacticalSimulationStep?: (
            fromR: number,
            fromC: number,
            toR: number,
            toC: number,
            color?: string
          ) => void;
        };
      };
      if (win.wizardChess?.showTacticalSimulationStep) {
        win.wizardChess.showTacticalSimulationStep(
          step.from.r,
          step.from.c,
          step.to.r,
          step.to.c,
          step.player
        );
      }
      playTacticalStepChime(activeStepIndex);
    }
  }, [isOpen, selectedStrategy, activeStepIndex]);

  // Clean up 3D board highlights when closing
  useEffect(() => {
    if (!isOpen) {
      setIsPlaying(false);
      if (playTimerRef.current) clearInterval(playTimerRef.current);
      const win = window as unknown as {
        wizardChess?: { clearSquareHighlights?: () => void };
      };
      win.wizardChess?.clearSquareHighlights?.();
    }
  }, [isOpen]);

  const handleNextStep = useCallback(() => {
    if (!selectedStrategy) return;
    setActiveStepIndex((prev) => {
      if (prev < selectedStrategy.moves.length - 1) {
        return prev + 1;
      } else {
        setIsPlaying(false);
        return prev;
      }
    });
  }, [selectedStrategy]);

  const handlePrevStep = useCallback(() => {
    setActiveStepIndex((prev) => Math.max(0, prev - 1));
  }, []);

  // Time-elapsing playback ticker
  useEffect(() => {
    if (isPlaying && selectedStrategy) {
      playTimerRef.current = window.setInterval(() => {
        setActiveStepIndex((prev) => {
          if (prev < selectedStrategy.moves.length - 1) {
            return prev + 1;
          } else {
            setIsPlaying(false);
            return 0; // loop back
          }
        });
      }, playbackSpeed * 1000);
    } else if (playTimerRef.current) {
      clearInterval(playTimerRef.current);
      playTimerRef.current = null;
    }
    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, [isPlaying, selectedStrategy, playbackSpeed]);

  if (!isOpen) return null;

  const currentStep: StrategyMoveStep | undefined = selectedStrategy?.moves[activeStepIndex];

  const categories = ['All', 'White Opening', 'Black Counter', 'Scholar Refutation', 'Novel Wizard'];

  const filteredStrategies = LEARNING_STRATEGIES.filter((s) => {
    if (activeCategory === 'All') return true;
    if (activeCategory === 'White Opening') return s.category === 'White Opening';
    if (activeCategory === 'Black Counter') return s.category.startsWith('Black Counter');
    if (activeCategory === 'Scholar Refutation') return s.category === 'Scholar Refutation';
    if (activeCategory === 'Novel Wizard') return s.category === 'Novel Wizard Strategy';
    return true;
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5"
      style={{ background: 'rgba(5, 7, 12, 0.82)', backdropFilter: 'blur(10px)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="learning-mode-title"
    >
      <div
        className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(175deg, rgba(16, 20, 30, 0.96) 0%, rgba(9, 11, 18, 0.98) 100%)',
          borderColor: 'rgba(212, 175, 55, 0.45)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.75), 0 0 40px rgba(212, 175, 55, 0.12)',
        }}
      >
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-amber-500/20 bg-black/30">
          <div className="flex items-center gap-3">
            <span className="text-xl">📖</span>
            <div>
              <h2
                id="learning-mode-title"
                className="text-base sm:text-lg font-bold tracking-wide text-amber-300 font-serif"
              >
                VISUAL LEARNING MODE • STRATEGY CODEX
              </h2>
              <p className="text-xs text-gray-400">
                Time-elapsing animated tactics, winning openings, and master counters
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-amber-300 text-sm px-3 py-1.5 rounded-full border border-white/10 hover:border-amber-400/40 transition-colors"
            aria-label="Close Learning Mode"
          >
            Close ✕
          </button>
        </div>

        {/* Suggested Counters Banner if White opened */}
        {suggestedStrategies && suggestedStrategies.length > 0 && (
          <div className="bg-amber-950/40 border-b border-amber-500/30 px-5 py-2.5 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-xs text-amber-200">
              <span className="font-semibold text-amber-400">⚡ Opponent Opening Detected:</span>
              <span>Top 3 winning approaches tailored to this position:</span>
            </div>
            <div className="flex items-center gap-2">
              {suggestedStrategies.map((strat) => (
                <button
                  key={strat.id}
                  type="button"
                  onClick={() => {
                    setSelectedStrategy(strat);
                    setActiveStepIndex(0);
                    setIsPlaying(true);
                  }}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                    selectedStrategy?.id === strat.id
                      ? 'bg-amber-500 text-black font-bold border-amber-400 shadow-md'
                      : 'bg-black/40 text-amber-200 border-amber-500/40 hover:bg-amber-900/40'
                  }`}
                >
                  {strat.name.split(' (')[0]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Main Body */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-white/10">
          {/* Left Column: Strategy Catalog (4 cols) */}
          <div className="md:col-span-5 p-4 flex flex-col gap-3 bg-black/20">
            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-1.5">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`text-xs px-2.5 py-1 rounded-full transition-all ${
                    activeCategory === cat
                      ? 'bg-amber-500/25 text-amber-300 border border-amber-400 font-semibold'
                      : 'bg-white/5 text-gray-400 border border-transparent hover:text-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Strategy List */}
            <div className="flex flex-col gap-2 overflow-y-auto max-h-[50vh] md:max-h-[58vh] pr-1">
              {filteredStrategies.map((strat) => {
                const isSelected = selectedStrategy?.id === strat.id;
                return (
                  <button
                    key={strat.id}
                    type="button"
                    onClick={() => {
                      setSelectedStrategy(strat);
                      setActiveStepIndex(0);
                      setIsPlaying(true);
                    }}
                    className={`text-left p-3 rounded-xl border transition-all flex flex-col gap-1.5 ${
                      isSelected
                        ? 'bg-gradient-to-r from-amber-950/60 to-black/80 border-amber-400 text-white shadow-lg'
                        : 'bg-white/5 border-white/10 text-gray-300 hover:border-amber-400/40 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-300 tracking-wide">
                        {strat.name}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-200 border border-amber-500/30">
                        {strat.badge}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                      {strat.summary}
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1 border-t border-white/5">
                      <span>{strat.moves.length} Turn Simulation</span>
                      <span className="text-cyan-400 font-medium">
                        {isSelected ? '▶ Simulating' : 'Explore →'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Time-Elapsing Simulation Player & Guided Analysis (7 cols) */}
          <div className="md:col-span-7 p-4 sm:p-5 flex flex-col justify-between gap-4 bg-gradient-to-b from-black/20 to-black/40">
            {selectedStrategy && (
              <>
                {/* Active Strategy Header */}
                <div className="flex flex-col gap-1 border-b border-white/10 pb-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h3 className="text-lg font-bold text-amber-200 font-serif">
                      {selectedStrategy.name}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-950/70 text-cyan-300 border border-cyan-500/40">
                        {selectedStrategy.category}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-950/60 text-amber-300 border border-amber-500/40">
                        {selectedStrategy.difficulty}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-300 italic">
                    "{selectedStrategy.coreConcept}"
                  </p>
                </div>

                {/* Simulation Progress Timeline Bar */}
                <div className="flex flex-col gap-2 bg-black/40 p-3 rounded-xl border border-white/10">
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span className="font-semibold text-amber-300">
                      Step {activeStepIndex + 1} of {selectedStrategy.moves.length}:
                    </span>
                    <span className="font-mono text-cyan-300 font-bold text-sm">
                      {currentStep?.notation}
                    </span>
                  </div>

                  {/* Visual Step Dots */}
                  <div className="grid grid-cols-7 gap-1.5 w-full">
                    {selectedStrategy.moves.map((step, idx) => {
                      const isActive = idx === activeStepIndex;
                      const isPast = idx < activeStepIndex;
                      return (
                        <button
                          key={step.step}
                          type="button"
                          onClick={() => {
                            setActiveStepIndex(idx);
                            setIsPlaying(false);
                          }}
                          className={`h-2 rounded-full transition-all ${
                            isActive
                              ? 'bg-amber-400 shadow-md ring-2 ring-amber-300/60 scale-105'
                              : isPast
                              ? 'bg-cyan-500/80'
                              : 'bg-white/20 hover:bg-white/40'
                          }`}
                          title={`Step ${idx + 1}: ${step.notation}`}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Active Step Tactical Guidance Card */}
                {currentStep && (
                  <div
                    className="p-4 rounded-xl border flex flex-col gap-2.5 transition-all"
                    style={{
                      background: 'rgba(21, 26, 40, 0.75)',
                      borderColor: 'rgba(78, 168, 222, 0.35)',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-3 h-3 rounded-full ${
                            currentStep.player === 'w'
                              ? 'bg-amber-100 shadow-[0_0_8px_rgba(255,255,255,0.8)]'
                              : 'bg-gray-800 border border-amber-400 shadow-[0_0_8px_rgba(212,175,55,0.6)]'
                          }`}
                        />
                        <span className="text-xs font-bold uppercase tracking-wider text-white">
                          {currentStep.player === 'w' ? 'White' : 'Black'}: {currentStep.stepName}
                        </span>
                      </div>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-cyan-900/50 text-cyan-200 border border-cyan-500/30">
                        {currentStep.strategicFocus}
                      </span>
                    </div>

                    <p className="text-sm text-gray-200 leading-relaxed font-sans">
                      {currentStep.actionExplanation}
                    </p>

                    <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-white/10">
                      <span>
                        Square Focus:{' '}
                        <strong className="text-amber-300 uppercase">
                          {currentStep.tacticalSquare}
                        </strong>{' '}
                        ({coordsToSq(currentStep.from.r, currentStep.from.c)} →{' '}
                        {coordsToSq(currentStep.to.r, currentStep.to.c)})
                      </span>
                      <span className="text-cyan-400 text-[11px]">
                        ✦ Follow glowing 3D arc on board
                      </span>
                    </div>
                  </div>
                )}

                {/* Player Controls */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveStepIndex(0);
                        setIsPlaying(false);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs"
                      title="Rewind to Step 1"
                    >
                      ⏮ Restart
                    </button>
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      disabled={activeStepIndex === 0}
                      className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white text-xs font-semibold"
                      title="Previous Step"
                    >
                      ◀ Prev
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-all shadow-md"
                      title={isPlaying ? 'Pause Simulation' : 'Play Simulation'}
                    >
                      {isPlaying ? '⏸ Pause' : '▶ Auto-Simulate'}
                    </button>
                    <button
                      type="button"
                      onClick={handleNextStep}
                      disabled={activeStepIndex === selectedStrategy.moves.length - 1}
                      className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white text-xs font-semibold"
                      title="Next Step"
                    >
                      Next ▶
                    </button>
                  </div>

                  {/* Speed Controls */}
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <span>Speed:</span>
                    {[
                      { label: '0.8s', val: 0.8 },
                      { label: '1.2s', val: 1.2 },
                      { label: '1.8s', val: 1.8 },
                    ].map((s) => (
                      <button
                        key={s.label}
                        type="button"
                        onClick={() => setPlaybackSpeed(s.val)}
                        className={`px-2 py-0.5 rounded text-[11px] ${
                          playbackSpeed === s.val
                            ? 'bg-cyan-500 text-black font-bold'
                            : 'bg-white/10 text-gray-300 hover:bg-white/20'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Footer Action */}
                <div className="flex items-center justify-between pt-3 border-t border-white/10">
                  <span className="text-xs text-gray-400">
                    Tip: Camera remains interactive during simulation.
                  </span>
                  <div className="flex items-center gap-2">
                    {onApplyStrategy && (
                      <button
                        type="button"
                        onClick={() => {
                          onApplyStrategy(selectedStrategy);
                          onClose();
                        }}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black font-bold text-xs tracking-wide shadow-lg transition-all"
                      >
                        Load Position on Board
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold"
                    >
                      Resume Game
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
