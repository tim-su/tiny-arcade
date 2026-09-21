const COLS = 20;
const ROWS = 20;
const SPEED_PRESETS = {
  1: { start: 210, min: 120 },
  2: { start: 140, min: 70 },
  3: { start: 85, min: 42 },
};

const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlayCopy = document.getElementById("overlay-copy");
const startButton = document.getElementById("start");
const muteButton = document.getElementById("mute");
const musicMuteButton = document.getElementById("musicMute");
const fullscreenButton = document.getElementById("fullscreen");
const refreshButton = document.getElementById("refresh");
const speedInput = document.getElementById("speed");
const speedValue = document.getElementById("speed-value");
const speedButtons = document.getElementById("speedButtons");
const musicButtons = document.getElementById("musicButtons");
const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const joystick = document.getElementById("joystick");
const joystickKnob = document.getElementById("joystickKnob");
const speedMeterFill = document.getElementById("speedMeterFill");
const speedMeterValue = document.getElementById("speedMeterValue");

const SPEED_METER_MIN_VALUE = 20;
const SPEED_METER_MAX_VALUE = 100;
const SPEED_METER_SLOWEST_STEP = SPEED_PRESETS[1].start;
const SPEED_METER_FASTEST_STEP = SPEED_PRESETS[3].min;

const dirVectors = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const cell = canvas.width / COLS;
const dirs = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  w: { x: 0, y: -1 },
  s: { x: 0, y: 1 },
  a: { x: -1, y: 0 },
  d: { x: 1, y: 0 },
};

let snake;
let dir;
let queued;
let food;
let score;
let best = Number(localStorage.getItem("snake-best") || 0);
let playing = false;
let paused = false;
let awaitingMove = false;
let lastTick = 0;
let stepMs = SPEED_PRESETS[2].start;
let muted = localStorage.getItem("snake-muted") === "1";
let musicMuted = localStorage.getItem("snake-music-muted") === "1";
let speedLevel = clampSpeed(Number(localStorage.getItem("snake-speed") || 2));
let audioCtx = null;

function repeat16(pattern, times) {
  const out = [];
  for (let i = 0; i < times; i += 1) out.push(...pattern);
  return out;
}

const DRUM_ARCADE_16 = ["kick", "hat", null, "hat", "hat", "hat", null, "hat", "kick", "hat", null, "hat", "hat", "hat", null, "hat"];
const DRUM_HATS_SYNCOPATED_16 = ["hat", null, "hat", "hat", null, "hat", "hat", null, "hat", null, "hat", "hat", null, "hat", "hat", null];

const DRUM_RETRO_16 = ["kick", "hat", "snare", "hat", "kick", "hat", "kick", "hat", "kick", "hat", "snare", "hat", "kick", "hat", "hat", "hat"];
const DRUM_RETRO_FILL_16 = ["kick", "snare", "hat", "snare", "kick", "snare", "hat", "snare", "kick", "hat", "snare", "hat", "kick", "snare", "kick", "snare"];

const DRUM_AAA_16 = ["kick", "hat", null, "hat", "kick", "hat", "snare", "hat", "kick", "hat", null, "hat", "kick", "hat", "snare", "hat"];
const DRUM_AAA_CALM_16 = ["kick", null, null, "hat", "kick", null, null, "hat", "kick", null, null, "hat", "kick", null, null, "hat"];

const DRUM_JARCADE_16 = ["kick", "hat", "hat", "snare", "kick", "hat", "hat", "snare", "kick", "hat", "snare", "hat", "kick", "hat", "snare", "hat"];
const DRUM_JARCADE_FILL_16 = ["kick", "snare", "hat", "snare", "kick", "hat", "snare", "hat", "kick", "snare", "hat", "snare", "kick", "snare", "kick", "snare"];

const BGM_TRACKS = {
  arcade: {
    // Energetic 4-chord chiptune progression (Am-F-C-G) over a driving kick/hat beat.
    step: 0.185,
    lead: [
      220, null, 261.63, null, 293.66, null, 329.63, null, 392, null, 329.63, null, 293.66, null, 261.63, null,
      174.61, null, 220, null, 261.63, null, 293.66, null, 349.23, null, 293.66, null, 261.63, null, 220, null,
      196, null, 246.94, null, 293.66, null, 329.63, null, 392, null, 329.63, null, 293.66, null, 246.94, null,
      246.94, null, 293.66, null, 329.63, null, 392, null, 440, null, 392, null, 329.63, null, 293.66, null,
    ],
    bass: [
      110, null, null, null, 82.41, null, null, null, 110, null, null, null, 130.81, null, null, null,
      87.31, null, null, null, 65.41, null, null, null, 87.31, null, null, null, 110, null, null, null,
      130.81, null, null, null, 98, null, null, null, 130.81, null, null, null, 164.81, null, null, null,
      98, null, null, null, 73.42, null, null, null, 98, null, null, null, 123.47, null, null, null,
    ],
    leadType: "triangle",
    leadGain: 0.022,
    bassType: "triangle",
    bassGain: 0.04,
    leadSustain: 1.7,
    bassSustain: 3.6,
    perc: repeat16(DRUM_ARCADE_16, 4),
    kickGain: 0.055,
    hatGain: 0.02,
  },
  chill: {
    // Upbeat synthwave progression (Dm-Bb-F-C) with syncopated bass and a soft hat groove.
    step: 0.2,
    lead: [
      293.66, null, 349.23, null, 440, 349.23, null, 523.25, null, 440, 349.23, null, 293.66, null, 349.23, null,
      233.08, null, 293.66, null, 349.23, 293.66, null, 440, null, 349.23, 293.66, null, 233.08, null, 293.66, null,
      174.61, null, 220, null, 261.63, 220, null, 329.63, null, 261.63, 220, null, 174.61, null, 220, null,
      261.63, null, 329.63, null, 392, 329.63, null, 440, null, 392, 329.63, null, 261.63, null, 329.63, null,
    ],
    bass: [
      73.42, null, null, 110, null, null, 73.42, null, null, 110, null, null, 73.42, null, null, null,
      58.27, null, null, 87.31, null, null, 58.27, null, null, 87.31, null, null, 58.27, null, null, null,
      87.31, null, null, 130.81, null, null, 87.31, null, null, 130.81, null, null, 87.31, null, null, null,
      65.41, null, null, 98, null, null, 65.41, null, null, 98, null, null, 65.41, null, null, null,
    ],
    leadType: "sawtooth",
    leadGain: 0.028,
    bassType: "triangle",
    bassGain: 0.045,
    leadSustain: 1.5,
    bassSustain: 2.4,
    perc: repeat16(DRUM_HATS_SYNCOPATED_16, 4),
    percGain: 0.02,
  },
  retro: {
    // High-energy '80s/'90s arcade: bright square arpeggios, punchy slap-style bass, crunchy drums, dramatic fill on the last phrase.
    step: 0.21,
    lead: [
      329.63, 392, 493.88, 587.33, 493.88, 392, 329.63, 392, 493.88, 587.33, 493.88, 392, 329.63, 392, 493.88, 587.33,
      261.63, 329.63, 392, 523.25, 392, 329.63, 261.63, 329.63, 392, 523.25, 392, 329.63, 261.63, 329.63, 392, 523.25,
      196, 246.94, 293.66, 392, 293.66, 246.94, 196, 246.94, 293.66, 392, 293.66, 246.94, 196, 246.94, 293.66, 392,
      293.66, 369.99, 440, 587.33, 440, 369.99, 293.66, 369.99, 440, 587.33, 440, 369.99, 293.66, 440, 587.33, 698.46,
    ],
    bass: [
      82.41, null, 164.81, null, 82.41, null, null, 164.81, 82.41, null, 164.81, null, 82.41, null, null, 164.81,
      65.41, null, 130.81, null, 65.41, null, null, 130.81, 65.41, null, 130.81, null, 65.41, null, null, 130.81,
      98, null, 196, null, 98, null, null, 196, 98, null, 196, null, 98, null, null, 196,
      73.42, null, 146.83, null, 73.42, null, null, 146.83, 73.42, 146.83, 73.42, 146.83, 73.42, 146.83, 73.42, 146.83,
    ],
    leadType: "square",
    leadGain: 0.024,
    bassType: "square",
    bassGain: 0.038,
    leadSustain: 1.3,
    bassSustain: 0.9,
    perc: repeat16(DRUM_RETRO_16, 3).concat(DRUM_RETRO_FILL_16),
    kickGain: 0.06,
    hatGain: 0.022,
    snareGain: 0.05,
  },
  aaa: {
    // Modern AAA arcade-action: hybrid electronic/cinematic, layered synths, deep punchy bass, alternating tension/release drums.
    step: 0.19,
    lead: [
      261.63, null, 311.13, 392, null, 311.13, 261.63, null, 392, null, 311.13, 261.63, null, 311.13, 392, null,
      207.65, null, 261.63, 311.13, null, 261.63, 207.65, null, 311.13, null, 261.63, 207.65, null, 261.63, 311.13, null,
      311.13, null, 392, 466.16, null, 392, 311.13, null, 466.16, null, 392, 311.13, null, 392, 466.16, null,
      233.08, null, 293.66, 349.23, null, 293.66, 233.08, null, 349.23, null, 293.66, 233.08, null, 293.66, 349.23, null,
    ],
    lead2: [
      523.25, null, null, null, 523.25, null, null, null, 466.16, null, null, null, 523.25, null, null, null,
      415.3, null, null, null, 415.3, null, null, null, 349.23, null, null, null, 415.3, null, null, null,
      622.25, null, null, null, 622.25, null, null, null, 554.37, null, null, null, 622.25, null, null, null,
      466.16, null, null, null, 466.16, null, null, null, 392, null, null, null, 466.16, null, null, null,
    ],
    bass: [
      65.41, null, null, null, 65.41, null, null, null, 65.41, null, null, null, 65.41, null, null, null,
      51.91, null, null, null, 51.91, null, null, null, 51.91, null, null, null, 51.91, null, null, null,
      77.78, null, null, null, 77.78, null, null, null, 77.78, null, null, null, 77.78, null, null, null,
      58.27, null, null, null, 58.27, null, null, null, 58.27, null, null, null, 58.27, null, null, null,
    ],
    leadType: "sawtooth",
    leadGain: 0.021,
    leadSustain: 1.6,
    leadFilter: 2600,
    lead2Type: "sine",
    lead2Gain: 0.012,
    lead2Sustain: 3,
    bassType: "sawtooth",
    bassGain: 0.015,
    bassSustain: 2.6,
    bassFilter: 700,
    perc: [...DRUM_AAA_16, ...DRUM_AAA_CALM_16, ...DRUM_AAA_16, ...DRUM_AAA_CALM_16],
    kickGain: 0.05,
    hatGain: 0.017,
    snareGain: 0.032,
  },
  jarcade: {
    // High-energy Japanese arcade/rhythm-game: euphoric major hooks, rapid arpeggios, punchy funky bass, busy drums with a climax fill.
    step: 0.115,
    lead: [
      261.63, 329.63, 392, 523.25, 392, 329.63, 261.63, 329.63, 392, 523.25, 392, 329.63, 261.63, 329.63, 392, 523.25,
      392, 493.88, 587.33, 784, 587.33, 493.88, 392, 493.88, 587.33, 784, 587.33, 493.88, 392, 493.88, 587.33, 784,
      220, 261.63, 329.63, 440, 329.63, 261.63, 220, 261.63, 329.63, 440, 329.63, 261.63, 220, 261.63, 329.63, 440,
      349.23, 440, 523.25, 698.46, 523.25, 440, 349.23, 440, 523.25, 698.46, 523.25, 440, 349.23, 523.25, 698.46, 880,
    ],
    bass: [
      65.41, null, 130.81, null, 65.41, null, 130.81, null, 65.41, null, 130.81, null, 65.41, null, 130.81, null,
      98, null, 196, null, 98, null, 196, null, 98, null, 196, null, 98, null, 196, null,
      55, null, 110, null, 55, null, 110, null, 55, null, 110, null, 55, null, 110, null,
      87.31, null, 174.61, null, 87.31, null, 174.61, null, 87.31, null, 174.61, null, 87.31, 174.61, 87.31, 174.61,
    ],
    leadType: "square",
    leadGain: 0.026,
    bassType: "square",
    bassGain: 0.032,
    leadSustain: 1.0,
    bassSustain: 0.7,
    perc: repeat16(DRUM_JARCADE_16, 3).concat(DRUM_JARCADE_FILL_16),
    kickGain: 0.065,
    hatGain: 0.025,
    snareGain: 0.05,
  },
};

let musicTrack = localStorage.getItem("snake-music") || "arcade";
if (!BGM_TRACKS[musicTrack]) musicTrack = "arcade";

let bgmTimerId = null;
let bgmStepIndex = 0;
let bgmNextStepTime = 0;

bestEl.textContent = String(best);
syncMuteButton();
syncMusicMuteButton();
syncSpeedControl();
syncMusicButtons();

const qrUrlEl = document.getElementById("qrUrl");
const qrcodeEl = document.getElementById("qrcode");
if (qrUrlEl && qrcodeEl && window.QRCode) {
  const shareUrl = window.location.href;
  qrUrlEl.textContent = shareUrl;
  new QRCode(qrcodeEl, {
    text: shareUrl,
    width: 140,
    height: 140,
    colorDark: "#08140d",
    colorLight: "#ffffff",
  });
}

function clampSpeed(value) {
  const level = Math.round(value);
  if (level < 1 || level > 3) return 2;
  return level;
}

function speedPreset() {
  return SPEED_PRESETS[speedLevel];
}

function applyStepMs() {
  const preset = speedPreset();
  stepMs = Math.max(preset.min, preset.start - Math.floor((score || 0) / 40) * 4);
  updateSpeedMeter();
}

function updateSpeedMeter() {
  const clampedStep = Math.min(SPEED_METER_SLOWEST_STEP, Math.max(SPEED_METER_FASTEST_STEP, stepMs));
  const t = (SPEED_METER_SLOWEST_STEP - clampedStep) / (SPEED_METER_SLOWEST_STEP - SPEED_METER_FASTEST_STEP);
  const value = Math.round(SPEED_METER_MIN_VALUE + t * (SPEED_METER_MAX_VALUE - SPEED_METER_MIN_VALUE));
  speedMeterValue.textContent = String(value);
  const pct = ((value - SPEED_METER_MIN_VALUE) / (SPEED_METER_MAX_VALUE - SPEED_METER_MIN_VALUE)) * 100;
  speedMeterFill.style.width = `${pct}%`;
}

function syncSpeedControl() {
  speedInput.value = String(speedLevel);
  speedValue.textContent = String(speedLevel);
  speedInput.style.setProperty("--speed-pct", `${((speedLevel - 1) / 2) * 100}%`);
  speedInput.setAttribute("aria-valuenow", String(speedLevel));
  speedInput.setAttribute("aria-valuetext", `Speed ${speedLevel}`);
  speedButtons.querySelectorAll(".speed-btn").forEach((btn) => {
    btn.classList.toggle("active", Number(btn.dataset.speed) === speedLevel);
  });
}

function setSpeedLevel(level) {
  speedLevel = clampSpeed(level);
  localStorage.setItem("snake-speed", String(speedLevel));
  syncSpeedControl();
  applyStepMs();
}

function syncMuteButton() {
  muteButton.textContent = muted ? "Sound off" : "Sound on";
  muteButton.setAttribute("aria-pressed", muted ? "true" : "false");
}

function syncMusicMuteButton() {
  musicMuteButton.textContent = musicMuted ? "Music off" : "Music on";
  musicMuteButton.setAttribute("aria-pressed", musicMuted ? "true" : "false");
}

let masterBus = null;

function unlockAudio() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    audioCtx = new AudioContextClass();
    // Master limiter: keeps overlapping layers (lead + harmony + bass + drums) from clipping into a crackle.
    masterBus = audioCtx.createDynamicsCompressor();
    masterBus.threshold.setValueAtTime(-18, audioCtx.currentTime);
    masterBus.knee.setValueAtTime(24, audioCtx.currentTime);
    masterBus.ratio.setValueAtTime(8, audioCtx.currentTime);
    masterBus.attack.setValueAtTime(0.003, audioCtx.currentTime);
    masterBus.release.setValueAtTime(0.15, audioCtx.currentTime);
    masterBus.connect(audioCtx.destination);
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
}

function tone(freq, duration, type, gainValue, slideTo) {
  if (muted || !audioCtx) return;
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (slideTo) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(slideTo, 1), now + duration);
  }
  gain.gain.setValueAtTime(gainValue, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc.connect(gain);
  gain.connect(masterBus);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

function playEat() {
  // Quick rising dual-tone beep: two short square beeps stepping up in pitch.
  tone(660, 0.06, "square", 0.09);
  setTimeout(() => tone(990, 0.07, "square", 0.08), 55);
}

function playCrash() {
  // Short descending flat buzz for wall/self collisions.
  tone(300, 0.26, "square", 0.09, 80);
}

function playClick() {
  // Standard UI bleep for menu/nav interactions (mute, speed, music, fullscreen).
  tone(880, 0.035, "square", 0.045);
}

function playStart() {
  tone(330, 0.1, "triangle", 0.07);
  setTimeout(() => tone(440, 0.14, "triangle", 0.07), 90);
}

function playMoveStart() {
  tone(220, 0.06, "sine", 0.04);
}

function playPause() {
  tone(180, 0.08, "triangle", 0.05);
}

function bgmTone(freq, duration, type, gainValue, startTime, filterCutoff) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(gainValue, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0008, startTime + duration);
  if (filterCutoff) {
    const filter = audioCtx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = filterCutoff;
    filter.Q.value = 0.7;
    osc.connect(filter);
    filter.connect(gain);
  } else {
    osc.connect(gain);
  }
  gain.connect(masterBus);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.02);
}

let percNoiseBuffer = null;

function getPercNoiseBuffer() {
  if (!percNoiseBuffer) {
    const size = Math.floor(audioCtx.sampleRate * 0.15);
    percNoiseBuffer = audioCtx.createBuffer(1, size, audioCtx.sampleRate);
    const data = percNoiseBuffer.getChannelData(0);
    for (let i = 0; i < size; i += 1) data[i] = Math.random() * 2 - 1;
  }
  return percNoiseBuffer;
}

function playKick(startTime, gainValue) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(110, startTime);
  osc.frequency.exponentialRampToValueAtTime(40, startTime + 0.14);
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(gainValue, startTime + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);
  osc.connect(gain);
  gain.connect(masterBus);
  osc.start(startTime);
  osc.stop(startTime + 0.22);
}

function playHat(startTime, gainValue) {
  const noise = audioCtx.createBufferSource();
  noise.buffer = getPercNoiseBuffer();
  const filter = audioCtx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 4500;
  filter.Q.value = 0.6;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(gainValue, startTime + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.045);
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(masterBus);
  noise.start(startTime);
  noise.stop(startTime + 0.045);
}

function playSnare(startTime, gainValue) {
  const noise = audioCtx.createBufferSource();
  noise.buffer = getPercNoiseBuffer();
  const filter = audioCtx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 1800;
  filter.Q.value = 0.8;
  const noiseGain = audioCtx.createGain();
  noiseGain.gain.setValueAtTime(0, startTime);
  noiseGain.gain.linearRampToValueAtTime(gainValue, startTime + 0.004);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.09);
  noise.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(masterBus);
  noise.start(startTime);
  noise.stop(startTime + 0.09);

  const osc = audioCtx.createOscillator();
  const oscGain = audioCtx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(180, startTime);
  oscGain.gain.setValueAtTime(0, startTime);
  oscGain.gain.linearRampToValueAtTime(gainValue * 0.6, startTime + 0.004);
  oscGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.07);
  osc.connect(oscGain);
  oscGain.connect(masterBus);
  osc.start(startTime);
  osc.stop(startTime + 0.08);
}

function scheduleBgm() {
  const track = BGM_TRACKS[musicTrack];
  while (bgmNextStepTime < audioCtx.currentTime + 0.15) {
    const i = bgmStepIndex % track.lead.length;
    const lead = track.lead[i];
    const lead2 = track.lead2 ? track.lead2[i % track.lead2.length] : null;
    const bass = track.bass ? track.bass[i] : null;
    const perc = track.perc ? track.perc[i % track.perc.length] : null;
    if (lead) bgmTone(lead, track.step * (track.leadSustain || 1.4), track.leadType, track.leadGain, bgmNextStepTime, track.leadFilter);
    if (lead2) {
      bgmTone(
        lead2,
        track.step * (track.lead2Sustain || track.leadSustain || 1.4),
        track.lead2Type || track.leadType,
        track.lead2Gain || track.leadGain,
        bgmNextStepTime,
        track.lead2Filter
      );
    }
    if (bass) bgmTone(bass, track.step * (track.bassSustain || 3.4), track.bassType, track.bassGain, bgmNextStepTime, track.bassFilter);
    if (perc === "kick") playKick(bgmNextStepTime, track.kickGain || track.percGain || 0.08);
    if (perc === "hat") playHat(bgmNextStepTime, track.hatGain || track.percGain || 0.03);
    if (perc === "snare") playSnare(bgmNextStepTime, track.snareGain || track.percGain || 0.05);
    bgmStepIndex += 1;
    bgmNextStepTime += track.step;
  }
}

function setMusicTrack(name) {
  if (!BGM_TRACKS[name] || name === musicTrack) return;
  musicTrack = name;
  localStorage.setItem("snake-music", musicTrack);
  syncMusicButtons();
  if (bgmTimerId) {
    stopBgm();
    startBgm();
  }
}

function syncMusicButtons() {
  musicButtons.querySelectorAll(".speed-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.track === musicTrack);
  });
}

function startBgm() {
  if (bgmTimerId || musicMuted || !audioCtx) return;
  bgmStepIndex = 0;
  bgmNextStepTime = audioCtx.currentTime + 0.05;
  scheduleBgm();
  bgmTimerId = setInterval(scheduleBgm, 100);
}

function stopBgm() {
  if (bgmTimerId) {
    clearInterval(bgmTimerId);
    bgmTimerId = null;
  }
}

function reset() {
  const midX = Math.floor(COLS / 2);
  const midY = 14;
  snake = [
    { x: midX, y: midY },
    { x: midX - 1, y: midY },
    { x: midX - 2, y: midY },
  ];
  dir = { x: 1, y: 0 };
  queued = dir;
  score = 0;
  applyStepMs();
  scoreEl.textContent = "0";
  placeFood();
}

function placeFood() {
  const taken = new Set(snake.map((p) => `${p.x},${p.y}`));
  let next;
  do {
    next = {
      x: Math.floor(Math.random() * COLS),
      y: Math.floor(Math.random() * ROWS),
    };
  } while (taken.has(`${next.x},${next.y}`));
  food = next;
}

function same(a, b) {
  return a.x === b.x && a.y === b.y;
}

function opposite(a, b) {
  return a.x === -b.x && a.y === -b.y;
}

function tick() {
  dir = queued;
  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
  const hitWall = head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS;
  const hitSelf = snake.some((part) => same(part, head));
  if (hitWall || hitSelf) {
    gameOver();
    return;
  }

  snake.unshift(head);
  if (same(head, food)) {
    score += 10;
    scoreEl.textContent = String(score);
    applyStepMs();
    placeFood();
    playEat();
  } else {
    snake.pop();
  }
}

function gameOver() {
  playing = false;
  paused = false;
  stopBgm();
  if (score > best) {
    best = score;
    localStorage.setItem("snake-best", String(best));
    bestEl.textContent = String(best);
  }
  overlayTitle.textContent = "Game over";
  overlayCopy.textContent = `You scored ${score}. Try for a longer snake.`;
  startButton.textContent = "Play again";
  overlay.classList.remove("hidden");
  playCrash();
}

function drawCell(x, y, fill, glow) {
  const px = x * cell + 2;
  const py = y * cell + 2;
  const size = cell - 4;
  ctx.fillStyle = fill;
  if (glow) {
    ctx.shadowColor = fill;
    ctx.shadowBlur = 12;
  }
  ctx.beginPath();
  ctx.roundRect(px, py, size, size, 5);
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawHead(part) {
  ctx.save();
  ctx.translate(part.x * cell + cell / 2, part.y * cell + cell / 2);
  ctx.rotate(Math.atan2(dir.y, dir.x));

  ctx.fillStyle = "rgba(125, 255, 154, 0.95)";
  ctx.beginPath();
  ctx.roundRect(-cell * 0.62, -cell * 0.28, cell * 0.7, cell * 0.56, 8);
  ctx.fill();

  ctx.fillStyle = "#eafff0";
  ctx.shadowColor = "#7dff9a";
  ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.arc(cell * 0.06, 0, cell * 0.46, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = "rgba(16, 36, 24, 0.22)";
  ctx.lineWidth = 1.2;
  ctx.stroke();

  function drawEye(ey) {
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(cell * 0.12, ey, 4.2, 4.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#102418";
    ctx.beginPath();
    ctx.arc(cell * 0.18, ey, 2.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(cell * 0.24, ey - 0.8, 0.7, 0, Math.PI * 2);
    ctx.fill();
  }
  drawEye(-5.6);
  drawEye(5.6);

  ctx.strokeStyle = "#ff5d7a";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cell * 0.42, 0);
  ctx.lineTo(cell * 0.62, 0);
  ctx.moveTo(cell * 0.62, 0);
  ctx.lineTo(cell * 0.76, -3);
  ctx.moveTo(cell * 0.62, 0);
  ctx.lineTo(cell * 0.76, 3);
  ctx.stroke();

  ctx.restore();
}

function drawTail(part, prevPart, fill) {
  const tx = part.x - prevPart.x;
  const ty = part.y - prevPart.y;
  const angle = Math.atan2(ty, tx);
  ctx.save();
  ctx.translate(part.x * cell + cell / 2, part.y * cell + cell / 2);
  ctx.rotate(angle);
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(-cell * 0.42, -cell * 0.3);
  ctx.lineTo(-cell * 0.42, cell * 0.3);
  ctx.quadraticCurveTo(cell * 0.1, cell * 0.16, cell * 0.5, 0);
  ctx.quadraticCurveTo(cell * 0.1, -cell * 0.16, -cell * 0.42, -cell * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function draw(now) {
  ctx.fillStyle = "#08140d";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(125, 255, 154, 0.06)";
  ctx.lineWidth = 1;
  for (let i = 1; i < COLS; i += 1) {
    ctx.beginPath();
    ctx.moveTo(i * cell, 0);
    ctx.lineTo(i * cell, canvas.height);
    ctx.stroke();
  }
  for (let i = 1; i < ROWS; i += 1) {
    ctx.beginPath();
    ctx.moveTo(0, i * cell);
    ctx.lineTo(canvas.width, i * cell);
    ctx.stroke();
  }

  drawCell(food.x, food.y, "#ff5d7a", true);

  const hueShift = (now || 0) / 20;
  const tailIndex = snake.length - 1;
  snake.forEach((part, i) => {
    if (i === 0 || i === tailIndex) return;
    const t = i / Math.max(snake.length - 1, 1);
    const hue = (hueShift - i * 16) % 360;
    drawCell(part.x, part.y, `hsla(${hue}, 90%, 62%, ${1 - t * 0.45})`, false);
  });
  if (tailIndex > 0) {
    const tailHue = (hueShift - tailIndex * 16) % 360;
    drawTail(snake[tailIndex], snake[tailIndex - 1], `hsla(${tailHue}, 90%, 62%, ${0.55})`);
  }
  drawHead(snake[0]);
}

function loop(now) {
  if (playing && !paused && !awaitingMove) {
    if (now - lastTick >= stepMs) {
      lastTick = now;
      tick();
    }
  }
  draw(now);
  requestAnimationFrame(loop);
}

function startGame() {
  reset();
  playing = true;
  paused = false;
  awaitingMove = true;
  lastTick = performance.now();
  overlay.classList.add("hidden");
  playStart();
  startBgm();
}

function togglePause() {
  if (!playing) return;
  paused = !paused;
  if (paused) {
    overlayTitle.textContent = "Paused";
    overlayCopy.textContent = "Enter, Space, or Play to keep slithering.";
    startButton.textContent = "Resume";
    overlay.classList.remove("hidden");
    playPause();
    stopBgm();
  } else {
    overlay.classList.add("hidden");
    playPause();
    startBgm();
  }
}

function startOrResume() {
  unlockAudio();
  if (playing && paused) {
    paused = false;
    overlay.classList.add("hidden");
    playPause();
    startBgm();
    return;
  }
  if (!playing) {
    startGame();
  }
}

speedInput.addEventListener("input", () => {
  setSpeedLevel(Number(speedInput.value));
});

speedButtons.addEventListener("click", (event) => {
  const btn = event.target.closest(".speed-btn");
  if (!btn) return;
  unlockAudio();
  playClick();
  setSpeedLevel(Number(btn.dataset.speed));
});

musicButtons.addEventListener("click", (event) => {
  const btn = event.target.closest(".speed-btn");
  if (!btn) return;
  unlockAudio();
  playClick();
  setMusicTrack(btn.dataset.track);
});

muteButton.addEventListener("click", () => {
  muted = !muted;
  localStorage.setItem("snake-muted", muted ? "1" : "0");
  syncMuteButton();
  unlockAudio();
  if (!muted) playClick();
});

musicMuteButton.addEventListener("click", () => {
  musicMuted = !musicMuted;
  localStorage.setItem("snake-music-muted", musicMuted ? "1" : "0");
  syncMusicMuteButton();
  unlockAudio();
  playClick();
  if (musicMuted) {
    stopBgm();
  } else if (playing && !paused) {
    startBgm();
  }
});

startButton.addEventListener("click", startOrResume);

function syncFullscreenButton() {
  const isFullscreen = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
  fullscreenButton.textContent = isFullscreen ? "Exit full screen" : "Full screen";
  fullscreenButton.setAttribute("aria-pressed", isFullscreen ? "true" : "false");
}

fullscreenButton.addEventListener("click", () => {
  unlockAudio();
  playClick();
  const isFullscreen = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
  if (isFullscreen) {
    (document.exitFullscreen || document.webkitExitFullscreen).call(document);
  } else {
    const el = document.documentElement;
    (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
  }
});

document.addEventListener("fullscreenchange", syncFullscreenButton);
document.addEventListener("webkitfullscreenchange", syncFullscreenButton);

refreshButton.addEventListener("click", () => {
  window.location.reload();
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.code === "Enter" || event.code === "NumpadEnter") {
    event.preventDefault();
    if (playing && !paused) {
      unlockAudio();
      togglePause();
      return;
    }
    startOrResume();
    return;
  }

  if (event.key === " " || event.code === "Space") {
    event.preventDefault();
    unlockAudio();
    togglePause();
    return;
  }

  const next = dirs[event.key] || dirs[event.key.toLowerCase()];
  if (!next) return;
  event.preventDefault();
  steer(next);
});

function steer(next) {
  if (!playing || paused) return;
  unlockAudio();
  if (!opposite(next, dir)) queued = next;
  if (awaitingMove) {
    awaitingMove = false;
    lastTick = performance.now();
    playMoveStart();
  }
}

const JOY_RADIUS = 46;
const JOY_DEADZONE = 12;
let joyActive = false;
let joyPointerId = null;

function joyDirFromDelta(dx, dy) {
  if (Math.hypot(dx, dy) < JOY_DEADZONE) return null;
  return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? dirVectors.right : dirVectors.left) : dy > 0 ? dirVectors.down : dirVectors.up;
}

function moveJoystick(event) {
  const rect = joystick.getBoundingClientRect();
  const dx = event.clientX - (rect.left + rect.width / 2);
  const dy = event.clientY - (rect.top + rect.height / 2);
  const dist = Math.min(Math.hypot(dx, dy), JOY_RADIUS);
  const angle = Math.atan2(dy, dx);
  const kx = Math.cos(angle) * dist;
  const ky = Math.sin(angle) * dist;
  joystickKnob.style.transform = `translate(calc(-50% + ${kx}px), calc(-50% + ${ky}px))`;

  const next = joyDirFromDelta(dx, dy);
  if (!playing) {
    if (next) startOrResume();
    return;
  }
  if (next) steer(next);
}

function resetJoystick() {
  joyActive = false;
  joyPointerId = null;
  joystick.classList.remove("active");
  joystickKnob.style.transform = "translate(-50%, -50%)";
}

joystick.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  joyActive = true;
  joyPointerId = event.pointerId;
  joystick.classList.add("active");
  joystick.setPointerCapture(event.pointerId);
  unlockAudio();
  moveJoystick(event);
});

joystick.addEventListener("pointermove", (event) => {
  if (!joyActive || event.pointerId !== joyPointerId) return;
  event.preventDefault();
  moveJoystick(event);
});

function endJoystick(event) {
  if (event.pointerId !== joyPointerId) return;
  resetJoystick();
}

joystick.addEventListener("pointerup", endJoystick);
joystick.addEventListener("pointercancel", endJoystick);
joystick.addEventListener("lostpointercapture", resetJoystick);

canvas.addEventListener(
  "touchstart",
  (event) => {
    event.preventDefault();
    unlockAudio();
    if (!playing) {
      startOrResume();
    } else {
      togglePause();
    }
  },
  { passive: false }
);

overlay.addEventListener("touchstart", (event) => {
  if (event.target === startButton) return;
  event.preventDefault();
  unlockAudio();
  startOrResume();
});

reset();
draw();
requestAnimationFrame(loop);
