import React, { useEffect, useMemo, useRef, useState } from 'react';
import DOMPurify from 'dompurify';
import { Activity, ArrowDownRight, ArrowRight, ArrowUpRight, BookOpen, Brain, Check, ChevronDown, ChevronRight, Clock3, Command, FileText, Flame, Focus, GraduationCap, LayoutDashboard, Lightbulb, Menu, MessageCircle, MoreHorizontal, Plus, Search, Send, Settings2, Sparkles, Target, Trash2, Upload, X, Bell, UserRound, LogOut } from 'lucide-react';
import { API_BASE, api, getToken } from './api.js';
import ProfilePage from './ProfilePage.jsx';
import './learning.css';

const weeks = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const studyAids = [
  { icon: Brain, title: 'Mind map', sub: 'See how concepts connect', color: 'lavender', kind: 'Mind map' },
  { icon: FileText, title: 'Cheat sheet', sub: 'The essentials, at a glance', color: 'mint', kind: 'Cheat sheet' },
  { icon: Target, title: 'Key topics', sub: 'Focus on what matters most', color: 'peach', kind: 'Key topics' },
  { icon: Activity, title: 'Learning roadmap', sub: 'A clear path, step by step', color: 'blue', kind: 'Learning roadmap' },
];
const sampleTopics = ['How neural networks learn', 'The cell cycle, simply explained', 'JavaScript closures & scope', 'Introduction to game theory'];

const GUIDE_KINDS = {
  'Mind map': 'mind-map',
  'Cheat sheet': 'cheat-sheet',
  'Key topics': 'key-topics',
  'Learning roadmap': 'roadmap',
  'Build on what you know': 'examples',
  'Check your understanding': 'practice-questions',
};

function utcWeekStart(offset = 0) {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  // JS weeks start Sunday; we want Monday-first like the heatmap
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7) + offset * 7);
  return d;
}

function fmtMins(mins) {
  const total = Math.floor(mins);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}
function StudyTimeSummary({ dailyMinutes = {} }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const weekStart = utcWeekStart(weekOffset);
  const prevStart = utcWeekStart(weekOffset - 1);

  const daysFor = (start) => {
    const out = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setUTCDate(date.getUTCDate() + i);
      const key = date.toISOString().slice(0, 10);
      out.push({
        key,
        label: weeks[i],
        minutes: Number(dailyMinutes[key]) || 0,
        dateLabel: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' }),
      });
    }
    return out;
  };

  const days = daysFor(weekStart);
  const prevDays = daysFor(prevStart);
  let totalMinutes = 0;
  let prevTotal = 0;
  for (const d of days) totalMinutes += d.minutes;
  for (const d of prevDays) prevTotal += d.minutes;

  let peak = 0;
  for (const d of days) if (d.minutes > peak) peak = d.minutes;
  const axisHours = Math.max(4, Math.ceil(peak / 120) * 2);
  const change = prevTotal ? Math.round(((totalMinutes - prevTotal) / prevTotal) * 100) : null;
  const rangeLabel = weekOffset === 0 ? 'This Week' : weekOffset === -1 ? 'Last Week' : `${Math.abs(weekOffset)} Weeks Ago`;
  const trendLabel = change === null ? (totalMinutes ? 'New this week' : 'No change') : `${Math.abs(change)}%`;
  return <section className="study-time-card" aria-label="Study time summary">
    <div className="study-time-heading"><div className="study-time-title"><span className="study-time-icon"><Clock3 size={19} /></span><h2>Study Time Summary</h2></div><label className="study-range-label"><span className="sr-only">Choose study week</span><select value={weekOffset} onChange={event => setWeekOffset(Number(event.target.value))}><option value={0}>This Week</option><option value={-1}>Last Week</option><option value={-2}>2 Weeks Ago</option><option value={-3}>3 Weeks Ago</option></select><ChevronDown size={13} /></label></div>
    <div className="study-time-total"><strong>{fmtMins(totalMinutes)}</strong><div className={`study-time-trend ${change < 0 ? 'trend-down' : ''}`}><span>{change === null ? <Activity size={14} /> : change < 0 ? <ArrowDownRight size={15} /> : <ArrowUpRight size={15} />}{trendLabel}</span><small>vs. previous week</small></div></div>
    <div className="study-time-caption">Total study time</div>
    <div className="study-chart" role="group" aria-label={`${rangeLabel}: ${fmtMins(totalMinutes)} total study time`}>
      <div className="study-chart-axis"><span>{axisHours}h</span><span>{axisHours / 2}h</span><span>0h</span></div>
      <div className="study-chart-area"><div className="study-chart-grid"><i /><i /><i /></div><div className="study-chart-bars">{days.map(day => <div className="study-bar-column" key={day.key}><div className="study-bar-space"><button type="button" className={`study-bar ${day.minutes ? 'has-time' : ''}`} title={`${day.label}, ${day.dateLabel}: ${fmtMins(day.minutes)}`} aria-label={`${day.label}, ${day.dateLabel}: ${fmtMins(day.minutes)} studied`}><span style={{ height: `${day.minutes ? Math.max(3, Math.min(100, day.minutes / (axisHours * 60) * 100)) : 0}%` }} /></button></div><span className="study-bar-label">{day.label}</span></div>)}</div></div>
    </div>
  </section>;
}
function App({ user, onSignOut }) {
  const [nav, setNav] = useState('Overview'), [query, setQuery] = useState(''), [subject, setSubject] = useState('Computer science'), [activeTopic, setActiveTopic] = useState('');
  const [uploaded, setUploaded] = useState([]), [courses, setCourses] = useState([]), [planner, setPlanner] = useState({ weeklyGoal: 5, dailyGoalMinutes: 25, days: [] }), [summary, setSummary] = useState({ studyDays: 0, totalMinutes: 0, totalSeconds: 0, currentStreak: 0, dailyMinutes: {} }), [studyGuide, setStudyGuide] = useState(''), [lessonPage, setLessonPage] = useState(null), [chatMessages, setChatMessages] = useState([]), [chatLoading, setChatLoading] = useState(false), [assistantMessages, setAssistantMessages] = useState([]), [assistantLoading, setAssistantLoading] = useState(false), [panel, setPanel] = useState(''), [toast, setToast] = useState(''), [mobileMenu, setMobileMenu] = useState(false), [searchOpen, setSearchOpen] = useState(false); const fileRef = useRef(null); const activeTopicRef = useRef(activeTopic); activeTopicRef.current = activeTopic;
  const todayKey = new Date().toISOString().slice(0, 10); const todayStudied = !!summary.dailyMinutes?.[todayKey]; const total = summary.studyDays; const studyMins = summary.totalMinutes; const currentTopic = activeTopic || courses[0]?.title || 'Choose a topic to get started';
  const showToast = (s) => { setToast(s); setTimeout(() => setToast(''), 2800) };

  const reload = async () => {
    const [nextCourses, nextNotes, nextSummary, nextPlanner] = await Promise.all([
      api('/courses'), api('/notes'), api('/study/summary'), api('/planner'),
    ]);
    setCourses(nextCourses);
    const notes = [];
    for (const n of nextNotes) notes.push({ ...n, size: (n.size / 1024).toFixed(0) + ' KB' });
    setUploaded(notes);
    setSummary(nextSummary);
    setPlanner(nextPlanner);
    if (nextCourses.length && !activeTopic) setActiveTopic(nextCourses[0].title);
  };
  useEffect(() => { reload().catch(e => showToast(e.message)) }, []);
  useEffect(() => {
    const IDLE_MS = 5 * 60 * 1000;
    const FLUSH_AT = 30 * 1000; // don't POST every tick
    let lastTick = Date.now(), lastActive = Date.now(), pendingMs = 0, sending = false;
    const updateLocalTotals = (seconds) => {
      const day = new Date().toISOString().slice(0, 10);
      setSummary(previous => {
        const todayBefore = previous.dailyMinutes?.[day] || 0;
        const dailyMinutes = { ...previous.dailyMinutes, [day]: todayBefore + seconds / 60 };
        const totalSeconds = (previous.totalSeconds ?? previous.totalMinutes * 60) + seconds;
        return { ...previous, totalSeconds, totalMinutes: Math.floor(totalSeconds / 60), studyDays: previous.studyDays + (todayBefore ? 0 : 1), currentStreak: todayBefore ? previous.currentStreak : Math.max(1, previous.currentStreak), dailyMinutes };
      });
    };
    const flush = async (onExit = false) => {
      if (sending && !onExit) return;
      const seconds = Math.floor(pendingMs / 1000);
      if (!seconds) return;
      pendingMs -= seconds * 1000;
      const payload = JSON.stringify({ seconds, topic: activeTopicRef.current || null });
      if (onExit) {
        // keepalive so the last chunk isn't dropped on tab close
        fetch(`${API_BASE}/study/sessions`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` }, body: payload, keepalive: true }).then(() => updateLocalTotals(seconds)).catch(() => { });
        return;
      }
      sending = true;
      try { await api('/study/sessions', { method: 'POST', body: { seconds, topic: activeTopicRef.current || null } }); updateLocalTotals(seconds) }
      catch { pendingMs += seconds * 1000 }
      finally { sending = false }
    };
    const markActivity = () => { lastActive = Date.now() };
    const measure = () => {
      const now = Date.now();
      const elapsed = Math.min(now - lastTick, 5000); // cap so a stalled tab doesn't dump minutes
      lastTick = now;
      if (document.visibilityState === 'visible' && now - lastActive <= IDLE_MS) pendingMs += elapsed;
      if (pendingMs >= FLUSH_AT) flush();
    };
    const onVisibility = () => { if (document.visibilityState === 'visible') lastActive = Date.now(); else flush() };
    const onPageHide = () => { measure(); flush(true) };
    const timer = setInterval(measure, 1000);
    const activityEvents = ['pointerdown', 'pointermove', 'keydown', 'scroll', 'touchstart'];
    activityEvents.forEach(event => window.addEventListener(event, markActivity, { passive: true }));
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    return () => { clearInterval(timer); measure(); flush(true); activityEvents.forEach(event => window.removeEventListener(event, markActivity)); document.removeEventListener('visibilitychange', onVisibility); window.removeEventListener('pagehide', onPageHide) };
  }, []);
  const startLesson = async (value = query) => {
    const clean = value.trim();
    if (!clean) return;
    setQuery('');
    setActiveTopic(clean);
    setChatMessages([]);
    setLessonPage({ title: clean, topic: clean, kind: 'lesson', content: '', loading: true, source: '' });
    try {
      let course = courses.find(c => c.title.toLowerCase() === clean.toLowerCase());
      if (!course) {
        course = await api('/courses', { method: 'POST', body: { title: clean, subject } });
        setCourses(prev => [course, ...prev]);
      }
      const result = await api('/ai/study-guide', { method: 'POST', body: { topic: clean, kind: 'lesson' } });
      setLessonPage({ title: clean, topic: clean, kind: 'lesson', content: result.content, loading: false, source: '' });
    } catch (e) {
      setLessonPage({ title: clean, topic: clean, kind: 'lesson', content: '', loading: false, error: e.message, source: '' });
    }
  };

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) {
      e.target.value = '';
      return;
    }
    const body = new FormData();
    for (const f of files.slice(0, 5)) body.append('files', f);
    try {
      await api('/notes', { method: 'POST', body });
      await reload();
      showToast(`${files.length} note${files.length > 1 ? 's' : ''} added to your library`);
    } catch (err) {
      showToast(err.message);
    }
    e.target.value = '';
  };

  const generateGuide = async (kind) => {
    const topic = activeTopic || currentTopic;
    const title = `${kind} · ${topic}`;
    setPanel('');
    setChatMessages([]);
    setLessonPage({ title, topic, kind, content: '', loading: true, source: '' });
    try {
      const result = await api('/ai/study-guide', { method: 'POST', body: { topic, kind: GUIDE_KINDS[kind] || 'lesson' } });
      setLessonPage({ title, topic, kind, content: result.content, loading: false, source: '' });
    } catch (e) {
      setLessonPage({ title, topic, kind, content: '', loading: false, error: e.message, source: '' });
    }
  };
  const startFocusSession = () => { setPanel(''); setLessonPage({ title: '25 minute focus session', topic: activeTopic || currentTopic, kind: 'focus-session' }) };
  const studyNote = async (note) => { setActiveTopic(note.name); setChatMessages([]); setLessonPage({ title: note.name, topic: note.name, noteId: note.id, kind: 'note-lesson', content: '', loading: true, source: note.name }); try { const result = await api(`/notes/${note.id}/study-guide`, { method: 'POST' }); setLessonPage({ title: note.name, topic: note.name, noteId: note.id, kind: 'note-lesson', content: result.content, loading: false, source: note.name }) } catch (error) { setLessonPage({ title: note.name, topic: note.name, noteId: note.id, kind: 'note-lesson', content: '', loading: false, error: error.message, source: note.name }) } };
  const askStudyQuestion = async (question) => { const clean = question.trim(); if (!clean || !lessonPage || chatLoading) return; const next = [...chatMessages, { role: 'user', content: clean }]; setChatMessages(next); setChatLoading(true); try { const result = await api('/ai/ask', { method: 'POST', body: { topic: lessonPage.topic || lessonPage.title, noteId: lessonPage.noteId || undefined, messages: next.slice(-12) } }); setChatMessages([...next, { role: 'assistant', content: result.answer }]) } catch (error) { setChatMessages([...next, { role: 'assistant', content: `I couldn’t get an answer just now: ${error.message}` }]) } finally { setChatLoading(false) } };
  const askWorkspaceAssistant = async (question) => { const clean = question.trim(); if (!clean || assistantLoading) return; const next = [...assistantMessages, { role: 'user', content: clean }]; setAssistantMessages(next); setAssistantLoading(true); try { const result = await api('/ai/chat', { method: 'POST', body: { messages: next.slice(-16) } }); setAssistantMessages([...next, { role: 'assistant', content: result.answer }]) } catch (error) { setAssistantMessages([...next, { role: 'assistant', content: `I couldn’t get an answer just now: ${error.message}` }]) } finally { setAssistantLoading(false) } };
  const togglePlannerDay = async (day) => { const days = planner.days.includes(day) ? planner.days.filter(item => item !== day) : [...planner.days, day]; const next = { ...planner, days }; setPlanner(next); try { setPlanner(await api('/planner', { method: 'PUT', body: next })) } catch (error) { showToast(error.message) } };
  const savePlannerSettings = async (updates) => { const next = { ...planner, ...updates }; setPlanner(next); try { setPlanner(await api('/planner', { method: 'PUT', body: next })); showToast('Study settings saved') } catch (error) { showToast(error.message); throw error } };
  const deleteCourse = async (course) => { try { await api(`/courses/${course.id}`, { method: 'DELETE' }); const remaining = courses.filter(item => item.id !== course.id); setCourses(remaining); if (activeTopic === course.title) setActiveTopic(remaining[0]?.title || ''); showToast(`“${course.title}” removed from My learning`) } catch (error) { showToast(error.message) } };
  const calendar = useMemo(() => {
    const today = new Date(); today.setUTCHours(0, 0, 0, 0);
    const firstMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 5, 1));
    const gridStart = new Date(firstMonth); gridStart.setUTCDate(gridStart.getUTCDate() - ((gridStart.getUTCDay() + 6) % 7));
    const gridEnd = new Date(today); gridEnd.setUTCDate(gridEnd.getUTCDate() + (6 - ((gridEnd.getUTCDay() + 6) % 7)));
    const firstKey = firstMonth.toISOString().slice(0, 10);
    const lastKey = today.toISOString().slice(0, 10);
    const cells = [];
    // pad to Mon–Sun so the heatmap lines up with month labels
    for (const date = new Date(gridStart); date <= gridEnd; date.setUTCDate(date.getUTCDate() + 1)) {
      const key = date.toISOString().slice(0, 10);
      cells.push({ key, inRange: key >= firstKey && key <= lastKey });
    }
    const monthLabels = Array.from({ length: 6 }, (_, index) => {
      const monthDate = new Date(Date.UTC(firstMonth.getUTCFullYear(), firstMonth.getUTCMonth() + index, 1));
      const weekIndex = Math.floor((monthDate - gridStart) / (7 * 24 * 60 * 60 * 1000));
      return { label: monthDate.toLocaleDateString(undefined, { month: 'short', timeZone: 'UTC' }), weekIndex };
    });
    return { weeks: Array.from({ length: cells.length / 7 }, (_, index) => cells.slice(index * 7, index * 7 + 7)), monthLabels };
  }, []);
  return <div className="app-shell">
    <aside className={`sidebar ${mobileMenu ? 'mobile-open' : ''}`}>
      <div className="brand"><div className="brand-mark"><Sparkles size={17} /></div><span>streak<span className="brand-light">labs</span></span></div>
      <div className="workspace-label">YOUR WORKSPACE <ChevronDown size={13} /></div>
      <nav className="main-nav">{[{ label: 'Overview', icon: LayoutDashboard }, { label: 'AI Assistant', icon: MessageCircle }, { label: 'My learning', icon: BookOpen }, { label: 'Notes library', icon: FileText }, { label: 'Study planner', icon: Target }].map(({ label, icon: Icon }) => <button className={`nav-item ${nav === label ? 'selected' : ''}`} onClick={() => { setNav(label); setMobileMenu(false) }} key={label}><Icon size={17} /><span>{label}</span>{label === 'Notes library' && uploaded.length > 0 && <span className="nav-count">{uploaded.length}</span>}</button>)}</nav>
      <div className="side-section-head"><span>RECENT TOPICS</span><button onClick={() => document.querySelector('.topic-input')?.focus()}><Plus size={14} /></button></div>
      <div className="recent-list">{(courses.length ? courses.slice(0, 3).map(course => course.title) : sampleTopics.slice(0, 3)).map((t, i) => <button key={t} className={`recent-item ${activeTopic === t ? 'recent-active' : ''}`} onClick={() => startLesson(t)}><span className={`recent-dot dot-${i}`}></span><span>{t}</span></button>)}</div>
      <div className="sidebar-bottom"><button className={`nav-item ${nav === 'Settings' ? 'selected' : ''}`} onClick={() => { setLessonPage(null); setNav('Settings'); setMobileMenu(false) }}><Settings2 size={17} /><span>Settings</span></button><div className="profile"><button className="avatar profile-avatar-button" onClick={() => { setLessonPage(null); setNav('My profile') }} aria-label="Open your profile">{(user.user_metadata?.full_name || user.email || 'S').slice(0, 1).toUpperCase()}</button><button className="profile-info profile-open-button" onClick={() => { setLessonPage(null); setNav('My profile') }}><strong>{user.user_metadata?.full_name || user.email}</strong><span>My profile</span></button><button className="signout-button" onClick={onSignOut}>Sign out</button></div></div>
    </aside>
    <main className="main-content"><header className="topbar"><button className="menu-button" onClick={() => setMobileMenu(!mobileMenu)}><Menu size={20} /></button><div className="crumb">Workspace <ChevronRight size={13} /> <strong>{lessonPage ? 'Study session' : nav}</strong></div><div className="top-actions"><div className="streak-pill"><Flame size={15} fill="#ff9e54" stroke="#ff9e54" /><span>{summary.currentStreak} day streak</span></div><button className="icon-button" aria-label="Search topic history" title="Search topic history" onClick={() => setSearchOpen(true)}><Search size={18} /></button><button className="avatar avatar-small profile-avatar-button" title="Open your profile" aria-label="Open your profile" onClick={() => { setLessonPage(null); setNav('My profile') }}>{(user.user_metadata?.full_name || user.email || 'S').slice(0, 1).toUpperCase()}</button></div></header>
      {lessonPage ? <LessonPage lesson={lessonPage} messages={chatMessages} chatLoading={chatLoading} onAsk={askStudyQuestion} onBack={() => setLessonPage(null)} onStartFocus={startFocusSession} /> : nav === 'My profile' ? <ProfilePage user={user} onBack={() => setNav('Overview')} /> : nav === 'Settings' ? <SettingsPage user={user} planner={planner} onSavePlanner={savePlannerSettings} onSignOut={onSignOut} onBack={() => setNav('Overview')} /> : nav === 'AI Assistant' ? <AssistantPage messages={assistantMessages} loading={assistantLoading} onAsk={askWorkspaceAssistant} onClear={() => setAssistantMessages([])} /> : nav === 'Overview' ? <div className="content-wrap"><section className="welcome-row"><div><div className="eyebrow">TUESDAY, OCTOBER 6 <span className="eyebrow-dot">·</span> YOUR LEARNING SPACE</div><h1>Make today <span>count.</span></h1><p className="welcome-sub">A little progress each day adds up to big things.</p></div><button className="focus-button" onClick={() => { setStudyGuide(''); setPanel('focus') }}><Focus size={16} /> Focus mode</button></section>
        <section className="hero-card"><div className="hero-copy"><div className="hero-kicker"><Sparkles size={14} /> YOUR PERSONAL AI TUTOR</div><h2>What do you want to<br /><span>learn today?</span></h2><p>Explore a new subject or pick up right where you left off.</p><div className="learn-search"><Search size={18} /><input className="topic-input" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && startLesson()} placeholder="Try “How do neural networks work?”" /><button onClick={() => startLesson()} aria-label="Start learning"><ArrowRight size={17} /></button></div><div className="suggestions"><span>TRY</span>{['Quantum physics', 'Personal finance', 'The Roman Empire'].map(t => <button key={t} onClick={() => { setQuery(t); startLesson(t) }}>{t}</button>)}</div></div><div className="hero-art"><div className="art-orbit orbit-one"></div><div className="art-orbit orbit-two"></div><div className="art-spark spark-one">✳</div><div className="art-spark spark-two">✦</div><div className="art-card card-back"><span className="art-card-icon"><Brain size={17} /></span><span>NEURAL NETWORKS</span><i></i><i></i><i></i></div><div className="art-node node-a"></div><div className="art-node node-b"></div><div className="art-node node-c"></div><div className="art-center"><div className="center-glow"></div><Sparkles size={33} /></div><div className="art-card card-front"><div className="mini-icon"><Lightbulb size={14} /></div><div><strong>New ideas</strong><span>waiting to click</span></div><ArrowUpRight size={15} /></div></div></section>
        <div className="section-heading"><div><h2>Pick up where you left off</h2><p>Your learning journey is in motion.</p></div><button className="text-link" onClick={() => setNav('My learning')}>View all <ArrowRight size={15} /></button></div>
        <section className="continue-card"><div className="course-icon"><Brain size={21} /></div><div className="course-info"><div className="course-tag">{courses[0]?.subject?.toUpperCase() || 'YOUR NEXT TOPIC'} <span>·</span> {courses[0] ? 'IN PROGRESS' : 'READY WHEN YOU ARE'}</div><h3>{currentTopic}</h3><div className="progress-track"><span style={{ width: `${courses[0]?.progress || 0}%` }}></span></div><div className="progress-label"><span>{courses[0] ? 'Continue your lesson' : 'Start by entering a topic above'}</span><span>{courses[0]?.progress || 0}% complete</span></div></div><button className="continue-button" onClick={() => courses[0] ? startLesson(currentTopic) : document.querySelector('.topic-input')?.focus()}>{courses[0] ? 'Continue' : 'Choose a topic'} <ArrowRight size={15} /></button><div className="course-decoration">03</div></section>
        <div className="lower-grid"><section className="streak-card"><div className="card-heading"><div><h2>Your consistency</h2><p>Small steps make a big difference.</p></div><button className="period-button">Last 6 months <ChevronDown size={13} /></button></div><div className="streak-stats"><div><span className="stat-num">{total}</span><span className="stat-label">STUDY DAYS</span></div><div><span className="stat-num">{Math.floor(studyMins / 60)}h {studyMins % 60}m</span><span className="stat-label">TOTAL LEARNING</span></div><div><span className="stat-num">{summary.currentStreak} <span className="stat-unit">days</span></span><span className="stat-label">CURRENT STREAK</span></div></div><div className="heatmap-wrap"><div className="month-labels" style={{ '--heatmap-week-count': calendar.weeks.length }}>{calendar.monthLabels.map(({ label, weekIndex }, index) => <span key={index} style={{ gridColumn: `${weekIndex + 1} / span 3` }}>{label}</span>)}</div><div className="heatmap-body"><div className="weekday-labels">{weeks.map((day, index) => <span key={day}>{index % 2 === 0 ? day : ''}</span>)}</div><div className="heatmap" style={{ '--heatmap-week-count': calendar.weeks.length }}>{calendar.weeks.map((week, weekIndex) => <div className="heat-week" key={weekIndex}>{week.map((day, dayIndex) => { const minutes = Number(summary.dailyMinutes?.[day.key]) || 0; const level = minutes ? minutes < 36 ? 1 : minutes < 60 ? 2 : minutes < 96 ? 3 : 4 : 0; return <button key={dayIndex} type="button" disabled={!day.inRange} title={day.inRange ? day.key + ': ' + (minutes ? fmtTracked(minutes) : 'No active study time recorded') : ''} className={['heat-cell', level ? 'level-' + level : '', day.key === todayKey ? 'today-cell' : '', day.inRange ? '' : 'heat-outside'].filter(Boolean).join(' ')} aria-label={day.inRange ? day.key + ': ' + fmtTracked(minutes) + ' active study time' : undefined} />; })}</div>)}</div></div></div><div className="heatmap-legend"><span>Less</span>{[0, 1, 2, 3, 4].map(x => <i key={x} className={x ? `level-${x}` : ''}></i>)}<span>More</span><span className="legend-tip">{todayStudied ? 'Today is in the books. Keep it up.' : 'Time tracks automatically while the site is visible and active'}</span></div></section>
          <section className="right-column"><StudyTimeSummary dailyMinutes={summary.dailyMinutes} /></section></div>
        <section className="study-aids"><div className="section-heading aids-heading"><div><h2>Study smarter</h2><p>Generate learning guides for your current topic.</p></div><button className="text-link" onClick={() => document.querySelector('.topic-input')?.focus()}>Choose a topic <ArrowRight size={15} /></button></div><div className="aid-grid">{studyAids.map(({ icon: Icon, title, sub, color, kind }) => <button key={title} className="aid-card" onClick={() => generateGuide(kind)}><div className={`aid-icon ${color}`}><Icon size={19} /></div><div className="aid-text"><h3>{title}</h3><p>{sub}</p></div><ArrowUpRight size={16} className="aid-arrow" /></button>)}</div></section>
        <footer>Made for curious minds <span>✳</span><span className="footer-right"><Command size={13} /> Press <kbd>/</kbd> to search</span></footer></div> : <PageView page={nav} uploaded={uploaded} courses={courses} planner={planner} togglePlannerDay={togglePlannerDay} fileRef={fileRef} handleFiles={handleFiles} activeTopic={activeTopic} setActiveTopic={setActiveTopic} setPanel={setPanel} setNav={setNav} showToast={showToast} onOpenTopic={startLesson} onStudyNote={studyNote} onDeleteCourse={deleteCourse} />}</main>
    {panel && <div className="modal-backdrop" onClick={() => setPanel('')}><section className="study-modal" onClick={e => e.stopPropagation()}><button className="modal-close" onClick={() => setPanel('')}><X size={18} /></button><div className="modal-kicker"><Sparkles size={14} /> {panel === 'focus' ? 'FOCUS MODE' : panel === 'lesson' ? 'YOUR LEARNING SPACE' : panel.toUpperCase()}</div><h2>{panel === 'focus' ? 'One thing at a time.' : panel === 'lesson' ? currentTopic : `${panel} for ${currentTopic}`}</h2>{studyGuide ? <pre className="guide-content">{studyGuide}</pre> : <p>{panel === 'focus' ? 'Choose how you want to spend this study session.' : 'Your study guide will appear here when AI is configured on the backend.'}</p>}<div className="modal-outline"><button type="button" className="focus-option" onClick={startFocusSession}><span className="outline-icon"><BookOpen size={17} /></span><span><strong>25 minute focus session</strong><small>A short, distraction-free study block</small></span><ChevronRight size={17} /></button><button type="button" className="focus-option" onClick={() => generateGuide('Build on what you know')}><span className="outline-icon"><Lightbulb size={17} /></span><span><strong>Build on what you know</strong><small>Examples and connections that make it stick</small></span><ChevronRight size={17} /></button><button type="button" className="focus-option" onClick={() => generateGuide('Check your understanding')}><span className="outline-icon"><Target size={17} /></span><span><strong>Check your understanding</strong><small>Practice questions, at your own pace</small></span><ChevronRight size={17} /></button></div><button className="modal-primary" onClick={() => { setPanel(''); startFocusSession() }}>Start a 25-minute focus session <ArrowRight size={16} /></button><div className="modal-meta"><Clock3 size={13} /> Learn at your own pace · progress is stored by the backend</div></section></div>}
    {searchOpen && <TopicSearchDialog courses={courses} onClose={() => setSearchOpen(false)} onSelect={topic => { setSearchOpen(false); startLesson(topic) }} />}
    {toast && <div className="toast"><Check size={15} />{toast}</div>}
  </div>
}
function TopicSearchDialog({ courses, onClose, onSelect }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); const onKeyDown = event => { if (event.key === 'Escape') onClose() }; window.addEventListener('keydown', onKeyDown); return () => window.removeEventListener('keydown', onKeyDown) }, []);
  const matchingCourses = courses.filter(course => course.title.toLowerCase().includes(query.trim().toLowerCase()));
  return <div className="topic-search-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}><section className="topic-search-dialog" role="dialog" aria-modal="true" aria-labelledby="topic-search-title"><div className="topic-search-input-row"><Search size={19} /><input ref={inputRef} value={query} onChange={event => setQuery(event.target.value)} placeholder="Search your learning history…" aria-label="Search saved learning topics" /><kbd>ESC</kbd><button type="button" onClick={onClose} aria-label="Close search"><X size={17} /></button></div><div className="topic-search-results"><h2 id="topic-search-title">{query.trim() ? 'Matching topics' : 'Your learning history'}</h2>{matchingCourses.length ? matchingCourses.slice(0, 8).map(course => <button className="topic-search-result" key={course.id} onClick={() => onSelect(course.title)}><span className="topic-search-result-icon"><BookOpen size={16} /></span><span><strong>{course.title}</strong><small>{course.subject || 'Saved topic'} · Continue learning</small></span><ArrowRight size={15} /></button>) : <div className="topic-search-empty">{query.trim() ? 'No saved topics match that search.' : 'Your studied topics will appear here.'}</div>}</div><div className="topic-search-hint">Search finds topics you have already started learning.</div></section></div>;
}
function PageView({ page, uploaded, courses, planner, togglePlannerDay, fileRef, handleFiles, activeTopic, setActiveTopic, setPanel, setNav, showToast, onOpenTopic, onStudyNote, onDeleteCourse }) {
  const openLesson = (topic) => { setActiveTopic(topic); onOpenTopic(topic) };
  return <div className="content-wrap page-view">
    <section className="page-intro"><div><div className="eyebrow">YOUR WORKSPACE <span className="eyebrow-dot">·</span> {page.toUpperCase()}</div><h1>{page === 'My learning' ? 'Your learning journey' : page === 'Notes library' ? 'Your notes, all in one place' : 'Make a plan that sticks.'}</h1><p className="welcome-sub">{page === 'My learning' ? 'Everything you’re learning, organized as you go.' : page === 'Notes library' ? 'Bring your own materials and turn them into a study session.' : 'A little structure makes it easier to show up every day.'}</p></div>{page === 'Study planner' && <button className="focus-button" onClick={() => setPanel('focus')}><Focus size={16} /> Start focus session</button>}</section>
    {page === 'My learning' && <><div className="page-toolbar"><div><h2>In progress</h2><p>Pick up right where you left off.</p></div><button className="primary-small" onClick={() => setNav('Overview')}><Plus size={15} /> Learn something new</button></div>{courses.length ? <div className="learning-list">{courses.map((course, i) => <article className="learning-row" key={course.id}><div className={`course-icon course-${i % 3}`}><Brain size={21} /></div><div className="learning-details"><div className="course-tag">{course.subject.toUpperCase()} <span>·</span> IN PROGRESS</div><h3>{course.title}</h3><div className="progress-track"><span style={{ width: `${course.progress}%` }} /></div><div className="progress-label"><span>Pick up where you left off</span><span>{course.progress}% complete</span></div></div><button className="continue-button" onClick={() => openLesson(course.title)}>Continue <ArrowRight size={15} /></button><button className="delete-topic-button" onClick={() => onDeleteCourse(course)} aria-label={`Delete ${course.title}`} title="Delete topic"><Trash2 size={15} /></button></article>)}</div> : <div className="empty-notes"><div className="empty-notes-icon"><BookOpen size={25} /></div><h3>Your learning journey starts with a topic</h3><p>Choose any subject from the overview and it will be saved here.</p><button className="primary-small" onClick={() => setNav('Overview')}><Plus size={14} /> Choose a topic</button></div>}<div className="page-tip"><Sparkles size={17} /><div><strong>Curious about something new?</strong><span>Type any topic and your personal study space is ready in seconds.</span></div><button className="text-link" onClick={() => setNav('Overview')}>Explore topics <ArrowRight size={14} /></button></div></>}
    {page === 'Notes library' && <><div className="notes-library-banner"><div className="notes-banner-icon"><Upload size={20} /></div><div><h2>Study from your own materials</h2><p>Upload class notes, readings, or handouts to keep everything together.</p></div><button className="primary-small" onClick={() => fileRef.current?.click()}><Upload size={14} /> Upload notes</button></div><input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt,.md" multiple hidden onChange={handleFiles} /><div className="page-toolbar notes-toolbar"><div><h2>Uploaded files <span className="count-badge">{uploaded.length}</span></h2><p>Your study materials.</p></div><button className="filter-button"><FileText size={14} /> All files <ChevronDown size={13} /></button></div>{uploaded.length ? <div className="library-files">{uploaded.map((f, i) => <div className="library-file" key={`${f.id || f.name}-${i}`}><div className="file-badge"><FileText size={16} /></div><div className="library-file-name"><strong>{f.name}</strong><span>{f.size} · Added to your library</span></div><button className="continue-button" onClick={() => onStudyNote(f)}>Study from this <ArrowRight size={14} /></button></div>)}</div> : <div className="empty-notes"><div className="empty-notes-icon"><FileText size={25} /></div><h3>Your notes will live here</h3><p>Upload a file to start building study guides from your own materials.</p><button className="primary-small" onClick={() => fileRef.current?.click()}><Upload size={14} /> Choose a file</button><small>PDF, DOCX, TXT or Markdown · up to 20 MB</small></div>}</>}
    {page === 'Study planner' && <><div className="planner-grid"><section className="planner-card"><div className="planner-card-head"><div><div className="today-eyebrow">YOUR WEEKLY STUDY PLAN</div><h2>Your weekly plan</h2></div><button className="filter-button">This week <ChevronDown size={13} /></button></div><p className="planner-description">Choose which days you plan to study. Your changes are saved.</p><div className="planner-days">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => <button key={d} className={`planner-day ${planner.days.includes(d) ? 'plan-done' : ''} ${i === new Date().getDay() % 7 ? 'plan-today' : ''}`} onClick={() => togglePlannerDay(d)}><span>{d}</span><i>{planner.days.includes(d) ? <Check size={15} /> : i === new Date().getDay() % 7 ? 'Today' : <Plus size={15} />}</i><small>{planner.days.includes(d) ? `${planner.dailyGoalMinutes} min` : i === new Date().getDay() % 7 ? 'Your next session' : 'Add session'}</small></button>)}</div><div className="weekly-progress"><div><span>Weekly goal</span><strong>{planner.days.length} of {planner.weeklyGoal} study days</strong></div><div className="progress-track"><span style={{ width: `${Math.min(100, planner.days.length / planner.weeklyGoal * 100)}%` }} /></div></div></section><section className="goal-card"><div className="goal-visual"><Target size={22} /></div><div className="today-eyebrow">YOUR DAILY GOAL</div><h2>{planner.dailyGoalMinutes} minutes</h2><p>One focused session a day is a great place to start.</p><button className="checkin-button" onClick={() => setPanel('focus')}>Start a focus session <ArrowRight size={15} /></button><div className="goal-foot"><Flame size={14} /> Keep your streak going</div></section></div><div className="planner-tip"><Clock3 size={17} /><div><strong>Small sessions add up.</strong><span>Choose a daily goal you can stick with, then make it a habit.</span></div><button className="text-link" onClick={() => setPanel('focus')}>Start today <ArrowRight size={14} /></button></div></>}
  </div>
}
function AssistantPage({ messages, loading, onAsk, onClear }) {
  const [question, setQuestion] = useState('');
  const submit = async (event) => { event.preventDefault(); if (!question.trim() || loading) return; const current = question; setQuestion(''); await onAsk(current) };
  const suggestions = ['Explain a difficult idea simply', 'Help me plan my week', 'Give me ideas for a project'];
  return <div className="content-wrap assistant-page"><header className="assistant-page-header"><div><div className="eyebrow">YOUR WORKSPACE <span className="eyebrow-dot">·</span> AI ASSISTANT</div><h1>What’s on your mind?</h1><p className="welcome-sub">Ask general questions, explore ideas, or get help with everyday tasks.</p></div>{messages.length > 0 && <button className="filter-button" onClick={onClear}>New conversation</button>}</header><section className={`assistant-chat-panel ${messages.length ? 'has-messages' : ''}`}><div className="assistant-conversation" aria-live="polite">{messages.length ? messages.map((message, index) => <article key={index} className={`assistant-message ${message.role === 'user' ? 'assistant-user-message' : 'assistant-ai-message'}`}><span>{message.role === 'user' ? 'You' : 'AI assistant'}</span><CleanAnswer text={message.content} /></article>) : <div className="assistant-welcome"><span className="assistant-welcome-icon"><Sparkles size={22} /></span><h2>How can I help?</h2><p>Ask me anything. You can keep asking follow-up questions in the same conversation.</p><div className="assistant-suggestions">{suggestions.map(item => <button key={item} onClick={() => onAsk(item)} disabled={loading}>{item}<ArrowRight size={14} /></button>)}</div></div>}{loading && <article className="assistant-message assistant-ai-message"><span>AI assistant</span><p className="typing-indicator">Thinking…</p></article>}</div><form className="assistant-input-form" onSubmit={submit}><textarea value={question} onChange={event => setQuestion(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submit(event) } }} placeholder="Ask anything…" rows="2" maxLength="4000" disabled={loading} /><button type="submit" aria-label="Send message" disabled={!question.trim() || loading}><Send size={17} /></button></form><small className="assistant-input-hint">General conversation · Enter to send · Shift + Enter for a new line</small></section></div>
}
function SettingsPage({ user, planner, onSavePlanner, onSignOut, onBack }) {
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState(planner.dailyGoalMinutes || 25);
  const [weeklyGoal, setWeeklyGoal] = useState(planner.weeklyGoal || 5);
  const [notificationState, setNotificationState] = useState(() => typeof Notification === 'undefined' ? 'unsupported' : Notification.permission);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  useEffect(() => { setDailyGoalMinutes(planner.dailyGoalMinutes || 25); setWeeklyGoal(planner.weeklyGoal || 5) }, [planner.dailyGoalMinutes, planner.weeklyGoal]);
  const save = async (event) => { event.preventDefault(); setSaving(true); setNotice(''); try { await onSavePlanner({ dailyGoalMinutes: Number(dailyGoalMinutes), weeklyGoal: Number(weeklyGoal) }); setNotice('Your study goals have been saved.') } catch { /* toast is shown by the app */ } finally { setSaving(false) } };
  const enableNotifications = async () => {
    if (!('Notification' in window)) {
      setNotificationState('unsupported');
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationState(permission);
    if (permission === 'granted') {
      new Notification('StreakLabs notifications enabled', { body: 'You can now receive browser notifications from this app.' });
    }
  };
  const sendTestNotification = () => { if (notificationState === 'granted') new Notification('StreakLabs test notification', { body: 'Browser notifications are working.' }) };
  return <div className="content-wrap settings-page">
    <button className="text-link profile-back" onClick={onBack}><ArrowRight size={15} className="back-arrow" /> Back to workspace</button>
    <header className="settings-heading"><span className="profile-page-icon"><Settings2 size={22} /></span><div><div className="eyebrow">YOUR WORKSPACE</div><h1>Settings</h1><p className="welcome-sub">Manage your study goals, notifications, and account.</p></div></header>
    <form className="settings-card" onSubmit={save}><div className="settings-section-title"><span className="settings-section-icon"><Target size={18} /></span><div><h2>Study goals</h2><p>These goals are also used by your Study Planner.</p></div></div><div className="settings-fields"><label>Daily study goal<select value={dailyGoalMinutes} onChange={event => setDailyGoalMinutes(event.target.value)}><option value="15">15 minutes</option><option value="25">25 minutes</option><option value="30">30 minutes</option><option value="45">45 minutes</option><option value="60">60 minutes</option><option value="90">90 minutes</option></select></label><label>Weekly study days<select value={weeklyGoal} onChange={event => setWeeklyGoal(event.target.value)}>{[1, 2, 3, 4, 5, 6, 7].map(days => <option value={days} key={days}>{days} {days === 1 ? 'day' : 'days'} per week</option>)}</select></label></div><div className="settings-footer"><span className="settings-saved" role="status">{notice}</span><button className="profile-save" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save study goals'}</button></div></form>
    <section className="settings-card"><div className="settings-section-title"><span className="settings-section-icon"><Bell size={18} /></span><div><h2>Browser notifications</h2><p>Allow StreakLabs to show notifications in this browser.</p></div></div><div className="settings-notification-row"><div><strong>Status</strong><span>{notificationState === 'unsupported' ? 'This browser does not support notifications.' : notificationState === 'granted' ? 'Notifications are allowed.' : notificationState === 'denied' ? 'Notifications are blocked in browser settings.' : 'Permission has not been requested.'}</span></div>{notificationState === 'granted' ? <button type="button" className="filter-button" onClick={sendTestNotification}>Send test</button> : notificationState !== 'unsupported' && notificationState !== 'denied' ? <button type="button" className="profile-save" onClick={enableNotifications}>Enable notifications</button> : null}</div></section>
    <section className="settings-card settings-account"><div className="settings-section-title"><span className="settings-section-icon"><UserRound size={18} /></span><div><h2>Account</h2><p>{user.email}</p></div></div><div className="settings-account-actions"><button type="button" className="filter-button" onClick={onBack}>Back to workspace</button><button type="button" className="settings-signout" onClick={onSignOut}><LogOut size={15} /> Sign out</button></div></section>
  </div>;
}
function fmtTracked(minutes) {
  const secs = Math.floor(minutes * 60);
  return secs < 60 ? `${secs} seconds` : `${Math.floor(secs / 60)} minutes`;
}

function prepMapMd(content, topic, kind) {
  let md = String(content || '').trim().replace(/^```(?:markdown|md)?\s*/i, '').replace(/\s*```$/, '');
  if (/^\s*#\s/m.test(md)) return md; // already a real markdown tree

  const lines = [];
  for (const raw of md.split(/\r?\n/)) {
    const line = raw.trim();
    if (line) lines.push(line);
  }

  if (kind === 'Learning roadmap') {
    const out = [`# ${topic}`];
    let stage = 0;
    for (const line of lines) {
      const clean = line.replace(/^(?:[-*+]\s+|\d+[.)]\s+)/, '');
      if (/^(?:stage\s+\d+|phase\s+\d+|\d+[.)])/i.test(clean)) {
        stage += 1;
        out.push(`## ${clean.replace(/^(?:\d+[.)]\s*)/, '')}`);
      } else if (clean) {
        if (!stage) {
          stage = 1;
          out.push('## Stage 1: Foundations');
        }
        out.push(`- ${clean}`);
      }
    }
    return out.join('\n');
  }

  const bullets = [];
  for (const line of lines) bullets.push(`- ${line.replace(/^(?:[-*+]\s+|\d+[.)]\s+)/, '')}`);
  return [`# ${topic}`, '## Main ideas', ...bullets].join('\n');
}

function scrubNode(node) {
  node.content = DOMPurify.sanitize(String(node.content || ''), {
    ALLOWED_TAGS: ['b', 'strong', 'i', 'em', 'code', 'span', 'del', 's', 'mark', 'sup', 'sub', 'br'],
    ALLOWED_ATTR: [],
  });
  if (node.children) {
    for (const child of node.children) scrubNode(child);
  }
  return node;
}
function InteractiveMarkmap({ markdown, topic, kind }) {
  const svgRef = useRef(null), markmapRef = useRef(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !markdown) return undefined;
    let cancelled = false, map = null, fitFrame = null;
    setError('');
    const render = async () => {
      try {
        const [{ Transformer }, { Markmap }] = await Promise.all([import('markmap-lib/no-plugins'), import('markmap-view')]);
        if (cancelled) return;
        const outline = prepMapMd(markdown, topic, kind);
        const root = scrubNode(new Transformer().transform(outline).root);
        const colors = ['#7048e8', '#2786bd', '#289875', '#d98a3d', '#bc5b88'];
        map = Markmap.create(svg, { autoFit: true, duration: 450, initialExpandLevel: 3, maxWidth: 280, spacingHorizontal: 100, spacingVertical: 16, color: node => colors[(node.state?.depth || 0) % colors.length], pan: true, zoom: true }, root);
        markmapRef.current = map;
        fitFrame = requestAnimationFrame(() => { if (!cancelled) map?.fit(); });
      } catch {
        if (!cancelled) setError('This map could not be displayed. Try generating it again.');
      }
    };
    render();
    return () => { cancelled = true; if (fitFrame !== null) cancelAnimationFrame(fitFrame); map?.destroy(); if (markmapRef.current === map) markmapRef.current = null; };
  }, [markdown, topic, kind]);
  return <div className="interactive-markmap">
    <div className="markmap-toolbar"><p>Click a branch to expand or collapse it. Drag to move; scroll to zoom.</p><button type="button" className="filter-button" onClick={() => markmapRef.current?.fit()}>Fit map</button></div>
    {error ? <div className="markmap-error">{error}</div> : <div className="markmap-viewport"><svg ref={svgRef} className="markmap-svg" role="img" aria-label={`${kind} for ${topic}`} /></div>}
  </div>;
}
function LessonPage({ lesson, messages, chatLoading, onAsk, onBack, onStartFocus }) {
  const [question, setQuestion] = useState('');
  const submitQuestion = async (e) => { e.preventDefault(); if (!question.trim() || chatLoading) return; const current = question; setQuestion(''); await onAsk(current) };
  if (lesson.kind === 'focus-session') return <FocusSessionPage lesson={lesson} onBack={onBack} />;
  return <div className="content-wrap lesson-page"><button className="text-link lesson-back" onClick={onBack}><ArrowRight size={15} className="back-arrow" /> Back to workspace</button><section className="lesson-heading"><div className="eyebrow"><Sparkles size={13} /> {lesson.source ? 'TEACHING FROM YOUR NOTE' : lesson.kind === 'lesson' ? 'YOUR PERSONAL AI LESSON' : String(lesson.kind).toUpperCase()}</div><h1>{lesson.title}</h1>{lesson.source && <p className="welcome-sub">This lesson is based on <strong>{lesson.source}</strong>.</p>}</section><article className={'lesson-content ' + (lesson.kind === 'Mind map' || lesson.kind === 'Learning roadmap' ? 'markmap-lesson' : '')}>{lesson.loading ? <div className="lesson-loading"><Sparkles size={20} /><h2>Building your lesson…</h2><p>Reading the material and preparing a clear explanation.</p></div> : lesson.error ? <div className="lesson-error"><h2>Couldn’t create this lesson</h2><p>{lesson.error}</p><small>Check that the note contains selectable text and try again.</small></div> : (lesson.kind === 'Mind map' || lesson.kind === 'Learning roadmap' ? <InteractiveMarkmap markdown={lesson.content} topic={lesson.topic || lesson.title} kind={lesson.kind} /> : <CleanAnswer text={lesson.content} />)}</article>{!lesson.loading && !lesson.error && <><div className="lesson-actions"><div><strong>Study time tracks automatically</strong><span>Time is counted while this page is visible and you’re active.</span></div><button className="modal-primary" onClick={onStartFocus}>Start a 25-minute focus session <ArrowRight size={16} /></button></div><section className="tutor-chat"><div className="tutor-chat-heading"><span className="tutor-chat-icon"><MessageCircle size={17} /></span><div><h2>Ask your AI tutor</h2><p>{lesson.source ? 'Answers will be based on this note.' : 'Ask follow-up questions about what you’re learning.'}</p></div></div>{messages.length > 0 && <div className="chat-messages" aria-live="polite">{messages.map((message, index) => <div key={index} className={`chat-message ${message.role === 'user' ? 'chat-user' : 'chat-assistant'}`}><span>{message.role === 'user' ? 'You' : 'Tutor'}</span><CleanAnswer text={message.content} /></div>)}{chatLoading && <div className="chat-message chat-assistant"><span>Tutor</span><p className="typing-indicator">Thinking…</p></div>}</div>}<form className="tutor-chat-form" onSubmit={submitQuestion}><textarea value={question} onChange={e => setQuestion(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitQuestion(e) } }} placeholder="Ask a question about this lesson…" rows="2" maxLength="1000" disabled={chatLoading} /><button type="submit" aria-label="Send question" disabled={!question.trim() || chatLoading}><Send size={16} /></button></form><small className="tutor-chat-hint">Press Enter to ask · Shift + Enter for a new line</small></section></>}</div>
}
function FocusSessionPage({ lesson, onBack }) {
  const [seconds, setSeconds] = useState(25 * 60), [running, setRunning] = useState(false);
  useEffect(() => { if (!running) return; const interval = setInterval(() => setSeconds(value => Math.max(0, value - 1)), 1000); const pauseWhenHidden = () => { if (document.visibilityState !== 'visible') setRunning(false) }; document.addEventListener('visibilitychange', pauseWhenHidden); return () => { clearInterval(interval); document.removeEventListener('visibilitychange', pauseWhenHidden) } }, [running]);
  useEffect(() => { if (seconds === 0) setRunning(false) }, [seconds]);
  const time = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  return <div className="content-wrap focus-session-page"><button className="text-link lesson-back" onClick={onBack}><ArrowRight size={15} className="back-arrow" /> Back to workspace</button><section className="focus-session-card"><div className="eyebrow"><Focus size={13} /> FOCUS MODE</div><h1>{seconds === 0 ? 'Focus session complete.' : 'One thing at a time.'}</h1><p className="welcome-sub">{seconds === 0 ? `You finished a focused session${lesson.topic ? ` on ${lesson.topic}` : ''}.` : `Settle in and focus on ${lesson.topic || 'your studies'}. Take it one step at a time.`}</p><div className={`focus-clock ${seconds === 0 ? 'focus-clock-done' : ''}`} aria-live="polite">{time}</div><div className="focus-session-caption">{seconds === 0 ? '25 minutes completed' : 'TIME REMAINING'}</div>{seconds > 0 ? <div className="focus-session-controls"><button className="modal-primary" onClick={() => setRunning(!running)}>{running ? 'Pause session' : seconds < 25 * 60 ? 'Resume session' : 'Start focus session'} <ArrowRight size={16} /></button><button className="focus-reset" onClick={() => { setRunning(false); setSeconds(25 * 60) }}>Reset timer</button></div> : <div className="focus-logged"><Check size={17} /> Your active study time has been recorded automatically.</div>}<div className="modal-meta"><Clock3 size={13} /> The streak matrix tracks active time on this website.</div></section></div>
}
function stripMd(value) {
  return value
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1$2')
    .replace(/~~(.*?)~~/g, '$1')
    .replace(/`+/g, '')
    .replace(/^\s*>\s?/, '')
    .trim();
}
function CleanAnswer({ text }) {
  // model still sneaks markdown through even when we tell it not to
  const lines = String(text || '').replace(/\r/g, '').split('\n');
  const blocks = [];
  let i = 0;
  const tableCells = line => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => stripMd(cell));
  while (i < lines.length) {
    const line = lines[i].trim(); if (!line || /^[-*_]{3,}$/.test(line)) { i++; continue }
    if (line.includes('|') && i + 1 < lines.length && /^\s*\|?\s*:?-{3,}/.test(lines[i + 1])) { const headers = tableCells(line); i += 2; const rows = []; while (i < lines.length && lines[i].includes('|')) { const cells = tableCells(lines[i]); rows.push(<div className="answer-table-row" key={`row-${i}`}>{cells.map((cell, index) => <span key={index}>{headers[index] ? <><strong>{headers[index]}:</strong> </> : null}{cell}</span>)}</div>); i++ } blocks.push(<div className="answer-table" key={`table-${i}`}>{rows}</div>); continue }
    const heading = line.match(/^#{1,6}\s+(.+)$/); if (heading) { blocks.push(<h3 key={`heading-${i}`}>{stripMd(heading[1])}</h3>); i++; continue }
    if (/^[-*+]\s+/.test(line)) { const items = []; while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) { items.push(<li key={`li-${i}`}>{stripMd(lines[i].replace(/^\s*[-*+]\s+/, ''))}</li>); i++ } blocks.push(<ul key={`ul-${i}`}>{items}</ul>); continue }
    if (/^\d+[.)]\s+/.test(line)) { const items = []; while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) { items.push(<li key={`li-${i}`}>{stripMd(lines[i].replace(/^\s*\d+[.)]\s+/, ''))}</li>); i++ } blocks.push(<ol key={`ol-${i}`}>{items}</ol>); continue }
    const paragraph = [stripMd(line)]; i++; while (i < lines.length && lines[i].trim() && !/^#{1,6}\s|^\s*[-*+]\s|^\s*\d+[.)]\s|^[-*_]{3,}$/.test(lines[i])) { paragraph.push(stripMd(lines[i].trim())); i++ } blocks.push(<p key={`p-${i}`}>{paragraph.join(' ')}</p>);
  }
  return <div className="clean-answer">{blocks}</div>
}
export default App;
