"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

type PresetLink = {
  type?: string;
  url: string;
  title?: string;
  thumb?: string;
  source?: string;
  detail?: string;
  byAuthor?: boolean;
};

type VideoStats = {
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
};

type VideoInfo = {
  id?: string;
  url?: string;
  description?: string;
  createTime?: string;
  stats?: VideoStats;
  cover?: string;
  playUrl?: string;
  playUrlNoWm?: string;
  width?: number;
  height?: number;
};

type AuthorDetail = {
  uniqueId?: string;
  nickname?: string;
  bio?: string;
  bioLink?: string;
  avatar?: string;
};

type FinderResult = {
  ok?: boolean;
  found?: boolean;
  author?: string;
  videoUrl?: string;
  presetLinks?: PresetLink[];
  input?: string;
  video?: VideoInfo;
  authorDetail?: AuthorDetail;
  otherLinks?: {
    url: string;
    source?: string;
    detail?: string;
  }[];
  scanned?: {
    description?: boolean;
    bio?: boolean;
    bioLinkPage?: boolean;
    comments?: number;
    replies?: number;
  };
  error?: string;
};

type HistoryItem = {
  url: string;
  time: number;
};

type SearchVideo = {
  id: string;
  url: string;
  description?: string;
  author?: string;
  nickname?: string;
  cover?: string;
  views?: number;
  likes?: number;
  comments?: number;
  music?: string;
};

function formatNumber(value?: number) {
  if (typeof value !== "number") return "0";

  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value);
}

function getPresetSize(type?: string) {
  if (!type) return "PRESET";

  return type.toUpperCase();
}

/**
 * Menentukan apakah sebuah link kemungkinan merupakan
 * link XML preset / tempat XML preset disimpan.
 *
 * Yang didukung:
 * - file .xml
 * - Google Drive
 * - WhatsApp Channel
 *
 * Sengaja TIDAK memasukkan wa.me karena itu biasanya
 * link order / kontak owner, bukan XML.
 */
function isXmlLink(
  link:
    | PresetLink
    | {
        url: string;
        source?: string;
        detail?: string;
      }
) {
  const value = link.url?.trim();

  if (!value) return false;

  const type =
    "type" in link
      ? String(link.type || "").toLowerCase()
      : "";

  if (type.includes("xml")) {
    return true;
  }

  try {
    const parsed = new URL(value);

    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname.toLowerCase();

    // Direct XML file
    if (path.endsWith(".xml")) {
      return true;
    }

    // Google Drive XML
    if (
      host === "drive.google.com" ||
      host.endsWith(".drive.google.com")
    ) {
      return true;
    }

    // WhatsApp Channel
    if (
      host === "whatsapp.com" ||
      host.endsWith(".whatsapp.com")
    ) {
      if (
        path.startsWith("/channel/") ||
        path.includes("/channel/")
      ) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

function isTikTok(value: string) {
  try {
    const url = new URL(value.trim());

    return (
      /(^|\.)tiktok\.com$/i.test(url.hostname) ||
      /(^|\.)vt\.tiktok\.com$/i.test(url.hostname)
    );
  } catch {
    return false;
  }
}

function Icon({
  name,
  size = 22
}: {
  name:
    | "search"
    | "sparkle"
    | "menu"
    | "play"
    | "eye"
    | "heart"
    | "comment"
    | "user"
    | "link"
    | "external"
    | "copy"
    | "check"
    | "clock"
    | "bookmark"
    | "home"
    | "arrow";
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const
  };

  switch (name) {
    case "search":
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4-4" />
        </svg>
      );

    case "sparkle":
      return (
        <svg {...common}>
          <path d="m12 3-1.4 5.6L5 10l5.6 1.4L12 17l1.4-5.6L19 10l-5.6-1.4L12 3Z" />
          <path d="m19 16-.7 2.3L16 19l2.3.7L19 22l.7-2.3L22 19l-2.3-.7L19 16Z" />
        </svg>
      );

    case "menu":
      return (
        <svg {...common}>
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      );

    case "play":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M8 5.5v13L19 12 8 5.5Z" />
        </svg>
      );

    case "eye":
      return (
        <svg {...common}>
          <path d="M2.5 12s3.2-5 9.5-5 9.5 5 9.5 5-3.2 5-9.5 5-9.5-5-9.5-5Z" />
          <circle cx="12" cy="12" r="2.5" />
        </svg>
      );

    case "heart":
      return (
        <svg {...common}>
          <path d="M20.8 8.9c0 5-8.8 10-8.8 10s-8.8-5-8.8-10A4.7 4.7 0 0 1 12 6.3a4.7 4.7 0 0 1 8.8 2.6Z" />
        </svg>
      );

    case "comment":
      return (
        <svg {...common}>
          <path d="M20 11.5a7.5 7.5 0 0 1-8 7.5 8.4 8.4 0 0 1-3.4-.7L4 20l1.7-4.1A7.2 7.2 0 0 1 4 11.5 7.5 7.5 0 0 1 12 4a7.5 7.5 0 0 1 8 7.5Z" />
        </svg>
      );

    case "user":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20c.8-3.2 3-5 7-5s6.2 1.8 7 5" />
        </svg>
      );

    case "link":
      return (
        <svg {...common}>
          <path d="M10 13.5 14 10" />
          <path d="M7.5 15.5 6 17a3.2 3.2 0 0 1-4.5-4.5l3-3A3.2 3.2 0 0 1 9 9" />
          <path d="M16.5 8.5 18 7a3.2 3.2 0 0 1 4.5 4.5l-3 3A3.2 3.2 0 0 1 15 15" />
        </svg>
      );

    case "external":
      return (
        <svg {...common}>
          <path d="M14 4h6v6" />
          <path d="m20 4-9 9" />
          <path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" />
        </svg>
      );

    case "copy":
      return (
        <svg {...common}>
          <rect x="8" y="8" width="11" height="11" rx="2" />
          <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
        </svg>
      );

    case "check":
      return (
        <svg {...common}>
          <path d="m5 12 4 4L19 6" />
        </svg>
      );

    case "clock":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7v5l3 2" />
        </svg>
      );

    case "bookmark":
      return (
        <svg {...common}>
          <path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-3.5L6 21V4.5Z" />
        </svg>
      );

    case "home":
      return (
        <svg {...common}>
          <path d="m3.5 10 8.5-7 8.5 7" />
          <path d="M5.5 9v11h13V9" />
          <path d="M9.5 20v-6h5v6" />
        </svg>
      );

    case "arrow":
      return (
        <svg {...common}>
          <path d="M5 12h14" />
          <path d="m13 6 6 6-6 6" />
        </svg>
      );

    default:
      return null;
  }
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [keyword, setKeyword] = useState("");
  const [videos, setVideos] = useState<SearchVideo[]>([]);
  const [searchingVideos, setSearchingVideos] = useState(false);
  const [searchMessage, setSearchMessage] = useState("");
  const [result, setResult] =
    useState<FinderResult | null>(null);

  const [status, setStatus] = useState<
    "idle" | "running" | "done" | "error"
  >("idle");

  const [progress, setProgress] = useState(
    "Ready to find presets."
  );

  const [error, setError] = useState("");
  const [copied, setCopied] =
    useState<string | null>(null);

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeTab, setActiveTab] = useState("home");

  const eventSourceRef =
    useRef<EventSource | null>(null);

  useEffect(() => {
    try {
      const stored =
        localStorage.getItem("xiyu_history");

      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch {
      setHistory([]);
    }

    return () => {
      eventSourceRef.current?.close();
    };
  }, []);

  const saveHistory = useCallback((value: string) => {
    try {
      const old: HistoryItem[] = JSON.parse(
        localStorage.getItem("xiyu_history") || "[]"
      );

      const next = [
        {
          url: value,
          time: Date.now()
        },
        ...old.filter(
          (item) => item.url !== value
        )
      ].slice(0, 10);

      localStorage.setItem(
        "xiyu_history",
        JSON.stringify(next)
      );

      setHistory(next);
    } catch {
      // Ignore localStorage errors.
    }
  }, []);

  const search = useCallback((selectedUrl?: string) => {
    const value = (selectedUrl ?? url).trim();

    if (!value) {
      setError("Paste a TikTok link first.");
      setStatus("error");
      return;
    }

    if (!isTikTok(value)) {
      setError("That doesn't look like a TikTok link.");
      setStatus("error");
      return;
    }

    eventSourceRef.current?.close();

    setResult(null);
    setError("");
    setStatus("running");
    setProgress("Connecting to finder...");

    saveHistory(value);

    const endpoint =
      `/api/find?url=${encodeURIComponent(value)}`;

    const source = new EventSource(endpoint);

    eventSourceRef.current = source;

    source.addEventListener("log", (event) => {
      const message =
        (event as MessageEvent).data;

      if (typeof message === "string") {
        setProgress(
          message.replace(/^"|"$/g, "")
        );
      }
    });

    source.addEventListener("result", (event) => {
      try {
        const parsed = JSON.parse(
          (event as MessageEvent).data
        ) as FinderResult;

        if (!parsed.ok) {
          setStatus("error");

          setError(
            parsed.error ||
              "The finder could not process this link."
          );

          source.close();
          return;
        }

        setResult(parsed);
        setStatus("done");
        setProgress("Preset search completed.");

        source.close();
      } catch {
        setStatus("error");
        setError(
          "The server returned an unreadable response."
        );

        source.close();
      }
    });

    source.addEventListener("error", () => {
      if (
        source.readyState ===
        EventSource.CLOSED
      ) {
        if (status !== "done") {
          setStatus("error");

          setError(
            "The finder connection closed before the result arrived."
          );
        }
      }
    });
  }, [url, saveHistory, status]);

  const searchVideos = async () => {
    const q = keyword.trim();
    if (q.length < 2) {
      setSearchMessage("Masukkan minimal 2 karakter untuk mencari video.");
      return;
    }
    setSearchingVideos(true);
    setVideos([]);
    setSearchMessage("Mencari video TikTok...");
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { cache: "no-store" });
      const raw = await response.text();
      let data: any;
      try {
        data = raw.trim() ? JSON.parse(raw) : null;
      } catch {
        throw new Error(`Server Search mengembalikan respons bukan JSON (HTTP ${response.status}). Cek deployment dan Runtime Logs Vercel.`);
      }
      if (!data) throw new Error(`Server Search mengirim respons kosong (HTTP ${response.status}).`);
      if (!response.ok || !data.ok) {
        const stage = data.stage ? ` [tahap: ${data.stage}]` : "";
        throw new Error(`${data.error || "Pencarian belum tersedia."}${stage}`);
      }
      const items = Array.isArray(data.videos) ? data.videos : [];
      setVideos(items);
      setSearchMessage(items.length ? `${items.length} video ditemukan. Pilih video untuk mencari preset.` : "Belum ada video yang ditemukan.");
    } catch (err) {
      setSearchMessage(err instanceof Error ? err.message : "Pencarian gagal.");
    } finally {
      setSearchingVideos(false);
    }
  };

  const scanSelectedVideo = (videoUrl: string) => {
    setUrl(videoUrl);
    setResult(null);
    setError("");
    setVideos([]);
    setSearchMessage("Video dipilih. Memulai pemindaian preset...");
    window.scrollTo({ top: 0, behavior: "smooth" });
    search(videoUrl);
  };

  const clearResult = () => {
    eventSourceRef.current?.close();

    setResult(null);
    setStatus("idle");
    setProgress("Ready to find presets.");
    setError("");
  };

  const copyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);

      setCopied(link);

      window.setTimeout(() => {
        setCopied((current) =>
          current === link ? null : current
        );
      }, 1800);
    } catch {
      setError("Unable to copy the link.");
    }
  };

  /*
   * =====================================================
   * PRESET + XML DETECTION
   * =====================================================
   *
   * presetLinks:
   *   Biasanya berisi link Alight Motion 5MB.
   *
   * otherLinks:
   *   Bisa berisi link tambahan yang ditemukan dari
   *   description / komentar / profile / sumber lain.
   *
   * Kita gabungkan keduanya untuk mencari XML.
   */

  const allPresetLinks =
    result?.presetLinks || [];

  const otherLinks =
    result?.otherLinks || [];

  /*
   * XML dipisahkan dari preset biasa.
   *
   * Contoh:
   *
   * 5MB
   * https://alightcreative.com/...
   *
   * XML
   * https://drive.google.com/file/...
   *
   * atau:
   *
   * XML
   * https://whatsapp.com/channel/...
   */
  const xmlLinks = useMemo(() => {
    const candidates = [
      ...allPresetLinks.filter((link) =>
        isXmlLink(link)
      ),

      ...otherLinks.filter((link) =>
        isXmlLink(link)
      )
    ];

    const seen = new Set<string>();

    return candidates.filter((link) => {
      const value = link.url?.trim();

      if (!value) return false;

      if (seen.has(value)) {
        return false;
      }

      seen.add(value);

      return true;
    });
  }, [allPresetLinks, otherLinks]);

  /*
   * Semua preset non-XML tetap dianggap sebagai preset
   * utama / 5MB.
   */
  const presets = useMemo(
    () =>
      allPresetLinks.filter(
        (link) => !isXmlLink(link)
      ),
    [allPresetLinks]
  );

  const video = result?.video;
  const author = result?.authorDetail;

  const profileUrl = useMemo(() => {
    if (!author?.uniqueId) return null;

    return `https://www.tiktok.com/@${author.uniqueId}`;
  }, [author?.uniqueId]);

  return (
    <main className="site-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <section className="hero">
        <div className="hero-image" />

        <div className="hero-overlay" />

        <header className="topbar">
          <div className="brand">
            <div className="brand-sparkle">
              <Icon
                name="sparkle"
                size={25}
              />
            </div>

            <div>
              <div className="brand-name">
                XIYU
              </div>

              <div className="brand-sub">
                FIND PRESET
              </div>
            </div>
          </div>

          <div className="hero-actions">
            <span className="finder-pill">
              <Icon
                name="sparkle"
                size={15}
              />

              FIND PRESET
            </span>


          </div>
        </header>

        <div className="hero-copy">
          <div className="script-line">
            <Icon
              name="sparkle"
              size={18}
            />

            Find
          </div>

          <h1>
            Alight Motion
            <br />
            Preset
          </h1>

          <p>
            From TikTok,
            <br />
            Faster & Easier
          </p>
        </div>

        <div className="hero-side-text">
          Good
          <br />
          Preset
          <br />
          Good
          <br />
          Vibes ♡
        </div>
      </section>

      <div className="content-wrap">
        <section className="keyword-search-panel">
          <div className="keyword-heading">
            <div><span className="keyword-kicker">TIKTOK DISCOVERY</span><h2>Search Preset</h2></div>
            <span className="keyword-note">Cari berdasarkan lagu atau kata kunci</span>
          </div>
          <div className="keyword-search-row">
            <input value={keyword} onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") searchVideos(); }}
              placeholder="Contoh: Montagem, DJ TikTok..." aria-label="Kata kunci TikTok" />
            <button type="button" onClick={searchVideos} disabled={searchingVideos}>
              {searchingVideos ? "Mencari..." : "Cari Video"}
            </button>
          </div>
          {searchMessage && <p className="keyword-status">{searchMessage}</p>}
          {videos.length > 0 && <div className="video-search-grid">
            {videos.map((video) => <article className="video-search-card" key={video.id}>
              {video.cover ? <img src={video.cover} alt="Thumbnail video TikTok" loading="lazy" /> : <div className="video-placeholder">♪</div>}
              <div className="video-search-info">
                <strong>{video.nickname || video.author || "TikTok creator"}</strong>
                <p>{video.description || video.music || "Video TikTok"}</p>
                <div className="video-search-stats"><span>▶ {formatNumber(video.views)}</span><span>♥ {formatNumber(video.likes)}</span><span>▢ {formatNumber(video.comments)}</span></div>
                <button type="button" onClick={() => scanSelectedVideo(video.url)}>Cari Preset</button>
              </div>
            </article>)}
          </div>}
        </section>

        <div className="finder-divider"><span>ATAU CARI DARI LINK VIDEO</span></div>
        <section className="search-card">
          <div className="tiktok-symbol">
            ♪
          </div>

          <input
            value={url}
            onChange={(event) =>
              setUrl(event.target.value)
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                search();
              }
            }}
            placeholder="Paste TikTok link here..."
            aria-label="TikTok URL"
            spellCheck={false}
          />

          {url && (
            <button
              className="clear-search"
              type="button"
              onClick={() => setUrl("")}
              aria-label="Clear"
            >
              ×
            </button>
          )}

          <button
            className="search-button"
            type="button"
            onClick={search}
            disabled={status === "running"}
            aria-label="Search"
          >
            <Icon
              name="search"
              size={25}
            />
          </button>
        </section>

        {status === "running" && (
          <section className="progress-card">
            <div className="progress-spinner" />

            <div>
              <strong>
                Finding your preset...
              </strong>

              <span>{progress}</span>
            </div>
          </section>
        )}

        {status === "error" && error && (
          <section className="error-card">
            <div className="error-icon">
              !
            </div>

            <div>
              <strong>
                Search stopped
              </strong>

              <span>{error}</span>
            </div>

            <button
              type="button"
              onClick={clearResult}
            >
              ×
            </button>
          </section>
        )}

        {status === "idle" && !result && (
          <section className="welcome-card">
            <div className="welcome-icon">
              <Icon
                name="sparkle"
                size={29}
              />
            </div>

            <div>
              <h2>
                Find your next preset
              </h2>

              <p>
                Paste a TikTok video link and
                let XIYU search the description,
                profile and comments.
              </p>
            </div>
          </section>
        )}

        {result && (
          <>
            <section className="result-video-card">
              <div className="video-preview">
                {video?.playUrlNoWm ||
                video?.playUrl ? (
                  <video
                    src={
                      video.playUrlNoWm ||
                      video.playUrl
                    }
                    poster={video.cover}
                    controls
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  <img
                    src={
                      video?.cover ||
                      "/hero.jpg"
                    }
                    alt=""
                  />
                )}

                {!video?.playUrlNoWm &&
                  !video?.playUrl &&
                  video?.cover && (
                    <div className="video-play-fallback">
                      <Icon
                        name="play"
                        size={28}
                      />
                    </div>
                  )}
              </div>

              <div className="video-info">
                <div className="video-author-row">
                  {author?.avatar ? (
                    <img
                      src={author.avatar}
                      alt=""
                      className="avatar large-avatar"
                    />
                  ) : (
                    <div className="avatar avatar-placeholder">
                      <Icon
                        name="user"
                        size={20}
                      />
                    </div>
                  )}

                  <div className="author-heading">
                    <strong>
                      {result.author ||
                        `@${
                          author?.uniqueId ||
                          "unknown"
                        }`}
                    </strong>

                    <span>
                      {author?.nickname ||
                        "TikTok creator"}
                    </span>
                  </div>

                  {profileUrl && (
                    <a
                      href={profileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="round-external"
                      aria-label="Open TikTok profile"
                    >
                      <Icon
                        name="external"
                        size={19}
                      />
                    </a>
                  )}
                </div>

                {video?.description && (
                  <p className="description">
                    {video.description}
                  </p>
                )}

                <div className="stats-row">
                  <div className="stat">
                    <Icon
                      name="eye"
                      size={19}
                    />

                    <strong>
                      {formatNumber(
                        video?.stats?.views
                      )}
                    </strong>

                    <span>Views</span>
                  </div>

                  <div className="stat">
                    <Icon
                      name="heart"
                      size={19}
                    />

                    <strong>
                      {formatNumber(
                        video?.stats?.likes
                      )}
                    </strong>

                    <span>Likes</span>
                  </div>

                  <div className="stat">
                    <Icon
                      name="comment"
                      size={19}
                    />

                    <strong>
                      {formatNumber(
                        video?.stats?.comments
                      )}
                    </strong>

                    <span>Comments</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="account-card">
              <div className="account-top">
                {author?.avatar ? (
                  <img
                    src={author.avatar}
                    alt=""
                    className="avatar account-avatar"
                  />
                ) : (
                  <div className="avatar account-avatar avatar-placeholder">
                    <Icon
                      name="user"
                      size={23}
                    />
                  </div>
                )}

                <div className="account-name">
                  <span>Account</span>

                  <strong>
                    {result.author ||
                      `@${
                        author?.uniqueId ||
                        "unknown"
                      }`}
                  </strong>
                </div>

                {profileUrl && (
                  <a
                    href={profileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="profile-button"
                  >
                    View profile

                    <Icon
                      name="arrow"
                      size={16}
                    />
                  </a>
                )}
              </div>

              <div className="account-details">
                {author?.bio && (
                  <div className="detail-item">
                    <Icon
                      name="user"
                      size={17}
                    />

                    <span>
                      {author.bio.split(
                        "\n"
                      )[0]}
                    </span>
                  </div>
                )}

                {author?.bioLink && (
                  <a
                    href={author.bioLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="detail-item link-detail"
                  >
                    <Icon
                      name="link"
                      size={17}
                    />

                    <span>
                      {author.bioLink}
                    </span>
                  </a>
                )}
              </div>
            </section>

            {/* =====================================================
                PRESET 5MB
               ===================================================== */}

            <section className="preset-section">
              <div className="section-heading">
                <div className="section-title">
                  <Icon
                    name="sparkle"
                    size={22}
                  />

                  <h2>
                    Preset links
                  </h2>

                  <span className="count-pill">
                    {presets.length}{" "}
                    {presets.length === 1
                      ? "result"
                      : "results"}
                  </span>
                </div>

                <span className="section-script">
                  Best Preset ♕
                </span>
              </div>

              {presets.length === 0 ? (
                <div className="empty-card">
                  <Icon
                    name="sparkle"
                    size={30}
                  />

                  <strong>
                    No 5MB preset found
                  </strong>

                  <span>
                    No Alight Motion 5MB
                    preset links were found
                    in this TikTok.
                  </span>
                </div>
              ) : (
                <div className="preset-list">
                  {presets.map(
                    (preset, index) => {
                      const isCopied =
                        copied ===
                        preset.url;

                      return (
                        <article
                          className="preset-card"
                          key={`${preset.url}-${index}`}
                        >
                          <div className="preset-thumb-wrap">
                            {preset.thumb ? (
                              <img
                                src={
                                  preset.thumb
                                }
                                alt=""
                                className="preset-thumb"
                                loading="lazy"
                              />
                            ) : (
                              <div className="preset-thumb fallback-thumb">
                                <Icon
                                  name="sparkle"
                                  size={35}
                                />
                              </div>
                            )}

                            {index === 0 && (
                              <span className="crown">
                                ♛
                              </span>
                            )}

                            <span className="size-badge">
                              {getPresetSize(
                                preset.type
                              )}
                            </span>
                          </div>

                          <div className="preset-content">
                            <h3>
                              {preset.title ||
                                "Alight Motion Preset"}
                            </h3>

                            <div className="preset-badges">
                              <span className="type-badge">
                                <Icon
                                  name="sparkle"
                                  size={13}
                                />

                                {getPresetSize(
                                  preset.type
                                )}
                              </span>

                              {preset.byAuthor && (
                                <span className="author-badge">
                                  BY THIS ACCOUNT
                                </span>
                              )}
                            </div>

                            {preset.detail && (
                              <span className="preset-author">
                                @
                                {preset.detail.replace(
                                  /^@/,
                                  ""
                                )}
                              </span>
                            )}

                            <div className="preset-url">
                              {preset.url}
                            </div>

                            <div className="preset-actions">
                              <a
                                href={
                                  preset.url
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="open-button"
                              >
                                <Icon
                                  name="external"
                                  size={18}
                                />

                                Open preset
                              </a>

                              <button
                                type="button"
                                className={`copy-button ${
                                  isCopied
                                    ? "copied"
                                    : ""
                                }`}
                                onClick={() =>
                                  copyLink(
                                    preset.url
                                  )
                                }
                              >
                                {isCopied ? (
                                  <Icon
                                    name="check"
                                    size={18}
                                  />
                                ) : (
                                  <Icon
                                    name="copy"
                                    size={18}
                                  />
                                )}

                                {isCopied
                                  ? "Copied"
                                  : "Copy link"}
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    }
                  )}
                </div>
              )}
            </section>

            {/* =====================================================
                XML PRESET
               ===================================================== */}

            {xmlLinks.length > 0 && (
              <section className="preset-section xml-section">
                <div className="section-heading">
                  <div className="section-title">
                    <Icon
                      name="link"
                      size={22}
                    />

                    <h2>
                      XML Preset
                    </h2>

                    <span className="count-pill">
                      {xmlLinks.length}{" "}
                      {xmlLinks.length === 1
                        ? "result"
                        : "results"}
                    </span>
                  </div>

                  <span className="section-script">
                    XML ♕
                  </span>
                </div>

                <div className="preset-list">
                  {xmlLinks.map(
                    (link, index) => {
                      const isCopied =
                        copied === link.url;

                      return (
                        <article
                          className="preset-card"
                          key={`xml-${link.url}-${index}`}
                        >
                          <div className="preset-thumb-wrap">
                            <div className="preset-thumb fallback-thumb">
                              <span
                                style={{
                                  fontWeight: 800,
                                  fontSize: 22,
                                  letterSpacing:
                                    "0.08em"
                                }}
                              >
                                XML
                              </span>
                            </div>

                            {index === 0 && (
                              <span className="crown">
                                ♛
                              </span>
                            )}

                            <span className="size-badge">
                              XML
                            </span>
                          </div>

                          <div className="preset-content">
                            <h3>
                              {link.detail ||
                                link.source ||
                                "Preset XML"}
                            </h3>

                            <div className="preset-badges">
                              <span className="type-badge">
                                <Icon
                                  name="link"
                                  size={13}
                                />

                                XML
                              </span>
                            </div>

                            <div className="preset-url">
                              {link.url}
                            </div>

                            <div className="preset-actions">
                              <a
                                href={
                                  link.url
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="open-button"
                              >
                                <Icon
                                  name="external"
                                  size={18}
                                />

                                Open XML
                              </a>

                              <button
                                type="button"
                                className={`copy-button ${
                                  isCopied
                                    ? "copied"
                                    : ""
                                }`}
                                onClick={() =>
                                  copyLink(
                                    link.url
                                  )
                                }
                              >
                                {isCopied ? (
                                  <Icon
                                    name="check"
                                    size={18}
                                  />
                                ) : (
                                  <Icon
                                    name="copy"
                                    size={18}
                                  />
                                )}

                                {isCopied
                                  ? "Copied"
                                  : "Copy link"}
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    }
                  )}
                </div>
              </section>
            )}
          </>
        )}

        <footer className="footer">
          <div className="footer-sparkles">
            <Icon
              name="sparkle"
              size={16}
            />

            <span>
              XIYU FIND PRESET
            </span>

            <Icon
              name="sparkle"
              size={16}
            />
          </div>

          <p>
            Find presets. Create something
            beautiful.
          </p>
        </footer>
      </div>

      <nav className="bottom-nav">
        <a className="active" href="/" aria-current="page">
          <Icon name="home" size={21} />
          <span>Home</span>
        </a>
        <a href="/docs">
          <Icon name="copy" size={21} />
          <span>Document API</span>
        </a>
      </nav>
    </main>
  );
}
