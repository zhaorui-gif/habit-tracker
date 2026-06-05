/* ============================================================
   Supabase Client + Auth — 能量打卡
   ============================================================ */

// ---- 配置（创建 Supabase 项目后填入）----
const SUPABASE_URL = 'https://vxpzcckvpkjbcfsvvdtq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_wDgy6czO_Sxy5_QhEon1XQ_yeB3V748';

// ---- Client ----
let _supabase = null;

function getSupabase() {
  if (!_supabase) {
    if (typeof supabase === 'undefined') {
      console.error('Supabase SDK 未加载，请检查 CDN 引用');
      return null;
    }
    _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return _supabase;
}

// ---- Auth State ----
let currentUser = null;

// 监听登录状态变化
function initAuthListener() {
  const sb = getSupabase();
  if (!sb) return;
  sb.auth.onAuthStateChange((event, session) => {
    currentUser = session ? session.user : null;
    if (event === 'SIGNED_IN') {
      console.log('用户已登录:', currentUser.email);
      onUserSignedIn();
    } else if (event === 'SIGNED_OUT') {
      console.log('用户已登出');
      onUserSignedOut();
    }
  });
}

// 检查当前会话
async function checkSession() {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  if (data.session) {
    currentUser = data.session.user;
    return currentUser;
  }
  return null;
}

// ---- 注册 ----
async function signUp(email, password) {
  const sb = getSupabase();
  if (!sb) return { error: 'SDK 未配置' };
  const { data, error } = await sb.auth.signUp({ email, password });
  return { data, error };
}

// ---- 登录 ----
async function signIn(email, password) {
  const sb = getSupabase();
  if (!sb) return { error: 'SDK 未配置' };
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  return { data, error };
}

// ---- 登出 ----
async function signOutUser() {
  const sb = getSupabase();
  if (!sb) return;
  await sb.auth.signOut();
  currentUser = null;
}

// ---- 登录/登出回调（由 app.js 重写）----
function onUserSignedIn() {}
function onUserSignedOut() {}

// ---- 检查是否已配置 ----
function isSupabaseConfigured() {
  return SUPABASE_URL !== 'https://YOUR_PROJECT.supabase.co' &&
         SUPABASE_ANON_KEY !== 'YOUR_ANON_KEY';
}
