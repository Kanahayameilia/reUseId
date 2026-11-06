// Kartu "Kuota Transaksi" di tab Pengaturan profil.
// Kalau   belum dijalankan, kartunya tetap tersembunyi.
onAuthReady(async () => {
  if (!isLoggedIn()) return;
  const { data, error } = await supabaseClient.rpc("my_tx_quota");
  const row = Array.isArray(data) ? data[0] : data;
  if (error || !row) return;

  const sisa = Math.max(0, row.batas_gratis - row.terpakai);
  document.getElementById("quotaText").textContent =
    `Bulan ini: ${Math.min(row.terpakai, row.batas_gratis)} dari ${row.batas_gratis} transaksi gratis terpakai ` +
    `(sisa ${sisa}). Kredit tambahan: ${row.kredit}.`;
  document.getElementById("quotaCard").hidden = false;
});
