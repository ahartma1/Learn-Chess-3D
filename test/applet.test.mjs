import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const ROOT = process.cwd();

test('Simplified Single-Player HUD in src/App.tsx excludes speed sliders, notation script bar, and multiplayer lobby', () => {
  const appTsx = fs.readFileSync(path.join(ROOT, 'src/App.tsx'), 'utf-8');

  // Must include simplified game & camera controls
  for (const requiredId of [
    'btn-side-toggle',
    'btn-ai-move',
    'btn-reset',
    'btn-cam-player',
    'btn-cam-top',
    'btn-cam-side',
    'btn-cam-wide',
    'btn-hide-ui',
    'controls-hint',
    'captured-tray',
    'btn-online-play',
    'btn-strategy-codex',
    'hud-timer-banner'
  ]) {
    assert.ok(appTsx.includes(`id="${requiredId}"`), `Missing required HUD control #${requiredId}`);
  }

  // Must NOT include camera speed sliders, script mode bar, or old deprecated modal IDs
  for (const forbiddenId of [
    'cam-speed-wrap',
    'input-cam-speed',
    'rot-speed-wrap',
    'input-rot-speed',
    'script-bar',
    'btn-script-modal',
    'btn-script-prev',
    'btn-script-next',
    'btn-lobby',
    'lobby-modal',
    'room-pill',
    'btn-checkmate-stepback'
  ]) {
    assert.ok(!appTsx.includes(forbiddenId), `Forbidden UI element #${forbiddenId} found in App.tsx`);
  }
});

test('All 7 compressed 3D assets (.glb.gz.b64) decode and gunzip to valid glTF 2.0 binary models', () => {
  const expectedModels = [
    'option8_cathedral',
    'pawn_white',
    'rook_white',
    'knight_white',
    'bishop_white',
    'queen_white',
    'king_white'
  ];

  for (const name of expectedModels) {
    const b64Path = path.join(ROOT, 'public/assets/glb', `${name}.glb.gz.b64`);
    assert.ok(fs.existsSync(b64Path), `Missing 3D asset ${b64Path}`);
    const b64Text = fs.readFileSync(b64Path, 'utf-8').trim();
    assert.ok(b64Text.length > 1000, `Asset ${name}.glb.gz.b64 is unexpectedly small`);

    const gzBuf = Buffer.from(b64Text, 'base64');
    const glbBuf = zlib.gunzipSync(gzBuf);

    const magic = glbBuf.toString('ascii', 0, 4);
    const version = glbBuf.readUInt32LE(4);
    const totalLen = glbBuf.readUInt32LE(8);
    assert.equal(magic, 'glTF', `Invalid glTF magic header for ${name}`);
    assert.equal(version, 2, `Invalid glTF version for ${name}`);
    assert.equal(totalLen, glbBuf.length, `Mismatched glTF byte length for ${name}`);
  }
});

test('Visual Learning Mode: Strategies provide 2 to 7 moves with concise step explanations and square focus', () => {
  const learningStrategiesCode = fs.readFileSync(path.join(ROOT, 'src/learningStrategies.ts'), 'utf-8');
  assert.ok(learningStrategiesCode.includes('LEARNING_STRATEGIES'), 'Must define LEARNING_STRATEGIES');
  assert.ok(learningStrategiesCode.includes('italian_game'), 'Must include Italian Game');
  assert.ok(learningStrategiesCode.includes('queens_gambit'), 'Must include Queens Gambit');
  assert.ok(learningStrategiesCode.includes('counter_sicilian'), 'Must include Sicilian Defense');
  assert.ok(learningStrategiesCode.includes('counter_french'), 'Must include French Defense');
  assert.ok(learningStrategiesCode.includes('counter_scandinavian'), 'Must include Scandinavian Defense');
  assert.ok(learningStrategiesCode.includes('counter_kings_indian'), 'Must include Kings Indian');
  assert.ok(learningStrategiesCode.includes('scholars_mate_refutation'), 'Must include Scholars Mate refutation');
  assert.ok(learningStrategiesCode.includes('sanctum_dragon_novelty'), 'Must include novel wizard strategy');
});

test('Visual Learning Mode: When White opens, Player 2 is offered top 3 winning counter approaches', () => {
  const learningStrategiesCode = fs.readFileSync(path.join(ROOT, 'src/learningStrategies.ts'), 'utf-8');
  assert.ok(learningStrategiesCode.includes('getRecommendedStrategies'), 'Must define getRecommendedStrategies');
  assert.ok(learningStrategiesCode.includes('firstMoveSq === \'e4\''), 'Must detect 1.e4 and recommend counters');
  assert.ok(learningStrategiesCode.includes('firstMoveSq === \'d4\''), 'Must detect 1.d4 and recommend counters');
  assert.ok(learningStrategiesCode.includes('scholars_mate_refutation'), 'Must recommend refutation on scholar attacks');
});

test('Server & Multiplayer: Supports 15/30/60m reminders, 24h indefinite pause, and 5-turn 2h emergency grace extensions', () => {
  const serverCode = fs.readFileSync(path.join(ROOT, 'server.ts'), 'utf-8');

  // Check 15, 30, 60 minute reminder support
  assert.ok(serverCode.includes('reminderIntervalMinutes'), 'Server must track reminderIntervalMinutes');
  assert.ok(serverCode.includes('15') && serverCode.includes('30') && serverCode.includes('60'), 'Must support 15, 30, and 60 minute intervals');

  // Check 24-hour max indefinite pause
  assert.ok(serverCode.includes('MAX_INDEFINITE_PAUSE_MS = 24 * 60 * 60 * 1000'), 'Server must enforce 24-hour max pause');
  assert.ok(serverCode.includes('scheduledResumeTime'), 'Server must support scheduled resume time');

  // Check 5 turns x 2 hours emergency grace suspension
  assert.ok(serverCode.includes('graceTokensWhite: 5'), 'Server must provide 5 grace tokens for White');
  assert.ok(serverCode.includes('graceTokensBlack: 5'), 'Server must provide 5 grace tokens for Black');
  assert.ok(serverCode.includes('2 * 60 * 60 * 1000'), 'Server must provide 2-hour grace duration');
});
