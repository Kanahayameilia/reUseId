// ---------- daftar kampus untuk autocomplete ----------
// daftar kampus ada di auth.js (MAGELANG_CAMPUSES): cuma perguruan tinggi di Kota & Kab. Magelang
const campuses = MAGELANG_CAMPUSES;

const campusInput = document.getElementById("campus");
const campusList = document.getElementById("campusList");
let highlightedIndex = -1;

function renderCampusList() {
  const query = campusInput.value.trim().toLowerCase();
  highlightedIndex = -1;

  // daftar cuma 8 kampus, jadi kalau kosong tampilkan semuanya
  const matches = campuses.filter((c) => c.toLowerCase().includes(query));

  if (matches.length === 0) {
    campusList.innerHTML = `<div class="autocomplete-empty">Kampus ini belum tersedia. Re:Use.ID saat ini baru untuk perguruan tinggi di Magelang.</div>`;
    campusList.hidden = false;
    return;
  }

  campusList.innerHTML = matches
    .map((c) => `<div class="autocomplete-item">${c}</div>`)
    .join("");
  campusList.hidden = false;

  campusList.querySelectorAll(".autocomplete-item").forEach((item) => {
    item.addEventListener("click", () => {
      campusInput.value = item.textContent;
      campusList.hidden = true;
      clearError("campus");
    });
  });
}

campusInput.addEventListener("input", renderCampusList);
campusInput.addEventListener("focus", renderCampusList);

campusInput.addEventListener("keydown", (e) => {
  const items = campusList.querySelectorAll(".autocomplete-item");
  if (campusList.hidden || items.length === 0) return;

  if (e.key === "ArrowDown") {
    e.preventDefault();
    highlightedIndex = Math.min(highlightedIndex + 1, items.length - 1);
    updateHighlight(items);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    highlightedIndex = Math.max(highlightedIndex - 1, 0);
    updateHighlight(items);
  } else if (e.key === "Enter" && highlightedIndex >= 0) {
    e.preventDefault();
    campusInput.value = items[highlightedIndex].textContent;
    campusList.hidden = true;
  } else if (e.key === "Escape") {
    campusList.hidden = true;
  }
});

function updateHighlight(items) {
  items.forEach((item, i) =>
    item.classList.toggle("highlighted", i === highlightedIndex),
  );
  items[highlightedIndex]?.scrollIntoView({ block: "nearest" });
}

document.addEventListener("click", (e) => {
  if (!e.target.closest(".autocomplete-field")) {
    campusList.hidden = true;
  }
});

// ---------- toggle show/hide password ----------
document.querySelectorAll(".toggle-eye").forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = document.getElementById(btn.dataset.target);
    target.type = target.type === "password" ? "text" : "password";
  });
});

// ---------- validasi form ----------
const form = document.getElementById("signupForm");

function showError(field, message) {
  document.getElementById(`err-${field}`).textContent = message;
  document.getElementById(field)?.classList.add("invalid");
}
function clearError(field) {
  const errEl = document.getElementById(`err-${field}`);
  if (errEl) errEl.textContent = "";
  document.getElementById(field)?.classList.remove("invalid");
}
function clearAllErrors() {
  [
    "fullName",
    "email",
    "password",
    "confirmPassword",
    "campus",
    "agree",
  ].forEach(clearError);
}

form.querySelectorAll("input").forEach((input) => {
  input.addEventListener("input", () => clearError(input.id));
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearAllErrors();

  const fullName = document.getElementById("fullName").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;
  const campus = campusInput.value.trim();
  const agree = document.getElementById("agree").checked;

  let hasError = false;

  if (fullName.length < 2) {
    showError("fullName", "Masukkan nama lengkap kamu.");
    hasError = true;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showError("email", "Format email nggak valid.");
    hasError = true;
  }
  if (password.length < 8) {
    showError("password", "Password minimal 8 karakter.");
    hasError = true;
  }
  if (confirmPassword !== password || confirmPassword === "") {
    showError("confirmPassword", "Konfirmasi password nggak cocok.");
    hasError = true;
  }
  if (!campuses.some((c) => c.toLowerCase() === campus.toLowerCase())) {
    showError(
      "campus",
      "Re:Use.ID saat ini baru untuk perguruan tinggi di Magelang. Pilih kampusmu dari daftar.",
    );
    hasError = true;
  }
  if (!agree) {
    showError("agree", "Kamu harus menyetujui Syarat & Ketentuan dulu.");
    hasError = true;
  }

  if (hasError) return;

  // ---------- daftar beneran ke Supabase ----------
  const submitBtn = form.querySelector(".btn-submit");
  submitBtn.disabled = true;
  submitBtn.textContent = "Mendaftarkan…";

  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, campus: campus },
    },
  });

  if (error) {
    submitBtn.disabled = false;
    submitBtn.textContent = "Daftar";
    showError(
      "email",
      error.message.includes("already registered") ||
        error.message.includes("exists")
        ? "Email ini sudah terdaftar."
        : "Gagal mendaftar: " + error.message,
    );
    return;
  }

  // Kalau project Supabase-nya mewajibkan konfirmasi email, signUp() TIDAK
  // langsung bikin session — data.session bakal null sampai user klik link
  // di emailnya. Kalau gitu, jangan langsung ke browse.html, kasih tau dulu.
  if (!data.session) {
    submitBtn.textContent = "Cek email kamu ✓";
    showError(
      "email",
      "Akun dibuat. Cek email kamu untuk konfirmasi sebelum login.",
    );
    return;
  }

  submitBtn.textContent = "Berhasil ✓ Mengalihkan…";
  await setLoggedIn();
  setTimeout(() => {
    window.location.href = "browse.html";
  }, 600);
});

// ---------- Masuk dengan Google ----------
const googleBtn = document.querySelector(".btn-google");
googleBtn?.addEventListener("click", () => signInWithGoogle(googleBtn));
