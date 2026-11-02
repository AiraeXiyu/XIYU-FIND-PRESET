"use client";

import { useState } from "react";

const BASE = "https://xiyu-find-preset.vercel.app";
const sections = [
  {
    title: "Base URL",
    method: "BASE",
    path: BASE,
    description: "Alamat utama API XIYU Preset Finder yang sudah terpasang di Vercel.",
    request: BASE,
    response: "Base URL tidak mengembalikan JSON. Tambahkan path endpoint yang tersedia di bawah."
  },
  {
    title: "TikTok Search",
    method: "GET",
    path: "/api/search?q=Montagem",
    description: "Mencari video TikTok berdasarkan kata kunci. Hasil pencarian hanya berisi kandidat video; pemindaian preset dilakukan setelah pengguna memilih video dan mengirim URL-nya ke Find Preset.",
    request: `GET ${BASE}/api/search?q=Montagem\nAccept: application/json`,
    response: `{
  "ok": true,
  "keyword": "Montagem",
  "count": 1,
  "videos": [
    {
      "id": "VIDEO_ID",
      "url": "https://www.tiktok.com/@creator/video/VIDEO_ID",
      "description": "Video description",
      "author": "creator",
      "nickname": "Creator Name",
      "cover": "https://...",
      "views": 120000,
      "likes": 8500,
      "comments": 120,
      "music": "Music title"
    }
  ]
}`,
    params: "q (wajib): kata kunci pencarian, 2–100 karakter.\nTidak memerlukan TIKTOK_TTWID atau API key yang diisi manual. Server mencoba memperoleh visitor cookie publik secara otomatis dari halaman TikTok. TikTok dapat membatasi atau menolak request otomatis; jika itu terjadi endpoint dapat mengembalikan error 502."
  },
  {
    title: "Find Preset",
    method: "GET",
    path: "/api/find?url={TIKTOK_VIDEO_URL}",
    description: "Memulai pemindaian preset dari URL video. Untuk alur Search Preset, kirim URL video yang dipilih ke endpoint yang sama ini. Find saat ini meneruskan stream dari layanan finder upstream yang sudah ada di source project.",
    request: `GET ${BASE}/api/find?url=https%3A%2F%2Fwww.tiktok.com%2F%40creator%2Fvideo%2F123456789\nAccept: text/event-stream`,
    response: "Content-Type: text/event-stream; charset=utf-8\nRespons berupa Server-Sent Events (SSE). Nama event dan payload mengikuti layanan finder upstream.",
    params: "url (wajib): URL video TikTok yang valid.\nbat (opsional): parameter yang diteruskan ke finder upstream.\nchg (opsional): parameter yang diteruskan ke finder upstream."
  }
];

export default function ApiDocsPage() {
  const [copied, setCopied] = useState("");
  async function copy(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      window.setTimeout(() => setCopied(""), 1800);
    } catch {
      setCopied("Gagal menyalin");
    }
  }
  const all = sections.map((s) => [s.title, `${s.method} ${s.path}`, s.description, s.params ? `PARAMETERS\n${s.params}` : "", `REQUEST\n${s.request}`, `RESPONSE\n${s.response}`].filter(Boolean).join("\n\n")).join("\n\n==============================\n\n");
  return <main className="docs-shell">
    <header className="docs-header">
      <a href="/" className="docs-brand">✦ XIYU <span>API DOCUMENTATION</span></a>
      <a href="/" className="docs-back">← Kembali ke Finder</a>
    </header>
    <section className="docs-intro">
      <span className="docs-kicker">DEVELOPER CENTER</span>
      <h1>Document API</h1>
      <p>Dokumentasi resmi endpoint API XIYU Find Preset, parameter, request, dan contoh response.</p>
      <button className="docs-copy-all" onClick={() => copy("all", all)}>{copied === "all" ? "✓ Berhasil disalin" : "▢ Copy All Document"}</button>
      <div className="docs-base"><small>BASE URL</small><code>{BASE}</code><button onClick={() => copy("base", BASE)}>{copied === "base" ? "Copied" : "Copy"}</button></div>
    </section>
    <section className="docs-content">
      {sections.map((s, i) => <article className="docs-card" key={s.title}>
        <div className="docs-card-top"><span className="docs-index">0{i + 1}</span><div><h2>{s.title}</h2><p>{s.description}</p></div></div>
        <div className="docs-endpoint"><b className={s.method === "GET" ? "get" : "base-method"}>{s.method}</b><code>{s.path}</code><button onClick={() => copy(`${s.title}-endpoint`, `${s.method} ${s.path}`)}>{copied === `${s.title}-endpoint` ? "Copied" : "Copy"}</button></div>
        {s.params && <DocBlock title="PARAMETERS" value={s.params} copied={copied} onCopy={copy} id={`${s.title}-params`} />}
        <DocBlock title="REQUEST" value={s.request} copied={copied} onCopy={copy} id={`${s.title}-request`} />
        <DocBlock title="RESPONSE" value={s.response} copied={copied} onCopy={copy} id={`${s.title}-response`} />
      </article>)}
      <aside className="docs-notice"><b>Catatan penggunaan</b><p>Search mengambil daftar kandidat video TikTok saja. Setelah memilih video, gunakan URL video tersebut pada endpoint Find Preset untuk memulai pemindaian.</p><p>Search mencoba memperoleh visitor cookie publik TikTok secara otomatis. Tidak perlu mengisi <code>TIKTOK_TTWID</code> di Environment Variables. Ketersediaan hasil tetap bergantung pada respons, pembatasan, dan perubahan sistem TikTok.</p><p>Endpoint Find pada source saat ini masih meneruskan SSE ke layanan finder upstream. Dokumentasi ini tidak mengklaim scanner tersebut sudah mandiri.</p></aside>
    </section>
    <footer className="docs-footer">XIYU FIND PRESET · API DOCUMENTATION</footer>
  </main>;
}

function DocBlock({ title, value, copied, onCopy, id }: { title: string; value: string; copied: string; onCopy: (label: string, value: string) => void; id: string }) {
  return <div className="docs-block"><div><b>{title}</b><button onClick={() => onCopy(id, value)}>{copied === id ? "✓ Copied" : "Copy"}</button></div><pre>{value}</pre></div>;
}
