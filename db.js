/* ============================================================
   DB Layer — Supabase（登录时） / LocalStorage（未登录时）
   对外暴露与原来 localStorage 一致的接口
   ============================================================ */

// ---- 保存全部数据到云端 ----
async function dbSaveAll(data) {
  if (!currentUser || !isSupabaseConfigured()) {
    // 回退到 localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return;
  }
  const sb = getSupabase();
  const uid = currentUser.id;

  try {
    // 习惯：先删后插
    await sb.from('habits').delete().eq('user_id', uid);
    if (data.habits.length) {
      const habits = data.habits.map(h => ({
        id: h.id, user_id: uid, name: h.name, icon: h.icon,
        category: h.category, energy_value: h.energyValue,
        frequency: h.frequency, time_of_day: h.timeOfDay
      }));
      await sb.from('habits').upsert(habits);
    }

    // 打卡记录
    await sb.from('habit_logs').delete().eq('user_id', uid);
    const logs = [];
    Object.entries(data.habitLogs || {}).forEach(([date, dayLogs]) => {
      Object.entries(dayLogs).forEach(([habitId, completed]) => {
        logs.push({ id: uid + '_' + date + '_' + habitId, user_id: uid,
                     habit_id: habitId, log_date: date, completed: !!completed });
      });
    });
    if (logs.length) {
      // Insert in batches of 100
      for (let i = 0; i < logs.length; i += 100) {
        await sb.from('habit_logs').upsert(logs.slice(i, i + 100));
      }
    }

    // 计划
    await sb.from('plans').delete().eq('user_id', uid);
    if (data.plans.length) {
      const plans = data.plans.map(p => ({
        id: p.id, user_id: uid, title: p.title,
        plan_date: p.date, plan_time: p.time || '',
        description: p.description || '', completed: p.completed || false
      }));
      await sb.from('plans').upsert(plans);
    }

    // 奖励
    await sb.from('rewards').delete().eq('user_id', uid);
    if (data.rewards.length) {
      const rewards = data.rewards.map(r => ({
        id: r.id, user_id: uid, name: r.name, icon: r.icon,
        energy_cost: r.energyCost, description: r.description || ''
      }));
      await sb.from('rewards').upsert(rewards);
    }

    // 兑换记录
    await sb.from('redeem_history').delete().eq('user_id', uid);
    if (data.redeemHistory.length) {
      const rh = data.redeemHistory.map(r => ({
        id: r.id, user_id: uid, reward_id: r.rewardId,
        energy_cost: r.energyCost, redeemed_at: r.redeemedAt
      }));
      await sb.from('redeem_history').upsert(rh);
    }

    // 日记
    await sb.from('diary_entries').delete().eq('user_id', uid);
    const diaryRows = [];
    Object.entries(data.diaryEntries || {}).forEach(([date, val]) => {
      const txt = typeof val === 'string' ? val : (val?.text || '');
      const mood = (val && val.mood) ? val.mood : 'smiling';
      if (txt.trim() || mood !== 'smiling') {
        diaryRows.push({ id: uid + '_' + date, user_id: uid,
                         entry_date: date, text: txt, mood });
      }
    });
    if (diaryRows.length) {
      await sb.from('diary_entries').upsert(diaryRows);
    }

    // 设置
    await sb.from('user_settings').upsert({
      user_id: uid, streak_best: data.streakBest || 0, created_at: data.createdAt
    });

    // 同时写一份到 localStorage 作为离线备份
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

  } catch (e) {
    console.error('云端保存失败，回退到本地:', e.message);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
}

// ---- 从云端加载全部数据 ----
async function dbLoadAll() {
  if (!currentUser || !isSupabaseConfigured()) {
    // 回退到 localStorage
    return loadFromLocalStorage();
  }
  const sb = getSupabase();
  const uid = currentUser.id;

  try {
    // 并行获取所有表
    const [habitsRes, logsRes, plansRes, rewardsRes, redeemRes, diaryRes, settingsRes] =
      await Promise.all([
        sb.from('habits').select('*').eq('user_id', uid),
        sb.from('habit_logs').select('*').eq('user_id', uid),
        sb.from('plans').select('*').eq('user_id', uid),
        sb.from('rewards').select('*').eq('user_id', uid),
        sb.from('redeem_history').select('*').eq('user_id', uid),
        sb.from('diary_entries').select('*').eq('user_id', uid),
        sb.from('user_settings').select('*').eq('user_id', uid).maybeSingle()
      ]);

    // 重构 appData
    const data = {};

    data.habits = (habitsRes.data || []).map(h => ({
      id: h.id, name: h.name, icon: h.icon, category: h.category,
      energyValue: h.energy_value, frequency: h.frequency,
      timeOfDay: h.time_of_day
    }));

    data.habitLogs = {};
    (logsRes.data || []).forEach(l => {
      if (!data.habitLogs[l.log_date]) data.habitLogs[l.log_date] = {};
      data.habitLogs[l.log_date][l.habit_id] = l.completed;
    });

    data.plans = (plansRes.data || []).map(p => ({
      id: p.id, title: p.title, date: p.plan_date,
      time: p.plan_time || '', description: p.description || '',
      completed: p.completed || false,
      createdAt: p.created_at
    }));

    data.rewards = (rewardsRes.data || []).map(r => ({
      id: r.id, name: r.name, icon: r.icon,
      energyCost: r.energy_cost, description: r.description || '',
      createdAt: r.created_at
    }));

    data.redeemHistory = (redeemRes.data || []).map(r => ({
      id: r.id, rewardId: r.reward_id,
      energyCost: r.energy_cost, redeemedAt: r.redeemed_at
    }));

    data.diaryEntries = {};
    (diaryRes.data || []).forEach(d => {
      data.diaryEntries[d.entry_date] = { text: d.text, mood: d.mood };
    });

    data.streakBest = settingsRes.data?.streak_best || 0;
    data.createdAt = settingsRes.data?.created_at || todayStr();

    // 缓存本地
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return data;

  } catch (e) {
    console.error('云端加载失败，使用本地缓存:', e.message);
    return loadFromLocalStorage();
  }
}

// ---- 本地回退 ----
function loadFromLocalStorage() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return getDefaultData();
  try { return migrateData(JSON.parse(raw)); }
  catch (e) { return getDefaultData(); }
}

function dbSaveLocal(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
