import { useEffect, useRef, useState, useCallback } from 'react';
import { initWizardChess } from './wizardChessEngine.js';
import { MultiplayerLobbyModal, RoomData } from './MultiplayerLobbyModal';
import { VisualLearningModal } from './VisualLearningModal';
import {
  LEARNING_STRATEGIES,
  LearningStrategy,
  getRecommendedStrategies,
} from './learningStrategies';
import { playReminderChime } from './soundEffects';

interface MoveHistoryItem {
  color: 'w' | 'b';
  from: { r: number; c: number };
  to: { r: number; c: number };
  notation?: string;
}

export default function App() {
  const initializedRef = useRef(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  // Online Multiplayer & State
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [playerColor, setPlayerColor] = useState<'w' | 'b'>('w');
  const [playerToken, setPlayerToken] = useState<string>('');
  const [isLobbyOpen, setIsLobbyOpen] = useState(false);

  // Turn Reminders & Countdown
  const [currentTurn, setCurrentTurn] = useState<'w' | 'b'>('w');
  const [reminderSecondsLeft, setReminderSecondsLeft] = useState<number>(30 * 60);
  const [showReminderAlert, setShowReminderAlert] = useState<string | null>(null);

  // Visual Learning Mode
  const [isLearningModalOpen, setIsLearningModalOpen] = useState(false);
  const [learningSuggestedStrategies, setLearningSuggestedStrategies] = useState<LearningStrategy[]>([]);
  const [activeStrategyAlert, setActiveStrategyAlert] = useState<string | null>(null);

  // Local move history for opening detection
  const [moveHistory, setMoveHistory] = useState<MoveHistoryItem[]>([]);

  // EventSource / polling refs
  const eventSourceRef = useRef<EventSource | null>(null);
  const pollTimerRef = useRef<number | null>(null);

  // Generate or retrieve persistent player token
  useEffect(() => {
    let tok = '';
    try {
      tok = localStorage.getItem('wizard_chess_player_tok') || '';
    } catch {}
    if (!tok) {
      tok = 'tok_' + Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
      try {
        localStorage.setItem('wizard_chess_player_tok', tok);
      } catch {}
    }
    setPlayerToken(tok);
  }, []);

  // Initialize Wizard Chess 3D Engine
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    initWizardChess();

    // Listen to move events from the 3D engine
    const handleEngineMove = (e: Event) => {
      const customEv = e as CustomEvent<{
        piece: string;
        color: 'w' | 'b';
        from: { r: number; c: number };
        to: { r: number; c: number };
        nextTurn: 'w' | 'b';
        moveHistory: MoveHistoryItem[];
      }>;

      if (customEv.detail) {
        const { nextTurn, moveHistory: history } = customEv.detail;
        setCurrentTurn(nextTurn);
        setMoveHistory(history || []);

        // Reset turn timer countdown
        setReminderSecondsLeft((roomData?.reminderIntervalMinutes || 30) * 60);
        setShowReminderAlert(null);

        // Check if White just played move 1 (Opening detected) -> offer top 3 counters to Black!
        if (history && history.length === 1 && history[0].color === 'w') {
          const recs = getRecommendedStrategies(nextTurn, history);
          setLearningSuggestedStrategies(recs);
          setActiveStrategyAlert(
            `White opened with 1. ${history[0].notation || 'e4'}! Top 3 counters available in Strategy Codex.`
          );
        }
      }
    };

    window.addEventListener('wizardchess:move', handleEngineMove);
    return () => {
      window.removeEventListener('wizardchess:move', handleEngineMove);
    };
  }, [roomData?.reminderIntervalMinutes]);

  // Turn Countdown Timer ticker
  useEffect(() => {
    const timer = setInterval(() => {
      if (roomData?.isPaused) return; // Frozen when indefinite pause is active
      if (roomData?.activeGraceSuspension) return; // Frozen during 2-hour grace suspension

      setReminderSecondsLeft((prev) => {
        if (prev <= 1) {
          // Trigger turn reminder chime & alert
          playReminderChime();
          const turnName = currentTurn === 'w' ? 'White' : 'Black';
          setShowReminderAlert(`Sanctum Reminder: It is ${turnName}'s turn to move!`);

          // Request browser notification if permitted
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            try {
              new Notification('Wizard Chess 3D', {
                body: `It is ${turnName}'s turn to make a move!`,
                icon: '/favicon.ico',
              });
            } catch {}
          }
          return (roomData?.reminderIntervalMinutes || 30) * 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [roomData?.isPaused, roomData?.activeGraceSuspension, roomData?.reminderIntervalMinutes, currentTurn]);

  // Remote Room Synchronization
  const connectToRoomEvents = useCallback((code: string) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    try {
      const sse = new EventSource(`/api/rooms/${code}/events`);
      eventSourceRef.current = sse;

      sse.addEventListener('room_event', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          if (data && data.room) {
            setRoomData(data.room);
            setCurrentTurn(data.room.turn);

            // Forward to 3D engine if engine has remote state handler
            const win = window as unknown as {
              wizardChess?: {
                applyRemoteRoomState?: (room: unknown) => void;
              };
            };
            win.wizardChess?.applyRemoteRoomState?.(data.room);

            if (data.type === 'reminder_ping') {
              playReminderChime();
              setShowReminderAlert(data.message || `Sanctum Reminder: It's ${data.playerColor === 'w' ? 'White' : 'Black'}'s turn!`);
            }
          }
        } catch {}
      });
    } catch {}

    // Backup polling
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    pollTimerRef.current = window.setInterval(async () => {
      try {
        const res = await fetch(`/api/rooms/${code}/state`);
        if (res.ok) {
          const d = await res.json();
          if (d.ok && d.room) {
            setRoomData(d.room);
            setCurrentTurn(d.room.turn);
            const win = window as unknown as {
              wizardChess?: {
                applyRemoteRoomState?: (room: unknown) => void;
              };
            };
            win.wizardChess?.applyRemoteRoomState?.(d.room);
          }
        }
      } catch {}
    }, 2500);
  }, []);

  // Check URL for ?room=ABCD on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      handleJoinRoom(roomParam.toUpperCase());
    }
    // Request notification permission quietly
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  // Room Actions
  const handleCreateRoom = async (preferredColor: 'w' | 'b', reminderMins: number) => {
    try {
      const res = await fetch('/api/rooms/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferredColor,
          playerToken,
          reminderIntervalMinutes: reminderMins,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setRoomData(data.room);
        setPlayerColor(data.color);
        window.history.replaceState({}, '', `?room=${data.code}`);

        const win = window as unknown as {
          wizardChess?: {
            startMultiplayerSync?: (c: string) => void;
            setPlayerColor?: (c: string) => void;
          };
        };
        win.wizardChess?.setPlayerColor?.(data.color);
        win.wizardChess?.startMultiplayerSync?.(data.code);

        connectToRoomEvents(data.code);
      }
    } catch (err) {
      console.error('Failed to create room:', err);
    }
  };

  const handleJoinRoom = async (code: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, playerToken }),
      });
      if (res.ok) {
        const data = await res.json();
        setRoomData(data.room);
        setPlayerColor(data.color);
        window.history.replaceState({}, '', `?room=${data.code}`);

        const win = window as unknown as {
          wizardChess?: {
            startMultiplayerSync?: (c: string) => void;
            setPlayerColor?: (c: string) => void;
          };
        };
        win.wizardChess?.setPlayerColor?.(data.color);
        win.wizardChess?.startMultiplayerSync?.(data.code);

        connectToRoomEvents(data.code);
        return true;
      }
    } catch (err) {
      console.error('Failed to join room:', err);
    }
    return false;
  };

  const handlePauseGame = async (hours: number) => {
    if (!roomData) return;
    try {
      const res = await fetch(`/api/rooms/${roomData.code}/pause`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hours }),
      });
      if (res.ok) {
        const d = await res.json();
        setRoomData(d.room);
      }
    } catch {}
  };

  const handleResumeGame = async () => {
    if (!roomData) return;
    try {
      const res = await fetch(`/api/rooms/${roomData.code}/resume`, {
        method: 'POST',
      });
      if (res.ok) {
        const d = await res.json();
        setRoomData(d.room);
      }
    } catch {}
  };

  const handleInvokeGraceSuspension = async () => {
    if (!roomData) return;
    try {
      const res = await fetch(`/api/rooms/${roomData.code}/suspend-grace`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerColor }),
      });
      if (res.ok) {
        const d = await res.json();
        setRoomData(d.room);
      }
    } catch {}
  };

  const handleUpdateReminderInterval = async (intervalMinutes: number) => {
    if (!roomData) return;
    try {
      const res = await fetch(`/api/rooms/${roomData.code}/reminder-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intervalMinutes }),
      });
      if (res.ok) {
        const d = await res.json();
        setRoomData(d.room);
        setReminderSecondsLeft(intervalMinutes * 60);
      }
    } catch {}
  };

  const handleApplyStrategy = (strategy: LearningStrategy) => {
    // When user wants to load strategy on live board, apply moves sequentially
    const win = window as unknown as {
      wizardChess?: {
        executeChessMove?: (fromR: number, fromC: number, toR: number, toC: number) => void;
        resetChessBoard?: (full: boolean) => void;
      };
    };
    if (win.wizardChess?.resetChessBoard) {
      win.wizardChess.resetChessBoard(true);
      let stepIdx = 0;
      const interval = setInterval(() => {
        if (stepIdx >= strategy.moves.length) {
          clearInterval(interval);
          return;
        }
        const m = strategy.moves[stepIdx];
        win.wizardChess?.executeChessMove?.(m.from.r, m.from.c, m.to.r, m.to.c);
        stepIdx++;
      }, 750);
    }
  };

  // UI Restoration
  const handleRestoreUI = () => {
    const win = window as unknown as { wizardChess?: { toggleUI?: (force?: boolean) => void } };
    if (win.wizardChess?.toggleUI) {
      win.wizardChess.toggleUI(false);
    } else {
      document.body.classList.remove('cinematic-ui-hidden');
      const btnHide = document.getElementById('btn-hide-ui');
      if (btnHide) btnHide.textContent = 'Hide UI [H]';
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileSheetOpen(false);
        setIsLobbyOpen(false);
        setIsLearningModalOpen(false);
      }
    };
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setMobileSheetOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <div id="loading-overlay">
        <div className="loader-title">Wizard Chess</div>
        <div className="loader-bar-wrap">
          <div className="loader-bar" id="loader-bar"></div>
        </div>
        <div id="loader-text">Summoning Sanctum Architecture &amp; Sculpted Pieces...</div>
      </div>

      <div id="canvas-container"></div>

      <button
        type="button"
        className="hud-btn mobile-only-restore-ui"
        id="btn-mobile-show-ui"
        onClick={handleRestoreUI}
        title="Show HUD Controls"
      >
        Show UI
      </button>

      {/* Top Floating HUD */}
      <div id="hud-top">
        <div className="hud-group" id="hud-left">
          <div className="brand-pill">
            <span className="brand-title">Wizard Chess</span>
          </div>

          <div className="status-pill" id="status-pill">
            <span className={`turn-dot ${currentTurn === 'b' ? 'black' : ''}`} id="turn-dot"></span>
            <span id="turn-text">{currentTurn === 'w' ? 'White to Move' : 'Black to Move'}</span>
            <span className="mode-badge" id="mode-badge">
              {roomData
                ? `Online (${playerColor === 'w' ? 'White' : 'Black'})`
                : playerColor === 'w'
                ? 'Playing as White'
                : 'Playing as Black'}
            </span>
          </div>

          {/* Turn Reminder Interval Countdown Pill */}
          <div
            className="status-pill"
            id="hud-timer-banner"
            title="Turn Reminder countdown interval"
            style={{ borderColor: 'rgba(78, 168, 222, 0.4)' }}
          >
            <span className="text-cyan-400 text-xs">🔔</span>
            <span className="text-xs font-mono text-cyan-200">
              Reminder in: <strong>{formatCountdown(reminderSecondsLeft)}</strong>
            </span>
            <span className="text-[10px] text-gray-400">
              ({roomData?.reminderIntervalMinutes || 30}m interval)
            </span>
          </div>
        </div>

        <button
          type="button"
          className={`hud-btn mobile-controls-trigger ${mobileSheetOpen ? 'active' : ''}`}
          id="btn-mobile-controls"
          aria-expanded={mobileSheetOpen}
          aria-controls="hud-right"
          onClick={() => setMobileSheetOpen((prev) => !prev)}
        >
          {mobileSheetOpen ? 'Close' : 'Controls'}
        </button>

        <div
          className={`mobile-sheet-backdrop ${mobileSheetOpen ? 'open' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            setMobileSheetOpen(false);
          }}
          aria-hidden="true"
        ></div>

        <div
          className={`hud-group ${mobileSheetOpen ? 'mobile-sheet-open' : ''}`}
          id="hud-right"
        >
          <div
            className="mobile-sheet-handle-wrap"
            onClick={(e) => {
              e.stopPropagation();
              setMobileSheetOpen(false);
            }}
            aria-hidden="true"
          >
            <div className="mobile-sheet-handle"></div>
          </div>

          <div className="mobile-sheet-header">
            <span className="mobile-sheet-title">Controls</span>
            <button
              type="button"
              className="mobile-sheet-close"
              id="btn-mobile-sheet-close"
              onClick={(e) => {
                e.stopPropagation();
                setMobileSheetOpen(false);
              }}
              aria-label="Close Controls"
            >
              Close ✕
            </button>
          </div>

          <div className="mobile-sheet-section-label">Multiplayer &amp; Learning</div>

          {/* Two-Player Online Lobby Button */}
          <button
            type="button"
            className={`hud-btn primary ${roomData ? 'active' : ''}`}
            id="btn-online-play"
            onClick={() => {
              setIsLobbyOpen(true);
              setMobileSheetOpen(false);
            }}
            title="Create or Join an Online 2-Player Game with Extended Pause & Reminders"
          >
            {roomData ? `⚔️ Room: ${roomData.code}` : '⚔️ Online 2-Player'}
          </button>

          {/* Visual Learning Mode Button */}
          <button
            type="button"
            className="hud-btn"
            id="btn-strategy-codex"
            onClick={() => {
              setIsLearningModalOpen(true);
              setMobileSheetOpen(false);
            }}
            title="Explore winning openings, counter-strategies, and simulated animated moves"
            style={{ borderColor: 'rgba(212, 175, 55, 0.45)' }}
          >
            📖 Visual Learning Mode
          </button>

          <div className="hud-divider" aria-hidden="true"></div>
          <div className="mobile-sheet-section-label">Game Actions</div>

          <button
            className="hud-btn"
            id="btn-side-toggle"
            title="Switch between Playing as White and Playing as Black"
            onClick={() => setMobileSheetOpen(false)}
          >
            Play as Black
          </button>
          <button
            className="hud-btn"
            id="btn-ai-move"
            title="Let the AI make the next move immediately"
            onClick={() => setMobileSheetOpen(false)}
          >
            AI Move
          </button>
          <button
            className="hud-btn"
            id="btn-reset"
            title="Start a fresh game on the altar"
            onClick={() => setMobileSheetOpen(false)}
          >
            New Game
          </button>

          <div className="hud-divider" aria-hidden="true"></div>
          <div className="mobile-sheet-section-label">
            <span>Camera Views</span>
            <span className="mobile-sheet-section-sub">Tap active view to flip</span>
          </div>

          <button
            className="hud-btn active"
            id="btn-cam-player"
            title="Player Camera (Click again to flip White / Black view)"
          >
            Player Cam
          </button>
          <button
            className="hud-btn"
            id="btn-cam-top"
            title="Overhead Board View (Click again to flip White / Black orientation)"
          >
            Overhead
          </button>
          <button
            className="hud-btn"
            id="btn-cam-side"
            title="Side Profile View (Click again to switch East / West side)"
          >
            Side
          </button>
          <button
            className="hud-btn"
            id="btn-cam-wide"
            title="Wide Cathedral View (Click again to switch North Rose / South Narthex)"
          >
            Cathedral
          </button>

          <div className="hud-divider" aria-hidden="true"></div>
          <div className="mobile-sheet-section-label">Display &amp; Gestures</div>

          <button
            className="hud-btn"
            id="btn-hide-ui"
            title="Toggle HUD visibility (Shortcut: H)"
            onClick={() => setMobileSheetOpen(false)}
          >
            Hide UI [H]
          </button>

          <div className="mobile-sheet-hint">
            <strong>Touch:</strong> Tap Piece to Move &nbsp;•&nbsp; 1-Finger Drag: Orbit &nbsp;•&nbsp; 2-Finger Drag: Pan &nbsp;•&nbsp; Pinch: Zoom
          </div>
        </div>
      </div>

      {/* Floating Active Strategy Alert Banner (When White opens with King's Pawn) */}
      {activeStrategyAlert && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 max-w-xl w-[92%] px-4 py-2.5 rounded-2xl bg-amber-950/90 border border-amber-400 text-amber-100 shadow-2xl flex items-center justify-between gap-3 text-xs backdrop-blur-md animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="text-base">💡</span>
            <span>{activeStrategyAlert}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setIsLearningModalOpen(true);
                setActiveStrategyAlert(null);
              }}
              className="px-2.5 py-1 rounded-full bg-amber-400 hover:bg-amber-300 text-black font-bold text-[11px] shadow"
            >
              Explore 3 Counters →
            </button>
            <button
              type="button"
              onClick={() => setActiveStrategyAlert(null)}
              className="text-amber-300 hover:text-white text-xs px-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Indefinite Pause / Sanctum Stasis Active Overlay Banner */}
      {roomData?.isPaused && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 max-w-lg w-[90%] p-3.5 rounded-2xl bg-blue-950/90 border border-cyan-400 text-cyan-100 shadow-2xl flex items-center justify-between gap-3 text-xs backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="text-xl">⏳</span>
            <div>
              <strong className="text-cyan-300 block">Sanctum Stasis Active</strong>
              <span>
                Game suspended. Resumes naturally at:{' '}
                {roomData.scheduledResumeTime
                  ? new Date(roomData.scheduledResumeTime).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'later'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResumeGame}
            className="px-3 py-1.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-bold text-xs shadow shrink-0"
          >
            Resume Early ▶
          </button>
        </div>
      )}

      {/* 2-Hour Grace Extension Active Banner */}
      {roomData?.activeGraceSuspension && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 max-w-lg w-[90%] p-3.5 rounded-2xl bg-amber-950/90 border border-amber-400 text-amber-100 shadow-2xl flex items-center justify-between gap-3 text-xs backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="text-xl">🛡️</span>
            <div>
              <strong className="text-amber-300 block">2-Hour Emergency Grace Active</strong>
              <span>
                {roomData.activeGraceSuspension.playerColor === 'w' ? 'White' : 'Black'} has frozen the turn clock for 2 hours.
              </span>
            </div>
          </div>
          <span className="text-xs px-2 py-1 rounded bg-black/40 font-mono text-amber-300">
            Active
          </span>
        </div>
      )}

      {/* Turn Reminder Alert Popup */}
      {showReminderAlert && (
        <div className="fixed top-36 left-1/2 -translate-x-1/2 z-40 px-5 py-3 rounded-2xl bg-red-950/90 border border-red-500/80 text-white shadow-2xl flex items-center gap-3 text-xs backdrop-blur-md animate-pulse">
          <span className="text-xl">🔔</span>
          <span className="font-semibold">{showReminderAlert}</span>
          <button
            type="button"
            onClick={() => setShowReminderAlert(null)}
            className="ml-2 text-white/80 hover:text-white font-bold"
          >
            Dismiss ✕
          </button>
        </div>
      )}

      {/* Bottom HUD */}
      <div id="hud-bottom">
        <div className="hint-pill" id="controls-hint">
          <strong>Controls:</strong> Click Piece to Move &nbsp;•&nbsp; Left-Drag: Orbit &nbsp;•&nbsp; Right-Drag: Pan &nbsp;•&nbsp; Scroll: Zoom &nbsp;•&nbsp; WASD + R/F: Fly Cam &nbsp;•&nbsp; H: Hide UI
        </div>
        <div className="captured-pill" id="captured-tray"></div>
      </div>

      {/* Checkmate Overlay */}
      <div id="checkmate-overlay" role="status" aria-live="polite">
        <div className="checkmate-banner">
          <div className="checkmate-ornament">✦ &nbsp; Sanctum Judgment &nbsp; ✦</div>
          <div className="checkmate-crown" id="checkmate-crown">♔</div>
          <div className="checkmate-title" id="checkmate-title">Checkmate</div>
          <div className="checkmate-rule"></div>
          <div className="checkmate-subtitle" id="checkmate-subtitle">
            White Triumphs • The Black King Has Fallen
          </div>
          <div className="checkmate-actions">
            <button className="checkmate-btn" id="btn-checkmate-replay">
              Replay King Fall
            </button>
            <button className="checkmate-btn" id="btn-checkmate-newgame">
              New Game
            </button>
            <button className="checkmate-btn secondary" id="btn-checkmate-dismiss">
              Dismiss
            </button>
          </div>
        </div>
      </div>

      {/* Online Multiplayer Lobby Modal */}
      <MultiplayerLobbyModal
        isOpen={isLobbyOpen}
        onClose={() => setIsLobbyOpen(false)}
        roomData={roomData}
        playerColor={playerColor}
        playerToken={playerToken}
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinRoom}
        onPauseGame={handlePauseGame}
        onResumeGame={handleResumeGame}
        onInvokeGraceSuspension={handleInvokeGraceSuspension}
        onUpdateReminderInterval={handleUpdateReminderInterval}
      />

      {/* Visual Learning Mode & Tactics Codex Modal */}
      <VisualLearningModal
        isOpen={isLearningModalOpen}
        onClose={() => setIsLearningModalOpen(false)}
        suggestedStrategies={learningSuggestedStrategies}
        onApplyStrategy={handleApplyStrategy}
      />
    </>
  );
}
