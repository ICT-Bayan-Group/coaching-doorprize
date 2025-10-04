# Bayan Run 2025 Doorprize Random Name Picker

Aplikasi web untuk pengundian doorprize secara acak, mendukung multi-winner, manajemen peserta & hadiah, serta tampilan display untuk proyektor. Dibangun dengan React, TypeScript, Vite, dan Tailwind CSS.

## Tech Stack

<p align="left">
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg" alt="React" width="40" />
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg" alt="TypeScript" width="40" />
  <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/Vitejs-logo.svg/1200px-Vitejs-logo.svg.png" alt="Vite" width="40" />
  <img src="https://www.svgrepo.com/show/374118/tailwind.svg" alt="Tailwind CSS" width="40" />
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/eslint/eslint-original.svg" alt="ESLint" width="40" />
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg" alt="Node.js" width="40" />
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/express/express-original.svg" alt="Express" width="40" />
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/socketio/socketio-original.svg" alt="Socket.IO" width="40" />
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/firebase/firebase-plain.svg" alt="Firebase" width="40" />
</p>

- **React**: Library UI untuk membangun antarmuka interaktif.
- **TypeScript**: Superset JavaScript dengan static typing.
- **Vite**: Build tool & dev server super cepat.
- **Tailwind CSS**: Utility-first CSS framework untuk styling responsif.
- **Framer Motion**: Animasi React modern.
- **Lucide React**: Icon SVG stylish.
- **PapaParse**: Parsing file CSV.
- **react-confetti**: Efek confetti untuk perayaan pemenang.
- **Node.js & Express**: Backend server untuk upload gambar hadiah dan integrasi realtime.
- **Socket.IO**: Komunikasi realtime antar browser/device (DisplayPage & AdminPage).
- **Firebase**: (Opsional) Sinkronisasi data peserta, pemenang, dan hadiah.

## Fitur Utama

- Manajemen peserta (tambah, hapus, import CSV/TXT)
- Manajemen hadiah (tambah, edit, hapus, quota, upload gambar hadiah)
- Pengundian acak single/multi-winner
- Export & print daftar pemenang
- Tampilan display khusus untuk proyektor
- Customisasi tema warna & logo event
- Lock/unlock kontrol admin
- **Realtime sync** antar browser/device (Admin & Display) via Socket.IO + Firebase
- **Upload gambar hadiah** langsung tampil di DisplayPage tanpa reload

## Struktur Project

```
src/
  components/      // Komponen UI utama (DrawingArea, ParticipantManager, PrizeManager, dll)
  hooks/           // Custom hooks (useLocalStorage)
  pages/           // Halaman utama (AdminPage, DisplayPage)
  types/           // Tipe data TypeScript
  utils/           // Utility (animations, fileHandling)
```

## Cara Menjalankan Project

1. **Clone repository**
   ```sh
   git clone <repo-url>
   cd bayanrun-doorprize
   ```

2. **Install dependencies frontend**
   ```sh
   npm install
   ```

3. **Install dependencies backend**
   ```sh
   cd server
   npm install
   cd ..
   ```

4. **Jalankan backend server**
   ```sh
   npm run server
   ```

5. **Jalankan development server frontend**
   ```sh
   npm run dev
   ```
   Buka [http://localhost:5173](http://localhost:5173) di browser.

6. **Build untuk produksi**
   ```sh
   npm run build
   ```

7. **Preview hasil build**
   ```sh
   npm run preview
   ```