import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CalendarPlus,
  ChevronDown,
  ClipboardCheck,
  FileDown,
  ListChecks,
  ListOrdered,
  LogIn,
  Mail,
  MessageCircle,
  Palette,
  QrCode,
  ScanLine,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';
import { PageHeader } from '@/components/admin/page-header';

interface ManualSection {
  icon: LucideIcon;
  title: string;
  summary: string;
  paragraphs: string[];
  bullets?: string[];
}

const sections: ManualSection[] = [
  {
    icon: LogIn,
    title: '1. Masuk ke admin web',
    summary: 'Login, sesi aman, dan pemulihan akses.',
    paragraphs: [
      'Buka halaman /admin/login di browser, lalu masukkan email dan password admin yang diberikan oleh tim teknis. Sesi disimpan sebagai cookie HttpOnly sehingga Anda tidak perlu login ulang di setiap halaman.',
    ],
    bullets: [
      'Jika muncul pesan kredensial tidak valid, periksa email/password atau minta admin didaftarkan.',
      'Gunakan tombol Sign out di sidebar atau menu profil untuk mengakhiri sesi.',
      'Jangan membagikan tautan admin atau cookie sesi ke pihak lain.',
    ],
  },
  {
    icon: CalendarPlus,
    title: '2. Membuat event',
    summary: 'Wizard event, media, dan publikasi.',
    paragraphs: [
      'Buka menu Events lalu pilih Create event. Wizard akan memandu Anda mengisi detail event, mengunggah poster, menyiapkan form, dan memilih tiket.',
      'Setelah event disimpan sebagai Draft, periksa kembali form dan tiket. Publikasikan event dari halaman detail event atau dari langkah akhir wizard agar peserta bisa mendaftar.',
    ],
    bullets: [
      'Poster dan galeri diunggah per file setelah crop, sehingga aman terhadap batas ukuran hosting.',
      'Event Draft belum bisa diakses publik. Event Cancelled berhenti menerima pendaftaran baru.',
      'Menghapus event bersifat permanen dan menghapus peserta, tiket, serta file terkait.',
    ],
  },
  {
    icon: ListChecks,
    title: '3. Form pendaftaran',
    summary: 'Field terkunci, pertanyaan custom, dan preview.',
    paragraphs: [
      'Buka Registration form dari halaman event. Nama dan Email selalu terkunci karena diperlukan untuk tiket dan komunikasi. Tambahkan pertanyaan lain sesuai kebutuhan event.',
    ],
    bullets: [
      'Tipe field: text, textarea, number, email, select, radio, checkbox, file, dan image.',
      'Urutan pertanyaan bisa diubah dengan drag handle atau tombol naik/turun.',
      'Maksimal 23 pertanyaan custom.',
      'Gunakan tab Preview untuk melihat tampilan form seperti yang akan dilihat peserta.',
      'Label jawaban disimpan sebagai snapshot saat peserta mendaftar, sehingga perubahan form berikutnya tidak mengubah riwayat.',
    ],
  },
  {
    icon: SlidersHorizontal,
    title: '4. Mode pendaftaran',
    summary: 'Auto-Accept vs Manual Review.',
    paragraphs: [
      'Auto-Accept: peserta langsung diterima dan tiket diproses otomatis. Manual Review: peserta masuk status Pending untuk disetujui atau ditolak admin.',
      'Pilih Manual Review jika event perlu seleksi peserta. Template email OTP dan email tiket hanya tersedia untuk event Manual Review.',
    ],
  },
  {
    icon: ShieldCheck,
    title: '5. Verifikasi OTP',
    summary: 'Kode email, masa berlaku, dan status Expired.',
    paragraphs: [
      'Pada Manual Review, peserta menerima kode OTP lewat email. Kode berlaku 10 menit dan wajib dimasukkan untuk menyelesaikan pendaftaran.',
      'Jika waktu habis, pendaftaran menjadi Expired dan tidak menghitung kuota. Peserta dapat mendaftar ulang.',
    ],
  },
  {
    icon: ClipboardCheck,
    title: '6. Review peserta',
    summary: 'Approve, reject, dan jawaban form.',
    paragraphs: [
      'Buka Participants dari halaman event, lalu pilih peserta berstatus Pending. Halaman detail menampilkan profil, waktu registrasi, seluruh jawaban form, dan berkas yang diunggah.',
      'Tekan Approve & issue ticket untuk menerima peserta dan mengantrekan pembuatan tiket. Tekan Reject untuk menolak. Kedua aksi memakai konfirmasi dan bersifat final.',
    ],
    bullets: [
      'Setelah review berhasil, admin kembali ke daftar peserta dan data dimuat ulang.',
      'Jika approve berhasil tetapi pengiriman job tiket gagal, halaman detail tetap terbuka dengan status Accepted dan tombol retry.',
      'Gunakan Refresh untuk melihat status tiket terbaru.',
    ],
  },
  {
    icon: QrCode,
    title: '7. Tiket & QR code',
    summary: 'Default ticket, custom canvas, dan unduhan.',
    paragraphs: [
      'Buka Ticket & email template dari halaman event. Pilih tiket default Event Gate atau desain custom dengan background sendiri.',
      'Editor canvas memakai koordinat ternormalisasi. QR code dan ticket code wajib ada, tidak bisa dihapus, dan QR selalu persegi. Elemen teks dapat digeser, di-resize, diubah ukuran font/warna, atau dihapus.',
    ],
    bullets: [
      'Template custom wajib memiliki tepat satu QR dan satu ticket code.',
      'Preview memakai data contoh; tiket asli memakai data peserta.',
      'Jika email tiket tidak sampai, admin dapat mengunduh artwork tiket dari daftar peserta atau halaman detail peserta.',
      'Peserta Accepted tanpa artwork tiket dapat di-retry dari halaman detail.',
    ],
  },
  {
    icon: MessageCircle,
    title: '8. Grup WhatsApp',
    summary: 'Tautan grup pada email dan status peserta.',
    paragraphs: [
      'Isi tautan grup WhatsApp pada pengaturan event. Tautan ini ikut dikirim pada email verifikasi OTP dan ditampilkan di halaman status peserta setelah OTP terverifikasi.',
      'Pastikan tautan masih aktif sebelum event dipublikasikan.',
    ],
  },
  {
    icon: Mail,
    title: '9. Template email & tiket',
    summary: 'OTP, ticket email, token, dan aktivasi.',
    paragraphs: [
      'Untuk event Manual Review, buka Ticket & email template lalu atur email OTP dan email tiket. Template aktif akan menggantikan email default Event Gate.',
      'Subject dan body bisa disesuaikan. Gunakan token palette untuk menyisipkan data peserta pada posisi kursor.',
    ],
    bullets: [
      'Token OTP: [NAME], [EMAIL], [EVENT_NAME], [CODE], [WHATSAPP_GROUP_LINK].',
      'Token tiket: [NAME], [EMAIL], [EVENT_NAME], [TICKET_IMAGE].',
      '[TICKET_IMAGE] hanya boleh berada di body email.',
      'Menonaktifkan toggle akan mengembalikan email default; konten custom tetap tersimpan.',
    ],
  },
  {
    icon: ScanLine,
    title: '10. Committee access & scanner',
    summary: 'QR pendaftaran, URL scanner, dan PIN volunteer.',
    paragraphs: [
      'Buka Committee access untuk melihat registration link, QR pendaftaran, scanner URL, dan PIN aktif. Bagikan QR/link ke calon peserta dan scanner URL + PIN ke petugas lapangan.',
      'Petugas membuka scanner URL, memasukkan nama dan PIN, lalu memindai QR tiket peserta. Regenerasi PIN langsung membatalkan PIN lama untuk sign-in baru.',
    ],
    bullets: [
      'Download QR menyimpan PNG registration QR.',
      'Event Draft atau Cancelled tidak menampilkan akses aktif.',
      'Volunteer yang sudah login tetap bisa memindai sampai sesinya berakhir.',
    ],
  },
  {
    icon: FileDown,
    title: '11. Export data peserta',
    summary: 'CSV, polling status, dan tautan unduhan.',
    paragraphs: [
      'Di halaman Participants, tekan Export CSV. Server membuat job export dan admin web memantau statusnya secara berkala.',
      'Saat selesai, tombol Download CSV akan muncul. Tautan unduhan memakai signed URL yang berlaku sekitar 5 menit. Jika waktu habis, jalankan export lagi.',
    ],
    bullets: [
      'Jika status timeout, gunakan Check status; job mungkin masih berjalan di background.',
      'Jika job gagal, gunakan Try again untuk memulai export baru.',
      'Filter daftar peserta tidak mengubah isi export; export mencakup data event.',
    ],
  },
  {
    icon: ListOrdered,
    title: '12. Status peserta',
    summary: 'Draft, Pending, Accepted, Rejected, Expired.',
    paragraphs: [
      'Draft: pendaftaran belum selesai/verifikasi OTP. Pending: menunggu review admin. Accepted: diterima dan tiket diterbitkan. Rejected: ditolak admin. Expired: OTP kedaluwarsa sebelum diselesaikan.',
      'Kehadiran dicatat terpisah sebagai Present atau Absent oleh petugas scanner di lokasi acara.',
    ],
  },
  {
    icon: Palette,
    title: '13. Tema, aksesibilitas, dan perangkat',
    summary: 'Dark mode, keyboard, dan tampilan responsif.',
    paragraphs: [
      'Admin web mendukung desktop, tablet, dan browser mobile. Gunakan tombol tema di topbar untuk beralih antara light dan dark mode; pilihan disimpan di browser.',
      'Semua tombol utama memiliki focus ring dan label aksesibel. Navigasi bisa dilakukan dengan keyboard, termasuk Tab, Enter, Escape pada dialog, serta tombol panah pada editor form.',
    ],
    bullets: [
      'Di layar kecil, sidebar berubah menjadi drawer yang bisa ditutup dengan Escape.',
      'Gunakan browser modern terbaru untuk hasil terbaik.',
      'Jika tampilan terasa sempit, perkecil zoom browser atau gunakan tampilan tablet/desktop.',
    ],
  },
];

function ManualSectionCard({ section, defaultOpen }: { section: ManualSection; defaultOpen: boolean }) {
  const Icon = section.icon;

  return (
    <details
      className="group rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-[0_4px_12px_rgba(0,0,0,0.04)]"
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none items-start gap-3 px-4 py-4 focus:outline-none focus:ring-2 focus:ring-primary sm:px-5 [&::-webkit-details-marker]:hidden">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-container text-on-surface">
          <Icon aria-hidden="true" className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-on-surface">{section.title}</span>
          <span className="mt-0.5 block font-description text-xs text-on-surface-variant">
            {section.summary}
          </span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className="mt-1 h-4 w-4 shrink-0 text-secondary transition-transform group-open:rotate-180"
        />
      </summary>

      <div className="border-t border-outline-variant px-4 py-4 sm:px-5">
        <div className="space-y-3">
          {section.paragraphs.map((paragraph) => (
            <p
              key={paragraph}
              className="font-description text-sm leading-relaxed text-on-surface-variant"
            >
              {paragraph}
            </p>
          ))}
        </div>

        {section.bullets ? (
          <ul className="mt-4 space-y-2 border-t border-outline-variant pt-4">
            {section.bullets.map((bullet) => (
              <li
                key={bullet}
                className="flex items-start gap-2 font-description text-sm leading-relaxed text-on-surface-variant"
              >
                <span
                  aria-hidden="true"
                  className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-secondary"
                />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </details>
  );
}

export default function AdminManualBookPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin guide"
        title="Manual book"
        description="Panduan operasional admin web untuk mengelola event, peserta, tiket, dan akses masuk acara."
        actions={(
          <>
            <Link
              href="/admin/events"
              className="inline-flex items-center gap-2 rounded-xl border border-outline-variant bg-surface-container-lowest px-3.5 py-2 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <CalendarDays aria-hidden="true" className="h-4 w-4" />
              Events
            </Link>
            <Link
              href="/admin/oversight"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-3.5 py-2 text-sm font-semibold text-on-primary transition-transform hover:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              Oversight
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </>
        )}
      />

      <section className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-[0_4px_12px_rgba(0,0,0,0.04)] sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-surface-container text-on-surface">
            <BookOpen aria-hidden="true" className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-on-surface">Panduan Admin Event Gate</h2>
            <p className="mt-1.5 max-w-3xl font-description text-sm leading-relaxed text-on-surface-variant">
              Panduan singkat penggunaan admin web untuk mengelola event, form pendaftaran,
              review peserta, tiket, email, dan akses scanner. Buka setiap bagian untuk melihat
              detail langkahnya. Istilah menu mengikuti tampilan admin web terbaru.
            </p>
            <p className="mt-3 font-description text-xs text-secondary">
              Terakhir diperbarui: 28 Oktober 2026
            </p>
          </div>
        </div>
      </section>

      <div className="space-y-3">
        {sections.map((section, index) => (
          <ManualSectionCard
            key={section.title}
            section={section}
            defaultOpen={index === 0}
          />
        ))}
      </div>
    </div>
  );
}
