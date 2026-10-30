import React, { useState } from 'react';

export interface RoomData {
  code: string;
  createdAt: number;
  updatedAt: number;
  hostColor: 'w' | 'b';
  whiteJoined: boolean;
  blackJoined: boolean;
  turn: 'w' | 'b';
  moves: unknown[];
  resetCount: number;
  reminderIntervalMinutes: number;
  turnStartTime: number;
  lastReminderPing: number | null;
  isPaused: boolean;
  pauseStartTime: number | null;
  pauseTotalElapsedMs: number;
  scheduledResumeTime: number | null;
  maxPauseElapsed: boolean;
  maxPauseLimitMs: number;
  graceTokensWhite: number;
  graceTokensBlack: number;
  activeGraceSuspension: {
    playerColor: 'w' | 'b';
    startTime: number;
    durationMs: number;
    expiresAt: number;
  } | null;
}

interface MultiplayerLobbyModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomData: RoomData | null;
  playerColor: 'w' | 'b';
  playerToken: string;
  onCreateRoom: (preferredColor: 'w' | 'b', reminderMinutes: number) => Promise<void>;
  onJoinRoom: (code: string) => Promise<boolean>;
  onPauseGame: (hours: number, scheduledTime?: number) => Promise<void>;
  onResumeGame: () => Promise<void>;
  onInvokeGraceSuspension: () => Promise<void>;
  onUpdateReminderInterval: (minutes: number) => Promise<void>;
}

export const MultiplayerLobbyModal: React.FC<MultiplayerLobbyModalProps> = ({
  isOpen,
  onClose,
  roomData,
  playerColor,
  onCreateRoom,
  onJoinRoom,
  onPauseGame,
  onResumeGame,
  onInvokeGraceSuspension,
  onUpdateReminderInterval,
}) => {
  const [activeTab, setActiveTab] = useState<'status' | 'create' | 'join' | 'pause'>(
    roomData ? 'status' : 'create'
  );
  const [createSide, setCreateSide] = useState<'w' | 'b'>('w');
  const [reminderMinutes, setReminderMinutes] = useState<number>(30);
  const [joinCodeInput, setJoinCodeInput] = useState<string>('');
  const [joinError, setJoinError] = useState<string>('');
  const [pauseHours, setPauseHours] = useState<number>(8);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState('');

  if (!isOpen) return null;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedMsg(`Copied ${label} to clipboard!`);
    setTimeout(() => setCopiedMsg(''), 2500);
  };

  const myGraceTokens = roomData
    ? playerColor === 'w'
      ? roomData.graceTokensWhite
      : roomData.graceTokensBlack
    : 5;

  const totalPauseHoursElapsed = roomData
    ? (roomData.pauseTotalElapsedMs / (3600 * 1000)).toFixed(1)
    : '0.0';

  const isConnected = roomData?.whiteJoined && roomData?.blackJoined;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5"
      style={{ background: 'rgba(5, 7, 12, 0.84)', backdropFilter: 'blur(10px)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="mp-lobby-title"
    >
      <div
        className="w-full max-w-xl flex flex-col rounded-2xl border shadow-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(175deg, rgba(16, 20, 30, 0.96) 0%, rgba(9, 11, 18, 0.98) 100%)',
          borderColor: 'rgba(212, 175, 55, 0.45)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.75), 0 0 40px rgba(212, 175, 55, 0.12)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-amber-500/20 bg-black/30">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">⚔️</span>
            <div>
              <h2
                id="mp-lobby-title"
                className="text-base sm:text-lg font-bold tracking-wide text-amber-300 font-serif"
              >
                ONLINE MULTIPLAYER &amp; SANCTUM TIMERS
              </h2>
              <p className="text-xs text-gray-400">
                Real-time 2-player sync, turn reminders &amp; extended suspension
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-amber-300 text-sm px-3 py-1.5 rounded-full border border-white/10 hover:border-amber-400/40 transition-colors"
          >
            Close ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 bg-black/20 px-3 pt-2 gap-1 overflow-x-auto">
          {roomData && (
            <button
              type="button"
              onClick={() => setActiveTab('status')}
              className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-all border-b-2 ${
                activeTab === 'status'
                  ? 'border-amber-400 text-amber-300 bg-white/5'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              Active Room ({roomData.code})
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-all border-b-2 ${
              activeTab === 'create'
                ? 'border-amber-400 text-amber-300 bg-white/5'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            Create New Room
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('join')}
            className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-all border-b-2 ${
              activeTab === 'join'
                ? 'border-amber-400 text-amber-300 bg-white/5'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            Join by Code
          </button>
          {roomData && (
            <button
              type="button"
              onClick={() => setActiveTab('pause')}
              className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-all border-b-2 ${
                activeTab === 'pause'
                  ? 'border-amber-400 text-amber-300 bg-white/5'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              Indefinite Pause &amp; Grace
            </button>
          )}
        </div>

        {/* Tab Contents */}
        <div className="p-5 flex flex-col gap-4">
          {/* Active Room Status */}
          {activeTab === 'status' && roomData && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-black/40 border border-amber-500/30">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-gray-400 uppercase tracking-wider">Room Code</span>
                  <span className="text-3xl font-mono font-bold text-amber-300 tracking-widest">
                    {roomData.code}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                      isConnected
                        ? 'bg-green-950/80 text-green-300 border-green-500/40'
                        : 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                    }`}
                  >
                    {isConnected ? '● 2/2 Connected' : '○ Waiting for Player 2'}
                  </span>
                  <span className="text-xs text-gray-300">
                    Playing as: <strong>{playerColor === 'w' ? 'White' : 'Black'}</strong>
                  </span>
                </div>
              </div>

              {/* Share Buttons */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleCopy(roomData.code, 'room code')}
                  className="flex-1 py-2 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white border border-white/10 flex items-center justify-center gap-1.5"
                >
                  📋 Copy Code
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleCopy(
                      `${window.location.origin}${window.location.pathname}?room=${roomData.code}`,
                      'invite link'
                    )
                  }
                  className="flex-1 py-2 px-3 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-xs font-semibold text-amber-300 border border-amber-500/40 flex items-center justify-center gap-1.5"
                >
                  🔗 Copy Invite Link
                </button>
              </div>

              {copiedMsg && (
                <div className="text-center text-xs text-green-400 font-semibold">{copiedMsg}</div>
              )}

              {/* Reminder Interval Settings */}
              <div className="flex flex-col gap-2 p-3.5 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-300">
                    Turn Reminder Interval:
                  </span>
                  <span className="text-xs text-amber-300 font-bold">
                    {roomData.reminderIntervalMinutes} minutes
                  </span>
                </div>
                <p className="text-[11px] text-gray-400">
                  Plays a cathedral bell chime and visual alert when a player's turn remains unplayed.
                </p>
                <div className="flex gap-2 pt-1">
                  {[15, 30, 60].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => onUpdateReminderInterval(mins)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        roomData.reminderIntervalMinutes === mins
                          ? 'bg-amber-500 text-black border-amber-400 shadow-md font-bold'
                          : 'bg-black/30 text-gray-300 border-white/10 hover:border-amber-400/40'
                      }`}
                    >
                      {mins} Min
                    </button>
                  ))}
                </div>
              </div>

              {/* Extended Pause Status */}
              <div className="flex flex-col gap-2 p-3.5 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-300">Sanctum Stasis:</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                      roomData.isPaused
                        ? 'bg-blue-900/60 text-cyan-300 border border-cyan-500/40'
                        : 'bg-gray-800 text-gray-400'
                    }`}
                  >
                    {roomData.isPaused ? 'PAUSED' : 'ACTIVE'}
                  </span>
                </div>
                <div className="text-xs text-gray-400 flex justify-between">
                  <span>Accumulated Pause Time:</span>
                  <span className="font-mono text-amber-300">{totalPauseHoursElapsed}h / 24h</span>
                </div>
                <div className="text-xs text-gray-400 flex justify-between">
                  <span>Post-24h Grace Extensions:</span>
                  <span className="font-mono text-cyan-300">
                    {myGraceTokens} of 5 tokens left (2 hrs each)
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Create Room Tab */}
          {activeTab === 'create' && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-gray-300">Play as Side:</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCreateSide('w')}
                    className={`py-3 rounded-xl border flex items-center justify-center gap-2 text-sm font-semibold transition-all ${
                      createSide === 'w'
                        ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-md'
                        : 'bg-black/30 border-white/10 text-gray-400 hover:text-white'
                    }`}
                  >
                    <span className="text-base">♔</span> White (First Move)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateSide('b')}
                    className={`py-3 rounded-xl border flex items-center justify-center gap-2 text-sm font-semibold transition-all ${
                      createSide === 'b'
                        ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-md'
                        : 'bg-black/30 border-white/10 text-gray-400 hover:text-white'
                    }`}
                  >
                    <span className="text-base">♚</span> Black
                  </button>
                </div>
              </div>

              {/* Turn Reminder Interval Selector */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-gray-300">
                  Turn Reminder Interval (Configurable):
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[15, 30, 60].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setReminderMinutes(mins)}
                      className={`py-2 rounded-lg text-xs font-semibold border transition-all ${
                        reminderMinutes === mins
                          ? 'bg-amber-500 text-black border-amber-400 shadow-md font-bold'
                          : 'bg-black/30 text-gray-300 border-white/10 hover:border-amber-400/40'
                      }`}
                    >
                      {mins} Minutes
                    </button>
                  ))}
                </div>
                <span className="text-[11px] text-gray-400">
                  Whichever player's turn it is receives a gentle chime &amp; notification on this
                  interval.
                </span>
              </div>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={async () => {
                  setIsSubmitting(true);
                  await onCreateRoom(createSide, reminderMinutes);
                  setIsSubmitting(false);
                  setActiveTab('status');
                }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black font-bold text-sm tracking-wide shadow-lg transition-all"
              >
                {isSubmitting ? 'Summoning Room...' : 'Create Online Sanctum Room'}
              </button>
            </div>
          )}

          {/* Join Room Tab */}
          {activeTab === 'join' && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-gray-300">
                  Enter 4-Character Room Code:
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={joinCodeInput}
                  onChange={(e) => {
                    setJoinCodeInput(e.target.value.toUpperCase());
                    setJoinError('');
                  }}
                  placeholder="e.g. VALR"
                  className="w-full py-3 px-4 rounded-xl bg-black/50 border border-white/20 text-amber-300 text-center font-mono text-2xl tracking-widest uppercase focus:outline-none focus:border-amber-400"
                />
              </div>

              {joinError && <div className="text-xs text-red-400 text-center">{joinError}</div>}

              <button
                type="button"
                disabled={isSubmitting || !joinCodeInput.trim()}
                onClick={async () => {
                  setIsSubmitting(true);
                  const ok = await onJoinRoom(joinCodeInput.trim());
                  setIsSubmitting(false);
                  if (ok) {
                    setActiveTab('status');
                    onClose();
                  } else {
                    setJoinError('Could not connect to room. Please verify the 4-character code.');
                  }
                }}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-bold text-sm tracking-wide shadow-lg transition-all"
              >
                {isSubmitting ? 'Entering Room...' : 'Join Sanctum Match'}
              </button>
            </div>
          )}

          {/* Extended Pause & Emergency Grace Suspensions Tab */}
          {activeTab === 'pause' && roomData && (
            <div className="flex flex-col gap-4">
              {roomData.isPaused ? (
                <div className="flex flex-col gap-3 p-4 rounded-xl bg-cyan-950/30 border border-cyan-500/40 text-center">
                  <span className="text-2xl">⏳</span>
                  <h4 className="text-sm font-bold text-cyan-200">SANCTUM STASIS IS ACTIVE</h4>
                  <p className="text-xs text-gray-300">
                    Gameplay is paused and state is safely preserved. Countdown timers are frozen.
                  </p>
                  {roomData.scheduledResumeTime && (
                    <div className="text-xs text-amber-300 bg-black/40 py-2 px-3 rounded-lg border border-amber-500/30">
                      Scheduled to automatically resume at:{' '}
                      <strong>
                        {new Date(roomData.scheduledResumeTime).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        ({new Date(roomData.scheduledResumeTime).toLocaleDateString()})
                      </strong>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={onResumeGame}
                    className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs shadow-md transition-all mt-1"
                  >
                    Resume Match Now
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-gray-300">
                      Indefinite Pause (Hours Away):
                    </label>
                    <p className="text-[11px] text-gray-400">
                      Suspends turn timers for many hours. Automatically resumes countdown at the
                      chosen expiration time to pick back up naturally.
                    </p>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {[2, 4, 8, 16].map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setPauseHours(h)}
                        className={`py-2 rounded-lg text-xs font-semibold border transition-all ${
                          pauseHours === h
                            ? 'bg-cyan-500 text-black border-cyan-400 font-bold'
                            : 'bg-black/30 text-gray-300 border-white/10 hover:border-cyan-400/40'
                        }`}
                      >
                        {h} Hours
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => onPauseGame(pauseHours)}
                    className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs tracking-wide shadow-md transition-all"
                  >
                    Activate Indefinite Pause ({pauseHours}h)
                  </button>
                </div>
              )}

              {/* 2-Hour Emergency Grace Extension Tokens */}
              <div className="flex flex-col gap-2 p-4 rounded-xl bg-amber-950/20 border border-amber-500/30">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300">
                    5-Turn Grace Extensions (2 Hours Each):
                  </span>
                  <span className="text-xs font-mono font-bold text-amber-200">
                    {myGraceTokens} of 5 Left
                  </span>
                </div>
                <p className="text-[11px] text-gray-300 leading-relaxed">
                  After the 24-hour indefinite pause elapses, players can suspend play for another 2
                  hours for 5 turns to accommodate busy schedules.
                </p>

                {roomData.activeGraceSuspension ? (
                  <div className="text-xs text-green-300 bg-green-950/40 border border-green-500/30 p-2.5 rounded-lg text-center font-medium">
                    ✦ 2-Hour Extension Active for{' '}
                    {roomData.activeGraceSuspension.playerColor === 'w' ? 'White' : 'Black'}{' '}
                    ✦
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={myGraceTokens <= 0 || roomData.isPaused}
                    onClick={onInvokeGraceSuspension}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 disabled:opacity-40 text-black font-bold text-xs tracking-wide shadow-md transition-all mt-1"
                  >
                    {myGraceTokens > 0
                      ? `Suspend Turn for 2 Hours (Use Token ${6 - myGraceTokens}/5)`
                      : 'All 5 Grace Turn Suspensions Used'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-white/10 bg-black/30 flex items-center justify-between">
          <span className="text-[11px] text-gray-400">
            {isConnected ? 'Match in Progress' : 'Single & Online Multi-mode'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
