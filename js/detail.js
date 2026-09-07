// ============================================================
// DETAIL.JS
// Re:Use.ID
//
// Data barang       : Supabase -> items
// Chat              : conversations + messages
// Barter            : barter_offers
// Foto barter       : Storage bucket "barter-offers"
// ============================================================

const FALLBACK_PHOTO =
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=900&h=900&fit=crop';

const FALLBACK_AVATAR =
  'https://i.pravatar.cc/80?img=47';


// ============================================================
// HELPER
// ============================================================

function escapeHtml(value) {
  if (value === null || value === undefined) return '';

  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}


function getItemPhotos(data) {
  if (Array.isArray(data.photos) && data.photos.length > 0) {
    return data.photos;
  }

  if (data.photo) {
    return [data.photo];
  }

  if (data.image_url) {
    return [data.image_url];
  }

  if (data.image) {
    return [data.image];
  }

  return [FALLBACK_PHOTO];
}


function getCurrentUserSafe() {
  if (typeof getCurrentUser === 'function') {
    return getCurrentUser();
  }

  return null;
}


// ============================================================
// MAIN
// ============================================================

(async function () {

  const params = new URLSearchParams(window.location.search);
  const requestedId = params.get('id');

  const mainEl = document.querySelector('main.wrap');


  // ==========================================================
  // NOT FOUND
  // ==========================================================

  function showNotFound(message) {

    if (!mainEl) return;

    mainEl.innerHTML = `
      <div
        style="
          max-width:480px;
          margin:80px auto;
          text-align:center;
          font-family:'DM Sans',sans-serif;
        "
      >
        <h2 style="margin-bottom:10px;">
          ${escapeHtml(message)}
        </h2>

        <a
          href="browse.html"
          style="
            color:var(--sage,#4E8C6B);
            font-weight:700;
          "
        >
          ← Kembali ke Jelajahi Barang
        </a>
      </div>
    `;
  }


  if (!requestedId) {
    showNotFound('Barang tidak ditemukan.');
    return;
  }


  // ==========================================================
  // AMBIL BARANG DARI SUPABASE
  // ==========================================================

  let item = null;

  try {

    const {
      data,
      error
    } = await supabaseClient
      .from('items')
      .select('*')
      .eq('id', requestedId)
      .single();


    if (error) {
      console.error('Gagal mengambil barang:', error);
    }


    if (!error && data) {

      item = {
        ...data,

        photos: getItemPhotos(data),

        tags: Array.isArray(data.tags)
          ? data.tags
          : [],

        owner:
          data.owner ||
          data.owner_name ||
          'Pengguna Re:Use.ID',

        avatar:
          data.avatar ||
          data.owner_avatar ||
          FALLBACK_AVATAR,

        rating:
          data.rating ||
          5,

        memberSince:
          data.member_since ||
          (
            data.created_at
              ? new Date(data.created_at)
                  .getFullYear()
                  .toString()
              : '-'
          ),

        jarak:
          data.jarak || 0
      };
    }

  } catch (err) {

    console.error(
      'Gagal memuat barang dari Supabase:',
      err
    );
  }


  if (!item) {

    showNotFound(
      'Barang tidak ditemukan atau sudah dihapus.'
    );

    return;
  }


  // ==========================================================
  // GEOLOCATION
  // ==========================================================

  let userLoc = null;

  try {

    if (typeof getUserLocation === 'function') {
      userLoc = await getUserLocation();
    }

  } catch (err) {

    console.warn(
      'Lokasi pengguna tidak tersedia:',
      err
    );

  }


  // ==========================================================
  // RENDER INFO BARANG
  // ==========================================================

  document.title =
    `${item.name} | Re:Use.ID`;


  const badgeEl =
    document.getElementById('itemBadge');

  if (badgeEl) {

    badgeEl.textContent =
      String(item.jenis || 'Barang').toUpperCase();

    badgeEl.classList.remove(
      'barter',
      'donasi'
    );

    badgeEl.classList.add(
      item.jenis === 'Barter'
        ? 'barter'
        : 'donasi'
    );
  }


  const itemNameEl =
    document.getElementById('itemName');

  if (itemNameEl) {
    itemNameEl.textContent =
      item.name || 'Tanpa nama';
  }


  const starCount = {
    'Layak':3,
    'Baik':4,
    'Sangat Baik':5
  }[item.kondisi] || 4;


  const conditionEl =
    document.getElementById('itemCondition');

  if (conditionEl) {

    conditionEl.innerHTML = `
      Kondisi: ${escapeHtml(item.kondisi || '-')}
      <span class="stars">
        ${'⭐'.repeat(starCount)}
      </span>
    `;
  }


  const descriptionEl =
    document.getElementById('itemDescription');

  if (descriptionEl) {
    descriptionEl.textContent =
      item.description || 'Tidak ada deskripsi.';
  }


  const tagsEl =
    document.getElementById('itemTags');

  if (tagsEl) {

    tagsEl.innerHTML =
      (item.tags || [])
        .map(
          tag =>
            `<span class="tag">#${escapeHtml(tag)}</span>`
        )
        .join('');
  }


  const ownerAvatarEl =
    document.getElementById('ownerAvatar');

  if (ownerAvatarEl) {

    ownerAvatarEl.src =
      item.avatar;

    ownerAvatarEl.alt =
      item.owner;
  }


  const ownerNameEl =
    document.getElementById('ownerName');

  if (ownerNameEl) {

    ownerNameEl.textContent =
      item.owner;
  }


  const ownerRatingEl =
    document.getElementById('ownerRating');

  if (ownerRatingEl) {

    ownerRatingEl.innerHTML =
      `⭐ ${escapeHtml(item.rating)}/5
       &nbsp;·&nbsp;
       Member sejak ${escapeHtml(item.memberSince)}`;
  }


  // ==========================================================
  // LOCATION
  // ==========================================================

  const locationEl =
    document.getElementById('itemLocation');


  let jarakText = '-';

  try {

    if (
      typeof computeItemDistance === 'function' &&
      userLoc
    ) {

      const jarak =
        computeItemDistance(
          item,
          userLoc
        );

      if (
        typeof jarak === 'number' &&
        !Number.isNaN(jarak)
      ) {

        if (jarak * 1000 < 1000) {

          jarakText =
            `${Math.round(jarak * 1000)}m`;

        } else {

          jarakText =
            `${Number(jarak).toFixed(1)} km`;
        }
      }
    }

  } catch (err) {

    console.warn(
      'Gagal menghitung jarak:',
      err
    );
  }


  if (locationEl) {

    locationEl.textContent =
      `📍 ${jarakText} dari lokasi Anda — ${
        item.lokasi || '-'
      }`;
  }


  // ==========================================================
  // BUTTON
  // ==========================================================

  const btnPrimary =
    document.getElementById('btnAjukanBarter');

  const btnHubungi =
    document.getElementById('btnHubungiPemilik');

  const isDonasi =
    item.jenis === 'Donasi';


  if (isDonasi) {

    if (btnPrimary) {
      btnPrimary.style.display = 'none';
    }

    if (btnHubungi) {

      btnHubungi.classList.remove(
        'btn-outline'
      );

      btnHubungi.classList.add(
        'btn-filled'
      );
    }

  } else {

    if (btnPrimary) {

      btnPrimary.style.display =
        'block';

      btnPrimary.textContent =
        'Ajukan Barter';
    }
  }


  // ==========================================================
  // GALLERY
  // ==========================================================

  const mainPhoto =
    document.getElementById('mainPhoto');

  const thumbRow =
    document.getElementById('thumbRow');


  if (mainPhoto) {

    mainPhoto.src =
      item.photos[0];

    mainPhoto.alt =
      item.name;
  }


  if (thumbRow) {

    thumbRow.innerHTML =
      item.photos
        .map(
          (src, index) => `
            <button
              type="button"
              class="thumb ${
                index === 0
                  ? 'active'
                  : ''
              }"
              data-src="${escapeHtml(src)}"
            >
              <img
                src="${escapeHtml(src)}"
                alt="${escapeHtml(item.name)}
                     — foto ${index + 1}"
              >
            </button>
          `
        )
        .join('');


    thumbRow
      .querySelectorAll('.thumb')
      .forEach(thumb => {

        thumb.addEventListener(
          'click',
          () => {

            if (mainPhoto) {

              mainPhoto.src =
                thumb.dataset.src;
            }

            thumbRow
              .querySelectorAll('.thumb')
              .forEach(
                t =>
                  t.classList.remove(
                    'active'
                  )
              );

            thumb.classList.add(
              'active'
            );
          }
        );

      });
  }


  // ==========================================================
  // BARANG SERUPA
  // ==========================================================

  const similarScroll =
    document.getElementById('similarScroll');


  if (similarScroll) {

    try {

      const {
        data: similarData,
        error: similarError
      } = await supabaseClient
        .from('items')
        .select('*')
        .eq('kategori', item.kategori)
        .eq('status', 'Aktif')
        .neq('id', item.id)
        .order(
          'created_at',
          {
            ascending:false
          }
        )
        .limit(4);


      if (
        similarError ||
        !similarData ||
        similarData.length === 0
      ) {

        similarScroll.innerHTML = `
          <p
            style="
              color:var(--ink-soft,#7A8B85);
            "
          >
            Belum ada barang serupa lainnya.
          </p>
        `;

      } else {

        similarScroll.innerHTML =
          similarData
            .map(sim => {

              const badgeClass =
                sim.jenis === 'Barter'
                  ? 'barter'
                  : 'donasi';

              const cover =
                sim.photo ||
                (
                  Array.isArray(sim.photos)
                    ? sim.photos[0]
                    : null
                ) ||
                sim.image_url ||
                FALLBACK_PHOTO;


              let simJarak =
                sim.jarak || 0;


              try {

                if (
                  typeof computeItemDistance === 'function' &&
                  userLoc
                ) {

                  simJarak =
                    computeItemDistance(
                      sim,
                      userLoc
                    );
                }

              } catch (err) {

                console.warn(
                  'Gagal menghitung jarak barang serupa:',
                  err
                );
              }


              const distanceText =
                typeof simJarak === 'number'
                  ? `${simJarak.toFixed(1)} km`
                  : `${simJarak} km`;


              return `
                <article class="sim-card">

                  <a
                    href="detail.html?id=${encodeURIComponent(sim.id)}"
                    class="sim-photo"
                  >

                    <span
                      class="sim-badge ${badgeClass}"
                    >
                      ${escapeHtml(
                        String(
                          sim.jenis || 'Barang'
                        ).toUpperCase()
                      )}
                    </span>

                    <img
                      src="${escapeHtml(cover)}"
                      alt="${escapeHtml(sim.name || 'Barang')}"
                      loading="lazy"
                    >

                  </a>


                  <div class="sim-body">

                    <div class="sim-title">
                      ${escapeHtml(
                        sim.name || 'Tanpa nama'
                      )}
                    </div>

                    <div class="sim-distance">
                      📍 ${distanceText} —
                      ${escapeHtml(
                        sim.lokasi || '-'
                      )}
                    </div>

                    <a
                      href="detail.html?id=${encodeURIComponent(sim.id)}"
                      class="sim-btn"
                    >
                      Lihat Detail
                    </a>

                  </div>

                </article>
              `;
            })
            .join('');
      }

    } catch (err) {

      console.error(
        'Gagal memuat barang serupa:',
        err
      );

      similarScroll.innerHTML = `
        <p
          style="
            color:var(--ink-soft,#7A8B85);
          "
        >
          Belum ada barang serupa lainnya.
        </p>
      `;
    }
  }


  // ==========================================================
  // REQUIRE LOGIN
  // ==========================================================

  function requireLogin(action) {

    if (
      typeof isLoggedIn === 'function' &&
      isLoggedIn()
    ) {

      action();

    } else {

      window.location.href =
        `login.html?redirect=${encodeURIComponent(
          `detail.html?id=${item.id}`
        )}`;
    }
  }


  // ==========================================================
  // BUKA / BUAT CONVERSATION
  // ==========================================================

  async function openConversation(
    autoMessage = null
  ) {

    const currentUser =
      getCurrentUserSafe();


    if (!currentUser) {

      window.location.href =
        `login.html?redirect=${encodeURIComponent(
          `detail.html?id=${item.id}`
        )}`;

      return;
    }


    if (item.user_id === currentUser.id) {

      alert(
        'Ini barang kamu sendiri, nggak bisa chat sama diri sendiri 🙂'
      );

      return;
    }


    try {

      let conversationId = null;


      // ------------------------------------------------------
      // CARI CONVERSATION YANG SUDAH ADA
      // ------------------------------------------------------

      const {
        data: existing,
        error: findError
      } = await supabaseClient
        .from('conversations')
        .select('id')
        .eq('item_id', item.id)
        .eq('buyer_id', currentUser.id)
        .eq('seller_id', item.user_id)
        .maybeSingle();


      if (findError) {
        throw new Error(
          findError.message
        );
      }


      if (existing) {

        conversationId =
          existing.id;

      } else {

        // ----------------------------------------------------
        // BUAT CONVERSATION BARU
        // ----------------------------------------------------

        const {
          data: created,
          error: createError
        } = await supabaseClient
          .from('conversations')
          .insert({

            item_id:item.id,

            item_name:item.name,

            item_photo:
              item.photos?.[0] ||
              null,

            buyer_id:
              currentUser.id,

            buyer_name:
              currentUser.user_metadata?.full_name ||
              currentUser.user_metadata?.name ||
              (
                typeof getUserName === 'function'
                  ? getUserName()
                  : 'Pengguna'
              ),

            buyer_avatar:
              currentUser.user_metadata?.avatar_url ||
              FALLBACK_AVATAR,

            seller_id:
              item.user_id,

            seller_name:
              item.owner,

            seller_avatar:
              item.avatar

          })
          .select('id')
          .single();


        if (createError) {

          throw new Error(
            createError.message
          );
        }


        conversationId =
          created.id;
      }


      // ------------------------------------------------------
      // PESAN OTOMATIS
      // ------------------------------------------------------

      if (autoMessage) {

        const {
          error:msgError
        } = await supabaseClient
          .from('messages')
          .insert({

            conversation_id:
              conversationId,

            sender_id:
              currentUser.id,

            content:
              autoMessage
          });


        if (msgError) {

          throw new Error(
            msgError.message
          );
        }


        await supabaseClient
          .from('conversations')
          .update({

            last_message:
              autoMessage,

            last_message_at:
              new Date().toISOString()

          })
          .eq(
            'id',
            conversationId
          );
      }


      window.location.href =
        `chat.html?id=${encodeURIComponent(
          conversationId
        )}`;


    } catch (err) {

      console.error(
        'Gagal membuka chat:',
        err
      );

      alert(
        'Gagal membuka chat: ' +
        (
          err.message ||
          err
        )
      );
    }
  }


  // ==========================================================
  // ELEMENT MODAL BARTER
  // ==========================================================

  const barterModal =
    document.getElementById('barterModal');

  const btnCloseBarterModal =
    document.getElementById(
      'btnCloseBarterModal'
    );

  const barterModalOverlay =
    document.getElementById(
      'barterModalOverlay'
    );

  const myItemsList =
    document.getElementById(
      'myItemsList'
    );

  const myItemsLoading =
    document.getElementById(
      'myItemsLoading'
    );

  const myItemsEmpty =
    document.getElementById(
      'myItemsEmpty'
    );

  const barterPhoto =
    document.getElementById(
      'barterPhoto'
    );

  const barterName =
    document.getElementById(
      'barterName'
    );

  const barterDescription =
    document.getElementById(
      'barterDescription'
    );

  const barterPreview =
    document.getElementById(
      'barterPreview'
    );

  const barterPreviewImage =
    document.getElementById(
      'barterPreviewImage'
    );

  const btnRemoveBarterPhoto =
    document.getElementById(
      'btnRemoveBarterPhoto'
    );

  const btnSendOtherOffer =
    document.getElementById(
      'btnSendOtherOffer'
    );


  // ==========================================================
  // MODAL OPEN / CLOSE
  // ==========================================================

  function openBarterModal() {

    if (!barterModal) return;

    barterModal.hidden = false;

    document.body.style.overflow =
      'hidden';

    loadMyBarterItems();
  }


  function closeBarterModal() {

    if (!barterModal) return;

    barterModal.hidden = true;

    document.body.style.overflow =
      '';

    resetOtherBarterForm();
  }


  if (btnCloseBarterModal) {

    btnCloseBarterModal.addEventListener(
      'click',
      closeBarterModal
    );
  }


  if (barterModalOverlay) {

    barterModalOverlay.addEventListener(
      'click',
      closeBarterModal
    );
  }


  document.addEventListener(
    'keydown',
    event => {

      if (
        event.key === 'Escape' &&
        barterModal &&
        !barterModal.hidden
      ) {

        closeBarterModal();
      }

    }
  );


  // ==========================================================
  // LOAD BARANG MILIK USER
  // ==========================================================

  async function loadMyBarterItems() {

    const currentUser =
      getCurrentUserSafe();


    if (!currentUser) return;


    if (myItemsLoading) {

      myItemsLoading.hidden =
        false;
    }


    if (myItemsEmpty) {

      myItemsEmpty.hidden =
        true;
    }


    if (myItemsList) {

      myItemsList.innerHTML =
        '';
    }


    try {

      const {
        data,
        error
      } = await supabaseClient
        .from('items')
        .select('*')
        .eq(
          'user_id',
          currentUser.id
        )
        .eq(
          'status',
          'Aktif'
        )
        .neq(
          'id',
          item.id
        )
        .order(
          'created_at',
          {
            ascending:false
          }
        );


      if (error) {

        throw new Error(
          error.message
        );
      }


      if (myItemsLoading) {

        myItemsLoading.hidden =
          true;
      }


      if (!data || data.length === 0) {

        if (myItemsEmpty) {

          myItemsEmpty.hidden =
            false;
        }

        return;
      }


      if (!myItemsList) return;


      myItemsList.innerHTML =
        data
          .map(myItem => {

            const photos =
              getItemPhotos(myItem);

            const photo =
              photos[0] ||
              FALLBACK_PHOTO;


            return `
              <button
                type="button"
                class="barter-item-card"
                data-item-id="${escapeHtml(myItem.id)}"
              >

                <img
                  class="barter-item-photo"
                  src="${escapeHtml(photo)}"
                  alt="${escapeHtml(
                    myItem.name || 'Barang'
                  )}"
                >

                <div class="barter-item-info">

                  <div class="barter-item-name">
                    ${escapeHtml(
                      myItem.name || 'Tanpa nama'
                    )}
                  </div>

                  <div class="barter-item-condition">
                    ${escapeHtml(
                      myItem.kondisi || '-'
                    )}
                  </div>

                </div>

              </button>
            `;
          })
          .join('');


      myItemsList
        .querySelectorAll(
          '.barter-item-card'
        )
        .forEach(card => {

          card.addEventListener(
            'click',
            async () => {

              const itemId =
                card.dataset.itemId;

              await createBarterOfferFromExistingItem(
                itemId
              );
            }
          );

        });


    } catch (err) {

      console.error(
        'Gagal memuat barang user:',
        err
      );


      if (myItemsLoading) {

        myItemsLoading.hidden =
          true;
      }


      if (myItemsEmpty) {

        myItemsEmpty.hidden =
          false;

        myItemsEmpty.textContent =
          'Gagal memuat barangmu.';
      }
    }
  }


  // ==========================================================
  // CREATE CONVERSATION KHUSUS BARTER
  // ==========================================================

  async function getOrCreateConversation() {

    const currentUser =
      getCurrentUserSafe();


    if (!currentUser) {

      throw new Error(
        'Kamu harus login terlebih dahulu.'
      );
    }


    const {
      data:existing,
      error:findError
    } = await supabaseClient
      .from('conversations')
      .select('id')
      .eq(
        'item_id',
        item.id
      )
      .eq(
        'buyer_id',
        currentUser.id
      )
      .eq(
        'seller_id',
        item.user_id
      )
      .maybeSingle();


    if (findError) {

      throw new Error(
        findError.message
      );
    }


    if (existing) {

      return existing.id;
    }


    const {
      data:created,
      error:createError
    } = await supabaseClient
      .from('conversations')
      .insert({

        item_id:
          item.id,

        item_name:
          item.name,

        item_photo:
          item.photos?.[0] ||
          null,

        buyer_id:
          currentUser.id,

        buyer_name:
          currentUser.user_metadata?.full_name ||
          currentUser.user_metadata?.name ||
          (
            typeof getUserName === 'function'
              ? getUserName()
              : 'Pengguna'
          ),

        buyer_avatar:
          currentUser.user_metadata?.avatar_url ||
          FALLBACK_AVATAR,

        seller_id:
          item.user_id,

        seller_name:
          item.owner,

        seller_avatar:
          item.avatar
      })
      .select('id')
      .single();


    if (createError) {

      throw new Error(
        createError.message
      );
    }


    return created.id;
  }


  // ==========================================================
  // BARTER DARI BARANG YANG SUDAH ADA
  // ==========================================================

  async function createBarterOfferFromExistingItem(
    offeredItemId
  ) {

    const currentUser =
      getCurrentUserSafe();


    if (!currentUser) {

      window.location.href =
        `login.html?redirect=${encodeURIComponent(
          `detail.html?id=${item.id}`
        )}`;

      return;
    }


    if (item.user_id === currentUser.id) {

      alert(
        'Kamu tidak bisa mengajukan barter untuk barangmu sendiri.'
      );

      return;
    }


    try {

      const {
        data:offeredItem,
        error:itemError
      } = await supabaseClient
        .from('items')
        .select('*')
        .eq(
          'id',
          offeredItemId
        )
        .eq(
          'user_id',
          currentUser.id
        )
        .eq(
          'status',
          'Aktif'
        )
        .single();


      if (itemError || !offeredItem) {

        throw new Error(
          itemError?.message ||
          'Barang yang dipilih tidak ditemukan.'
        );
      }


      const conversationId =
        await getOrCreateConversation();


      // ------------------------------------------------------
      // CEK PENAWARAN PENDING YANG SAMA
      // ------------------------------------------------------

      const {
        data:existingOffer,
        error:existingOfferError
      } = await supabaseClient
        .from('barter_offers')
        .select('id,status')
        .eq(
          'item_id',
          item.id
        )
        .eq(
          'offered_item_id',
          offeredItem.id
        )
        .eq(
          'proposer_id',
          currentUser.id
        )
        .eq(
          'status',
          'pending'
        )
        .maybeSingle();


      if (existingOfferError) {

        throw new Error(
          existingOfferError.message
        );
      }


      if (existingOffer) {

        window.location.href =
          `chat.html?id=${encodeURIComponent(
            conversationId
          )}`;

        return;
      }


      const offeredPhotos =
        getItemPhotos(offeredItem);


      // ------------------------------------------------------
      // BUAT BARTER OFFER
      // ------------------------------------------------------

      const {
        data:offer,
        error:offerError
      } = await supabaseClient
        .from('barter_offers')
        .insert({

          item_id:
            item.id,

          offered_item_id:
            offeredItem.id,

          offered_name:
            offeredItem.name,

          offered_description:
            offeredItem.description ||
            null,

          offered_photo_path:
            offeredPhotos[0] ||
            null,

          proposer_id:
            currentUser.id,

          owner_id:
            item.user_id,

          status:
            'pending'

        })
        .select('id')
        .single();


      if (offerError) {

        throw new Error(
          offerError.message
        );
      }


      // ------------------------------------------------------
      // KIRIM PESAN KE CHAT
      // ------------------------------------------------------

      const message =
        `🔄 Saya mengajukan barter untuk "${item.name}" dengan barang saya: "${offeredItem.name}".`;


      const {
        error:messageError
      } = await supabaseClient
        .from('messages')
        .insert({

          conversation_id:
            conversationId,

          sender_id:
            currentUser.id,

          content:
            message
        });


      if (messageError) {

        throw new Error(
          messageError.message
        );
      }


      await supabaseClient
        .from('conversations')
        .update({

          last_message:
            message,

          last_message_at:
            new Date().toISOString()

        })
        .eq(
          'id',
          conversationId
        );


      closeBarterModal();


      window.location.href =
        `chat.html?id=${encodeURIComponent(
          conversationId
        )}&barter=${encodeURIComponent(
          offer.id
        )}`;


    } catch (err) {

      console.error(
        'Gagal membuat penawaran barter:',
        err
      );

      alert(
        'Gagal mengirim penawaran barter: ' +
        (
          err.message ||
          err
        )
      );
    }
  }


  // ==========================================================
  // PREVIEW FOTO BARANG LAIN
  // ==========================================================

  if (barterPhoto) {

    barterPhoto.addEventListener(
      'change',
      () => {

        const file =
          barterPhoto.files?.[0];


        if (!file) return;


        const allowedTypes = [
          'image/jpeg',
          'image/png',
          'image/webp'
        ];


        if (
          !allowedTypes.includes(
            file.type
          )
        ) {

          alert(
            'Foto harus berupa JPG, PNG, atau WEBP.'
          );

          barterPhoto.value =
            '';

          return;
        }


        const maxSize =
          5 * 1024 * 1024;


        if (file.size > maxSize) {

          alert(
            'Ukuran foto maksimal 5 MB.'
          );

          barterPhoto.value =
            '';

          return;
        }


        const reader =
          new FileReader();


        reader.onload =
          event => {

            if (barterPreviewImage) {

              barterPreviewImage.src =
                event.target.result;
            }


            if (barterPreview) {

              barterPreview.hidden =
                false;
            }
          };


        reader.readAsDataURL(file);
      }
    );
  }


  // ==========================================================
  // REMOVE FOTO
  // ==========================================================

  if (btnRemoveBarterPhoto) {

    btnRemoveBarterPhoto.addEventListener(
      'click',
      () => {

        resetBarterPhoto();
      }
    );
  }


  function resetBarterPhoto() {

    if (barterPhoto) {

      barterPhoto.value =
        '';
    }


    if (barterPreviewImage) {

      barterPreviewImage.src =
        '';
    }


    if (barterPreview) {

      barterPreview.hidden =
        true;
    }
  }


  function resetOtherBarterForm() {

    resetBarterPhoto();


    if (barterName) {

      barterName.value =
        '';
    }


    if (barterDescription) {

      barterDescription.value =
        '';
    }
  }


  // ==========================================================
  // UPLOAD BARANG LAIN
  // ==========================================================

  async function createBarterOfferFromOtherItem() {

    const currentUser =
      getCurrentUserSafe();


    if (!currentUser) {

      window.location.href =
        `login.html?redirect=${encodeURIComponent(
          `detail.html?id=${item.id}`
        )}`;

      return;
    }


    if (item.user_id === currentUser.id) {

      alert(
        'Kamu tidak bisa mengajukan barter untuk barangmu sendiri.'
      );

      return;
    }


    const file =
      barterPhoto?.files?.[0];


    const name =
      barterName?.value.trim();


    const description =
      barterDescription?.value.trim();


    // --------------------------------------------------------
    // VALIDASI
    // --------------------------------------------------------

    if (!file) {

      alert(
        'Silakan pilih foto barang yang ingin ditawarkan.'
      );

      return;
    }


    if (!name) {

      alert(
        'Nama barang wajib diisi.'
      );

      barterName?.focus();

      return;
    }


    if (name.length < 2) {

      alert(
        'Nama barang terlalu pendek.'
      );

      barterName?.focus();

      return;
    }


    if (!description) {

      alert(
        'Deskripsi barang wajib diisi.'
      );

      barterDescription?.focus();

      return;
    }


    try {

      if (btnSendOtherOffer) {

        btnSendOtherOffer.disabled =
          true;

        btnSendOtherOffer.textContent =
          'Mengirim...';
      }


      // ------------------------------------------------------
      // BUAT CONVERSATION
      // ------------------------------------------------------

      const conversationId =
        await getOrCreateConversation();


      // ------------------------------------------------------
      // CEK PENAWARAN PENDING
      // ------------------------------------------------------

      const {
        data:existingOffer,
        error:existingOfferError
      } = await supabaseClient
        .from('barter_offers')
        .select('id,status')
        .eq(
          'item_id',
          item.id
        )
        .eq(
          'proposer_id',
          currentUser.id
        )
        .eq(
          'status',
          'pending'
        )
        .maybeSingle();


      if (existingOfferError) {

        throw new Error(
          existingOfferError.message
        );
      }


      if (existingOffer) {

        alert(
          'Kamu masih memiliki penawaran barter yang sedang menunggu respons untuk barang ini.'
        );

        window.location.href =
          `chat.html?id=${encodeURIComponent(
            conversationId
          )}`;

        return;
      }


      // ------------------------------------------------------
      // NAMA FILE AMAN
      // ------------------------------------------------------

      const extension =
        file.name
          .split('.')
          .pop()
          .toLowerCase();


      const safeExtension =
        ['jpg','jpeg','png','webp']
          .includes(extension)
          ? extension
          : 'jpg';


      const randomName =
        `${crypto.randomUUID()}.${safeExtension}`;


      const storagePath =
        `${currentUser.id}/${randomName}`;


      // ------------------------------------------------------
      // UPLOAD KE STORAGE
      // ------------------------------------------------------

      const {
        error:uploadError
      } = await supabaseClient
        .storage
        .from('barter-offers')
        .upload(
          storagePath,
          file,
          {
            cacheControl:'3600',
            upsert:false,
            contentType:file.type
          }
        );


      if (uploadError) {

        throw new Error(
          'Gagal upload foto: ' +
          uploadError.message
        );
      }


      // ------------------------------------------------------
      // SIMPAN PENAWARAN
      // ------------------------------------------------------

      const {
        data:offer,
        error:offerError
      } = await supabaseClient
        .from('barter_offers')
        .insert({

          item_id:
            item.id,

          offered_item_id:
            null,

          offered_name:
            name,

          offered_description:
            description,

          offered_photo_path:
            storagePath,

          proposer_id:
            currentUser.id,

          owner_id:
            item.user_id,

          status:
            'pending'

        })
        .select('id')
        .single();


      if (offerError) {

        // Jika DB gagal, hapus file yang baru saja diupload
        await supabaseClient
          .storage
          .from('barter-offers')
          .remove([
            storagePath
          ]);


        throw new Error(
          offerError.message
        );
      }


      // ------------------------------------------------------
      // KIRIM PESAN
      // ------------------------------------------------------

      const message =
        `🔄 Saya mengajukan barter untuk "${item.name}" dengan barang "${name}".`;


      const {
        error:messageError
      } = await supabaseClient
        .from('messages')
        .insert({

          conversation_id:
            conversationId,

          sender_id:
            currentUser.id,

          content:
            message
        });


      if (messageError) {

        throw new Error(
          messageError.message
        );
      }


      await supabaseClient
        .from('conversations')
        .update({

          last_message:
            message,

          last_message_at:
            new Date().toISOString()

        })
        .eq(
          'id',
          conversationId
        );


      closeBarterModal();


      window.location.href =
        `chat.html?id=${encodeURIComponent(
          conversationId
        )}&barter=${encodeURIComponent(
          offer.id
        )}`;


    } catch (err) {

      console.error(
        'Gagal membuat penawaran barter:',
        err
      );

      alert(
        'Gagal mengirim penawaran barter: ' +
        (
          err.message ||
          err
        )
      );


    } finally {

      if (btnSendOtherOffer) {

        btnSendOtherOffer.disabled =
          false;

        btnSendOtherOffer.textContent =
          'Kirim Penawaran Barter';
      }
    }
  }


  // ==========================================================
  // BUTTON KIRIM BARANG LAIN
  // ==========================================================

  if (btnSendOtherOffer) {

    btnSendOtherOffer.addEventListener(
      'click',
      () => {

        requireLogin(
          createBarterOfferFromOtherItem
        );

      }
    );
  }


  // ==========================================================
  // BUTTON AJUKAN BARTER
  // ==========================================================

  if (btnPrimary && !isDonasi) {

    btnPrimary.addEventListener(
      'click',
      () => {

        requireLogin(
          () => {

            const currentUser =
              getCurrentUserSafe();


            if (
              currentUser &&
              item.user_id === currentUser.id
            ) {

              alert(
                'Kamu tidak bisa mengajukan barter pada barangmu sendiri 🙂'
              );

              return;
            }


            openBarterModal();

          }
        );

      }
    );
  }


  // ==========================================================
  // BUTTON HUBUNGI PEMILIK
  // ==========================================================

  if (btnHubungi) {

    btnHubungi.addEventListener(
      'click',
      () => {

        requireLogin(
          () => {

            openConversation(null);

          }
        );

      }
    );
  }


})();