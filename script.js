const audioFiles = {
  E: 'audio/E.mp3',
  A: 'audio/A.mp3',
  D: 'audio/D.mp3',
  G: 'audio/G.mp3',
  B: 'audio/B.mp3',
  HighE: 'audio/HighE.mp3',
};

function playSound(note) {
  const audio = new Audio(audioFiles[note]);
  audio.play();
}

document.getElementById('btnE').addEventListener('click', () => playSound('E'));
document.getElementById('btnA').addEventListener('click', () => playSound('A'));
document.getElementById('btnD').addEventListener('click', () => playSound('D'));
document.getElementById('btnG').addEventListener('click', () => playSound('G'));
document.getElementById('btnB').addEventListener('click', () => playSound('B'));
document.getElementById('btnHighE').addEventListener('click', () => playSound('HighE'));
