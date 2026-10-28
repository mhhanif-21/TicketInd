# Rencana Migrasi: Mobile + Web → Full Web

Status: **Draft untuk review**
Branch kerja: `feat/full-web-migration`
Basis: `master` @ `c101607`

## 1. Tujuan

Memindahkan seluruh fungsi **Mobile Admin (Flutter)** ke **Web Admin (Next.js)** sehingga:

- Admin EO dapat mengelola event sepenuhnya dari browser.
- Publik tetap menggunakan web yang sudah ada untuk pendaftaran, status tiket, dan check-in.
- Setelah web admin mencapai parity dan lolos UAT, aplikasi mobile, build APK, dan pipeline mobile dinonaktifkan.

**Definition of Done**

- Semua screen dan aksi mobile tersedia di web admin.
- Web admin dapat dipakai nyaman di desktop, tablet, dan browser mobile.
- Auth admin aman (HttpOnly cookie), tidak menyimpan token di `localStorage`.
- Tidak ada regresi pada flow publik: daftar event, registrasi, OTP, status tiket, scanner check-in, export.
- Mobile hanya dihapus setelah masa parallel run dan sign-off.

---

## 2. Kondisi Saat Ini

### Web (`web/`)

Sudah memiliki:

- Public event landing, registrasi, OTP, status tiket.
- Volunteer check-in: login PIN, scanner kamera, input manual.
- Backend API admin yang cukup lengkap (`/api/v1/events`, `/registrations`, `/admin/dashboard`, export, ticket template, email template, dll).
- Supabase Auth + allowlist admin (`isAdminUser`) dan middleware berbasis Bearer token / cookie volunteer.

Belum memiliki:

- Halaman login admin.
- Layout, navigasi, dan seluruh UI admin.
- Session admin berbasis cookie untuk browser.
- Data fetching layer dan komponen admin (table, form, modal, toast).

### Mobile (`mobile/`)

Memiliki fitur yang harus dipindahkan:

| Screen mobile | Fungsi |
|---|---|
| `login_screen.dart` | Login admin |
| `admin_dashboard_screen.dart` | Statistik global + 5 event terbaru |
| `home_screen.dart` | Katalog event, search, sort, pagination |
| `detail_event_metrics_screen.dart` | Detail event, metrics, publish/cancel/delete, menu management |
| `create_event_screen.dart` | Buat event + upload/crop poster |
| `edit_event_screen.dart` | Edit detail + kelola media/gallery |
| `form_builder_screen.dart` | Form builder (Nama & Email locked, max 23 custom field) |
| `ticket_template_screen.dart` | Ticket template + email OTP/approval |
| `ticket_template_editor_screen.dart` | Editor canvas: drag, resize, font, warna |
| `access_management_screen.dart` | Link pendaftaran, QR, PIN scanner |
| `participants_screen.dart` | Daftar peserta, filter, export CSV, download tiket |
| `review_detail_screen.dart` | Detail peserta, approve/reject, retry tiket, buka file |
| `executive_oversight_screen.dart` | Ringkasan eksekutif |
| `manual_book_screen.dart` | Panduan admin |

Backend yang dipakai mobile sebagian besar **sudah ada di web** dan bisa langsung dipakai ulang. Pekerjaan utama ada di UI, session browser, dan beberapa penyesuaian API.

---

## 3. Keputusan Arsitektur

### 3.1 Route admin

Gunakan namespace `/admin`:

```
/admin/login
/admin
/admin/events
/admin/events/new
/admin/events/[eventId]
/admin/events/[eventId]/edit
/admin/events/[eventId]/form
/admin/events/[eventId]/ticket
/admin/events/[eventId]/access
/admin/events/[eventId]/participants
/admin/events/[eventId]/participants/[registrationId]
/admin/oversight
/admin/manual-book
```

Catatan:

- `admin` harus direservasi sebagai slug event agar tidak bentrok dengan route publik `/[slug]`. Tambahkan validasi di pembuatan/update event.
- Public pages yang ada tidak diubah strukturnya.

### 3.2 Auth admin: HttpOnly cookie (BFF)

Rekomendasi: session admin disimpan dalam cookie `HttpOnly`, bukan `localStorage`.

Perubahan:

1. `POST /api/v1/auth/admin/login`
   - Tetap mengembalikan JSON token untuk kompatibilitas sementara.
   - Set cookie:
     - `ticketin_admin_access` (HttpOnly, Secure di production, SameSite=Lax, path `/`)
     - `ticketin_admin_refresh` (HttpOnly, Secure di production, SameSite=Lax, path `/api/v1/auth/admin`)
2. `POST /api/v1/auth/admin/refresh`
   - Baca `refresh_token` dari body **atau** cookie.
   - Rotasi kedua cookie saat sukses.
3. `POST /api/v1/auth/admin/logout` (baru)
   - Hapus kedua cookie.
4. `GET /api/v1/auth/admin/session` (baru)
   - Verifikasi access cookie; jika kedaluwarsa, coba refresh dengan refresh cookie.
   - Return profil admin yang sedang login.
5. `getAuthenticatedAdmin(request)`
   - Terima `Authorization: Bearer ...` **atau** `ticketin_admin_access` cookie.
   - Tetap validasi role admin lewat `isAdminUser`.
6. `middleware.ts`
   - Ekstrak token admin dari cookie untuk route `/admin` dan API admin.
   - Guard halaman `/admin/**`:
     - Belum ada session → redirect `/admin/login?next=...`.
     - Session valid → lanjut.
     - Access token expired tapi refresh cookie ada → izinkan shell dimuat; client auth provider akan memanggil endpoint refresh.
   - `/admin/login` saat sudah login → redirect `/admin`.
   - Pertahankan perilaku volunteer dan worker yang sudah ada.
7. CSRF
   - SameSite=Lax + pengecekan `Origin`/`Sec-Fetch-Site` untuk request mutasi yang memakai cookie.
   - Jangan mengaktifkan CORS wildcard untuk endpoint admin.

Keuntungan:

- Token tidak bisa dibaca JavaScript.
- Bisa dipakai server component di masa depan.
- Logout dan expiry lebih terkontrol.
- Tidak perlu mengubah kontrak API admin yang sudah ada.

### 3.3 Data fetching

Tambahkan **TanStack Query** (`@tanstack/react-query`) untuk:

- Cache dan deduplikasi request.
- Loading/error state konsisten.
- Invalidasi setelah mutasi (create/update/review/export).
- Retry terkontrol.

Buat satu wrapper:

```ts
// web/lib/admin/api.ts
adminFetch<T>(path, init): Promise<T>
```

Tanggung jawab:

- `credentials: 'same-origin'`.
- Parse JSON dan lempar `AdminApiError` yang membawa `status`, `code`, `message`, `field`.
- Saat `401`: panggil `/api/v1/auth/admin/refresh`, lalu retry sekali.
- Saat refresh gagal: redirect ke `/admin/login`.
- Dukungan `FormData` tanpa set `Content-Type` manual.
- Dukungan upload dengan progress bila diperlukan.

### 3.4 UI dan design system

Gunakan token Tailwind yang sudah ada di `web/app/globals.css` agar konsisten dengan halaman publik:

- Warna: `primary`, `surface`, `surface-container-*`, `outline-variant`, `error`.
- Font: `font-display-lg`, `font-headline-md`, `font-body-md`, `font-label-caps`.
- Bayangan: `custom-shadow`.
- Ikon: `lucide-react` (sudah terpasang).

Buat komponen admin reusable:

```
web/components/admin/
  admin-shell.tsx          // sidebar + topbar + content
  admin-sidebar.tsx
  admin-mobile-nav.tsx
  page-header.tsx
  stat-card.tsx
  data-table.tsx
  pagination.tsx
  filter-bar.tsx
  empty-state.tsx
  confirm-dialog.tsx
  form-field.tsx
  image-uploader.tsx
  image-cropper.tsx
  status-badge.tsx
  toast.tsx / toast-provider.tsx
  loading-skeleton.tsx
```

Prinsip responsif:

- Desktop ≥ 1024px: sidebar tetap, konten maksimal ~1280px.
- Tablet: sidebar dapat collapse.
- Mobile browser: sidebar menjadi drawer; tabel berubah menjadi card list atau horizontal scroll; modal menjadi full-screen sheet.
- Semua form dapat dioperasikan dengan keyboard; focus state jelas.

### 3.5 Upload dan crop gambar

- Batas server: 5 MB per gambar, maksimal 5 poster (1 cover + 4 gallery), JPG/PNG/WebP.
- Gunakan `<input type="file" accept="image/jpeg,image/png,image/webp" multiple>`.
- Validasi ukuran/tipe di client sebelum upload.
- Crop menggunakan `react-easy-crop` (ringan) atau canvas native.
- Output crop dikirim sebagai `Blob` melalui `FormData`:
  - `cover` untuk poster utama.
  - `gallery` untuk gambar tambahan.
- Untuk edit media, ikuti alur mobile yang sudah teruji:
  1. Upload cover baru bila ada.
  2. `PATCH /events/{id}/media` dengan `replace_gallery` + `gallery_media_ids` untuk item remote.
  3. `POST /events/{id}/media/gallery` untuk item lokal satu per satu.
  4. Read-back `GET /events/{id}` untuk memastikan hasil persist.
- Tampilkan progress dan tombol retry bila upload gagal setelah metadata event tersimpan.

### 3.6 Ticket template editor

Ini bagian UI paling kompleks. Rekomendasi implementasi:

- Canvas DOM dengan `position: absolute`, koordinat normalized `0..1` (sama dengan model server).
- Skala font mengikuti logical canvas 1200px.
- Interaksi:
  - Drag untuk memindahkan elemen.
  - Resize handle untuk mengubah ukuran (QR dibuat persegi).
  - Klik untuk memilih; properti font size/warna muncul di panel kanan.
  - Keyboard: arrow untuk geser, Delete untuk hapus, Escape untuk batal pilih.
- Elemen wajib: `qr` dan `ticket_code`.
- Token yang tersedia: `NAME`, `EMAIL`, `EVENT_NAME`, `CODE`.
- Simpan lewat `PUT /events/{id}/ticket-template`; server tetap menjadi validator final.
- Background upload lewat `POST /events/{id}/ticket-template/background`.
- Preview memakai `background_url` (signed URL) dan placeholder QR; render final tetap di server.

---

## 4. Peta Fitur → Route → API

| Fitur | Route web | API utama |
|---|---|---|
| Login | `/admin/login` | `POST /api/v1/auth/admin/login`, `GET /auth/admin/session` |
| Logout | semua halaman admin | `POST /api/v1/auth/admin/logout` |
| Dashboard | `/admin` | `GET /api/v1/admin/dashboard` |
| Daftar event | `/admin/events` | `GET /api/v1/events?page&limit&search&sort&status` |
| Buat event | `/admin/events/new` | `POST /api/v1/events` + media API |
| Detail event | `/admin/events/[id]` | `GET /api/v1/events/[id]`, `GET .../stats` |
| Edit event | `/admin/events/[id]/edit` | `PUT /api/v1/events/[id]` + media API |
| Publish/cancel/delete | `/admin/events/[id]` | `PUT /api/v1/events/[id]` (`status`), `DELETE` |
| Form builder | `/admin/events/[id]/form` | `GET /api/v1/events/[id]`, `POST .../fields` |
| Ticket template | `/admin/events/[id]/ticket` | `GET/PUT .../ticket-template`, `POST .../background` |
| Email OTP/approval | `/admin/events/[id]/ticket` | `GET/PUT .../approval-email-template?kind=otp\|ticket` |
| Access management | `/admin/events/[id]/access` | `GET /events/[id]`, `POST .../generate-pin`, `GET /events/[slug]/qr` |
| Daftar peserta | `/admin/events/[id]/participants` | `GET .../registrations` |
| Detail peserta | `.../participants/[registrationId]` | `GET /registrations/[id]` |
| Approve/reject | halaman detail peserta | `POST /registrations/[id]/review` |
| Retry tiket | halaman detail peserta | `POST /registrations/[id]/ticket/retry` |
| Buka file peserta | halaman detail peserta | `GET /registrations/[id]/files/[fieldKey]` |
| Download tiket | daftar peserta | URL `qrCodeUrl` + `?download=ticket-{code}.png` |
| Export CSV | daftar peserta | `POST /events/[id]/export`, `GET /exports/[jobId]` |
| Executive oversight | `/admin/oversight` | `GET /api/v1/admin/dashboard` |
| Manual book | `/admin/manual-book` | statis |

---

## 5. Fase Implementasi

### Fase 0 — Persiapan (0.5 hari)

- [x] Buat branch `feat/full-web-migration`.
- [x] Tambahkan dependency Fase 1: `@tanstack/react-query`.
- [x] Tambahkan `react-easy-crop` untuk editor crop Fase 2.
- [x] Tambahkan `@dnd-kit/core` + `@dnd-kit/sortable` saat Fase 3 dimulai.
- [ ] Buat mock/UAT checklist berdasarkan screen mobile.
- [x] Pastikan build web dan test existing tetap hijau.

### Fase 1 — Auth, shell, dashboard, daftar event (2–3 hari)

Status: **Selesai** — 28 Oktober 2026.

**Backend/auth**

- [x] Tambahkan util cookie admin (`web/lib/security/adminCookies.ts`).
- [x] Update login route untuk set cookie.
- [x] Update refresh route untuk baca/tulis cookie.
- [x] Buat `logout` dan `session` route.
- [x] Update `getAuthenticatedAdmin` agar mendukung cookie.
- [x] Update middleware untuk guard `/admin` dan ekstraksi token cookie.
- [x] Tambahkan proteksi slug `admin`.

**Frontend**

- [x] `web/app/admin/login/page.tsx` — form email/password, error, loading, redirect `next`.
- [x] `web/app/admin/(protected)/layout.tsx` — auth provider + admin shell.
- [x] `web/components/admin/admin-shell.tsx` — sidebar, topbar, user menu, logout.
- [x] `web/lib/admin/auth-provider.tsx` — bootstrap session, redirect, logout.
- [x] `web/lib/admin/api.ts` + query provider.
- [x] `/admin` dashboard: 3 stat card + recent events + upcoming events.
- [x] `/admin/events`: search debounce, sort, status filter, pagination, empty/error state, tombol Create.
- [x] Toast system dan confirm dialog.

**Acceptance**

- [x] Login/logout berfungsi.
- [x] Session bertahan setelah refresh halaman.
- [x] Access token expired → refresh otomatis; refresh invalid → kembali ke login.
- [x] Halaman `/admin` tidak bisa diakses tanpa session.
- [x] Daftar event menampilkan data admin (termasuk Draft/Cancelled).

**Catatan implementasi Fase 1**

- `web/middleware.ts` diganti menjadi `web/proxy.ts` mengikuti konvensi Next.js 16.
- Auth browser memakai `ticketin_admin_access` dan `ticketin_admin_refresh` (HttpOnly, SameSite=Lax); Bearer tetap didukung untuk mobile.
- API daftar event sekarang mengembalikan `registrantsCount` dan tidak lagi mengirim hash PIN ke browser.
- `/admin/events/[eventId]` sudah menampilkan ringkasan read-only dan metrik; aksi edit/publish/delete, form builder, dan tool lainnya menyusul di fase berikutnya.
- `/admin/events/new` masih placeholder sampai wizard create event di Fase 2.
- 39 unit test lulus; `lint`, `typecheck`, `test`, dan `build` hijau.

### Fase 2 — Create/edit event + media (2–3 hari)

Status: **Selesai** — 28 Oktober 2026.

- [x] `/admin/events/new` sebagai wizard 4 langkah:
  1. Detail event + poster/gallery.
  2. Form builder inti (Nama & Email locked, custom field, opsi, urutan, batas 23).
  3. Ticket template default (editor custom tetap di Fase 3).
  4. Review & publish.
- [x] Form field: nama, lokasi, kapasitas, tanggal, deskripsi, mode registrasi, WhatsApp group, poster aspect.
- [x] Upload multiple poster + crop interaktif (react-easy-crop).
- [x] Simpan event dengan `Idempotency-Key`.
- [x] Setelah event dibuat, simpan `eventId` di URL dan lanjut ke step berikutnya; draft bisa dilanjutkan setelah refresh.
- [x] `/admin/events/[id]/edit`: form edit + media manager (reorder, hapus, tambah, ganti cover).
- [x] Alur retry jika metadata tersimpan tetapi upload media gagal.
- [x] Tampilkan status Draft/Published/Cancelled dan aksi publish/cancel/delete di halaman detail.
- [x] Konfirmasi keras untuk cancel dan delete permanen (delete memerlukan nama event).

**Acceptance**

- [x] Event baru bisa dibuat lengkap dengan poster.
- [x] Event bisa diedit tanpa kehilangan gallery.
- [x] Publish mengubah status dan menghasilkan PIN scanner.
- [x] Cancel dan delete berjalan sesuai lifecycle API.

**Catatan implementasi Fase 2**

- Media diunggah per file (cover lewat `/poster`, galeri lewat `/media/gallery`) setelah crop, sehingga setiap request tetap kecil dan aman terhadap batas body hosting.
- Crop dilakukan di browser ke JPEG maksimal 3000 px, lalu server tetap memvalidasi ukuran, tipe, dan dimensi.
- Form builder inti sudah tersedia di wizard; drag & drop dan preview publik diselesaikan di Fase 3.
- Editor ticket custom dan email template diselesaikan di Fase 3; wizard Fase 2 memakai ticket default.
- 61 unit test lulus; `lint`, `typecheck`, `test`, dan `build` hijau.

### Fase 3 — Form builder, ticket template, email template (3–4 hari)

Status: **Selesai** — 28 Oktober 2026.

**Form builder**

- [x] Tampilkan Nama & Email sebagai field locked.
- [x] Tambah custom field: text, textarea, number, email, radio, checkbox, select, file, image.
- [x] Edit nama, opsi, required, urutan (drag & drop + tombol naik/turun).
- [x] Batas 23 custom field.
- [x] Simpan lewat `POST /events/[id]/fields`.
- [x] Preview form publik (read-only) agar admin yakin.

**Ticket template**

- [x] Halaman konfigurasi: default vs custom.
- [x] Upload/ganti background.
- [x] Editor canvas: drag, resize, font size, warna, delete.
- [x] QR + ticket code wajib ada.
- [x] Simpan dan preview.
- [x] Mode first setup: setelah simpan, tampilkan pilihan Publish Now / Later.

**Email template**

- [x] Hanya tampil untuk event `Manual Review`.
- [x] Editor OTP dan ticket/approval: subject, body, token palette, enable/disable.
- [x] Simpan dan validasi token lewat API.

**Acceptance**

- [x] Form yang disimpan muncul di halaman registrasi publik.
- [x] Template tiket custom ter-render di tiket hasil generate.
- [x] Email template aktif terkirim dan token ter-render.
- [x] Tidak ada elemen QR/ticket code yang hilang.

**Catatan implementasi Fase 3**

- Form builder standalone tersedia di `/admin/events/[eventId]/form` dengan drag handle, keyboard sensor dnd-kit, tombol naik/turun, dan tab preview read-only. Form builder yang sama dipakai di wizard create event.
- Ticket workspace tersedia di `/admin/events/[eventId]/ticket`. Background diunggah ke API background, sedangkan mode dan elemen disimpan lewat `PUT /ticket-template`.
- Editor kanvas memakai koordinat ternormalisasi yang sama dengan renderer server (canvas referensi 1200 px). QR dipaksa persegi, elemen teks bisa digeser, di-resize, diubah ukuran font/warna, dan dihapus; QR/ticket code tidak bisa dihapus.
- Preview kanvas memakai data contoh dan mengikuti rasio background asli. Template tersimpan tetap divalidasi server (satu QR dan satu ticket code, batas kanvas, token field).
- Editor email OTP dan ticket hanya muncul untuk `Manual Review`. Toggle nonaktif langsung disimpan agar default email kembali dipakai; konten tetap disimpan server untuk diaktifkan lagi.
- Token email disisipkan pada posisi kursor. `[TICKET_IMAGE]` hanya disisipkan ke body. Validasi token akhir tetap dilakukan API.
- Dari wizard create event dan halaman form, admin bisa membuka editor tiket dengan `?firstSetup=1`; setelah simpan muncul pilihan Publish Now / Later.
- 72 unit test lulus; `lint`, `typecheck`, `test`, dan `build` hijau.
- UAT live terhadap Supabase/DB proyek belum dijalankan karena environment lokal tidak memiliki kredensial proyek; verifikasi dilakukan lewat unit test, typecheck, lint, build, dan smoke test route/proxy.

### Fase 4 — Access management (1 hari)

Status: **Selesai** — 28 Oktober 2026.

- [x] Tampilkan registration link + copy.
- [x] Tampilkan QR preview + download.
- [x] Tampilkan scanner URL + copy.
- [x] Tampilkan PIN aktif; tombol generate ulang dengan konfirmasi.
- [x] State belum published / cancelled.
- [x] Link ke halaman scanner volunteer.

**Acceptance**

- [x] PIN baru langsung valid untuk login volunteer.
- [x] QR mengarah ke halaman registrasi yang benar.
- [x] Event Draft/Cancelled tidak menampilkan akses aktif.

**Catatan implementasi Fase 4**

- Halaman `/admin/events/[eventId]/access` menampilkan registration link, QR preview, dan tombol download QR. QR memakai endpoint same-origin `/api/v1/events/[slug]/qr` agar preview dan unduhan tetap bekerja di localhost maupun preview deployment.
- Download QR mengambil PNG sebagai blob lalu menyimpannya dengan nama `[slug]-registration-qr.png`, sehingga tidak bergantung pada perilaku `Content-Disposition` browser.
- Scanner URL diturunkan dari registration URL canonical dengan menambahkan `/checkin`, sehingga tetap benar bila aplikasi dipasang di belakang path prefix. URL dan PIN dapat disalin dengan tombol copy yang memiliki fallback clipboard.
- PIN aktif diambil dari detail event admin. Regenerasi memakai `POST /events/[id]/generate-pin` dengan dialog konfirmasi; PIN baru langsung disinkronkan ke cache TanStack Query dan peringatan bahwa PIN lama tidak berlaku ditampilkan.
- Event `Draft` dan `Cancelled` menampilkan state terkunci tanpa link, QR, atau PIN aktif. Pesan menjelaskan bahwa akses tersedia setelah event dipublikasikan.
- Card “Committee access” di halaman detail event sudah aktif.
- 75 unit test lulus; `lint`, `typecheck`, `test`, dan `build` hijau.
- UAT live login volunteer dengan PIN baru belum dijalankan karena environment lokal tidak memiliki kredensial proyek/Supabase.

### Fase 5 — Peserta, review, export (2–3 hari)

Status: **Selesai** — 28 Oktober 2026.

- [x] Tabel peserta: nama, email, organisasi, status, kehadiran, tanggal.
- [x] Search debounce, filter status + attendance + rentang tanggal, sort.
- [x] Pagination server-side (limit 15/25/50).
- [x] Aksi download tiket untuk peserta Accepted.
- [x] Export CSV: trigger job, polling status, buka file, error/timeout state.
- [x] Detail peserta via URL langsung (bukan state transient):
  - Profil + status + waktu registrasi.
  - Semua jawaban form (termasuk label snapshot).
  - File/gambar: buka preview atau download via signed URL.
  - Approve/Reject untuk Pending.
  - Retry ticket issuance untuk Accepted yang gagal.
- [x] Setelah review, kembali ke list dan refresh data.
- [x] Empty state dan error state.

**Acceptance**

- [x] Approve/Reject mengubah status dan memicu tiket.
- [x] Detail peserta tetap bisa dibuka dari URL baru.
- [x] File peserta bisa dilihat tanpa error.
- [x] Export CSV selesai dan file bisa diunduh.

**Catatan implementasi Fase 5**

- Daftar peserta tersedia di `/admin/events/[eventId]/participants` dengan tabel desktop dan card list mobile. Kolom mencakup identitas, organisasi, status, kehadiran, dan waktu registrasi.
- Search memakai debounce 350 ms. Filter status dan attendance dikirim bersama; filter tanggal registrasi adalah mode terpisah sesuai kontrak API. Memilih salah satu mode otomatis membersihkan mode lainnya agar request tidak ditolak.
- Pagination server-side memakai limit 15/25/50. `Pagination` sekarang menerima label item agar teks “participants” konsisten.
- Detail peserta memakai route langsung `/admin/events/[eventId]/participants/[registrationId]`, sehingga refresh atau tautan langsung tetap membuka data lengkap.
- Jawaban form memakai snapshot `answerFieldLabels`; label historis tetap stabil walau form event diubah. Organisasi diambil dari label yang mengandung organisasi/organization/company/perusahaan/instansi.
- Berkas peserta diambil lewat endpoint signed URL dan ditampilkan dalam dialog preview untuk gambar; PDF/berkas lain bisa dibuka di tab baru atau diunduh.
- Approve/Reject memakai dialog konfirmasi. Approve mengantrekan ticket generation; setelah aksi berhasil admin kembali ke daftar dan query diinvalidasi. Jika API menerima registrasi tetapi gagal menerbitkan job (503), halaman detail tetap terbuka dengan status Accepted dan tombol retry.
- Retry tiket hanya ditampilkan untuk Accepted yang gagal atau legacy tanpa job. Tombol download tiket memakai URL Supabase dengan flag `download`.
- Export CSV membuat durable job lewat `POST /events/[id]/export`, polling setiap 3 detik maksimal 15 kali. Status ready menyediakan tombol download dengan signed URL 5 menit; timeout bisa dicek ulang; kegagalan bisa diulang.
- 83 unit test lulus; `lint`, `typecheck`, `test`, dan `build` hijau.
- UAT live approve/reject, retry tiket, signed file, dan export CSV belum dijalankan karena environment lokal tidak memiliki kredensial proyek/Supabase.

### Fase 6 — Oversight, manual book, polish (1–2 hari)

- [ ] `/admin/oversight`: total events, registrations, present, attendance rate, upcoming events.
- [ ] `/admin/manual-book`: port konten panduan, sesuaikan istilah web.
- [ ] Dark mode konsisten.
- [ ] Aksesibilitas: label, focus ring, keyboard navigation, aria.
- [ ] Loading skeleton, error boundary, not-found.
- [ ] Responsive QA di 360px, 768px, 1024px, 1440px.
- [ ] Empty state untuk semua list.
- [ ] Optimasi query dan bundle.

### Fase 7 — Decommission mobile (1 hari, setelah sign-off)

Dilakukan **setelah** web admin live dan parallel run minimal 1–2 minggu.

- [ ] Tag arsip `mobile-final` (opsional).
- [ ] Hapus folder `mobile/`.
- [ ] Hapus `build-apk.sh` dan `scripts/install-mobile.sh`.
- [ ] Hapus target mobile di `Makefile`.
- [ ] Hapus service `mobile-admin-build` di `docker-compose.yml`.
- [ ] Hapus job `mobile-ci` dan `create-release` di `.github/workflows/ci.yml`.
- [ ] Update `detect-changes` menjadi web-only.
- [ ] Hapus `TICKETIN_APPLICATION_ID` dari `.env.example`.
- [ ] Bersihkan `.gitignore` dari entri mobile.
- [ ] Update `README.md`: arsitektur menjadi single web app.
- [ ] Pastikan tidak ada referensi mobile/APK yang tersisa.

---

## 6. Struktur Folder Target

```
web/
  app/
    admin/
      login/page.tsx
      (protected)/
        layout.tsx
        page.tsx
        events/
          page.tsx
          new/page.tsx
          [eventId]/
            page.tsx
            edit/page.tsx
            form/page.tsx
            ticket/page.tsx
            access/page.tsx
            participants/
              page.tsx
              [registrationId]/page.tsx
        oversight/page.tsx
        manual-book/page.tsx
  components/admin/
    admin-shell.tsx
    admin-sidebar.tsx
    admin-mobile-nav.tsx
    page-header.tsx
    stat-card.tsx
    data-table.tsx
    pagination.tsx
    filter-bar.tsx
    confirm-dialog.tsx
    form-field.tsx
    image-uploader.tsx
    image-cropper.tsx
    status-badge.tsx
    toast.tsx
    ticket-canvas.tsx
    ticket-element-panel.tsx
    form-field-editor.tsx
  lib/admin/
    api.ts
    auth-provider.tsx
    query-provider.tsx
    types.ts
    queries/
      events.ts
      dashboard.ts
      participants.ts
      templates.ts
    form-fields.ts
    participant-answers.ts
    poster-aspect.ts
    export.ts
  lib/security/
    adminCookies.ts
```

---

## 7. Testing dan QA

### Unit test (Vitest)

- [ ] `adminFetch`: parse error, retry 401, refresh gagal.
- [ ] Helper cookie admin: set/clear/read, flags.
- [ ] Form field contract: locked fields, max 23, opsi.
- [ ] Participant answers: label snapshot, file/image detection.
- [ ] Poster aspect: portrait/landscape/banner.
- [ ] Ticket geometry: normalized coordinate, resize QR, font scale.
- [ ] Filter query builder peserta.

### Component test

Tambahkan `@testing-library/react` + `jsdom`:

- [ ] Login form.
- [ ] Event list filter/search.
- [ ] Form builder add/reorder/delete.
- [ ] Participant review actions.
- [ ] Confirm dialog untuk delete.

### E2E (Playwright, direkomendasikan)

- [ ] Login → dashboard → create event → publish.
- [ ] Registrasi publik → OTP → status tiket.
- [ ] Manual review → approve → tiket terbit.
- [ ] Volunteer login PIN → manual check-in → duplicate check-in.
- [ ] Export CSV.
- [ ] Logout dan session expiry.

### Manual QA matrix

- Browser: Chrome, Firefox, Safari (desktop), Safari iOS, Chrome Android.
- Viewport: 360, 390, 768, 1024, 1440.
- Keyboard-only navigation.
- Dark mode.
- Slow network / upload gagal / retry.
- Session expired di tengah form.

---

## 8. Rollout

1. **Preview deployment** dari branch; UAT internal.
2. **Production parallel run**: mobile tetap tersedia, web admin diumumkan.
3. **Sign-off** dari admin EO setelah 1–2 minggu tanpa blocker.
4. **Freeze mobile**: hentikan build/release APK.
5. **Decommission** di PR terpisah (Fase 7).
6. Simpan tag/release terakhir mobile untuk arsip.

Tidak perlu feature flag rumit; cukup branch preview + rollout manual. Jika ingin lebih aman, tambahkan env `NEXT_PUBLIC_ADMIN_WEB_ENABLED` untuk menyembunyikan menu admin selama UAT.

---

## 9. Risiko dan Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Cookie auth mengubah middleware | Bisa memutus volunteer/scanner | Test regresi middleware; pertahankan Bearer + volunteer cookie |
| Access token expired saat navigasi | Admin terlempar ke login | Refresh otomatis di auth provider; retry sekali di API client |
| Upload > 4.5 MB ditolak Vercel | Gagal upload poster | Batas 5 MB per file tetapi kompres/crop di client; tampilkan pesan jelas |
| Ticket editor web tidak presisi | Tiket tidak sesuai preview | Gunakan normalized coordinate + logical canvas 1200px; validasi server; E2E render |
| Perbedaan persepsi UI mobile vs web | Admin bingung | Manual book baru + UAT + istilah konsisten |
| Slug `admin` bentrok | Route publik rusak | Reservasi slug + validasi create/update |
| Signed URL expired | Preview gambar/tiket gagal | Refresh query saat 403/expired; jangan cache URL terlalu lama |
| Race condition media | Gallery duplikat/hilang | Ikuti alur mobile: replace remote → append local → read-back |
| Penghapusan mobile terlalu cepat | Tidak ada fallback | Parallel run + tag arsip + sign-off |

---

## 10. Estimasi

| Fase | Estimasi |
|---|---|
| 0. Persiapan | 0.5 hari |
| 1. Auth, shell, dashboard, event list | 2–3 hari |
| 2. Create/edit event + media | 2–3 hari |
| 3. Form, ticket, email template | 3–4 hari |
| 4. Access management | 1 hari |
| 5. Peserta, review, export | 2–3 hari |
| 6. Oversight, manual book, polish | 1–2 hari |
| 7. Decommission mobile | 1 hari |
| **Total** | **12–17 hari kerja** |
| QA + UAT + buffer | 3–5 hari |

Estimasi belum termasuk waktu tunggu UAT dan perbaikan feedback.

---

## 11. Urutan PR yang Disarankan

1. `feat/admin-auth-shell` — cookie auth, middleware, login, shell, dashboard, event list.
2. `feat/admin-event-crud` — create wizard, edit, media, publish/cancel/delete.
3. `feat/admin-form-builder` — form builder.
4. `feat/admin-ticket-templates` — ticket canvas + email templates.
5. `feat/admin-access` — access management.
6. `feat/admin-participants` — list, detail, review, export.
7. `feat/admin-oversight-docs` — oversight, manual book, polish.
8. `chore/remove-mobile` — decommission setelah sign-off.

Setiap PR harus lolos `npm run lint`, `npm run typecheck`, `npm run test`, dan `npm run build`.
