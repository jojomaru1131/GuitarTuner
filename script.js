// オーディオファイル
const audioFiles = {
  E: 'audio/E.mp3',
  A: 'audio/A.mp3',
  D: 'audio/D.mp3',
  G: 'audio/G.mp3',
  B: 'audio/B.mp3',
  HighE: 'audio/HighE.mp3',
};

// ギター弦の周波数（Hz）
const guitarNotes = {
  'E2': { freq: 82.41, name: 'E', string: 6 }, // 6弦
  'A2': { freq: 110.00, name: 'A', string: 5 }, // 5弦
  'D3': { freq: 146.83, name: 'D', string: 4 }, // 4弦
  'G3': { freq: 196.00, name: 'G', string: 3 }, // 3弦
  'B3': { freq: 246.94, name: 'B', string: 2 }, // 2弦
  'E4': { freq: 329.63, name: 'E', string: 1 }  // 1弦
};

let audioContext;
let analyser;
let microphone;
let dataArray;
let isListening = false;

// DOM要素
const startMicBtn = document.getElementById('startMic');
const stopMicBtn = document.getElementById('stopMic');
const noteDisplay = document.getElementById('noteDisplay');
const frequencyDisplay = document.getElementById('frequencyDisplay');
const meterNeedle = document.getElementById('meterNeedle');
const tuningStatus = document.getElementById('tuningStatus');

// ボタンの参照
const buttons = {
  'E2': document.getElementById('btnE'),
  'A2': document.getElementById('btnA'),
  'D3': document.getElementById('btnD'),
  'G3': document.getElementById('btnG'),
  'B3': document.getElementById('btnB'),
  'E4': document.getElementById('btnHighE')
};

// サンプル音再生
function playSound(note) {
  const audio = new Audio(audioFiles[note]);
  audio.play();
}

// マイク開始
startMicBtn.addEventListener('click', async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    microphone = audioContext.createMediaStreamSource(stream);
    
    analyser.fftSize = 16384; // より高解像度に変更
    analyser.smoothingTimeConstant = 0.1; // スムージング追加
    analyser.minDecibels = -90; // ノイズフロアを下げる
    analyser.maxDecibels = -10; // ダイナミックレンジ調整
    const bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);
    
    microphone.connect(analyser);
    
    isListening = true;
    startMicBtn.style.display = 'none';
    stopMicBtn.style.display = 'inline-block';
    
    detectPitch();
  } catch (err) {
    alert('マイクへのアクセスが拒否されました。ブラウザの設定を確認してください。');
    console.error('マイクアクセスエラー:', err);
  }
});

// マイク停止
stopMicBtn.addEventListener('click', () => {
  if (audioContext) {
    audioContext.close();
  }
  isListening = false;
  startMicBtn.style.display = 'inline-block';
  stopMicBtn.style.display = 'none';
  
  // 表示をリセット
  noteDisplay.textContent = '-';
  frequencyDisplay.textContent = '- Hz';
  tuningStatus.textContent = '音を検出してください';
  tuningStatus.className = 'tuning-status no-signal';
  meterNeedle.style.transform = 'translateX(-50%) translateY(-50%)';
  
  // ボタンの強調表示をリセット
  Object.values(buttons).forEach(btn => btn.classList.remove('active'));
});

// 音程検出
function detectPitch() {
  if (!isListening) return;

  analyser.getByteFrequencyData(dataArray);
  
  // 最も強い周波数を検出
  const frequency = getFrequency();
  
  if (frequency > 50 && frequency < 500) {
    const closestNote = getClosestNote(frequency);
    updateDisplay(frequency, closestNote);
  } else {
    noteDisplay.textContent = '-';
    frequencyDisplay.textContent = '- Hz';
    tuningStatus.textContent = '音を検出してください';
    tuningStatus.className = 'tuning-status no-signal';
    Object.values(buttons).forEach(btn => btn.classList.remove('active'));
  }

  requestAnimationFrame(detectPitch);
}

// 周波数検出（改善版）
function getFrequency() {
  const sampleRate = audioContext.sampleRate;
  const binSize = sampleRate / analyser.fftSize;
  
  let maxIndex = 0;
  let maxValue = 0;
  
  // ギター音域の範囲に限定（約80Hz〜400Hz）
  const minBin = Math.floor(80 / binSize);
  const maxBin = Math.floor(400 / binSize);
  
  // 最大値を検出
  for (let i = minBin; i < Math.min(maxBin, dataArray.length); i++) {
    if (dataArray[i] > maxValue) {
      maxValue = dataArray[i];
      maxIndex = i;
    }
  }
  
  // 信号が弱すぎる場合は無視
  if (maxValue < 50) {
    return 0;
  }
  
  // パラボリック補間で精度向上
  if (maxIndex > 0 && maxIndex < dataArray.length - 1) {
    const y1 = dataArray[maxIndex - 1];
    const y2 = dataArray[maxIndex];
    const y3 = dataArray[maxIndex + 1];
    
    const a = (y1 - 2 * y2 + y3) / 2;
    const b = (y3 - y1) / 2;
    
    if (a !== 0) {
      const xOffset = -b / (2 * a);
      maxIndex = maxIndex + xOffset;
    }
  }
  
  return maxIndex * binSize;
}

// 最も近い音程を検出
function getClosestNote(frequency) {
  let closest = null;
  let minDiff = Infinity;
  
  for (const [noteName, noteData] of Object.entries(guitarNotes)) {
    const diff = Math.abs(frequency - noteData.freq);
    if (diff < minDiff) {
      minDiff = diff;
      closest = { ...noteData, noteName, diff };
    }
  }
  
  return closest;
}

// 表示更新
function updateDisplay(frequency, closestNote) {
  if (!closestNote) return;
  
  noteDisplay.textContent = closestNote.name;
  frequencyDisplay.textContent = `${frequency.toFixed(1)} Hz`;
  
  // セント計算（音程の細かな差）
  const centsDiff = 1200 * Math.log2(frequency / closestNote.freq);
  
  // メーター針の位置更新
  const meterPosition = Math.max(-50, Math.min(50, centsDiff * 2)); // -50セントから+50セントの範囲
  meterNeedle.style.transform = `translateX(calc(-50% + ${meterPosition}px)) translateY(-50%)`;
  
  // チューニング状態の判定
  const tolerance = 10; // セント
  Object.values(buttons).forEach(btn => btn.classList.remove('active'));
  
  if (Math.abs(centsDiff) < tolerance) {
    tuningStatus.textContent = `${closestNote.name}弦 - チューニング完了！`;
    tuningStatus.className = 'tuning-status in-tune';
    buttons[closestNote.noteName]?.classList.add('active');
  } else if (centsDiff > 0) {
    tuningStatus.textContent = `${closestNote.name}弦 - 高すぎます (${centsDiff.toFixed(0)}セント)`;
    tuningStatus.className = 'tuning-status sharp';
  } else {
    tuningStatus.textContent = `${closestNote.name}弦 - 低すぎます (${centsDiff.toFixed(0)}セント)`;
    tuningStatus.className = 'tuning-status flat';
  }
}

// ボタンイベントリスナー
document.getElementById('btnE').addEventListener('click', () => playSound('E'));
document.getElementById('btnA').addEventListener('click', () => playSound('A'));
document.getElementById('btnD').addEventListener('click', () => playSound('D'));
document.getElementById('btnG').addEventListener('click', () => playSound('G'));
document.getElementById('btnB').addEventListener('click', () => playSound('B'));
document.getElementById('btnHighE').addEventListener('click', () => playSound('HighE'));
