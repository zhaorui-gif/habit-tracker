-- ============================================================
-- 能量打卡 · Supabase 数据库 Schema
-- 在 Supabase SQL Editor 中执行此文件
-- ============================================================

-- 1. 习惯表
CREATE TABLE IF NOT EXISTS habits (
  id          TEXT PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  icon        TEXT DEFAULT '🌱',
  category    TEXT DEFAULT '健康',
  energy_value INTEGER DEFAULT 10,
  frequency   JSONB DEFAULT '["mon","tue","wed","thu","fri","sat","sun"]',
  time_of_day TEXT DEFAULT 'anytime',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 打卡记录
CREATE TABLE IF NOT EXISTS habit_logs (
  id         TEXT PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id   TEXT NOT NULL,
  log_date   DATE NOT NULL,
  completed  BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 计划
CREATE TABLE IF NOT EXISTS plans (
  id          TEXT PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  plan_date   DATE NOT NULL,
  plan_time   TEXT DEFAULT '',
  description TEXT DEFAULT '',
  completed   BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 奖励
CREATE TABLE IF NOT EXISTS rewards (
  id          TEXT PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  icon        TEXT DEFAULT '🎁',
  energy_cost INTEGER DEFAULT 30,
  description TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 兑换记录
CREATE TABLE IF NOT EXISTS redeem_history (
  id          TEXT PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_id   TEXT NOT NULL,
  energy_cost INTEGER NOT NULL,
  redeemed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. 日记
CREATE TABLE IF NOT EXISTS diary_entries (
  id         TEXT PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  text       TEXT DEFAULT '',
  mood       TEXT DEFAULT 'smiling',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. 用户设置
CREATE TABLE IF NOT EXISTS user_settings (
  user_id      UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  streak_best  INTEGER DEFAULT 0,
  created_at   DATE DEFAULT CURRENT_DATE
);

-- ============================================================
-- Row Level Security (RLS) — 每个用户只能读写自己的数据
-- ============================================================

ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE redeem_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE diary_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "habits_user_policy" ON habits
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "habit_logs_user_policy" ON habit_logs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "plans_user_policy" ON plans
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "rewards_user_policy" ON rewards
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "redeem_history_user_policy" ON redeem_history
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "diary_entries_user_policy" ON diary_entries
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_settings_policy" ON user_settings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 索引
CREATE INDEX IF NOT EXISTS idx_habits_user ON habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_logs_user_date ON habit_logs(user_id, log_date);
CREATE INDEX IF NOT EXISTS idx_plans_user_date ON plans(user_id, plan_date);
CREATE INDEX IF NOT EXISTS idx_rewards_user ON rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_redeem_user ON redeem_history(user_id);
CREATE INDEX IF NOT EXISTS idx_diary_user_date ON diary_entries(user_id, entry_date);
