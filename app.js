/* ===== Storage ===== */
const STORAGE_KEY = 'energy_tracker_data';

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return getDefaultData();
  try {
    const data = JSON.parse(raw);
    return migrateData(data);
  } catch (e) {
    return getDefaultData();
  }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getDefaultData() {
  const demoHabits = [
    { id: 'demo1', name: '早起 (7:00前)', icon: '🌅', category: '健康', energyValue: 15, frequency: ['mon','tue','wed','thu','fri','sat','sun'], timeOfDay: 'morning' },
    { id: 'demo2', name: '阅读30分钟', icon: '📚', category: '学习', energyValue: 10, frequency: ['mon','tue','wed','thu','fri','sat','sun'], timeOfDay: 'anytime' },
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
  if (!data.streakBest) data.streakBest = 0;
  return data;
}

/* ===== Helpers ===== */
function todayStr() {
  const d = new Date();
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = (today - target) / 86400000;
  if (diff === 0) return '今天';
  if (diff === 1) return '昨天';
  if (diff === 2) return '前天';
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return m + '/' + day;
}

function formatFullDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日';
}

function getWeekdayLabel(n) {
  return ['日', '一', '二', '三', '四', '五', '六'][n];
}

function getTodayWeekday() {
  return new Date().getDay();
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/* ===== App State ===== */
let appData = loadData();

/* ===== DOM Refs ===== */
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
  else if (tab === 'plans') renderPlans();
  else if (tab === 'rewards') renderRewards();
  else if (tab === 'profile') renderProfile();
}

/* ===== Greeting ===== */
function updateGreeting() {
  const h = new Date().getHours();
  let text;
  if (h < 6) text = '夜深了 🌙';
  else if (h < 9) text = '早上好 ☀️';
  else if (h < 12) text = '上午好 🌤️';
  else if (h < 14) text = '中午好 ☀️';
  else if (h < 18) text = '下午好 🌈';
  else if (h < 21) text = '晚上好 🌙';
  else text = '夜深了 🌙';

  const el = $('#greetingText');
  if (el) el.textContent = text;
}

function updateDateText() {
  const d = new Date();
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  const text = d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日 星期' + weekdays[d.getDay()];
  const el = $('#dateText');
  if (el) el.textContent = text;
}

/* ===== Energy Calculations ===== */
function getTodayEnergyEarned() {
  const today = todayStr();
  let earned = 0;
  const logs = appData.habitLogs[today] || {};
  appData.habits.forEach(h => {
    if (logs[h.id]) earned += h.energyValue;
  });
  return earned;
}

function getTotalEnergyEarned() {
  let total = 0;
  Object.keys(appData.habitLogs).forEach(date => {
    const logs = appData.habitLogs[date] || {};
    appData.habits.forEach(h => {
      if (logs[h.id]) total += h.energyValue;
    });
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
  const todayWD = getTodayWeekday();
  const wdKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][todayWD];
  return appData.habits.filter(h => h.frequency.includes(wdKey));
}

function getStreak() {
  let streak = 0;
  const d = new Date();

  while (true) {
    const dateStr = d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
    const logs = appData.habitLogs[dateStr] || {};
    const habitsForDay = getHabitsForDate(dateStr);

    if (habitsForDay.length === 0) {
      // Day with no scheduled habits — skip, don't break streak
      d.setDate(d.getDate() - 1);
      continue;
    }

    const completed = habitsForDay.filter(h => logs[h.id]).length;
    if (completed < habitsForDay.length) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function getHabitsForDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const wd = d.getDay();
  const wdKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][wd];
  return appData.habits.filter(h => h.frequency.includes(wdKey));
}

/* ===== Render: Today ===== */
function renderToday() {
  updateGreeting();
  updateDateText();
  updateHeaderEnergy();
  updateEnergyRing();
  updateStatsRow();
  renderTodayHabits();
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
  const circumference = 2 * Math.PI * 85;
  const maxEnergy = Math.max(getCurrentEnergy(), 100);
  const ratio = Math.min(getCurrentEnergy() / maxEnergy, 1);
  ring.setAttribute('stroke-dasharray', circumference);
  ring.setAttribute('stroke-dashoffset', circumference * (1 - ratio));
}

function updateStatsRow() {
  const today = todayStr();
  const todayHabits = getTodayHabits();
  const logs = appData.habitLogs[today] || {};
  const done = todayHabits.filter(h => logs[h.id]).length;
  const total = todayHabits.length;

  const streak = getStreak();
  if (streak > appData.streakBest) {
    appData.streakBest = streak;
    saveData(appData);
  }

  $('#streakDays').textContent = streak;
  $('#todayDone').innerHTML = done + '/<span id="todayTotal">' + total + '</span>';
  $('#totalHabits').textContent = appData.habits.length;
  $('#todayProgress').textContent = total > 0 ? Math.round((done / total) * 100) + '%' : '0%';
}

function renderTodayHabits() {
  const today = todayStr();
  const todayHabits = getTodayHabits();
  const logs = appData.habitLogs[today] || {};
  const container = $('#todayHabitList');
  if (!container) return;

  if (todayHabits.length === 0) {
    container.innerHTML = `<div class="empty-state"><span class="empty-icon">📝</span><p>今天没有安排习惯，去"我的"页面添加吧</p></div>`;
    return;
  }

  container.innerHTML = todayHabits.map(h => {
    const done = !!logs[h.id];
    const timeLabel = { morning: '🌅 早晨', afternoon: '☀️ 下午', evening: '🌙 晚上', anytime: '🌤️ 任意时间' }[h.timeOfDay];
    const catLabel = h.category;
    return `
      <div class="habit-item${done ? ' completed' : ''}" data-habit-id="${h.id}">
        <div class="habit-check">✓</div>
        <div class="habit-icon">${h.icon}</div>
        <div class="habit-info">
          <div class="habit-name">${escHtml(h.name)}</div>
          <div class="habit-meta">${catLabel} · ${timeLabel}</div>
        </div>
        <div class="habit-energy-badge">+${h.energyValue} ⚡</div>
      </div>
    `;
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
    // Undo
    delete appData.habitLogs[today][habitId];
  } else {
    // Complete
    appData.habitLogs[today][habitId] = true;
    spawnEnergyParticle(el, habit.energyValue);
  }

  // Update energy history for today
  updateEnergyHistory(today);

  saveData(appData);
  renderToday();
}

function updateEnergyHistory(dateStr) {
  const earned = getTotalEnergyEarned();
  const spent = getTotalEnergySpent();
  appData.energyHistory[dateStr] = {
    earned: earned,
    spent: spent,
    balance: earned - spent
  };
}

function spawnEnergyParticle(el, value) {
  const rect = el.getBoundingClientRect();
  const particle = document.createElement('div');
  particle.className = 'energy-particle';
  particle.textContent = '+' + value + ' ⚡';
  particle.style.left = rect.left + rect.width / 2 - 30 + 'px';
  particle.style.top = rect.top + 'px';
  document.body.appendChild(particle);
  particle.addEventListener('animationend', () => particle.remove());
}

function escHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* ===== Render: Plans ===== */
function renderPlans() {
  const today = todayStr();
  renderCalendarStrip(today);
  renderPlanList(today);
}

function renderCalendarStrip(selectedDate) {
  const container = $('#calendarStrip');
  if (!container) return;

  const today = todayStr();
  const dates = [];
  for (let i = -3; i <= 10; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    dates.push({
      str: d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'),
      day: getWeekdayLabel(d.getDay()),
      date: d.getDate(),
      isToday: d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') === today
    });
  }

  container.innerHTML = dates.map(d => {
    const hasPlans = appData.plans.some(p => p.date === d.str);
    const isSelected = d.str === selectedDate;
    const isToday = d.isToday;
    return `
      <div class="calendar-day${isToday ? ' today' : ''}${isSelected ? ' selected' : ''}${hasPlans ? ' has-plans' : ''}" data-date="${d.str}">
        <span class="cal-day">${d.day}</span>
        <span class="cal-date">${d.date}</span>
        <span class="cal-dot"></span>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.calendar-day').forEach(day => {
    day.addEventListener('click', () => {
      container.querySelectorAll('.calendar-day').forEach(d => d.classList.remove('selected'));
      day.classList.add('selected');
      renderPlanList(day.dataset.date);
    });
  });

  // Scroll today into view
  const todayEl = container.querySelector('.today');
  if (todayEl) {
    todayEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }
}

function renderPlanList(dateStr) {
  const container = $('#planList');
  const titleEl = $('#planDateTitle');
  const countEl = $('#planCount');
  if (!container) return;

  if (titleEl) {
    titleEl.textContent = dateStr === todayStr() ? '今日计划' : formatFullDate(dateStr) + ' 计划';
  }

  const plans = appData.plans
    .filter(p => p.date === dateStr)
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''));

  if (countEl) countEl.textContent = plans.length + '项';

  if (plans.length === 0) {
    container.innerHTML = `<div class="empty-state"><span class="empty-icon">📅</span><p>暂无计划，点击右上角➕添加</p></div>`;
    return;
  }

  container.innerHTML = plans.map(p => `
    <div class="plan-item${p.completed ? ' completed' : ''}" data-plan-id="${p.id}">
      <div class="plan-time">${p.time || '全天'}</div>
      <div class="plan-content">
        <div class="plan-title">${escHtml(p.title)}</div>
        ${p.description ? `<div class="plan-desc">${escHtml(p.description)}</div>` : ''}
      </div>
      <button class="plan-check-btn" data-action="toggle"></button>
      <button class="plan-delete" data-action="delete">🗑</button>
    </div>
  `).join('');

  container.querySelectorAll('.plan-item').forEach(item => {
    item.querySelector('[data-action="toggle"]').addEventListener('click', (e) => {
      e.stopPropagation();
      togglePlan(item.dataset.planId);
    });
    item.querySelector('[data-action="delete"]').addEventListener('click', (e) => {
      e.stopPropagation();
      deletePlan(item.dataset.planId);
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

/* ===== Render: Rewards ===== */
function renderRewards() {
  const currentEnergy = getCurrentEnergy();
  const totalEarned = getTotalEnergyEarned();
  const totalSpent = getTotalEnergySpent();

  // Update energy display
  $('#rewardEnergyAmount').textContent = currentEnergy + ' ⚡';
  $('#totalEarned').textContent = totalEarned;
  $('#totalSpent').textContent = totalSpent;

  // Energy bar
  const bar = $('#rewardEnergyFill');
  if (bar) {
    const maxEarned = Math.max(totalEarned, 100);
    const ratio = Math.min(currentEnergy / maxEarned, 1);
    bar.style.width = Math.max(ratio * 100, 0) + '%';
  }

  // Reward grid
  renderRewardGrid(currentEnergy);

  // Redeem history
  renderRedeemHistory();
}

function renderRewardGrid(currentEnergy) {
  const container = $('#rewardGrid');
  if (!container) return;

  if (appData.rewards.length === 0) {
    container.innerHTML = `<div class="empty-state"><span class="empty-icon">🎁</span><p>还没有奖励，点击右上角➕添加</p></div>`;
    return;
  }

  container.innerHTML = appData.rewards.map(r => {
    const canAfford = currentEnergy >= r.energyCost;
    // Count how many times redeemed
    const redeemedCount = appData.redeemHistory.filter(h => h.rewardId === r.id).length;
    return `
      <div class="reward-card${redeemedCount > 0 ? ' redeemed' : ''}" data-reward-id="${r.id}">
        <div class="reward-icon">${r.icon}</div>
        <div class="reward-name">${escHtml(r.name)}</div>
        ${r.description ? `<div class="reward-desc">${escHtml(r.description)}</div>` : ''}
        <div class="reward-cost">${r.energyCost} ⚡</div>
        <button class="btn-redeem" ${canAfford ? '' : 'disabled'}>
          ${canAfford ? '立即兑换' : '能量不足'}
        </button>
        ${redeemedCount > 0 ? `<div style="font-size:0.7rem;color:var(--text-muted);margin-top:4px;">已兑换 ${redeemedCount} 次</div>` : ''}
      </div>
    `;
  }).join('');

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

  if (appData.redeemHistory.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';
  const recent = [...appData.redeemHistory].reverse().slice(0, 10);

  list.innerHTML = recent.map(rh => {
    const reward = appData.rewards.find(r => r.id === rh.rewardId);
    const d = new Date(rh.redeemedAt);
    const dateStr = d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate();
    return `
      <div class="redeem-item">
        <span class="redeem-icon">${reward ? reward.icon : '🎁'}</span>
        <div class="redeem-info">
          <div class="redeem-name">${reward ? escHtml(reward.name) : '已删除的奖励'}</div>
          <div class="redeem-date">${dateStr}</div>
        </div>
        <span class="redeem-cost">-${rh.energyCost} ⚡</span>
      </div>
    `;
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
  if (currentEnergy < reward.energyCost) {
    pendingRedeemRewardId = null;
    $('#modalRedeem').classList.remove('active');
    alert('能量不足，无法兑换！');
    return;
  }

  // Record redemption
  appData.redeemHistory.push({
    id: uid(),
    rewardId: reward.id,
    energyCost: reward.energyCost,
    redeemedAt: new Date().toISOString()
  });

  // Update energy history
  updateEnergyHistory(todayStr());

  saveData(appData);
  pendingRedeemRewardId = null;

  // Close confirm modal
  $('#modalRedeem').classList.remove('active');

  // Show success toast with remaining energy
  showRedeemToast(reward, getCurrentEnergy());

  // Refresh rewards tab
  renderRewards();
  updateHeaderEnergy();
  updateEnergyRing();
}

function showRedeemToast(reward, remainingEnergy) {
  $('#redeemToastEnergy').textContent = '剩余能量：' + remainingEnergy + ' ⚡';
  const toast = $('#redeemToast');
  toast.classList.add('active');
  setTimeout(() => {
    toast.classList.remove('active');
  }, 1800);
}

$('#btnConfirmRedeem').addEventListener('click', confirmRedeem);

/* ===== Render: Profile ===== */
function renderProfile() {
  const totalEarned = getTotalEnergyEarned();
  const totalSpent = getTotalEnergySpent();
  const streak = getStreak();
  let totalCheckins = 0;
  Object.values(appData.habitLogs).forEach(logs => {
    totalCheckins += Object.keys(logs).length;
  });

  $('#profileTotalEnergy').textContent = totalEarned;
  $('#profileStreak').textContent = (appData.streakBest || 0) + '天';
  $('#profileCheckins').textContent = totalCheckins + '次';

  renderHabitManageList();
  renderEnergyChart();
}

function renderHabitManageList() {
  const container = $('#habitManageList');
  if (!container) return;

  if (appData.habits.length === 0) {
    container.innerHTML = `<div class="empty-state"><span class="empty-icon">🌟</span><p>添加你的第一个习惯吧</p></div>`;
    return;
  }

  container.innerHTML = appData.habits.map(h => {
    const freqStr = ['日', '一', '二', '三', '四', '五', '六']
      .filter((_, i) => h.frequency.includes(['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][i]))
      .join('·');
    return `
      <div class="habit-manage-item" data-habit-id="${h.id}">
        <span class="hm-icon">${h.icon}</span>
        <div class="hm-info">
          <div class="hm-name">${escHtml(h.name)}</div>
          <div class="hm-meta">${h.category} · ${freqStr || '无重复'}</div>
        </div>
        <span class="hm-energy">+${h.energyValue} ⚡</span>
        <button class="hm-delete" data-action="delete-habit">🗑</button>
      </div>
    `;
  }).join('');

  container.querySelectorAll('[data-action="delete-habit"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const item = btn.closest('.habit-manage-item');
      if (item) deleteHabit(item.dataset.habitId);
    });
  });

  container.querySelectorAll('.habit-manage-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.closest('[data-action]')) return;
      openEditHabitModal(item.dataset.habitId);
    });
  });
}

function deleteHabit(habitId) {
  if (!confirm('确定要删除这个习惯吗？已有的打卡记录会保留。')) return;
  appData.habits = appData.habits.filter(h => h.id !== habitId);
  saveData(appData);
  renderToday();
  renderProfile();
}

function renderEnergyChart() {
  const container = $('#energyChart');
  if (!container) return;

  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'));
  }

  const data = days.map(date => {
    const logs = appData.habitLogs[date] || {};
    let earned = 0;
    appData.habits.forEach(h => {
      if (logs[h.id]) earned += h.energyValue;
    });
    const redeemForDay = appData.redeemHistory.filter(rh => {
      const d = new Date(rh.redeemedAt);
      const ds = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      return ds === date;
    });
    const spent = redeemForDay.reduce((s, r) => s + r.energyCost, 0);
    return { date, earned, spent, net: earned - spent };
  });

  const maxVal = Math.max(...data.map(d => Math.max(d.earned, d.spent, 5)), 20);

  container.innerHTML = data.map(d => {
    const h = Math.max((d.earned / maxVal) * 100, 4);
    const isNetNegative = d.net < 0;
    const label = new Date(d.date + 'T00:00:00').getDate() + '日';
    return `
      <div class="chart-bar-wrap">
        <span class="chart-value">${d.net >= 0 ? '+' : ''}${d.net}</span>
        <div class="chart-bar${isNetNegative ? ' negative' : ''}" style="height:${h}px;"></div>
        <span class="chart-label">${label}</span>
      </div>
    `;
  }).join('');
}

/* ===== Modals ===== */
function closeAllModals() {
  $$('.modal-overlay').forEach(m => m.classList.remove('active'));
}

$$('.modal-close').forEach(btn => {
  btn.addEventListener('click', closeAllModals);
});

$$('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeAllModals();
  });
});

/* ===== Habit Modal ===== */
const DEFAULT_ICONS = ['🌅', '🏃', '📚', '💪', '🧘', '🎯', '✍️', '🎨', '🎵', '🌿', '💧', '🍎', '😴', '📝', '💻', '🧹', '🐾', '☕', '💊', '🧠'];
const REWARD_ICONS = ['🎬', '📺', '🎮', '🍰', '🧋', '☕', '🛍️', '🎁', '🍕', '🍣', '🎪', '✈️', '🎵', '📱', '💤', '🛀', '🍿', '🎧', '👗', '🍩'];

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
  const habit = appData.habits.find(h => h.id === habitId);
  if (!habit) return;
  $('#modalHabitTitle').textContent = '编辑习惯';
  $('#habitEditId').value = habit.id;
  $('#habitName').value = habit.name;
  $('#habitEnergy').value = habit.energyValue;
  $('#habitEnergyLabel').textContent = habit.energyValue + ' ⚡';
  $('#habitCategory').value = habit.category;
  $('#habitTimeOfDay').value = habit.timeOfDay;
  renderIconPicker('iconPicker', DEFAULT_ICONS, habit.icon);
  renderWeekdayPicker(habit.frequency);
  $('#modalHabit').classList.add('active');
}

function renderIconPicker(containerId, icons, selected) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = icons.map(icon => `
    <div class="icon-option${icon === selected ? ' selected' : ''}" data-icon="${icon}">${icon}</div>
  `).join('');
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
  const keys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const labels = ['日', '一', '二', '三', '四', '五', '六'];
  container.innerHTML = keys.map((k, i) => `
    <div class="wd-option${selectedDays.includes(k) ? ' selected' : ''}" data-day="${k}">${labels[i]}</div>
  `).join('');
  container.querySelectorAll('.wd-option').forEach(opt => {
    opt.addEventListener('click', () => {
      opt.classList.toggle('selected');
    });
  });
}

$('#habitEnergy').addEventListener('input', function() {
  $('#habitEnergyLabel').textContent = this.value + ' ⚡';
});

$('#btnSaveHabit').addEventListener('click', () => {
  const name = $('#habitName').value.trim();
  if (!name) return alert('请输入习惯名称');

  const iconPicker = $('#iconPicker');
  const selectedIcon = iconPicker.querySelector('.icon-option.selected');
  const icon = selectedIcon ? selectedIcon.dataset.icon : DEFAULT_ICONS[0];

  const category = $('#habitCategory').value;
  const energyValue = parseInt($('#habitEnergy').value);
  const timeOfDay = $('#habitTimeOfDay').value;

  const weekdayPicker = $('#weekdayPicker');
  const selectedWeekdays = [...weekdayPicker.querySelectorAll('.wd-option.selected')].map(el => el.dataset.day);
  if (selectedWeekdays.length === 0) return alert('请至少选择一个重复日');

  const editId = $('#habitEditId').value;

  if (editId) {
    const habit = appData.habits.find(h => h.id === editId);
    if (habit) {
      habit.name = name;
      habit.icon = icon;
      habit.category = category;
      habit.energyValue = energyValue;
      habit.timeOfDay = timeOfDay;
      habit.frequency = selectedWeekdays;
    }
  } else {
    appData.habits.push({
      id: uid(),
      name,
      icon,
      category,
      energyValue,
      timeOfDay,
      frequency: selectedWeekdays
    });
  }

  saveData(appData);
  closeAllModals();
  renderToday();
  renderProfile();
});

$('#btnAddHabit').addEventListener('click', openAddHabitModal);

/* ===== Plan Modal ===== */
$('#btnAddPlan').addEventListener('click', () => {
  $('#planTitle').value = '';
  $('#planDate').value = todayStr();
  $('#planTime').value = '';
  $('#planDesc').value = '';
  $('#modalPlan').classList.add('active');
});

$('#btnSavePlan').addEventListener('click', () => {
  const title = $('#planTitle').value.trim();
  if (!title) return alert('请输入计划标题');
  appData.plans.push({
    id: uid(),
    title,
    date: $('#planDate').value || todayStr(),
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
$('#btnAddReward').addEventListener('click', () => {
  $('#rewardName').value = '';
  $('#rewardCost').value = 30;
  $('#rewardCostLabel').textContent = '30 ⚡';
  $('#rewardDesc').value = '';
  renderIconPicker('rewardIconPicker', REWARD_ICONS, null);
  $('#modalReward').classList.add('active');
});

$('#rewardCost').addEventListener('input', function() {
  $('#rewardCostLabel').textContent = this.value + ' ⚡';
});

$('#btnSaveReward').addEventListener('click', () => {
  const name = $('#rewardName').value.trim();
  if (!name) return alert('请输入奖励名称');

  const iconPicker = $('#rewardIconPicker');
  const selectedIcon = iconPicker.querySelector('.icon-option.selected');
  const icon = selectedIcon ? selectedIcon.dataset.icon : REWARD_ICONS[0];

  const energyCost = parseInt($('#rewardCost').value);
  const description = $('#rewardDesc').value.trim();

  appData.rewards.push({
    id: uid(),
    name,
    icon,
    energyCost,
    description,
    createdAt: new Date().toISOString()
  });

  saveData(appData);
  closeAllModals();
  renderRewards();
});

/* ===== Reset ===== */
$('#btnReset').addEventListener('click', () => {
  if (!confirm('确定要重置所有数据吗？此操作不可恢复！')) return;
  if (!confirm('再次确认：所有习惯、计划、奖励和打卡记录将被清空。')) return;
  appData = getDefaultData();
  saveData(appData);
  renderToday();
  renderProfile();
  renderRewards();
  renderPlans();
});

/* ===== Init ===== */
function initApp() {
  // SVG gradient for energy ring
  const svgDefs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
  gradient.id = 'ringGradient';
  gradient.setAttribute('x1', '0%');
  gradient.setAttribute('y1', '0%');
  gradient.setAttribute('x2', '100%');
  gradient.setAttribute('y2', '100%');
  const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
  stop1.setAttribute('offset', '0%');
  stop1.setAttribute('stop-color', '#667eea');
  const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
  stop2.setAttribute('offset', '100%');
  stop2.setAttribute('stop-color', '#764ba2');
  gradient.appendChild(stop1);
  gradient.appendChild(stop2);
  svgDefs.appendChild(gradient);
  const ring = $('#energyRing');
  if (ring) {
    ring.parentElement.insertBefore(svgDefs, ring);
    const circumference = 2 * Math.PI * 85;
    ring.setAttribute('stroke-dasharray', circumference);
    ring.setAttribute('stroke-dashoffset', circumference);
  }

  renderToday();
}

document.addEventListener('DOMContentLoaded', initApp);
