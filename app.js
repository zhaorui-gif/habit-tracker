/* ===== Storage ===== */
const STORAGE_KEY = 'energy_tracker_v2';

async function loadData() {
  if (currentUser && isSupabaseReady()) {
    try { return await dbLoadAll(); }
    catch (e) { console.error('云端加载失败:', e.message); }
  }
  return loadFromLocalStorage();
}

function saveData(data) {
  // 本地立即保存
  dbSaveLocal(data);
  // 云端异步同步（不阻塞 UI）
  if (currentUser && isSupabaseReady()) {
    dbSaveAll(data).catch(e => console.error('云端同步失败:', e.message));
  }
}

function getDefaultData() {
  const demoHabits = [
    { id: 'demo1', name: '早起 (7:00前)', icon: '🌅', category: '健康', energyValue: 15, frequency: ['mon','tue','wed','thu','fri','sat','sun'], timeOfDay: 'morning' },
    { id: 'demo2', name: '阅读30分钟', icon: '📖', category: '学习', energyValue: 10, frequency: ['mon','tue','wed','thu','fri','sat','sun'], timeOfDay: 'anytime' },
    { id: 'demo3', name: '运动锻炼', icon: '🏃', category: '健康', energyValue: 20, frequency: ['mon','tue','wed','thu','fri'], timeOfDay: 'afternoon' },
    { id: 'demo4', name: '冥想10分钟', icon: '🧘', category: '健康', energyValue: 8, frequency: ['mon','tue','wed','thu','fri','sat','sun'], timeOfDay: 'evening' },
    { id: 'demo5', name: '喝8杯水', icon: '💧', category: '健康', energyValue: 10, frequency: ['mon','tue','wed','thu','fri','sat','sun'], timeOfDay: 'anytime' },
    { id: 'demo6', name: '写日记', icon: '✍️', category: '生活', energyValue: 8, frequency: ['mon','tue','wed','thu','fri','sat','sun'], timeOfDay: 'evening' },
    { id: 'demo7', name: '学习新技能', icon: '💻', category: '学习', energyValue: 12, frequency: ['mon','tue','wed','thu','fri'], timeOfDay: 'anytime' },
    { id: 'demo8', name: '整理房间', icon: '🧹', category: '生活', energyValue: 10, frequency: ['sat','sun'], timeOfDay: 'anytime' },
  ];
  const demoRewards = [
    { id: 'demor1', name: '看一集剧', icon: '📺', energyCost: 30, description: '追一集喜欢的剧放松一下', createdAt: new Date().toISOString() },
    { id: 'demor2', name: '喝杯奶茶', icon: '🧋', energyCost: 25, description: '奖励自己一杯奶茶', createdAt: new Date().toISOString() },
    { id: 'demor3', name: '玩游戏1小时', icon: '🎮', energyCost: 50, description: '尽情享受游戏时光', createdAt: new Date().toISOString() },
    { id: 'demor4', name: '买个小礼物', icon: '🎁', energyCost: 80, description: '给自己买个小礼物', createdAt: new Date().toISOString() },
    { id: 'demor5', name: '睡个懒觉', icon: '💤', energyCost: 40, description: '周末睡到自然醒', createdAt: new Date().toISOString() },
    { id: 'demor6', name: '外出吃大餐', icon: '🍕', energyCost: 100, description: '去喜欢的餐厅大吃一顿', createdAt: new Date().toISOString() },
  ];
  return {
    habits: demoHabits,
    habitLogs: {},
    plans: [],
    rewards: demoRewards,
    redeemHistory: [],
    energyHistory: {},
    diaryEntries: {},
    createdAt: todayStr(),
    streakBest: 0
  };
}

function migrateData(data) {
  if (!data.habitLogs) data.habitLogs = {};
  if (!data.plans) data.plans = [];
  if (!data.rewards) data.rewards = [];
  if (!data.redeemHistory) data.redeemHistory = [];
  if (!data.energyHistory) data.energyHistory = {};
  if (!data.diaryEntries) data.diaryEntries = {};
  // migrate old string diary entries to {text, mood} format
  Object.keys(data.diaryEntries).forEach(k => {
    if (typeof data.diaryEntries[k] === 'string') {
      data.diaryEntries[k] = { text: data.diaryEntries[k], mood: 'smiling' };
    }
  });
  if (!data.streakBest) data.streakBest = 0;
  if (!data.totalHabits) data.totalHabits = 0; // deprecated, kept for migration
  return data;
}

/* ===== Helpers ===== */
function todayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

function formatFullDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.getFullYear() + '年' + (d.getMonth()+1) + '月' + d.getDate() + '日';
}

function getWeekdayLabel(n) { return ['日','一','二','三','四','五','六'][n]; }

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,6); }

/* ===== App State ===== */
let appData = null;
let currentCalendarView = 'week';
let selectedPlanDate = todayStr();
let isAuthMode = false; // true = 注册，false = 登录

/* ===== DOM ===== */
function $(sel) { return document.querySelector(sel); }
function $$(sel) { return document.querySelectorAll(sel); }

/* ===== Navigation ===== */
$$('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    const tab = item.dataset.tab;
    switchTab(tab);
  });
});

function switchTab(tab) {
  $$('.nav-item').forEach(n => n.classList.remove('active'));
  $$('.tab-content').forEach(c => c.classList.remove('active'));
  const navItem = document.querySelector(`.nav-item[data-tab="${tab}"]`);
  const content = document.getElementById('tab-' + tab);
  if (navItem) navItem.classList.add('active');
  if (content) content.classList.add('active');
  if (tab === 'today') renderToday();
  else if (tab === 'plans') { selectedPlanDate = todayStr(); renderPlans(); }
  else if (tab === 'rewards') renderRewards();
  else if (tab === 'profile') renderProfile();
}

/* ===== Greeting ===== */
function updateGreeting() {
  const h = new Date().getHours();
  let text;
  if (h < 6) text = '夜深了';
  else if (h < 9) text = '早上好';
  else if (h < 12) text = '上午好';
  else if (h < 14) text = '中午好';
  else if (h < 18) text = '下午好';
  else if (h < 21) text = '晚上好';
  else text = '夜深了';
  const el = $('#greetingText');
  if (el) el.textContent = text;
}

function updateDateText() {
  const d = new Date();
  const text = d.getFullYear() + '年' + (d.getMonth()+1) + '月' + d.getDate() + '日 星期' + getWeekdayLabel(d.getDay());
  const el = $('#dateText');
  if (el) el.textContent = text;
}

/* ===== Energy ===== */
function getTodayEnergyEarned() {
  const today = todayStr();
  let earned = 0;
  const logs = appData.habitLogs[today] || {};
  appData.habits.forEach(h => { if (logs[h.id]) earned += h.energyValue; });
  return earned;
}

function getTotalEnergyEarned() {
  let total = 0;
  Object.keys(appData.habitLogs).forEach(date => {
    const logs = appData.habitLogs[date] || {};
    appData.habits.forEach(h => { if (logs[h.id]) total += h.energyValue; });
  });
  return total;
}

function getTotalEnergySpent() {
  return appData.redeemHistory.reduce((sum, r) => sum + r.energyCost, 0);
}

function getCurrentEnergy() {
  return getTotalEnergyEarned() - getTotalEnergySpent();
}

function getTodayHabits() {
  const wdKey = ['sun','mon','tue','wed','thu','fri','sat'][new Date().getDay()];
  return appData.habits.filter(h => h.frequency.includes(wdKey));
}

function getHabitsForDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const wdKey = ['sun','mon','tue','wed','thu','fri','sat'][d.getDay()];
  return appData.habits.filter(h => h.frequency.includes(wdKey));
}

function getStreak() {
  let streak = 0;
  const d = new Date();
  while (true) {
    const ds = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    const logs = appData.habitLogs[ds] || {};
    const habits = getHabitsForDate(ds);
    if (habits.length === 0) { d.setDate(d.getDate()-1); continue; }
    const done = habits.filter(h => logs[h.id]).length;
    if (done < habits.length) break;
    streak++;
    d.setDate(d.getDate()-1);
  }
  return streak;
}

function updateEnergyHistory(dateStr) {
  const earned = getTotalEnergyEarned();
  const spent = getTotalEnergySpent();
  appData.energyHistory[dateStr] = { earned, spent, balance: earned - spent };
}

/* ===== Render: Today ===== */
function renderToday() {
  updateGreeting();
  updateDateText();
  updateHeaderEnergy();
  updateEnergyRing();
  updateStatsRow();
  renderTodayHabits();
  updateMoodDisplay();
}

function updateHeaderEnergy() {
  const el = $('#headerEnergyValue');
  if (el) el.textContent = getCurrentEnergy();
}

function updateEnergyRing() {
  const el = $('#energyRingValue');
  if (el) el.textContent = getCurrentEnergy();
  const ring = $('#energyRing');
  if (!ring) return;
  const c = 2 * Math.PI * 78;
  const MAX_ENERGY = 500; // 一圈 = 500 能量值
  const ratio = Math.min(getCurrentEnergy() / MAX_ENERGY, 1);
  ring.setAttribute('stroke-dasharray', c);
  ring.setAttribute('stroke-dashoffset', c * (1 - ratio));
}

function updateStatsRow() {
  const today = todayStr();
  const todayHabits = getTodayHabits();
  const logs = appData.habitLogs[today] || {};
  const done = todayHabits.filter(h => logs[h.id]).length;
  const streak = getStreak();
  if (streak > appData.streakBest) { appData.streakBest = streak; saveData(appData); }
  $('#streakDays').textContent = streak;
  $('#todayDone').innerHTML = done + '/<span id="todayTotal">' + todayHabits.length + '</span>';
  $('#todayProgress').textContent = todayHabits.length > 0 ? Math.round((done/todayHabits.length)*100) + '%' : '0%';
}

function updateMoodDisplay() {
  const today = todayStr();
  const entry = appData.diaryEntries[today];
  const mood = (entry && entry.mood) ? entry.mood : 'smiling';
  const display = $('#moodDisplay');
  if (display) display.src = 'moods/' + mood + '.svg';
}

function renderTodayHabits() {
  const today = todayStr();
  const todayHabits = getTodayHabits();
  const logs = appData.habitLogs[today] || {};
  const container = $('#todayHabitList');
  if (!container) return;
  if (todayHabits.length === 0) {
    container.innerHTML = '<div class="empty-state"><span class="empty-icon">—</span><p>今天没有安排习惯</p></div>';
    return;
  }
  const timeMap = { morning:'早晨', afternoon:'下午', evening:'晚上', anytime:'任意时间' };
  container.innerHTML = todayHabits.map(h => {
    const done = !!logs[h.id];
    return `<div class="habit-item${done?' completed':''}" data-habit-id="${h.id}">
      <div class="habit-check">✓</div>
      <div class="habit-icon">${h.icon}</div>
      <div class="habit-info">
        <div class="habit-name">${escHtml(h.name)}</div>
        <div class="habit-meta">${h.category} · ${timeMap[h.timeOfDay]||''}</div>
      </div>
      <div class="habit-energy-badge">+${h.energyValue} ⚡</div>
    </div>`;
  }).join('');
  container.querySelectorAll('.habit-item').forEach(item => {
    item.addEventListener('click', () => toggleHabit(item.dataset.habitId, item));
  });
}

function toggleHabit(habitId, el) {
  const today = todayStr();
  if (!appData.habitLogs[today]) appData.habitLogs[today] = {};
  const habit = appData.habits.find(h => h.id === habitId);
  if (!habit) return;
  if (appData.habitLogs[today][habitId]) {
    delete appData.habitLogs[today][habitId];
  } else {
    appData.habitLogs[today][habitId] = true;
    spawnEnergyParticle(el, habit.energyValue);
  }
  updateEnergyHistory(today);
  saveData(appData);
  renderToday();
}

function spawnEnergyParticle(el, value) {
  const rect = el.getBoundingClientRect();
  const particle = document.createElement('div');
  particle.className = 'energy-particle';
  particle.textContent = '+' + value + ' ⚡';
  particle.style.left = rect.left + rect.width/2 - 28 + 'px';
  particle.style.top = rect.top + 'px';
  document.body.appendChild(particle);
  particle.addEventListener('animationend', () => particle.remove());
}

function escHtml(str) { const d=document.createElement('div'); d.textContent=str; return d.innerHTML; }

/* ===== Render: Plans ===== */
function renderPlans() {
  renderCalendar();
  renderPlanList(selectedPlanDate);
  renderDiary(selectedPlanDate);
}

/* ===== Calendar ===== */
function renderCalendar() {
  if (currentCalendarView === 'week') {
    $('#calendarStrip').style.display = 'flex';
    $('#monthCalendar').style.display = 'none';
    renderWeekCalendar(selectedPlanDate);
  } else {
    $('#calendarStrip').style.display = 'none';
    $('#monthCalendar').style.display = 'block';
    renderMonthCalendar(selectedPlanDate);
  }
}

function renderWeekCalendar(selectedDate) {
  const container = $('#calendarStrip');
  if (!container) return;
  const today = todayStr();
  const d0 = new Date(selectedDate + 'T00:00:00');
  const start = new Date(d0);
  start.setDate(start.getDate() - 3);

  const dates = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    dates.push(dateObj(d, today));
  }

  container.innerHTML = dates.map(d => {
    const diary = appData.diaryEntries[d.str];
    const hasDiary = diary && (typeof diary === 'string' ? diary.trim() : (diary.text || '').trim());
    const has = appData.plans.some(p => p.date === d.str) || !!hasDiary;
    const sel = d.str === selectedDate;
    const td = d.isToday;
    return `<div class="calendar-day${td?' today':''}${sel?' selected':''}${has?' has-plans':''}" data-date="${d.str}">
      <span class="cal-day">${d.day}</span><span class="cal-date">${d.date}</span><span class="cal-dot"></span>
    </div>`;
  }).join('');

  container.querySelectorAll('.calendar-day').forEach(day => {
    day.addEventListener('click', () => {
      selectedPlanDate = day.dataset.date;
      renderPlans();
    });
  });

  const todayEl = container.querySelector('.today');
  if (todayEl) todayEl.scrollIntoView({ behavior:'smooth', inline:'center', block:'nearest' });
}

function renderMonthCalendar(selectedDate) {
  const grid = $('#calendarGrid');
  if (!grid) return;
  const today = todayStr();
  const selD = new Date(selectedDate + 'T00:00:00');
  const year = selD.getFullYear();
  const month = selD.getMonth();

  // first day of month
  const firstDay = new Date(year, month, 1);
  const startDay = firstDay.getDay(); // 0=Sun

  // last day
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();

  // prev month days
  const prevLast = new Date(year, month, 0).getDate();

  let html = '';

  for (let i = 0; i < startDay; i++) {
    const d = prevLast - startDay + i + 1;
    const ds = dateStr(year, month-1, d);
    html += cellHtml(d, ds, true, false, false, today);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const ds = dateStr(year, month, d);
    const isToday = ds === today;
    const isSel = ds === selectedDate;
    html += cellHtml(d, ds, false, isToday, isSel, today);
  }

  // fill remaining cells
  const totalCells = Math.ceil((startDay + daysInMonth) / 7) * 7;
  const remaining = totalCells - (startDay + daysInMonth);
  for (let d = 1; d <= remaining; d++) {
    const ds = dateStr(year, month+1, d);
    html += cellHtml(d, ds, true, false, false, today);
  }

  grid.innerHTML = html;

  grid.querySelectorAll('.calendar-cell').forEach(cell => {
    cell.addEventListener('click', () => {
      if (cell.dataset.date) {
        selectedPlanDate = cell.dataset.date;
        renderPlans();
      }
    });
  });

  // update month title
  const titleEl = $('#planDateTitle');
  if (titleEl) titleEl.textContent = (year) + '年' + (month+1) + '月';
}

function dateObj(d, today) {
  return {
    str: d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'),
    day: getWeekdayLabel(d.getDay()),
    date: d.getDate(),
    isToday: d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0') === today
  };
}

function dateStr(y, m, d) {
  const dt = new Date(y, m, d);
  return dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0')+'-'+String(dt.getDate()).padStart(2,'0');
}

function cellHtml(d, ds, otherMonth, isToday, isSelected, todayStr) {
  const diary = appData.diaryEntries[ds];
  const hasDiary = diary && (typeof diary === 'string' ? diary.trim() : (diary.text || '').trim());
  const hasPlans = appData.plans.some(p => p.date === ds) || !!hasDiary;
  return `<div class="calendar-cell${otherMonth?' other-month':''}${isToday?' today':''}${isSelected?' selected':''}${hasPlans?' has-plans':''}" data-date="${ds}">
    ${d}<span class="cell-dot"></span>
  </div>`;
}

/* ===== Plan List (by date) ===== */
function renderPlanList(dateStr) {
  const container = $('#planList');
  const countEl = $('#planCount');
  if (!container) return;
  const plans = appData.plans.filter(p => p.date === dateStr).sort((a,b) => (a.time||'').localeCompare(b.time||''));
  if (countEl) countEl.textContent = plans.length + '项';

  // Update title for week view
  if (currentCalendarView === 'week') {
    const titleEl = $('#planDateTitle');
    if (titleEl) titleEl.textContent = dateStr === todayStr() ? '今日计划' : formatFullDate(dateStr);
  }

  if (plans.length === 0) {
    container.innerHTML = '<div class="empty-state"><span class="empty-icon">—</span><p>暂无计划</p></div>';
    return;
  }

  container.innerHTML = plans.map(p => `
    <div class="plan-item${p.completed?' completed':''}" data-plan-id="${p.id}">
      <div class="plan-time">${p.time||'全天'}</div>
      <div class="plan-content">
        <div class="plan-title">${escHtml(p.title)}</div>
        ${p.description?`<div class="plan-desc">${escHtml(p.description)}</div>`:''}
      </div>
      <button class="plan-check-btn" data-action="toggle"></button>
      <button class="plan-delete" data-action="delete">✕</button>
    </div>
  `).join('');

  container.querySelectorAll('.plan-item').forEach(item => {
    item.querySelector('[data-action="toggle"]').addEventListener('click', (e) => {
      e.stopPropagation(); togglePlan(item.dataset.planId);
    });
    item.querySelector('[data-action="delete"]').addEventListener('click', (e) => {
      e.stopPropagation(); deletePlan(item.dataset.planId);
    });
  });
}

function togglePlan(planId) {
  const plan = appData.plans.find(p => p.id === planId);
  if (!plan) return;
  plan.completed = !plan.completed;
  saveData(appData);
  renderPlans();
}

function deletePlan(planId) {
  appData.plans = appData.plans.filter(p => p.id !== planId);
  saveData(appData);
  renderPlans();
}

/* ===== Diary ===== */
const MOOD_LIST = ['smiling','happy-2','cheeky','flirt','flirt-1','nerd','rich','confused','yawning','tired-1','dissapointment','angry','arrogant','faint'];

function renderMoodPicker(dateStr) {
  const container = $('#moodPicker');
  if (!container) return;
  const entry = appData.diaryEntries[dateStr];
  const currentMood = (entry && entry.mood) ? entry.mood : '';

  container.innerHTML = MOOD_LIST.map(m => {
    const sel = m === currentMood ? ' selected' : '';
    return `<div class="mood-option${sel}" data-mood="${m}">
      <img src="moods/${m}.svg" alt="${m}" />
    </div>`;
  }).join('');

  container.querySelectorAll('.mood-option').forEach(opt => {
    opt.addEventListener('click', () => {
      container.querySelectorAll('.mood-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
    });
  });
}

function renderDiary(dateStr) {
  const editor = $('#diaryEditor');
  const dateLabel = $('#diaryDateLabel');
  const wordCount = $('#diaryWordCount');
  const entryList = $('#diaryList');

  if (dateLabel) dateLabel.textContent = dateStr === todayStr() ? '今天' : formatFullDate(dateStr);

  // Render mood picker
  renderMoodPicker(dateStr);

  // Load existing entry
  const entry = appData.diaryEntries[dateStr];
  const existingText = (entry && entry.text) ? entry.text : '';
  if (editor) {
    editor.value = existingText;
    editor.dataset.diaryDate = dateStr;
    // If diary has content, show in view mode; else edit mode
    if (existingText.trim()) {
      editor.readOnly = true;
      const saveBtn = $('#btnSaveDiary');
      const editBtn = $('#btnEditDiary');
      if (saveBtn) saveBtn.style.display = 'none';
      if (editBtn) editBtn.style.display = 'inline-block';
    } else {
      editor.readOnly = false;
      const saveBtn = $('#btnSaveDiary');
      const editBtn = $('#btnEditDiary');
      if (saveBtn) saveBtn.style.display = 'inline-block';
      if (editBtn) editBtn.style.display = 'none';
    }
  }
  if (wordCount) wordCount.textContent = existingText.length + ' 字';

  // Render past entries
  if (entryList) {
    const entries = Object.entries(appData.diaryEntries)
      .filter(([d, val]) => {
        const txt = typeof val === 'string' ? val : (val && val.text ? val.text : '');
        return d !== dateStr && txt.trim();
      })
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 10);

    if (entries.length === 0) {
      entryList.innerHTML = '';
      return;
    }

    entryList.innerHTML = entries.map(([d, val]) => {
      const txt = typeof val === 'string' ? val : (val && val.text ? val.text : '');
      const mood = (val && val.mood) ? val.mood : 'smiling';
      const preview = txt.length > 80 ? txt.slice(0, 80) + '…' : txt;
      return `<div class="diary-entry" data-diary-date="${d}">
        <div class="diary-entry-date">
          <img src="moods/${mood}.svg" style="width:20px;height:20px;vertical-align:-4px;margin-right:4px;" alt="" />
          ${formatFullDate(d)}
        </div>
        <div class="diary-entry-text">${escHtml(preview)}</div>
      </div>`;
    }).join('');

    entryList.querySelectorAll('.diary-entry').forEach(entry => {
      entry.addEventListener('click', () => {
        selectedPlanDate = entry.dataset.diaryDate;
        renderPlans();
        // Stay on Today tab — user is looking at past diaries via the list
      });
    });
  }
}

$('#diaryEditor').addEventListener('input', function() {
  const wc = $('#diaryWordCount');
  if (wc) wc.textContent = this.value.length + ' 字';
});

$('#btnSaveDiary').addEventListener('click', () => {
  const editor = $('#diaryEditor');
  if (!editor) return;
  const dateStr = editor.dataset.diaryDate || todayStr();
  const text = editor.value.trim();

  const selectedMood = $('#moodPicker').querySelector('.mood-option.selected');
  const mood = selectedMood ? selectedMood.dataset.mood : 'smiling';

  if (text || mood) {
    appData.diaryEntries[dateStr] = { text, mood };
  } else {
    delete appData.diaryEntries[dateStr];
  }
  saveData(appData);

  // Flash feedback on save button
  const saveBtn = $('#btnSaveDiary');
  const originalText = saveBtn.textContent;
  saveBtn.textContent = '已保存 ✓';
  saveBtn.style.background = '#4A8F5E';

  setTimeout(() => {
    saveBtn.textContent = originalText;
    saveBtn.style.background = '';

    // After save: switch to view mode (readonly + show edit button)
    if (editor) editor.readOnly = true;
    saveBtn.style.display = 'none';
    const editBtn = $('#btnEditDiary');
    if (editBtn) editBtn.style.display = 'inline-block';
  }, 1200);

  updateMoodDisplay();
  renderCalendar();
});

// Edit diary button — switch back to edit mode
$('#btnEditDiary').addEventListener('click', () => {
  const editor = $('#diaryEditor');
  if (editor) editor.readOnly = false;
  const editBtn = $('#btnEditDiary');
  if (editBtn) editBtn.style.display = 'none';
  const saveBtn = $('#btnSaveDiary');
  if (saveBtn) saveBtn.style.display = 'inline-block';
  if (editor) editor.focus();
});

// Click mood card to switch to Plans tab (diary lives there now)
$('#moodCard').addEventListener('click', () => {
  switchTab('plans');
});

/* ===== Calendar View Toggle ===== */
$$('#calendarViewToggle .toggle-option').forEach(btn => {
  btn.addEventListener('click', () => {
    $$('#calendarViewToggle .toggle-option').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentCalendarView = btn.dataset.view;
    renderPlans();
  });
});

/* ===== Render: Rewards ===== */
function renderRewards() {
  const currentEnergy = getCurrentEnergy();
  const totalEarned = getTotalEnergyEarned();
  const totalSpent = getTotalEnergySpent();
  $('#rewardEnergyAmount').textContent = currentEnergy + ' ⚡';
  $('#totalEarned').textContent = totalEarned;
  $('#totalSpent').textContent = totalSpent;
  const bar = $('#rewardEnergyFill');
  if (bar) {
    const maxEarned = Math.max(totalEarned, 100);
    bar.style.width = Math.max((currentEnergy / maxEarned) * 100, 0) + '%';
  }
  renderRewardGrid(currentEnergy);
  renderRedeemHistory();
}

function renderRewardGrid(currentEnergy) {
  const container = $('#rewardGrid');
  if (!container) return;
  if (appData.rewards.length === 0) {
    container.innerHTML = '<div class="empty-state"><span class="empty-icon">—</span><p>还没有奖励</p></div>';
    return;
  }
  container.innerHTML = appData.rewards.map(r => {
    const canAfford = currentEnergy >= r.energyCost;
    const redeemedCount = appData.redeemHistory.filter(h => h.rewardId === r.id).length;
    return `<div class="reward-card" data-reward-id="${r.id}">
      <button class="reward-edit-btn" data-action="edit-reward" title="编辑">✎</button>
      <div class="reward-icon">${r.icon}</div>
      <div class="reward-name">${escHtml(r.name)}</div>
      ${r.description?`<div class="reward-desc">${escHtml(r.description)}</div>`:''}
      <div class="reward-cost">${r.energyCost} ⚡</div>
      <button class="btn-redeem" ${canAfford?'':'disabled'}>${canAfford?'兑换':'能量不足'}</button>
      ${redeemedCount>0?`<div style="font-size:0.68rem;color:var(--text-lighter);margin-top:2px;">已兑 ${redeemedCount} 次</div>`:''}
    </div>`;
  }).join('');

  // Edit buttons
  container.querySelectorAll('[data-action="edit-reward"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const card = btn.closest('.reward-card');
      if (card) openEditRewardModal(card.dataset.rewardId);
    });
  });

  // Redeem buttons
  container.querySelectorAll('.btn-redeem:not([disabled])').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const card = btn.closest('.reward-card');
      if (card) openRedeemConfirm(card.dataset.rewardId);
    });
  });
}

function renderRedeemHistory() {
  const section = $('#redeemHistorySection');
  const list = $('#redeemList');
  if (!section || !list) return;
  if (appData.redeemHistory.length === 0) { section.style.display = 'none'; return; }
  section.style.display = 'block';
  const recent = [...appData.redeemHistory].reverse().slice(0, 10);
  list.innerHTML = recent.map(rh => {
    const reward = appData.rewards.find(r => r.id === rh.rewardId);
    const d = new Date(rh.redeemedAt);
    return `<div class="redeem-item">
      <span class="redeem-icon">${reward?reward.icon:'—'}</span>
      <div class="redeem-info">
        <div class="redeem-name">${reward?escHtml(reward.name):'已删除'}</div>
        <div class="redeem-date">${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()}</div>
      </div>
      <span class="redeem-cost">−${rh.energyCost} ⚡</span>
    </div>`;
  }).join('');
}

/* ===== Redeem Flow ===== */
let pendingRedeemRewardId = null;

function openRedeemConfirm(rewardId) {
  const reward = appData.rewards.find(r => r.id === rewardId);
  if (!reward) return;
  const currentEnergy = getCurrentEnergy();
  if (currentEnergy < reward.energyCost) return;
  pendingRedeemRewardId = rewardId;
  $('#redeemConfirmIcon').textContent = reward.icon;
  $('#redeemConfirmCost').textContent = reward.energyCost + ' ⚡';
  $('#redeemConfirmRemain').textContent = (currentEnergy - reward.energyCost) + ' ⚡';
  $('#modalRedeem').classList.add('active');
}

function confirmRedeem() {
  if (!pendingRedeemRewardId) return;
  const reward = appData.rewards.find(r => r.id === pendingRedeemRewardId);
  if (!reward) return;
  const currentEnergy = getCurrentEnergy();
  if (currentEnergy < reward.energyCost) { closeAllModals(); alert('能量不足'); return; }
  appData.redeemHistory.push({ id:uid(), rewardId:reward.id, energyCost:reward.energyCost, redeemedAt:new Date().toISOString() });
  updateEnergyHistory(todayStr());
  saveData(appData);
  pendingRedeemRewardId = null;
  $('#modalRedeem').classList.remove('active');
  showRedeemToast(reward, getCurrentEnergy());
  renderRewards();
  updateHeaderEnergy();
  updateEnergyRing();
}

function showRedeemToast(reward, remainingEnergy) {
  $('#redeemToastEnergy').textContent = '剩余能量：' + remainingEnergy + ' ⚡';
  const toast = $('#redeemToast');
  toast.classList.add('active');
  setTimeout(() => toast.classList.remove('active'), 1800);
}

$('#btnConfirmRedeem').addEventListener('click', confirmRedeem);

/* ===== Reward Edit ===== */
function openEditRewardModal(rewardId) {
  const reward = appData.rewards.find(r => r.id === rewardId);
  if (!reward) return;
  $('#modalRewardTitle').textContent = '编辑奖励';
  $('#rewardEditId').value = reward.id;
  $('#rewardName').value = reward.name;
  $('#rewardCost').value = reward.energyCost;
  $('#rewardCostLabel').textContent = reward.energyCost + ' ⚡';
  $('#rewardDesc').value = reward.description || '';
  renderIconPicker('rewardIconPicker', REWARD_ICONS, reward.icon);

  // Show delete button in edit mode
  let delBtn = $('#btnDeleteReward');
  if (!delBtn) {
    delBtn = document.createElement('button');
    delBtn.id = 'btnDeleteReward';
    delBtn.className = 'btn-delete-reward';
    delBtn.textContent = '删除此奖励';
    delBtn.addEventListener('click', deleteRewardFromModal);
    const footer = $('#rewardModalFooter');
    if (footer) footer.prepend(delBtn);
  }
  delBtn.style.display = 'block';

  $('#modalReward').classList.add('active');
}

function deleteRewardFromModal() {
  const rewardId = $('#rewardEditId').value;
  if (!rewardId) return;
  if (!confirm('确定删除这个奖励吗？')) return;
  appData.rewards = appData.rewards.filter(r => r.id !== rewardId);
  saveData(appData);
  closeAllModals();
  renderRewards();
}

function openAddRewardModal() {
  $('#modalRewardTitle').textContent = '添加奖励';
  $('#rewardEditId').value = '';
  $('#rewardName').value = '';
  $('#rewardCost').value = 30;
  $('#rewardCostLabel').textContent = '30 ⚡';
  $('#rewardDesc').value = '';
  renderIconPicker('rewardIconPicker', REWARD_ICONS, null);
  const delBtn = $('#btnDeleteReward');
  if (delBtn) delBtn.style.display = 'none';
  $('#modalReward').classList.add('active');
}

/* ===== Render: Profile ===== */
function renderProfile() {
  const totalEarned = getTotalEnergyEarned();
  let totalCheckins = 0;
  Object.values(appData.habitLogs).forEach(logs => { totalCheckins += Object.keys(logs).length; });
  $('#profileTotalEnergy').textContent = totalEarned;
  $('#profileStreak').textContent = (appData.streakBest||0) + '天';
  $('#profileCheckins').textContent = totalCheckins + '次';
  // Summary card
  const count = appData.habits.length;
  const summaryEl = $('#habitSummaryText');
  if (summaryEl) summaryEl.textContent = count + ' 个习惯';
  renderEnergyChart();
}

// ---- 习惯管理模态 ----
function openManageHabitsModal() {
  const body = $('#manageHabitsBody');
  if (!body) return;

  if (appData.habits.length === 0) {
    body.innerHTML = '<div class="empty-state"><span class="empty-icon">—</span><p>还没有习惯</p></div>';
  } else {
    const freqKeys = ['sun','mon','tue','wed','thu','fri','sat'];
    const freqLabels = ['日','一','二','三','四','五','六'];
    body.innerHTML = appData.habits.map(h => {
      const days = freqLabels.filter((_,i) => h.frequency.includes(freqKeys[i])).join('·');
      return `<div class="manage-habit-row" data-habit-id="${h.id}">
        <span class="mh-icon">${h.icon}</span>
        <div class="mh-info">
          <div class="mh-name">${escHtml(h.name)}</div>
          <div class="mh-meta">${h.category} · ${days||'无'}</div>
        </div>
        <span class="mh-energy">+${h.energyValue} ⚡</span>
        <div class="mh-actions">
          <button class="mh-btn edit" data-action="edit">✎</button>
          <button class="mh-btn delete" data-action="delete">✕</button>
        </div>
      </div>`;
    }).join('');

    body.querySelectorAll('[data-action="edit"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const row = btn.closest('.manage-habit-row');
        if (row) openEditHabitModal(row.dataset.habitId);
      });
    });
    body.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const row = btn.closest('.manage-habit-row');
        if (row) {
          const habit = appData.habits.find(h => h.id === row.dataset.habitId);
          if (habit && confirm('删除「' + habit.name + '」？打卡记录保留。')) {
            appData.habits = appData.habits.filter(h => h.id !== row.dataset.habitId);
            saveData(appData);
            openManageHabitsModal(); // refresh modal
            renderToday();
            renderProfile();
          }
        }
      });
    });
  }
  $('#modalManageHabits').classList.add('active');
}

// Add habit from manage modal
$('#btnAddHabitFromManage').addEventListener('click', () => {
  openAddHabitModal();
});

// Wire up profile link cards
$('#btnManageHabits').addEventListener('click', openManageHabitsModal);

$('#btnSwitchAccount').addEventListener('click', async () => {
  if (currentUser) {
    await signOutUser();
  }
  // Show auth overlay
  const overlay = $('#authOverlay');
  if (overlay) overlay.classList.remove('hidden');
  // Reset auth form
  isAuthMode = false;
  $('#authTitle').textContent = '欢迎回来';
  $('#authSub').textContent = '登录以同步你的数据';
  $('#authSubmit').textContent = '登录';
  $('#nameGroup').style.display = 'none';
  $('#authToggleLink').textContent = '注册';
  $('#authEmail').value = '';
  $('#authPassword').value = '';
  const msg = $('#authMsg'); if (msg) msg.remove();
});

function deleteHabit(habitId) {
  if (!confirm('确定删除？打卡记录会保留。')) return;
  appData.habits = appData.habits.filter(h => h.id !== habitId);
  saveData(appData);
  renderToday();
  renderProfile();
}

function renderEnergyChart() {
  const container = $('#energyChart');
  if (!container) return;
  const days = [];
  for (let i=6; i>=0; i--) {
    const d = new Date(); d.setDate(d.getDate()-i);
    days.push(d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'));
  }
  const data = days.map(date => {
    const logs = appData.habitLogs[date] || {};
    let earned = 0;
    appData.habits.forEach(h => { if (logs[h.id]) earned += h.energyValue; });
    const spent = appData.redeemHistory.filter(rh => {
      const d = new Date(rh.redeemedAt);
      return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0') === date;
    }).reduce((s,r) => s+r.energyCost, 0);
    return { date, earned, spent, net: earned-spent };
  });
  const maxVal = Math.max(...data.map(d => Math.max(d.earned, d.spent, 5)), 20);
  container.innerHTML = data.map(d => {
    const h = Math.max((d.earned/maxVal)*100, 3);
    return `<div class="chart-bar-wrap">
      <span class="chart-value">${d.net>=0?'+':''}${d.net}</span>
      <div class="chart-bar${d.net<0?' negative':''}" style="height:${h}px;"></div>
      <span class="chart-label">${new Date(d.date+'T00:00:00').getDate()}日</span>
    </div>`;
  }).join('');
}

/* ===== Modals ===== */
function closeAllModals() { $$('.modal-overlay').forEach(m => m.classList.remove('active')); }
$$('.modal-close').forEach(btn => btn.addEventListener('click', closeAllModals));
$$('.modal-overlay').forEach(o => o.addEventListener('click', (e) => { if (e.target===o) closeAllModals(); }));

/* ===== Icon Pickers ===== */
const DEFAULT_ICONS = ['🌅','🏃','📖','💪','🧘','🎯','✍️','🎨','🎵','🌿','💧','🍎','😴','📝','💻','🧹','🐾','☕','💊','🧠'];
const REWARD_ICONS  = ['🎬','📺','🎮','🍰','🧋','☕','🛍️','🎁','🍕','🍣','🎪','✈️','🎵','📱','💤','🛀','🍿','🎧','👗','🍩'];

function renderIconPicker(containerId, icons, selected) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = icons.map(icon =>
    `<div class="icon-option${icon===selected?' selected':''}" data-icon="${icon}">${icon}</div>`
  ).join('');
  container.querySelectorAll('.icon-option').forEach(opt => {
    opt.addEventListener('click', () => {
      container.querySelectorAll('.icon-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
    });
  });
}

function renderWeekdayPicker(selectedDays) {
  const container = $('#weekdayPicker');
  if (!container) return;
  const keys = ['sun','mon','tue','wed','thu','fri','sat'];
  const labels = ['日','一','二','三','四','五','六'];
  container.innerHTML = keys.map((k,i) =>
    `<div class="wd-option${selectedDays.includes(k)?' selected':''}" data-day="${k}">${labels[i]}</div>`
  ).join('');
  container.querySelectorAll('.wd-option').forEach(opt => {
    opt.addEventListener('click', () => opt.classList.toggle('selected'));
  });
}

/* ===== Habit Modal ===== */
$('#habitEnergy').addEventListener('input', function() {
  $('#habitEnergyLabel').textContent = this.value + ' ⚡';
});

function openAddHabitModal() {
  $('#modalHabitTitle').textContent = '添加习惯';
  $('#habitEditId').value = '';
  $('#habitName').value = '';
  $('#habitEnergy').value = 10;
  $('#habitEnergyLabel').textContent = '10 ⚡';
  $('#habitCategory').value = '健康';
  $('#habitTimeOfDay').value = 'anytime';
  renderIconPicker('iconPicker', DEFAULT_ICONS, null);
  renderWeekdayPicker([]);
  $('#modalHabit').classList.add('active');
}

function openEditHabitModal(habitId) {
  const h = appData.habits.find(h => h.id === habitId);
  if (!h) return;
  $('#modalHabitTitle').textContent = '编辑习惯';
  $('#habitEditId').value = h.id;
  $('#habitName').value = h.name;
  $('#habitEnergy').value = h.energyValue;
  $('#habitEnergyLabel').textContent = h.energyValue + ' ⚡';
  $('#habitCategory').value = h.category;
  $('#habitTimeOfDay').value = h.timeOfDay;
  renderIconPicker('iconPicker', DEFAULT_ICONS, h.icon);
  renderWeekdayPicker(h.frequency);
  $('#modalHabit').classList.add('active');
}

$('#btnSaveHabit').addEventListener('click', () => {
  const name = $('#habitName').value.trim();
  if (!name) return alert('请输入习惯名称');
  const iconSel = $('#iconPicker').querySelector('.icon-option.selected');
  const icon = iconSel ? iconSel.dataset.icon : DEFAULT_ICONS[0];
  const category = $('#habitCategory').value;
  const energyValue = parseInt($('#habitEnergy').value);
  const timeOfDay = $('#habitTimeOfDay').value;
  const weekdays = [...$('#weekdayPicker').querySelectorAll('.wd-option.selected')].map(el => el.dataset.day);
  if (weekdays.length === 0) return alert('请至少选择一个重复日');

  const editId = $('#habitEditId').value;
  if (editId) {
    const h = appData.habits.find(h => h.id === editId);
    if (h) Object.assign(h, { name, icon, category, energyValue, timeOfDay, frequency: weekdays });
  } else {
    appData.habits.push({ id:uid(), name, icon, category, energyValue, timeOfDay, frequency: weekdays });
  }
  saveData(appData);
  closeAllModals();
  renderToday();
  renderProfile();
});

// btnAddHabit removed from profile — use btnAddHabitFromManage instead

/* ===== Plan Modal ===== */
$('#btnAddPlan').addEventListener('click', () => {
  $('#planTitle').value = '';
  $('#planDate').value = selectedPlanDate;
  $('#planTime').value = '';
  $('#planDesc').value = '';
  $('#modalPlan').classList.add('active');
});

$('#btnSavePlan').addEventListener('click', () => {
  const title = $('#planTitle').value.trim();
  if (!title) return alert('请输入计划标题');
  appData.plans.push({
    id: uid(), title,
    date: $('#planDate').value || selectedPlanDate,
    time: $('#planTime').value || '',
    description: $('#planDesc').value.trim(),
    completed: false,
    createdAt: new Date().toISOString()
  });
  saveData(appData);
  closeAllModals();
  renderPlans();
});

/* ===== Reward Modal ===== */
$('#btnAddReward').addEventListener('click', openAddRewardModal);

$('#rewardCost').addEventListener('input', function() {
  $('#rewardCostLabel').textContent = this.value + ' ⚡';
});

$('#btnSaveReward').addEventListener('click', () => {
  const name = $('#rewardName').value.trim();
  if (!name) return alert('请输入奖励名称');
  const iconSel = $('#rewardIconPicker').querySelector('.icon-option.selected');
  const icon = iconSel ? iconSel.dataset.icon : REWARD_ICONS[0];
  const energyCost = parseInt($('#rewardCost').value);
  const description = $('#rewardDesc').value.trim();
  const editId = $('#rewardEditId').value;

  if (editId) {
    const r = appData.rewards.find(r => r.id === editId);
    if (r) Object.assign(r, { name, icon, energyCost, description });
  } else {
    appData.rewards.push({ id:uid(), name, icon, energyCost, description, createdAt: new Date().toISOString() });
  }
  saveData(appData);
  closeAllModals();
  renderRewards();
});

/* ===== Reset ===== */
$('#btnReset').addEventListener('click', () => {
  if (!confirm('确定重置所有数据？不可恢复！')) return;
  if (!confirm('再次确认：所有数据将被清空。')) return;
  appData = getDefaultData();
  saveData(appData);
  renderToday();
  renderProfile();
  renderRewards();
  renderPlans();
});

/* ===== Init ===== */
async function initApp() {
  // 1. Setup energy ring (同步)
  const ring = $('#energyRing');
  if (ring) {
    const c = 2 * Math.PI * 78;
    ring.setAttribute('stroke-dasharray', c);
    ring.setAttribute('stroke-dashoffset', c);
  }

  // 2. 立即加载本地数据 + 渲染页面（不等网络）
  appData = loadFromLocalStorage();
  renderToday();

  // 3. 立即注册 UI 事件（不等任何异步）
  setupAuthUI();

  // 4. 后台静默检查云端会话（不阻塞页面）
  loadSupabaseSDK().then(async () => {
    await initAuthListener();
    const user = await checkSession();
    if (user) {
      // 已登录 → 隐藏登录界面，从云端刷新数据
      const overlay = $('#authOverlay');
      if (overlay) overlay.classList.add('hidden');
      appData = await loadData();
      renderToday();
      renderProfile();
    }
  }).catch(() => {
    // SDK 加载失败，保持本地模式
  });
}

// ---- Auth UI ----
function setupAuthUI() {
  const toggle = $('#authToggleLink');
  const title = $('#authTitle');
  const sub = $('#authSub');
  const submitBtn = $('#authSubmit');
  const nameGroup = $('#nameGroup');
  const skipBtn = $('#authSkip');
  const form = $('#authForm');

  if (toggle) {
    toggle.addEventListener('click', (e) => {
      e.preventDefault();
      isAuthMode = !isAuthMode;
      if (isAuthMode) {
        title.textContent = '创建账号';
        sub.textContent = '注册后数据将云端同步';
        submitBtn.textContent = '注册';
        nameGroup.style.display = 'block';
        toggle.textContent = '登录';
      } else {
        title.textContent = '欢迎回来';
        sub.textContent = '登录以同步你的数据';
        submitBtn.textContent = '登录';
        nameGroup.style.display = 'none';
        toggle.textContent = '注册';
      }
    });
  }

  if (skipBtn) {
    skipBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const overlay = $('#authOverlay');
      if (overlay) overlay.classList.add('hidden');
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = $('#authEmail').value.trim();
      const password = $('#authPassword').value;
      if (!email || !password) return;

      submitBtn.disabled = true;
      submitBtn.textContent = isAuthMode ? '注册中…' : '登录中…';

      let result;
      if (isAuthMode) {
        result = await signUp(email, password);
      } else {
        result = await signIn(email, password);
      }

      if (result.error) {
        submitBtn.disabled = false;
        submitBtn.textContent = isAuthMode ? '注册' : '登录';
        // Show error
        let msg = $('#authMsg');
        if (!msg) {
          msg = document.createElement('p');
          msg.id = 'authMsg';
          msg.className = 'auth-msg error';
          form.appendChild(msg);
        }
        msg.textContent = result.error.message || '操作失败，请重试';
        msg.className = 'auth-msg error';
      } else if (!isAuthMode) {
        // Login success
        const overlay = $('#authOverlay');
        if (overlay) overlay.classList.add('hidden');
        appData = await loadData();
        renderToday();
      } else {
        // Register success — Supabase sent verification email
        submitBtn.disabled = false;
        submitBtn.textContent = '注册';
        let msg = $('#authMsg');
        if (!msg) {
          msg = document.createElement('p');
          msg.id = 'authMsg';
          msg.className = 'auth-msg';
          form.appendChild(msg);
        }
        msg.textContent = '✓ 验证邮件已发送，请查收邮箱后重新登录';
        msg.className = 'auth-msg success';
      }
    });
  }

  // Override auth callbacks
  onUserSignedIn = async function() {
    appData = await loadData();
    renderToday();
  };

  onUserSignedOut = function() {
    appData = loadFromLocalStorage();
    renderToday();
    const overlay = $('#authOverlay');
    if (overlay) overlay.classList.remove('hidden');
  };
}

document.addEventListener('DOMContentLoaded', initApp);
