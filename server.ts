import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';

interface MoveRecord {
  seq: number;
  color: 'w' | 'b';
  from: { r: number; c: number };
  to: { r: number; c: number };
  promotion?: string;
  ts: number;
  notation?: string;
}

interface RoomRecord {
  code: string;
  createdAt: number;
  updatedAt: number;
  hostColor: 'w' | 'b';
  whiteJoined: boolean;
  blackJoined: boolean;
  whiteToken: string | null;
  blackToken: string | null;
  turn: 'w' | 'b';
  moves: MoveRecord[];
  resetCount: number;

  // Turn Reminders
  reminderIntervalMinutes: number; // 15, 30, or 60 min
  turnStartTime: number;
  lastReminderPing: number | null;

  // Indefinite Pause
  isPaused: boolean;
  pauseStartTime: number | null;
  pauseTotalElapsedMs: number; // max 24 hours = 86,400,000 ms
  scheduledResumeTime: number | null;
  maxPauseElapsed: boolean;

  // Post-24h Grace Suspensions: 2 hours for 5 turns
  graceTokensWhite: number; // starts at 5
  graceTokensBlack: number; // starts at 5
  activeGraceSuspension: {
    playerColor: 'w' | 'b';
    startTime: number;
    durationMs: number; // 2 hours = 7,200,000 ms
    expiresAt: number;
  } | null;
}

const MAX_INDEFINITE_PAUSE_MS = 24 * 60 * 60 * 1000; // 24 hours
const GRACE_EXTENSION_MS = 2 * 60 * 60 * 1000; // 2 hours
const DEFAULT_REMINDER_MINUTES = 30; // 15, 30, or 60 min

const rooms = new Map<string, RoomRecord>();
const sseClients = new Map<string, Set<express.Response>>();

function broadcastRoom(code: string, eventType: string, extraData: Record<string, unknown> = {}) {
  const room = rooms.get(code);
  if (!room) return;
  const clients = sseClients.get(code);
  if (!clients || clients.size === 0) return;

  const payload = JSON.stringify({
    type: eventType,
    room: serializeRoom(room),
    ts: Date.now(),
    ...extraData,
  });

  for (const client of clients) {
    try {
      client.write(`event: room_event\ndata: ${payload}\n\n`);
    } catch {
      clients.delete(client);
    }
  }
}

function serializeRoom(room: RoomRecord) {
  const now = Date.now();
  let currentPauseDuration = room.pauseTotalElapsedMs;
  if (room.isPaused && room.pauseStartTime) {
    currentPauseDuration += now - room.pauseStartTime;
  }

  const isMaxPauseReached = currentPauseDuration >= MAX_INDEFINITE_PAUSE_MS;

  return {
    code: room.code,
    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
    hostColor: room.hostColor,
    whiteJoined: room.whiteJoined,
    blackJoined: room.blackJoined,
    turn: room.turn,
    moves: room.moves,
    resetCount: room.resetCount,
    reminderIntervalMinutes: room.reminderIntervalMinutes,
    turnStartTime: room.turnStartTime,
    lastReminderPing: room.lastReminderPing,
    isPaused: room.isPaused,
    pauseStartTime: room.pauseStartTime,
    pauseTotalElapsedMs: currentPauseDuration,
    scheduledResumeTime: room.scheduledResumeTime,
    maxPauseElapsed: room.maxPauseElapsed || isMaxPauseReached,
    maxPauseLimitMs: MAX_INDEFINITE_PAUSE_MS,
    graceTokensWhite: room.graceTokensWhite,
    graceTokensBlack: room.graceTokensBlack,
    activeGraceSuspension: room.activeGraceSuspension,
    serverTime: now,
  };
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  if (rooms.has(code)) {
    return generateRoomCode();
  }
  return code;
}

// Background ticker to auto-resume on scheduled pause expiration, check grace expirations, and trigger reminders
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    // 1. Auto resume scheduled pause
    if (room.isPaused && room.scheduledResumeTime && now >= room.scheduledResumeTime) {
      if (room.pauseStartTime) {
        room.pauseTotalElapsedMs += now - room.pauseStartTime;
      }
      room.isPaused = false;
      room.pauseStartTime = null;
      room.scheduledResumeTime = null;
      if (room.pauseTotalElapsedMs >= MAX_INDEFINITE_PAUSE_MS) {
        room.maxPauseElapsed = true;
      }
      room.turnStartTime = now;
      room.lastReminderPing = null;
      room.updatedAt = now;
      broadcastRoom(code, 'resume', { autoResumed: true, message: 'Indefinite pause period expired. Match resumed!' });
    }

    // 2. Check 2-hour grace suspension expiration
    if (room.activeGraceSuspension && now >= room.activeGraceSuspension.expiresAt) {
      room.activeGraceSuspension = null;
      room.turnStartTime = now;
      room.lastReminderPing = null;
      room.updatedAt = now;
      broadcastRoom(code, 'grace_expired', { message: '2-hour emergency grace extension elapsed.' });
    }

    // 3. Turn reminders (15, 30, or 60 min)
    if (!room.isPaused && !room.activeGraceSuspension && room.whiteJoined && room.blackJoined) {
      const intervalMs = room.reminderIntervalMinutes * 60 * 1000;
      const turnElapsed = now - room.turnStartTime;
      const lastPingElapsed = room.lastReminderPing ? now - room.lastReminderPing : turnElapsed;

      if (turnElapsed >= intervalMs && lastPingElapsed >= intervalMs) {
        room.lastReminderPing = now;
        room.updatedAt = now;
        broadcastRoom(code, 'reminder_ping', {
          playerColor: room.turn,
          intervalMinutes: room.reminderIntervalMinutes,
          message: `Sanctum Reminder: It is ${room.turn === 'w' ? 'White' : 'Black'}'s turn to move!`,
        });
      }
    }
  }
}, 2000);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const isProduction = process.env.NODE_ENV === 'production';

  app.use(express.json({ limit: '10mb' }));

  // API Endpoints
  app.post('/api/rooms/create', (req, res) => {
    const { preferredColor = 'w', playerToken = 'tok_' + Math.random().toString(36).slice(2, 10), reminderIntervalMinutes = DEFAULT_REMINDER_MINUTES } = req.body || {};
    const validInterval = [15, 30, 60].includes(Number(reminderIntervalMinutes)) ? Number(reminderIntervalMinutes) : 30;
    const color: 'w' | 'b' = preferredColor === 'b' ? 'b' : 'w';
    const code = generateRoomCode();
    const now = Date.now();

    const room: RoomRecord = {
      code,
      createdAt: now,
      updatedAt: now,
      hostColor: color,
      whiteJoined: color === 'w',
      blackJoined: color === 'b',
      whiteToken: color === 'w' ? playerToken : null,
      blackToken: color === 'b' ? playerToken : null,
      turn: 'w',
      moves: [],
      resetCount: 0,
      reminderIntervalMinutes: validInterval,
      turnStartTime: now,
      lastReminderPing: null,
      isPaused: false,
      pauseStartTime: null,
      pauseTotalElapsedMs: 0,
      scheduledResumeTime: null,
      maxPauseElapsed: false,
      graceTokensWhite: 5,
      graceTokensBlack: 5,
      activeGraceSuspension: null,
    };

    rooms.set(code, room);

    res.json({
      ok: true,
      code,
      color,
      playerToken,
      room: serializeRoom(room),
    });
  });

  app.post('/api/rooms/join', (req, res) => {
    const { code, playerToken = 'tok_' + Math.random().toString(36).slice(2, 10) } = req.body || {};
    const normalizedCode = String(code || '').trim().toUpperCase();
    const room = rooms.get(normalizedCode);

    if (!room) {
      // Create on-demand if joining an ad-hoc room
      const now = Date.now();
      const newRoom: RoomRecord = {
        code: normalizedCode,
        createdAt: now,
        updatedAt: now,
        hostColor: 'w',
        whiteJoined: true,
        blackJoined: true,
        whiteToken: 'host_' + normalizedCode,
        blackToken: playerToken,
        turn: 'w',
        moves: [],
        resetCount: 0,
        reminderIntervalMinutes: DEFAULT_REMINDER_MINUTES,
        turnStartTime: now,
        lastReminderPing: null,
        isPaused: false,
        pauseStartTime: null,
        pauseTotalElapsedMs: 0,
        scheduledResumeTime: null,
        maxPauseElapsed: false,
        graceTokensWhite: 5,
        graceTokensBlack: 5,
        activeGraceSuspension: null,
      };
      rooms.set(normalizedCode, newRoom);
      return res.json({
        ok: true,
        code: normalizedCode,
        color: 'b',
        playerToken,
        room: serializeRoom(newRoom),
      });
    }

    let assignedColor: 'w' | 'b' = 'b';
    if (!room.whiteJoined || room.whiteToken === playerToken) {
      room.whiteJoined = true;
      room.whiteToken = playerToken;
      assignedColor = 'w';
    } else if (!room.blackJoined || room.blackToken === playerToken) {
      room.blackJoined = true;
      room.blackToken = playerToken;
      assignedColor = 'b';
    } else {
      // Spectator or re-joining as opponent
      assignedColor = 'b';
    }

    room.updatedAt = Date.now();
    broadcastRoom(normalizedCode, 'player_joined', { color: assignedColor });

    res.json({
      ok: true,
      code: normalizedCode,
      color: assignedColor,
      playerToken,
      room: serializeRoom(room),
    });
  });

  app.get('/api/rooms/:code/state', (req, res) => {
    const code = String(req.params.code || '').toUpperCase();
    const room = rooms.get(code);
    if (!room) {
      return res.status(404).json({ ok: false, error: 'Room not found' });
    }
    res.json({ ok: true, room: serializeRoom(room) });
  });

  app.get('/api/rooms/:code/events', (req, res) => {
    const code = String(req.params.code || '').toUpperCase();
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.write('\n');

    if (!sseClients.has(code)) {
      sseClients.set(code, new Set());
    }
    const clientSet = sseClients.get(code)!;
    clientSet.add(res);

    const room = rooms.get(code);
    if (room) {
      const initPayload = JSON.stringify({
        type: 'room_state',
        room: serializeRoom(room),
        ts: Date.now(),
      });
      res.write(`event: room_event\ndata: ${initPayload}\n\n`);
    }

    req.on('close', () => {
      clientSet.delete(res);
      if (clientSet.size === 0) {
        sseClients.delete(code);
      }
    });
  });

  app.post('/api/rooms/:code/move', (req, res) => {
    const code = String(req.params.code || '').toUpperCase();
    const room = rooms.get(code);
    if (!room) {
      return res.status(404).json({ ok: false, error: 'Room not found' });
    }

    const { color, from, to, promotion = 'queen', notation = '' } = req.body || {};
    const now = Date.now();

    const nextSeq = room.moves.length + 1;
    const newMove: MoveRecord = {
      seq: nextSeq,
      color: color === 'b' ? 'b' : 'w',
      from,
      to,
      promotion,
      notation,
      ts: now,
    };

    room.moves.push(newMove);
    room.turn = room.turn === 'w' ? 'b' : 'w';
    room.turnStartTime = now;
    room.lastReminderPing = null;
    room.updatedAt = now;

    // If an active grace suspension was on for this turn, clear it
    if (room.activeGraceSuspension) {
      room.activeGraceSuspension = null;
    }

    broadcastRoom(code, 'move', { move: newMove });
    res.json({ ok: true, move: newMove, room: serializeRoom(room) });
  });

  // Configurable indefinite pause option:
  // Allows pausing game through many hours of being away, and resuming timer-based countdowns at chosen expiration time
  app.post('/api/rooms/:code/pause', (req, res) => {
    const code = String(req.params.code || '').toUpperCase();
    const room = rooms.get(code);
    if (!room) return res.status(404).json({ ok: false, error: 'Room not found' });

    const { hours = 8, scheduledResumeTime } = req.body || {};
    const now = Date.now();

    let targetResume = scheduledResumeTime ? Number(scheduledResumeTime) : null;
    if (!targetResume && hours) {
      targetResume = now + Number(hours) * 3600 * 1000;
    }

    // Limit indefinite pause to maximum 24h from now
    if (targetResume && targetResume > now + MAX_INDEFINITE_PAUSE_MS) {
      targetResume = now + MAX_INDEFINITE_PAUSE_MS;
    }

    room.isPaused = true;
    room.pauseStartTime = now;
    room.scheduledResumeTime = targetResume;
    room.updatedAt = now;

    broadcastRoom(code, 'pause', {
      scheduledResumeTime: room.scheduledResumeTime,
      message: 'Gameplay paused in Sanctum Stasis. Timers frozen.',
    });

    res.json({ ok: true, room: serializeRoom(room) });
  });

  app.post('/api/rooms/:code/resume', (req, res) => {
    const code = String(req.params.code || '').toUpperCase();
    const room = rooms.get(code);
    if (!room) return res.status(404).json({ ok: false, error: 'Room not found' });

    const now = Date.now();
    if (room.isPaused && room.pauseStartTime) {
      room.pauseTotalElapsedMs += now - room.pauseStartTime;
    }

    if (room.pauseTotalElapsedMs >= MAX_INDEFINITE_PAUSE_MS) {
      room.maxPauseElapsed = true;
    }

    room.isPaused = false;
    room.pauseStartTime = null;
    room.scheduledResumeTime = null;
    room.turnStartTime = now;
    room.lastReminderPing = null;
    room.updatedAt = now;

    broadcastRoom(code, 'resume', { message: 'Sanctum Stasis ended. Match resumed!' });
    res.json({ ok: true, room: serializeRoom(room) });
  });

  // Emergency grace suspension: "allowing players to suspend play for another 2 hours for 5 turns after a maximum 24 hour 'indefinite' pause elapses."
  app.post('/api/rooms/:code/suspend-grace', (req, res) => {
    const code = String(req.params.code || '').toUpperCase();
    const room = rooms.get(code);
    if (!room) return res.status(404).json({ ok: false, error: 'Room not found' });

    const { playerColor } = req.body || {};
    const pColor = playerColor === 'b' ? 'b' : 'w';

    const tokens = pColor === 'w' ? room.graceTokensWhite : room.graceTokensBlack;
    if (tokens <= 0) {
      return res.status(400).json({ ok: false, error: 'No 2-hour grace suspension tokens remaining for this player (maximum 5 turns reached).' });
    }

    if (pColor === 'w') {
      room.graceTokensWhite -= 1;
    } else {
      room.graceTokensBlack -= 1;
    }

    const now = Date.now();
    room.activeGraceSuspension = {
      playerColor: pColor,
      startTime: now,
      durationMs: GRACE_EXTENSION_MS,
      expiresAt: now + GRACE_EXTENSION_MS,
    };
    room.updatedAt = now;

    broadcastRoom(code, 'grace_suspension', {
      graceSuspension: room.activeGraceSuspension,
      playerColor: pColor,
      remainingTokens: pColor === 'w' ? room.graceTokensWhite : room.graceTokensBlack,
      message: `${pColor === 'w' ? 'White' : 'Black'} invoked a 2-hour turn suspension (Turns remaining with grace: ${pColor === 'w' ? room.graceTokensWhite : room.graceTokensBlack}).`,
    });

    res.json({ ok: true, room: serializeRoom(room) });
  });

  // Configure 15, 30, or 60 minute reminder intervals
  app.post('/api/rooms/:code/reminder-config', (req, res) => {
    const code = String(req.params.code || '').toUpperCase();
    const room = rooms.get(code);
    if (!room) return res.status(404).json({ ok: false, error: 'Room not found' });

    const { intervalMinutes } = req.body || {};
    const parsed = Number(intervalMinutes);
    if ([15, 30, 60].includes(parsed)) {
      room.reminderIntervalMinutes = parsed;
      room.lastReminderPing = null;
      room.updatedAt = Date.now();
      broadcastRoom(code, 'reminder_config', { intervalMinutes: parsed });
      return res.json({ ok: true, room: serializeRoom(room) });
    }
    res.status(400).json({ ok: false, error: 'Interval must be 15, 30, or 60 minutes' });
  });

  app.post('/api/rooms/:code/reset', (req, res) => {
    const code = String(req.params.code || '').toUpperCase();
    const room = rooms.get(code);
    if (!room) return res.status(404).json({ ok: false, error: 'Room not found' });

    const now = Date.now();
    room.moves = [];
    room.turn = 'w';
    room.resetCount += 1;
    room.turnStartTime = now;
    room.lastReminderPing = null;
    room.isPaused = false;
    room.pauseStartTime = null;
    room.scheduledResumeTime = null;
    room.activeGraceSuspension = null;
    room.updatedAt = now;

    broadcastRoom(code, 'reset', { message: 'The board has been reset for a fresh match.' });
    res.json({ ok: true, room: serializeRoom(room) });
  });

  app.post('/api/upload-screenshot', (req, res) => {
    res.json({ ok: true, saved: true });
  });

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true, port: PORT, host: '0.0.0.0' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve('dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Wizard Chess 3D server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
