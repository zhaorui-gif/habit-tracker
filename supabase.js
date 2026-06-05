/* ============================================================
   Supabase Client + Auth — 能量打卡
   SDK 在后台异步加载，不阻塞页面
   ============================================================ */

// ---- 配置 ----
const SUPABASE_URL = 'https://vxpzcckvpkjbcfsvvdtq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_wDgy6czO_Sxy5_QhEon1XQ_yeB3V748';

// ---- 异步加载 Supabase SDK ----
let _supabase = null;
let _supabaseLoading = false;
let _supabaseReady = false;
let _supabaseLoadPromise = null;

function loadSupabaseSDK() {
  if (_supabaseReady) return Promise.resolve();
  if (_supabaseLoadPromise) return _supabaseLoadPromise;

  _supabaseLoadPromise = new Promise((resolve) => {
    // 如果已经加载了
    if (typeof supabase !== 'undefined' && supabase.createClient) {
      _supabaseReady = true;
      resolve();
      return;
    }
    // 后台异步加载
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    script.onload = () => { _supabaseReady = true; resolve(); };
    script.onerror = () => { console.warn('Supabase SDK 加载失败，仅本地模式可用'); resolve(); };
    document.head.appendChild(script);
  });
  return _supabaseLoadPromise;
}

function getSupabase() {
  if (!_supabase && _supabaseReady && typeof supabase !== 'undefined') {
    _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return _supabase;
}

// 页面加载后立即开始后台加载 SDK
if (typeof document !== 'undefined') {
  loadSupabaseSDK();
}

// ---- Auth State ----
let currentUser = null;

// 监听登录状态变化
async function initAuthListener() {
  await loadSupabaseSDK();
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
  await loadSupabaseSDK();
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data } = await sb.auth.getSession();
    if (data.session) {
      currentUser = data.session.user;
      return currentUser;
    }
  } catch(e) {
    console.warn('会话检查失败:', e.message);
  }
  return null;
}

// 检查 Supabase 是否就绪（SDK 已加载 + 密钥已配置）
function isSupabaseReady() {
  return _supabaseReady &&
         SUPABASE_URL !== 'https://YOUR_PROJECT.supabase.co' &&
         SUPABASE_ANON_KEY !== 'YOUR_ANON_KEY';
}

// ---- 注册 ----
async function signUp(email, password) {
  await loadSupabaseSDK();
  const sb = getSupabase();
  if (!sb) return { error: { message: '网络不可用' } };
  const { data, error } = await sb.auth.signUp({ email, password });
  return { data, error };
}

// ---- 登录 ----
async function signIn(email, password) {
  await loadSupabaseSDK();
  const sb = getSupabase();
  if (!sb) return { error: { message: '网络不可用' } };
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  return { data, error };
}

// ---- 登出 ----
async function signOutUser() {
  const sb = getSupabase();
  if (sb) {
    try { await sb.auth.signOut(); } catch(e) {}
  }
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
