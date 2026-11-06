// Kartu "Kuota Transaksi" di tab Pengaturan profil.
// Kalau migrasi SQL kredit belum dijalankan, kartunya tetap tersembunyi.
onAuthReady(async () => {
  if (!isLoggedIn()) return;
  const { data, error } = await supabaseClient.rpc("my_tx_quota");
  const row = Array.isArray(data) ? data[0] : data;
  if (error || !row) return;

  let teks;
  if (row.langganan_sampai) {
    const sampai = new Date(row.langganan_sampai).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    teks = `Langganan aktif sampai ${sampai}. Pengajuan tidak terbatas.`;
  } else {
    const sisa = Math.max(0, row.batas_gratis - row.terpakai);
    teks =
      `Bulan ini: ${Math.min(row.terpakai, row.batas_gratis)} dari ${row.batas_gratis} transaksi gratis terpakai ` +
      `(sisa ${sisa}). Kredit tambahan: ${row.kredit}.`;
  }
  document.getElementById("quotaText").textContent = teks;
  document.getElementById("quotaCard").hidden = false;
});
