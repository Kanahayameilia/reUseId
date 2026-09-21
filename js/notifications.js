// =========================================================
// reUseId - NOTIFIKASI PESAN (lonceng + badge + unread per chat)
// =========================================================
// Dimuat SETELAH auth.js (dan sebelum chat.js di chat.html).
// Nggak butuh kolom database baru: status "sudah dibaca" disimpan
// di localStorage, per user, per percakapan.
//
// Dipakai chat.js lewat:
//   ReuseNotif.getUnreadByConv(ids) -> { convId: jumlahBelumDibaca }
//   ReuseNotif.markSeen(convId)     -> tandai percakapan sudah dibaca
// Kalau ada perubahan, event 'reuse-unread-changed' dipicu di document.
// =========================================================
(function () {
  const bell  = document.getElementById('notifBell');
  const badge = document.getElementById('notifBadge');
  const onChatPage = /chat\.html$/i.test(location.pathname);
  const EPOCH = '1970-01-01T00:00:00.000Z';

  // ---------- style ----------
  const style = document.createElement('style');
  style.textContent = `
    .notif-bell{position:relative;background:none;border:0;cursor:pointer;
      font-size:1.25rem;line-height:1;padding:8px;border-radius:50%;}
    .notif-bell:hover{background:rgba(76,175,125,.14);}
    .notif-badge{position:absolute;top:0;right:-2px;min-width:18px;height:18px;
      padding:0 5px;border-radius:9px;background:#E5484D;color:#fff;
      font:700 11px/18px 'DM Sans',sans-serif;text-align:center;}
    .notif-badge[hidden],.notif-bell[hidden]{display:none;}

    /* daftar chat: belum dibaca */
    .conv-time{display:flex;flex-direction:column;align-items:flex-end;gap:6px;}
    .conv-item.unread .conv-name{font-weight:800;}
    .conv-item.unread .conv-last{font-weight:700;color:#1F2A26;}
    .conv-item.unread .conv-time{color:#3A9265;font-weight:700;}
    .conv-item.unread:not(.active){background:#F3FAF6;box-shadow:inset 3px 0 0 #4CAF7D;}
    .conv-unread{min-width:20px;height:20px;padding:0 6px;border-radius:10px;
      background:#4CAF7D;color:#fff;font:700 11px/20px 'DM Sans',sans-serif;text-align:center;}
  `;
  document.head.appendChild(style);

  // ---------- penyimpanan status dibaca ----------
  let myId = null;
  const uid = () => myId || (myId = getUserId());
  const mapKey    = () => `reuse_notif_seen_v2_${uid()}`;
  const legacyKey = () => `reuse_notif_seen_${uid()}`;   // versi lama (1 timestamp global)

  function loadSeen() {
    try { return JSON.parse(localStorage.getItem(mapKey())) || {}; }
    catch { return {}; }
  }
  const seenFor = (map, convId) =>
    map[convId] || localStorage.getItem(legacyKey()) || EPOCH;
  const ts = (v) => new Date(v).getTime();

  function changed() {
    document.dispatchEvent(new CustomEvent('reuse-unread-changed'));
  }

  // ---------- API ----------
  async function getUnreadByConv(convIds) {
    const result = {};
    if (!uid() || !convIds.length) return result;

    const map = loadSeen();
    const oldest = convIds.map(id => seenFor(map, id)).sort((a, b) => ts(a) - ts(b))[0];

    const { data, error } = await supabaseClient
      .from('messages')
      .select('conversation_id, created_at')
      .in('conversation_id', convIds)
      .neq('sender_id', uid())
      .gt('created_at', oldest)
      .limit(1000);
    if (error) { console.error('[notif] gagal hitung unread:', error.message); return result; }

    (data || []).forEach(m => {
      if (ts(m.created_at) > ts(seenFor(map, m.conversation_id))) {
        result[m.conversation_id] = (result[m.conversation_id] || 0) + 1;
      }
    });
    return result;
  }

  async function markSeen(convId) {
    if (!uid() || !convId) return;
    // pakai waktu pesan terakhir dari server (bukan jam browser) biar nggak meleset
    const { data } = await supabaseClient
      .from('messages')
      .select('created_at')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: false })
      .limit(1);
    const latest = data?.[0]?.created_at || new Date().toISOString();

    const map = loadSeen();
    if (!map[convId] || ts(latest) > ts(map[convId])) {
      map[convId] = latest;
      localStorage.setItem(mapKey(), JSON.stringify(map));
    }
    changed();
  }

  window.ReuseNotif = { getUnreadByConv, markSeen };

  // ---------- badge lonceng + judul tab ----------
  const baseTitle = document.title;
  function render(count) {
    if (badge) {
      badge.textContent = count > 9 ? '9+' : String(count);
      badge.hidden = count === 0;
    }
    document.title = count > 0 ? `(${count}) ${baseTitle}` : baseTitle;
  }

  async function refresh() {
    if (!uid()) return;
    const { data: convs, error } = await supabaseClient
      .from('conversations')
      .select('id')
      .or(`buyer_id.eq.${uid()},seller_id.eq.${uid()}`);
    if (error) { console.error('[notif] gagal ambil conversations:', error.message); return; }

    const unread = await getUnreadByConv((convs || []).map(c => c.id));
    render(Object.values(unread).reduce((a, b) => a + b, 0));
  }

  // percakapan yang sedang dibuka di chat.html (chat.js menaruh ?id= di URL)
  const activeConvId = () =>
    onChatPage ? new URLSearchParams(location.search).get('id') : null;

  function listenRealtime() {
    supabaseClient
      .channel('notif-messages')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async (payload) => {
          const m = payload.new;
          if (m.sender_id === uid()) return;
          // lagi baca chat ini -> langsung dianggap sudah dibaca
          if (!document.hidden && m.conversation_id === activeConvId()) {
            await markSeen(m.conversation_id);
          } else {
            changed();
          }
        })
      .subscribe((status) => console.log('[notif] realtime:', status));

    // cadangan kalau realtime putus
    setInterval(changed, 30000);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) return;
      const id = activeConvId();
      if (id) markSeen(id); else changed();
    });
  }

  // ---------- start ----------
  onAuthReady(() => {
    if (!isLoggedIn()) return;
    myId = getUserId();

    if (bell) {
      bell.hidden = false;
      bell.addEventListener('click', () => { window.location.href = 'chat.html'; });
    }

    document.addEventListener('reuse-unread-changed', refresh);
    refresh();
    listenRealtime();
  });
})();