"use client";

import { useState } from "react";

const BASE = "https://your-domain.vercel.app";
const sections = [
  {
    title: "Base URL",
    method: "BASE",
    path: BASE,
    description: "Ganti domain contoh dengan domain deployment XIYU milikmu. Semua endpoint di bawah menggunakan base URL ini.",
    request: BASE,
    response: "Base URL tidak mengembalikan JSON; gunakan endpoint yang tersedia di bawah."
  },
  {
    title: "TikTok Search",
    method: "GET",
    path: "/api/search?q=Montagem",
    description: "Mencari kandidat video TikTok berdasarkan kata kunci. Endpoint memakai modul pencarian TikTok yang diintegrasikan dari source tiktok-search-api yang diberikan. Memerlukan TIKTOK_TTWID di Environment Variables Vercel.",
    request: `GET ${BASE}/api/search?q=Montagem\nAccept: application/json`,
    response: `{
  "ok": true,
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
    params: "q (wajib): kata kunci 2–100 karakter.\nKonfigurasi server: TIKTOK_TTWID (wajib), isi dengan nilai cookie ttwid saja, tanpa awalan ttwid= dan tanpa titik koma. Jangan pernah menaruh nilainya di frontend atau membagikannya."
  },
  {
    title: "Find Preset",
    method: "GET",
    path: "/api/find?url={TIKTOK_VIDEO_URL}",
    description: "Memulai pemindaian berdasarkan URL video. Route saat ini memvalidasi URL TikTok dan meneruskan stream dari layanan finder upstream yang dikonfigurasi di source. Ini belum merupakan scanner mandiri XIYU.",
    request: `GET ${BASE}/api/find?url=https%3A%2F%2Fwww.tiktok.com%2F%40creator%2Fvideo%2F123456789`,
    response: "Content-Type: text/event-stream; charset=utf-8\nRespons berupa Server-Sent Events (SSE) yang diteruskan dari layanan finder upstream. Bentuk event dan payload final bergantung pada layanan tersebut.",
    params: "url (wajib): URL video TikTok yang valid.\nbat (opsional): parameter diteruskan ke layanan finder upstream.\nchg (opsional): parameter diteruskan ke layanan finder upstream."
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
  const all = sections.map((s) => [s.title, `${s.method} ${s.path}`, s.description, s.params ? `PARAMETER\n${s.params}` : "", `REQUEST\n${s.request}`, `RESPONSE\n${s.response}`].filter(Boolean).join("\n\n")).join("\n\n==============================\n\n");
  return <main className="docs-shell">
    <header className="docs-header">
      <a href="/" className="docs-brand">✦ XIYU <span>API DOCUMENTATION</span></a>
      <a href="/" className="docs-back">← Kembali ke Finder</a>
    </header>
    <section className="docs-intro">
      <span className="docs-kicker">DEVELOPER CENTER</span>
      <h1>Document API</h1>
      <p>Dokumentasi endpoint API XIYU Find Preset, parameter, request, dan contoh response.</p>
      <button className="docs-copy-all" onClick={() => copy("all", all)}>{copied === "all" ? "✓ Berhasil disalin" : "▢ Copy All Document"}</button>
      <div className="docs-base"><small>BASE URL CONTOH</small><code>{BASE}</code><button onClick={() => copy("base", BASE)}>{copied === "base" ? "Copied" : "Copy"}</button></div>
    </section>
    <section className="docs-content">
      {sections.map((s, i) => <article className="docs-card" key={s.title}>
        <div className="docs-card-top"><span className="docs-index">0{i + 1}</span><div><h2>{s.title}</h2><p>{s.description}</p></div></div>
        <div className="docs-endpoint"><b className={s.method === "GET" ? "get" : "base-method"}>{s.method}</b><code>{s.path}</code><button onClick={() => copy(`${s.title}-endpoint`, s.path)}>{copied === `${s.title}-endpoint` ? "Copied" : "Copy"}</button></div>
        {s.params && <DocBlock title="PARAMETERS" value={s.params} copied={copied} onCopy={copy} id={`${s.title}-params`} />}
        <DocBlock title="REQUEST" value={s.request} copied={copied} onCopy={copy} id={`${s.title}-request`} />
        <DocBlock title="RESPONSE" value={s.response} copied={copied} onCopy={copy} id={`${s.title}-response`} />
      </article>)}
      <aside className="docs-notice"><b>Catatan konfigurasi</b><p>Search menggunakan implementasi pencarian dari source TikTok Search yang diberikan. Isi <code>TIKTOK_TTWID</code> di Environment Variables Vercel (nilai cookie saja, tanpa <code>ttwid=</code>). Jangan menaruh cookie di frontend atau membagikannya.</p><p>Dokumentasi ini menggambarkan route yang ada pada source project saat ini. Find Preset masih meneruskan SSE ke upstream; dukungan YouTube dan scanner mandiri belum tersedia pada route tersebut.</p></aside>
    </section>
    <footer className="docs-footer">XIYU FIND PRESET · API DOCUMENTATION</footer>
  </main>;
}

function DocBlock({ title, value, copied, onCopy, id }: { title: string; value: string; copied: string; onCopy: (label: string, value: string) => void; id: string }) {
  return <div className="docs-block"><div><b>{title}</b><button onClick={() => onCopy(id, value)}>{copied === id ? "✓ Copied" : "Copy"}</button></div><pre>{value}</pre></div>;
}
