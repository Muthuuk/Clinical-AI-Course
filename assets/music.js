/* Clinical AI course: gentle background music for lessons.
   Generated live in the browser (Web Audio API): a slow, soft chord pad with a light
   shimmer and echo, so there are no audio files and no licensing to manage.
   Music.play() fades in, Music.pause() fades out, Music.setOn(bool) is the learner's switch. */
(function(){
  const KEY = 'cg:music';
  let on = true; try { const v = localStorage.getItem(KEY); if (v !== null) on = v === '1'; } catch(e){}
  let ctx = null, master = null, timer = null, playing = false, step = 0;
  const VOL = 0.05;
  // chord progression (Hz): Cmaj9, Am7, Fmaj7, G6 — calm and unresolved, loops every 32 seconds
  const N = f => 440*Math.pow(2, (f-69)/12);
  const CHORDS = [[48,55,64,71,74],[45,52,60,67,72],[41,48,57,64,69],[43,50,59,64,71]].map(c => c.map(N));
  const BAR = 8;

  function setup(){
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800; lp.Q.value = 0.3;
    // simple echo for space
    const delay = ctx.createDelay(2); delay.delayTime.value = 0.45; const fb = ctx.createGain(); fb.gain.value = 0.35; const wet = ctx.createGain(); wet.gain.value = 0.35;
    delay.connect(fb); fb.connect(delay); delay.connect(wet);
    lp.connect(master); lp.connect(delay); wet.connect(master); master.connect(ctx.destination);
    master._in = lp;
    return true;
  }
  function voice(freq, t, dur, type, level){
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq; o.detune.value = (Math.random()-0.5)*8;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(level, t + dur*0.35); g.gain.linearRampToValueAtTime(level*0.8, t + dur*0.7); g.gain.linearRampToValueAtTime(0, t + dur + 1.5);
    o.connect(g); g.connect(master._in); o.start(t); o.stop(t + dur + 1.6);
  }
  function bar(){
    if (!ctx || !playing) return;
    const t = ctx.currentTime + 0.05, ch = CHORDS[step % CHORDS.length];
    ch.forEach((f, i) => voice(f, t, BAR, i < 2 ? 'sine' : 'triangle', i < 2 ? 0.22 : 0.09));
    // a few soft bell notes drifting over the pad
    for (let k = 0; k < 3; k++){ const f = ch[2 + Math.floor(Math.random()*3)]*2; voice(f, t + 1 + k*2.3 + Math.random(), 1.2, 'sine', 0.05); }
    step++;
  }
  function fade(to, secs){ if (!master) return; const t = ctx.currentTime; master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value, t); master.gain.linearRampToValueAtTime(to, t + secs); }

  window.Music = {
    isOn: () => on,
    setOn(v){ on = !!v; try { localStorage.setItem(KEY, on ? '1' : '0'); } catch(e){} if (!on) this.pause(); },
    play(){
      if (!on) return;
      if (!ctx && !setup()) return;
      if (ctx.state === 'suspended') ctx.resume();
      if (playing) return; playing = true;
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) { /* still allowed: audio is not motion */ }
      fade(VOL, 2.5); bar(); clearInterval(timer); timer = setInterval(bar, BAR*1000);
    },
    pause(){ if (!playing) return; playing = false; clearInterval(timer); timer = null; fade(0, 1.5); }
  };
})();
