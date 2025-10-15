import React, { useEffect, useState, useRef } from 'react';

// FocusBuddy — Single-file React component (default export)
// Usage: paste into a React project (e.g. Vite / Create React App) and render <FocusBuddy />
// Styling uses Tailwind CSS utility classes (no imports required here if your project already uses Tailwind).

export default function FocusBuddy() {
  const [phase, setPhase] = useState('idle'); // idle, grounding, focus, break
  const [duration, setDuration] = useState(20); // minutes for focus
  const [breakDuration, setBreakDuration] = useState(5); // minutes for break
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [task, setTask] = useState('');
  const [history, setHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('focusbuddy_history') || '[]');
    } catch { return []; }
  });
  const [checklist, setChecklist] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('focusbuddy_checklist') || '[]');
    } catch { return []; }
  });
  const timerRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('focusbuddy_history', JSON.stringify(history));
  }, [history]);
  useEffect(() => {
    localStorage.setItem('focusbuddy_checklist', JSON.stringify(checklist));
  }, [checklist]);

  useEffect(() => {
    if (phase === 'focus' || phase === 'break' || phase === 'grounding') {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setSecondsLeft(s => {
          if (s <= 1) {
            clearInterval(timerRef.current);
            beep();
            onTimerEnd();
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function startGrounding() {
    setPhase('grounding');
    setSecondsLeft(120); // 2 minutes
  }

  function startFocus() {
    if (!task.trim()) {
      alert('Write a short, clear task first (e.g. "Draft one paragraph").');
      return;
    }
    setPhase('focus');
    setSecondsLeft(duration * 60);
  }

  function startBreak() {
    setPhase('break');
    setSecondsLeft(breakDuration * 60);
  }

  function pauseTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
      setPhase(p => p + '_paused');
    }
  }

  function resumeTimer() {
    // if paused, resume same phase
    setPhase(p => {
      if (p.endsWith('_paused')) return p.replace('_paused', '');
      return p;
    });
  }

  function stopTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setPhase('idle');
    setSecondsLeft(0);
  }

  function onTimerEnd() {
    // log completed session if focus ended
    if (phase === 'focus') {
      const done = { task: task, minutes: duration, date: new Date().toISOString() };
      setHistory(h => [done, ...h].slice(0, 100));
    }
    // transition
    if (phase === 'grounding') {
      // after grounding, go to idle so user can start focus
      setPhase('idle');
    } else if (phase === 'focus') {
      setPhase('idle');
    } else if (phase === 'break') {
      setPhase('idle');
    }
  }

  function beep() {
    if (!audioRef.current) return;
    try { audioRef.current.currentTime = 0; audioRef.current.play(); } catch {}
  }

  function addChecklistItem(text) {
    if (!text.trim()) return;
    setChecklist(c => [{ id: Date.now(), text, done: false }, ...c]);
  }

  function toggleChecklist(id) {
    setChecklist(c => c.map(i => i.id === id ? { ...i, done: !i.done } : i));
  }

  function removeChecklist(id) {
    setChecklist(c => c.filter(i => i.id !== id));
  }

  function formatTime(s) {
    const mm = Math.floor(s/60).toString().padStart(2,'0');
    const ss = (s%60).toString().padStart(2,'0');
    return `${mm}:${ss}`;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 p-6 flex items-start justify-center">
      <audio ref={audioRef} src={null} />
      <div className="max-w-3xl w-full bg-white shadow-xl rounded-2xl p-6 grid gap-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">FocusBuddy</h1>
          <div className="text-sm text-slate-500">Simple, kind, and flexible focus tool</div>
        </header>

        {/* Task & Controls */}
        <section className="grid gap-3 sm:grid-cols-3 sm:items-end">
          <div className="sm:col-span-2">
            <label className="block text-xs text-slate-600">Today's Task (short & specific)</label>
            <input
              value={task}
              onChange={e => setTask(e.target.value)}
              className="mt-1 w-full border rounded-lg p-2"
              placeholder="e.g. Draft 1 paragraph for report"
            />
          </div>

          <div className="flex gap-2">
            <div>
              <label className="block text-xs text-slate-600">Focus (min)</label>
              <input type="number" min={5} max={120} value={duration} onChange={e => setDuration(Number(e.target.value))}
                className="mt-1 w-20 border rounded-lg p-2 text-center" />
            </div>
            <div>
              <label className="block text-xs text-slate-600">Break (min)</label>
              <input type="number" min={1} max={60} value={breakDuration} onChange={e => setBreakDuration(Number(e.target.value))}
                className="mt-1 w-20 border rounded-lg p-2 text-center" />
            </div>
          </div>
        </section>

        {/* Timer & Actions */}
        <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center p-4 bg-slate-50 rounded-2xl w-48">
              <div className="text-sm text-slate-500">Phase</div>
              <div className="text-lg font-medium">{phase.replace('_paused','')}</div>
              <div className="mt-2 text-2xl font-mono">{secondsLeft ? formatTime(secondsLeft) : '--:--'}</div>
            </div>

            <div className="flex flex-col gap-2">
              <button onClick={startGrounding} className="px-4 py-2 rounded-lg border">Ground (2m)</button>
              <div className="flex gap-2">
                <button onClick={startFocus} className="px-4 py-2 rounded-lg bg-emerald-500 text-white">Start Focus</button>
                <button onClick={startBreak} className="px-4 py-2 rounded-lg bg-sky-500 text-white">Quick Break</button>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={pauseTimer} className="px-4 py-2 rounded-lg border">Pause</button>
            <button onClick={resumeTimer} className="px-4 py-2 rounded-lg border">Resume</button>
            <button onClick={stopTimer} className="px-4 py-2 rounded-lg border">Stop</button>
          </div>
        </section>

        {/* Checklist + Grounding prompt */}
        <section className="grid sm:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-50 rounded-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Mini Checklist</h3>
              <button onClick={() => setChecklist([])} className="text-xs text-slate-500">Clear</button>
            </div>
            <Checklist
              items={checklist}
              onAdd={addChecklistItem}
              onToggle={toggleChecklist}
              onRemove={removeChecklist}
            />
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl">
            <h3 className="font-medium">Grounding Reminder</h3>
            <p className="mt-2 text-sm text-slate-500">If your focus drifts, try this short prompt:</p>
            <ol className="mt-2 list-decimal list-inside text-sm">
              <li>Stop and breathe 3 slow breaths.</li>
              <li>Name 3 things you can see, 2 you can touch, 1 you can hear.</li>
              <li>Return to the task for one more focused minute.</li>
            </ol>
          </div>
        </section>

        {/* History */}
        <section>
          <h3 className="font-medium">Recent Sessions</h3>
          <div className="mt-2 grid gap-2">
            {history.length === 0 && <div className="text-sm text-slate-500">No sessions yet — start a focus sprint to log progress.</div>}
            {history.map((h, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 rounded-lg border">
                <div>
                  <div className="text-sm font-medium">{h.task}</div>
                  <div className="text-xs text-slate-500">{new Date(h.date).toLocaleString()} · {h.minutes} min</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <footer className="text-xs text-slate-400">Made to be kind: small sprints, gentle resets. Save locally in your browser.</footer>
      </div>
    </div>
  );
}

function Checklist({ items, onAdd, onToggle, onRemove }) {
  const [text, setText] = useState('');
  return (
    <div>
      <div className="flex gap-2">
        <input value={text} onChange={e => setText(e.target.value)} className="flex-1 p-2 rounded-lg border" placeholder="Add quick item (e.g. Reply to Sam)" />
        <button onClick={() => { onAdd(text); setText(''); }} className="px-3 py-2 rounded-lg border">Add</button>
      </div>
      <div className="mt-3 space-y-2">
        {items.map(it => (
          <div key={it.id} className="flex items-center justify-between p-2 rounded-lg bg-white border">
            <div className="flex items-center gap-3">
              <input type="checkbox" checked={it.done} onChange={() => onToggle(it.id)} />
              <div className={`text-sm ${it.done ? 'line-through text-slate-400' : ''}`}>{it.text}</div>
            </div>
            <button onClick={() => onRemove(it.id)} className="text-xs text-red-500">Remove</button>
          </div>
        ))}
      </div>
    </div>
  );
}
