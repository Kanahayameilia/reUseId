// Data barang bersama — dipakai di halaman browse (listing) dan detail.
// Di app nyata, ini akan diganti dengan hasil fetch dari API/database.
const ITEMS = [
  {
    id:1, name:"Jaket Denim Oversize", kategori:"Pakaian", jenis:"Barter", kondisi:"Sangat Baik",
    jarak:0.5, lokasi:"Kos Tidar Utara, Magelang",
    owner:"Rani A.", avatar:"https://i.pravatar.cc/80?img=32", rating:4.8, memberSince:"2024",
    description:"Jaket denim oversize warna biru washed, jarang dipakai (cuma 3–4 kali). Ukuran L, cocok buat cewek/cowok yang suka gaya kasual. Nggak ada noda atau sobek, kancing lengkap, bahan tebal dan hangat. Alasan dilepas karena kurang cocok sama gaya sehari-hari.",
    tags:["Pakaian","Jaket","Denim","Unisex"],
    photos:[
      "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=900&h=900&fit=crop",
      "https://images.unsplash.com/photo-1544966503-7cc5ac882d5f?w=900&h=900&fit=crop",
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=900&h=900&fit=crop",
      "https://images.unsplash.com/photo-1523205771623-e0faa4d2813d?w=900&h=900&fit=crop"
    ],
    photo:"https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&h=400&fit=crop"
  },
  {
    id:2, name:"Buku Kalkulus II", kategori:"Buku", jenis:"Donasi", kondisi:"Sangat Baik",
    jarak:0.4, lokasi:"Perpus Kampus, Magelang",
    owner:"Dimas P.", avatar:"https://i.pravatar.cc/80?img=12", rating:4.9, memberSince:"2023",
    description:"Buku Kalkulus II edisi terbaru, dipakai satu semester aja, kondisi seperti baru tanpa coretan. Cocok buat mahasiswa Teknik/MIPA semester awal. Didonasikan gratis, siapa cepat dia dapat.",
    tags:["Buku","Kalkulus","Kuliah"],
    photos:[
      "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=900&h=900&fit=crop",
      "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=900&h=900&fit=crop"
    ],
    photo:"https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=400&fit=crop"
  },
  {
    id:3, name:"Lampu Meja LED", kategori:"Elektronik", jenis:"Barter", kondisi:"Baik",
    jarak:0.8, lokasi:"Kos Melati, Magelang",
    owner:"Sari W.", avatar:"https://i.pravatar.cc/80?img=45", rating:4.6, memberSince:"2024",
    description:"Lampu meja LED 3 tingkat kecerahan, colokan USB, masih nyala normal. Ada sedikit baret di dudukan tapi nggak ganggu fungsi. Mau ditukar sama barang lain yang sepadan.",
    tags:["Elektronik","Lampu","Belajar"],
    photos:[
      "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=900&h=900&fit=crop",
      "https://images.unsplash.com/photo-1517991104123-1d56a6e81ed9?w=900&h=900&fit=crop"
    ],
    photo:"https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400&h=400&fit=crop"
  },
  {
    id:4, name:"Meja Belajar Lipat", kategori:"Perabot", jenis:"Donasi", kondisi:"Layak",
    jarak:2.1, lokasi:"Sekretariat BEM, Magelang",
    owner:"Fajar N.", avatar:"https://i.pravatar.cc/80?img=8", rating:4.5, memberSince:"2022",
    description:"Meja belajar lipat kayu, cukup buat laptop + buku. Ada beberapa goresan wajar karena pemakaian tapi masih kokoh dan aman dipakai. Didonasikan karena mau pindah kos.",
    tags:["Perabot","Meja","Belajar"],
    photos:[
      "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=900&h=900&fit=crop",
      "https://images.unsplash.com/photo-1594620302200-9a762244a156?w=900&h=900&fit=crop"
    ],
    photo:"https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=400&h=400&fit=crop"
  },
  {
    id:5, name:"Kemeja Flanel Kotak", kategori:"Pakaian", jenis:"Barter", kondisi:"Sangat Baik",
    jarak:1.2, lokasi:"Kos Anggrek, Magelang",
    owner:"Bagas T.", avatar:"https://i.pravatar.cc/80?img=15", rating:4.7, memberSince:"2024",
    description:"Kemeja flanel motif kotak merah-hitam, ukuran M, bahan tebal cocok buat cuaca dingin. Baru dipakai dua kali, masih wangi. Terbuka buat barter sama pakaian lain ukuran serupa.",
    tags:["Pakaian","Kemeja","Flanel"],
    photos:[
      "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=900&h=900&fit=crop",
      "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=900&h=900&fit=crop"
    ],
    photo:"https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=400&h=400&fit=crop"
  },
  {
    id:6, name:"Novel Fiksi Bekas (5 buku)", kategori:"Buku", jenis:"Donasi", kondisi:"Baik",
    jarak:0.6, lokasi:"Kos Mawar, Magelang",
    owner:"Intan R.", avatar:"https://i.pravatar.cc/80?img=25", rating:4.9, memberSince:"2023",
    description:"Paket 5 novel fiksi (romance & fantasi), kondisi bagus, cuma ada sedikit lipatan di sampul. Cocok buat yang suka baca santai. Didonasikan sekaligus, nggak dijual satuan.",
    tags:["Buku","Novel","Fiksi"],
    photos:[
      "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=900&h=900&fit=crop",
      "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=900&h=900&fit=crop"
    ],
    photo:"https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&h=400&fit=crop"
  },
  {
    id:7, name:"Kabel & Charger Laptop", kategori:"Elektronik", jenis:"Barter", kondisi:"Layak",
    jarak:1.5, lokasi:"Kos Tidar, Magelang",
    owner:"Yoga S.", avatar:"https://i.pravatar.cc/80?img=51", rating:4.4, memberSince:"2022",
    description:"Charger laptop universal + kabel HDMI, masih berfungsi normal. Ada sedikit selotip di ujung kabel buat jaga-jaga tapi nggak ganggu. Mau tukar sama aksesoris elektronik lain.",
    tags:["Elektronik","Charger","Aksesoris"],
    photos:[
      "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=900&h=900&fit=crop",
      "https://images.unsplash.com/photo-1517991104123-1d56a6e81ed9?w=900&h=900&fit=crop"
    ],
    photo:"https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=400&h=400&fit=crop"
  },
  {
    id:8, name:"Rak Buku Kayu Kecil", kategori:"Perabot", jenis:"Barter", kondisi:"Baik",
    jarak:3.4, lokasi:"Kos Melati, Magelang",
    owner:"Citra D.", avatar:"https://i.pravatar.cc/80?img=38", rating:4.6, memberSince:"2023",
    description:"Rak buku kayu 3 tingkat, muat sekitar 20-an buku. Kondisi kokoh, ada sedikit warna pudar di bagian atas. Mau ditukar sama perabot kos lain yang sepadan.",
    tags:["Perabot","Rak","Kayu"],
    photos:[
      "https://images.unsplash.com/photo-1594620302200-9a762244a156?w=900&h=900&fit=crop",
      "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=900&h=900&fit=crop"
    ],
    photo:"https://images.unsplash.com/photo-1594620302200-9a762244a156?w=400&h=400&fit=crop"
  },
  {
    id:9, name:"Tas Ransel Kampus", kategori:"Pakaian", jenis:"Donasi", kondisi:"Sangat Baik",
    jarak:0.9, lokasi:"Kos Anggrek, Magelang",
    owner:"Reza M.", avatar:"https://i.pravatar.cc/80?img=60", rating:4.8, memberSince:"2024",
    description:"Tas ransel kampus warna hitam, muat laptop 14 inch + buku. Resleting semua lancar, tali masih kuat. Didonasikan karena sudah beli tas baru.",
    tags:["Pakaian","Tas","Ransel"],
    photos:[
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=900&h=900&fit=crop",
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=900&h=900&fit=crop"
    ],
    photo:"https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop"
  },
];