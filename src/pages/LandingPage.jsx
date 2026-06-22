// src/pages/LandingPage.jsx
import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  AnimatePresence,
} from "framer-motion";

/* ------------------------------------------------------------------ */
/*  Fonts — same pairing as Login.jsx, so the handoff from landing to */
/*  login feels like one continuous brand, not two different apps.   */
/* ------------------------------------------------------------------ */
function useBrandFonts() {
  useEffect(() => {
    if (document.getElementById("staykila-fonts")) return;
    const link = document.createElement("link");
    link.id = "staykila-fonts";
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Inter:wght@400;500;600;700;800&display=swap";
    document.head.appendChild(link);
  }, []);
}

/* ------------------------------------------------------------------ */
/*  Shared motion variants                                            */
/* ------------------------------------------------------------------ */
const fadeUp = {
  hidden: { opacity: 0, y: 36 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
  },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
  },
};

const staggerContainer = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.12 },
  },
};

/* Reveal-on-scroll wrapper: viewport-triggered, fires once, respects
   prefers-reduced-motion by skipping straight to the visible state. */
function Reveal({ children, variants = fadeUp, className = "", ...rest }) {
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.25 }}
      variants={variants}
      {...rest}>
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Eyebrow / chapter mark — reused from Login.jsx's visual language. */
/* ------------------------------------------------------------------ */
function Eyebrow({ children, light = false }) {
  return (
    <div className="flex items-center gap-3 mb-5 justify-center md:justify-start">
      <span className="h-px w-8 bg-[#c9a84c]" />
      <span
        className={`text-xs tracking-[0.25em] uppercase font-semibold ${
          light ? "text-[#0f1b2d]/70" : "text-[#c9a84c]"
        }`}>
        {children}
      </span>
    </div>
  );
}

/* Counts a number up from 0 to `value` once it scrolls into view. */
function Counter({ value, suffix = "", duration = 1.6 }) {
  const ref = useRef(null);
  const [display, setDisplay] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          setStarted(true);
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduceMotion) {
      setDisplay(value);
      return;
    }
    let frame;
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / (duration * 1000));
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [started, value, duration]);

  return (
    <span ref={ref}>
      {display.toLocaleString()}
      {suffix}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Sticky nav — transparent over the hero, solidifies on scroll.     */
/*  Mobile gets a slide-down menu instead of relying on hidden links. */
/* ------------------------------------------------------------------ */
function Navbar() {
  const navigate = useNavigate();
  const [solid, setSolid] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = [
    { href: "#rooms", label: "Rooms" },
    { href: "#qr", label: "QR System" },
    { href: "#analytics", label: "Analytics" },
    { href: "#pricing", label: "Pricing" },
  ];

  return (
    <header
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
        solid || menuOpen
          ? "bg-[#0f1b2d]/95 backdrop-blur-md border-b border-white/10 py-3"
          : "bg-gradient-to-b from-[#0f1b2d]/70 to-transparent py-4 md:py-5"
      }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/5 border border-[#c9a84c]/40 flex items-center justify-center shrink-0">
            <i className="fas fa-hotel text-[#c9a84c] text-sm"></i>
          </div>
          <span
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
            className="text-lg sm:text-xl text-white font-medium">
            StayKila
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm text-gray-300">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="hover:text-white transition-colors">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={() => navigate("/signin")}
            className="text-sm font-semibold text-white px-4 py-2 rounded-lg hover:bg-white/10 transition-colors">
            Login
          </button>
          <button
            onClick={() => navigate("/signin")}
            className="text-sm font-semibold text-[#0f1b2d] bg-gradient-to-r from-[#c9a84c] to-[#e8d189] px-4 py-2 rounded-lg hover:shadow-[0_8px_24px_-8px_rgba(201,168,76,0.6)] hover:-translate-y-0.5 transition-all duration-200">
            Start Free Trial
          </button>
        </div>

        {/* Mobile: compact CTA + hamburger toggle */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            onClick={() => navigate("/signin")}
            className="text-xs font-semibold text-[#0f1b2d] bg-gradient-to-r from-[#c9a84c] to-[#e8d189] px-3.5 py-2 rounded-lg whitespace-nowrap">
            Try Free
          </button>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            className="w-9 h-9 rounded-lg border border-white/15 flex items-center justify-center text-white shrink-0">
            <i
              className={`fas ${menuOpen ? "fa-xmark" : "fa-bars"} text-sm`}></i>
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="md:hidden overflow-hidden border-t border-white/10 bg-[#0f1b2d]">
            <nav className="flex flex-col px-4 sm:px-6 py-3">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="py-3 text-sm text-gray-300 border-b border-white/5 last:border-b-0">
                  {link.label}
                </a>
              ))}
              <button
                onClick={() => {
                  setMenuOpen(false);
                  navigate("/signin");
                }}
                className="mt-3 text-sm font-semibold text-white py-2.5 rounded-lg border border-white/15">
                Login
              </button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/*  A floating mini-dashboard card used in the hero. Drifts gently    */
/*  via Framer Motion's animate loop, independent of scroll.          */
/* ------------------------------------------------------------------ */
function FloatingStatCard({
  icon,
  label,
  value,
  accent = "#c9a84c",
  className = "",
  delay = 0,
  floatRange = 10,
  floatDuration = 6,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
      className={`absolute ${className}`}>
      <motion.div
        animate={{ y: [0, -floatRange, 0] }}
        transition={{
          duration: floatDuration,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="rounded-xl border border-white/10 bg-white/[0.06] backdrop-blur-xl px-4 py-3 shadow-2xl shadow-black/30 flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${accent}1f` }}>
          <i className={`fas ${icon} text-sm`} style={{ color: accent }}></i>
        </div>
        <div>
          <p className="text-[10px] tracking-wide uppercase text-gray-400 leading-none mb-1">
            {label}
          </p>
          <p className="text-base font-semibold text-white leading-none">
            {value}
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ============================================================ */
/*  SECTION 1 — HERO                                            */
/* ============================================================ */
function Hero() {
  const navigate = useNavigate();
  const sectionRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen w-full snap-start snap-always overflow-hidden flex items-center justify-center pt-24 pb-12 md:pt-28">
      {/* Parallax backdrop with actual hotel image */}
      <motion.div style={{ y: bgY }} className="absolute inset-0">
        {/* Hero background image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80')",
          }}
        />
        {/* Dark overlays */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(180deg, rgba(12,21,34,0.85) 0%, rgba(15,27,45,0.75) 40%, rgba(15,27,45,0.9) 100%)",
          }}
        />
        {/* Subtle gold gradient glow */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(201,168,76,0.15), transparent 45%), radial-gradient(circle at 80% 70%, rgba(201,168,76,0.08), transparent 50%)",
          }}
        />
        {/* Architectural grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(201,168,76,1) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,1) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
      </motion.div>

      <motion.div
        style={{ opacity: contentOpacity }}
        className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 w-full">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-10 lg:gap-16 items-center">
          {/* Copy */}
          <motion.div
            initial="hidden"
            animate="show"
            variants={staggerContainer}
            className="text-center lg:text-left">
            <motion.div variants={fadeUp}>
              <Eyebrow>Property management, reimagined</Eyebrow>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-[4.2rem] text-white font-medium leading-[1.1] lg:leading-[1.05] mb-5 sm:mb-6">
              Run Every Room
              <br />
              From <span className="italic text-[#c9a84c]">One Dashboard.</span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="text-gray-300 text-base sm:text-lg leading-relaxed max-w-xl mx-auto lg:mx-0 mb-8 sm:mb-9">
              StayKila helps hotels, lodges, inns, and resorts manage room
              occupancy, QR check-ins, guest messaging, revenue, and daily
              operations — all in real time.
            </motion.p>

            <motion.div
              variants={fadeUp}
              className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-3 sm:gap-4">
              <button
                onClick={() => navigate("/signin")}
                className="w-full sm:w-auto text-[#0f1b2d] font-semibold bg-gradient-to-r from-[#c9a84c] to-[#e8d189] px-7 py-3.5 rounded-xl hover:shadow-[0_12px_32px_-8px_rgba(201,168,76,0.55)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200">
                Start Free Trial
              </button>
              <button
                onClick={() => navigate("/signin")}
                className="w-full sm:w-auto text-white font-semibold border border-white/20 px-7 py-3.5 rounded-xl hover:bg-white/10 hover:border-white/30 transition-all duration-200">
                Login
              </button>
            </motion.div>
          </motion.div>

          {/* Floating dashboard preview — desktop/tablet only, the
              floating absolute-positioned cards don't have a clean
              mobile layout, so we show a simplified static version
              below instead of clipping/overlapping them. */}
          <motion.div
            variants={scaleIn}
            initial="hidden"
            animate="show"
            transition={{ delay: 0.3 }}
            className="relative h-[420px] hidden lg:block">
            {/* Core dashboard card */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-x-4 top-10 rounded-2xl border border-white/10 bg-white/[0.05] backdrop-blur-2xl shadow-2xl shadow-black/40 p-6">
              <div className="flex items-center justify-between mb-5">
                <span className="text-xs tracking-widest uppercase text-gray-400">
                  Property Overview
                </span>
                <span className="flex items-center gap-1.5 text-[11px] text-gray-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Live
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Available Rooms", value: "18", accent: "#34d399" },
                  { label: "Occupied Rooms", value: "42", accent: "#c9a84c" },
                  {
                    label: "Revenue Today",
                    value: "$6,240",
                    accent: "#60a5fa",
                  },
                  { label: "Occupancy Rate", value: "70%", accent: "#e8d189" },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="rounded-xl bg-white/[0.04] border border-white/5 p-4">
                    <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-1.5">
                      {s.label}
                    </p>
                    <p
                      className="text-xl font-semibold"
                      style={{ color: s.accent }}>
                      {s.value}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>

            <FloatingStatCard
              icon="fa-bell"
              label="New booking"
              value="Suite 04"
              accent="#34d399"
              className="-top-2 -left-2 z-20"
              delay={0.9}
              floatRange={8}
              floatDuration={5.5}
            />
            <FloatingStatCard
              icon="fa-qrcode"
              label="QR Scan"
              value="Room 112"
              accent="#c9a84c"
              className="bottom-4 -right-6 z-20"
              delay={1.1}
              floatRange={9}
              floatDuration={6.5}
            />
          </motion.div>

          {/* Compact mobile/tablet stat row — replaces the floating
              dashboard so nothing overlaps or spills off-screen. */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            transition={{ delay: 0.4 }}
            className="lg:hidden grid grid-cols-2 gap-3 max-w-md mx-auto w-full">
            {[
              {
                label: "Available",
                value: "18",
                accent: "#34d399",
                icon: "fa-door-open",
              },
              {
                label: "Occupied",
                value: "42",
                accent: "#c9a84c",
                icon: "fa-bed",
              },
              {
                label: "Revenue Today",
                value: "$6,240",
                accent: "#60a5fa",
                icon: "fa-sack-dollar",
              },
              {
                label: "Occupancy",
                value: "70%",
                accent: "#e8d189",
                icon: "fa-chart-pie",
              },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-white/10 bg-white/[0.05] backdrop-blur-sm p-4 flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${s.accent}1f` }}>
                  <i
                    className={`fas ${s.icon} text-xs`}
                    style={{ color: s.accent }}></i>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wide text-gray-500 leading-none mb-1 truncate">
                    {s.label}
                  </p>
                  <p className="text-sm font-semibold text-white leading-none">
                    {s.value}
                  </p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </motion.div>

      {/* Scroll cue */}
      <motion.div
        style={{ opacity: contentOpacity }}
        className="hidden sm:flex absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex-col items-center gap-2 text-gray-400">
        <span className="text-[11px] tracking-[0.2em] uppercase">Scroll</span>
        <motion.span
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          className="w-8 h-8 rounded-full border border-white/15 flex items-center justify-center">
          <i className="fas fa-chevron-down text-xs"></i>
        </motion.span>
      </motion.div>
    </section>
  );
}

/* ============================================================ */
/*  SECTION 2 — ROOM MANAGEMENT                                 */
/* ============================================================ */
const ROOM_STATUS_STYLES = {
  Available: {
    dot: "bg-emerald-400",
    text: "text-emerald-400",
    border: "border-emerald-400/30",
    glow: "rgba(52,211,153,0.18)",
  },
  Occupied: {
    dot: "bg-red-400",
    text: "text-red-400",
    border: "border-red-400/30",
    glow: "rgba(248,113,113,0.18)",
  },
  Expiring: {
    dot: "bg-orange-400",
    text: "text-orange-400",
    border: "border-orange-400/30",
    glow: "rgba(251,146,60,0.18)",
  },
  Cleaning: {
    dot: "bg-sky-400",
    text: "text-sky-400",
    border: "border-sky-400/30",
    glow: "rgba(56,189,248,0.18)",
  },
};

const ROOMS = [
  { id: "101", status: "Available" },
  { id: "102", status: "Occupied" },
  { id: "103", status: "Expiring" },
  { id: "104", status: "Cleaning" },
  { id: "105", status: "Available" },
  { id: "106", status: "Occupied" },
  { id: "107", status: "Available" },
  { id: "108", status: "Cleaning" },
];

function RoomManagement() {
  return (
    <section
      id="rooms"
      className="relative min-h-screen w-full snap-start snap-always flex items-center justify-center bg-[#0f1b2d] overflow-hidden pt-24 pb-12 md:pt-28">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,rgba(201,168,76,0.08),transparent_55%)]" />
      <div className="relative max-w-7xl mx-auto px-5 sm:px-6 w-full">
        <Reveal className="text-center max-w-2xl mx-auto mb-10 md:mb-16">
          <Eyebrow>The Front Desk</Eyebrow>
          <h2
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
            className="text-3xl sm:text-4xl md:text-5xl text-white font-medium leading-tight mb-4 md:mb-5">
            Manage Every Room{" "}
            <span className="italic text-[#c9a84c]">Instantly.</span>
          </h2>
          <p className="text-gray-400 text-sm sm:text-base leading-relaxed">
            See status, availability, and turnover across your entire property
            the moment it changes — no walking the halls required.
          </p>
        </Reveal>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.15 }}
          variants={staggerContainer}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {ROOMS.map((room) => {
            const s = ROOM_STATUS_STYLES[room.status];
            return (
              <motion.div
                key={room.id}
                variants={fadeUp}
                whileHover={{ y: -6 }}
                transition={{ duration: 0.25 }}
                className={`relative rounded-2xl border ${s.border} bg-white/[0.04] backdrop-blur-sm p-4 sm:p-5 cursor-default`}
                style={{ boxShadow: `0 12px 30px -10px ${s.glow}` }}>
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <span className="text-xs uppercase tracking-wide text-gray-500">
                    Room
                  </span>
                  <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                </div>
                <p className="text-xl sm:text-2xl font-semibold text-white mb-1">
                  {room.id}
                </p>
                <p className={`text-xs sm:text-sm font-medium ${s.text}`}>
                  {room.status}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

/* ============================================================ */
/*  SECTION 3 — QR CODE SYSTEM (signature moment)                */
/*  A literal key-card shape carries the brand's "room key"      */
/*  metaphor from Login.jsx into the marketing surface — instead */
/*  of a generic square QR tile, it's cut and bordered like a    */
/*  physical hotel key card with a perforated stub and chip.     */
/* ============================================================ */
function QRSystem() {
  return (
    <section
      id="qr"
      className="relative min-h-screen w-full snap-start snap-always flex items-center justify-center bg-[#0c1522] overflow-hidden pt-24 pb-12 md:pt-28">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_60%,rgba(201,168,76,0.1),transparent_50%)]" />
      <div className="relative max-w-7xl mx-auto px-5 sm:px-6 grid lg:grid-cols-2 gap-10 lg:gap-16 items-center w-full">
        {/* Key-card visual */}
        <Reveal
          variants={scaleIn}
          className="order-2 lg:order-1 flex justify-center">
          <div className="relative w-[240px] sm:w-[280px] md:w-[300px] h-[340px] sm:h-[400px] md:h-[420px]">
            {/* Key card body */}
            <motion.div
              initial={{ rotate: -6 }}
              whileInView={{ rotate: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0 rounded-[24px] sm:rounded-[28px] bg-gradient-to-br from-[#16243a] to-[#0c1522] border border-white/10 shadow-2xl shadow-black/50 p-5 sm:p-7 flex flex-col">
              <div className="flex items-center justify-between">
                <span
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                  className="text-white text-base sm:text-lg">
                  StayKila
                </span>
                <i className="fas fa-hotel text-[#c9a84c] text-sm"></i>
              </div>
              <p className="text-[10px] sm:text-[11px] tracking-widest uppercase text-gray-500 mt-1">
                Room 214 · Key Access
              </p>

              <div className="flex-1 flex items-center justify-center">
                <motion.div
                  animate={{ rotate: [0, 3, 0, -3, 0] }}
                  transition={{
                    duration: 8,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="w-32 h-32 sm:w-40 sm:h-40 md:w-44 md:h-44 rounded-xl bg-white p-3 shadow-[0_0_40px_-10px_rgba(201,168,76,0.5)]">
                  <div
                    className="w-full h-full rounded-md"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(0deg, #0f1b2d 0 4px, transparent 4px 8px), repeating-linear-gradient(90deg, #0f1b2d 0 4px, transparent 4px 8px)",
                      backgroundBlendMode: "multiply",
                    }}
                  />
                </motion.div>
              </div>

              <p className="text-center text-[10px] sm:text-[11px] text-gray-500">
                Scan to unlock your stay
              </p>
            </motion.div>

            {/* Phone mockup, peeking from behind. Hidden on small phones
                where there isn't room for it without overlapping. */}
            <motion.div
              initial={{ opacity: 0, x: 30, rotate: 8 }}
              whileInView={{ opacity: 1, x: 0, rotate: 8 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.8,
                delay: 0.3,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="absolute -right-10 sm:-right-14 md:-right-16 bottom-[-1.5rem] sm:bottom-[-2rem] w-24 sm:w-28 md:w-32 h-48 sm:h-56 md:h-64 rounded-[18px] sm:rounded-[22px] bg-[#0f1b2d] border-4 border-[#1d2c42] shadow-2xl shadow-black/60 p-2 hidden md:block">
              <div className="w-full h-full rounded-2xl bg-gradient-to-b from-white/10 to-transparent flex flex-col items-center justify-center gap-2 px-3">
                <i className="fas fa-wifi text-[#c9a84c] text-sm"></i>
                <p className="text-[9px] text-gray-300 text-center leading-tight">
                  WiFi connected
                </p>
                <div className="w-full h-px bg-white/10 my-1" />
                <i className="fas fa-utensils text-[#c9a84c] text-sm"></i>
                <p className="text-[9px] text-gray-300 text-center leading-tight">
                  Digital menu ready
                </p>
              </div>
            </motion.div>
          </div>
        </Reveal>

        {/* Copy */}
        <Reveal className="order-1 lg:order-2">
          <Eyebrow>Contactless by design</Eyebrow>
          <h2
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
            className="text-3xl sm:text-4xl md:text-5xl text-white font-medium leading-tight mb-4 md:mb-5">
            A QR Code For{" "}
            <span className="italic text-[#c9a84c]">Every Room.</span>
          </h2>
          <p className="text-gray-400 text-sm sm:text-base leading-relaxed max-w-md mb-6 md:mb-7">
            StayKila generates a unique QR code for every room automatically.
            One scan gives guests everything they need, without a single app
            download.
          </p>
          <ul className="space-y-3 sm:space-y-3.5">
            {[
              {
                icon: "fa-circle-info",
                text: "Room information & house rules",
              },
              { icon: "fa-concierge-bell", text: "Hotel services on request" },
              { icon: "fa-wifi", text: "WiFi name and password" },
              {
                icon: "fa-utensils",
                text: "Digital menu, browsable on any phone",
              },
              { icon: "fa-headset", text: "Direct line to guest support" },
            ].map((item) => (
              <li
                key={item.text}
                className="group flex items-center gap-3 text-sm text-gray-300 transition-colors hover:text-gray-100">
                <span className="w-8 h-8 rounded-lg bg-[#c9a84c]/15 flex items-center justify-center shrink-0 transition-colors group-hover:bg-[#c9a84c]/25">
                  <i className={`fas ${item.icon} text-[#c9a84c] text-xs`}></i>
                </span>
                <span>{item.text}</span>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}

/* ============================================================ */
/*  SECTION 4 — GUEST MESSAGING                                 */
/* ============================================================ */
const CHAT_MESSAGES = [
  { from: "guest", text: "Can I request extra towels?" },
  { from: "reception", text: "Of course — housekeeping is on the way." },
  { from: "guest", text: "Thank you! Also, what time is checkout?" },
  {
    from: "reception",
    text: "Checkout is 11am, but happy to extend if needed.",
  },
];

function GuestMessaging() {
  return (
    <section className="relative min-h-screen w-full snap-start snap-always flex items-center justify-center bg-[#0f1b2d] overflow-hidden pt-24 pb-12 md:pt-28">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_30%,rgba(201,168,76,0.08),transparent_55%)]" />
      <div className="relative max-w-7xl mx-auto px-5 sm:px-6 grid lg:grid-cols-2 gap-10 lg:gap-16 items-center w-full">
        <Reveal>
          <Eyebrow>Always reachable</Eyebrow>
          <h2
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
            className="text-3xl sm:text-4xl md:text-5xl text-white font-medium leading-tight mb-4 md:mb-5">
            Chat With Guests{" "}
            <span className="italic text-[#c9a84c]">In Real Time.</span>
          </h2>
          <p className="text-gray-400 text-sm sm:text-base leading-relaxed max-w-md">
            Every room's QR code opens a direct line to your front desk, so
            requests get answered in minutes, not after a missed phone call.
          </p>
        </Reveal>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          variants={staggerContainer}
          className="rounded-2xl border border-white/10 bg-white/[0.05] backdrop-blur-xl shadow-2xl shadow-black/30 p-4 sm:p-5 max-w-md mx-auto w-full">
          <div className="flex items-center gap-3 pb-4 mb-4 border-b border-white/10">
            <div className="w-9 h-9 rounded-full bg-[#c9a84c]/20 flex items-center justify-center shrink-0">
              <i className="fas fa-concierge-bell text-[#c9a84c] text-xs"></i>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white leading-none truncate">
                Room 214 · Front Desk
              </p>
              <p className="text-[11px] text-emerald-400 mt-1">Online</p>
            </div>
          </div>

          <div className="space-y-3">
            {CHAT_MESSAGES.map((m, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                className={`flex ${
                  m.from === "guest" ? "justify-start" : "justify-end"
                }`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-snug ${
                    m.from === "guest"
                      ? "bg-white/10 text-gray-200 rounded-tl-sm"
                      : "bg-gradient-to-br from-[#c9a84c] to-[#e8d189] text-[#0f1b2d] font-medium rounded-tr-sm"
                  }`}>
                  {m.text}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ============================================================ */
/*  SECTION 5 — CHECK-IN SYSTEM                                 */
/* ============================================================ */
const CHECKIN_STEPS = [
  { icon: "fa-door-open", label: "Check In" },
  { icon: "fa-stopwatch", label: "Stay Timer Starts" },
  { icon: "fa-bed", label: "Guest Stay Active" },
  { icon: "fa-rotate", label: "Extend Stay" },
  { icon: "fa-door-closed", label: "Checkout" },
];

function CheckInSystem() {
  return (
    <section className="relative min-h-screen w-full snap-start snap-always flex items-center justify-center bg-[#0c1522] overflow-hidden pt-24 pb-12 md:pt-28">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(201,168,76,0.1),transparent_50%)]" />
      <div className="relative max-w-6xl mx-auto px-5 sm:px-6 w-full">
        <Reveal className="text-center max-w-2xl mx-auto mb-10 md:mb-16">
          <Eyebrow>Frictionless arrivals</Eyebrow>
          <h2
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
            className="text-3xl sm:text-4xl md:text-5xl text-white font-medium leading-tight mb-4 md:mb-5">
            Fast{" "}
            <span className="italic text-[#c9a84c]">
              Check-ins & Checkouts.
            </span>
          </h2>
          <p className="text-gray-400 text-sm sm:text-base leading-relaxed">
            One workflow takes a guest from arrival to departure, with stay
            timers that keep the whole property in sync.
          </p>
        </Reveal>

        {/* Workflow rail */}
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={staggerContainer}
          className="relative grid grid-cols-3 sm:grid-cols-5 md:flex md:items-center md:justify-between gap-4 sm:gap-3 md:gap-6">
          <div className="hidden md:block absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#c9a84c]/40 to-transparent -translate-y-1/2 z-0" />
          {CHECKIN_STEPS.map((step) => (
            <motion.div
              key={step.label}
              variants={scaleIn}
              className="relative z-10 flex flex-col items-center text-center gap-2 sm:gap-3 md:flex-1">
              <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-2xl bg-white/[0.05] border border-[#c9a84c]/30 backdrop-blur-sm flex items-center justify-center shadow-lg shadow-black/30">
                <i
                  className={`fas ${step.icon} text-[#c9a84c] text-base md:text-lg`}></i>
              </div>
              <p className="text-xs sm:text-sm font-medium text-white leading-snug">
                {step.label}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* Live stay timer card */}
        <Reveal className="mt-10 md:mt-16 max-w-md mx-auto">
          <div className="rounded-2xl border border-white/10 bg-white/[0.05] backdrop-blur-xl p-5 sm:p-6 text-center shadow-xl shadow-black/30">
            <p className="text-xs uppercase tracking-widest text-gray-400 mb-2">
              Room 214 · Stay Timer
            </p>
            <p
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
              className="text-3xl sm:text-4xl text-[#e8d189] font-medium tabular-nums">
              14h 22m remaining
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Checkout scheduled for 11:00 AM
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ============================================================ */
/*  SECTION 6 — REVENUE ANALYTICS                                */
/* ============================================================ */
const ANALYTICS_CHART = [38, 52, 45, 68, 60, 82, 74, 90, 85, 95, 88, 92];

function RevenueAnalytics() {
  return (
    <section
      id="analytics"
      className="relative min-h-screen w-full snap-start snap-always flex items-center justify-center bg-[#0f1b2d] overflow-hidden pt-24 pb-12 md:pt-28">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_40%,rgba(201,168,76,0.08),transparent_55%)]" />
      <div className="relative max-w-7xl mx-auto px-5 sm:px-6 w-full">
        <Reveal className="text-center max-w-2xl mx-auto mb-10 md:mb-16">
          <Eyebrow>The back office</Eyebrow>
          <h2
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
            className="text-3xl sm:text-4xl md:text-5xl text-white font-medium leading-tight mb-4 md:mb-5">
            Track Revenue{" "}
            <span className="italic text-[#c9a84c]">And Occupancy.</span>
          </h2>
          <p className="text-gray-400 text-sm sm:text-base leading-relaxed">
            One dashboard for every number that matters, updating itself as the
            day unfolds.
          </p>
        </Reveal>

        <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6 lg:gap-8">
          {/* Chart card */}
          <Reveal
            variants={scaleIn}
            className="rounded-2xl border border-white/10 bg-white/[0.05] backdrop-blur-xl p-5 sm:p-7 shadow-2xl shadow-black/30">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs tracking-widest uppercase text-gray-400">
                Monthly Revenue Trend
              </span>
              <span className="text-sm font-semibold text-[#e8d189]">
                +18.4%
              </span>
            </div>
            <p className="text-[11px] text-gray-500 mb-5 md:mb-6">
              Compared to the previous 12 months
            </p>
            <div className="flex items-end gap-1.5 sm:gap-2.5 h-32 sm:h-44">
              {ANALYTICS_CHART.map((h, i) => {
                const isPeak = h === Math.max(...ANALYTICS_CHART);
                return (
                  <motion.div
                    key={i}
                    initial={{ height: 0 }}
                    whileInView={{ height: `${h}%` }}
                    viewport={{ once: true }}
                    transition={{
                      duration: 0.6,
                      delay: i * 0.04,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className={`flex-1 rounded-t-md ${
                      isPeak
                        ? "bg-gradient-to-t from-[#c9a84c] to-[#e8d189] shadow-[0_0_14px_rgba(201,168,76,0.5)]"
                        : "bg-gradient-to-t from-[#c9a84c]/20 to-[#c9a84c]/55"
                    }`}
                  />
                );
              })}
            </div>
          </Reveal>

          {/* Stat tiles */}
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
            variants={staggerContainer}
            className="grid grid-cols-2 gap-3 sm:gap-4">
            {[
              {
                label: "Revenue (MTD)",
                value: 84200,
                prefix: "$",
                icon: "fa-sack-dollar",
              },
              { label: "Check-ins", value: 1240, icon: "fa-door-open" },
              { label: "Bookings", value: 956, icon: "fa-calendar-check" },
              {
                label: "Occupancy Rate",
                value: 82,
                suffix: "%",
                icon: "fa-chart-pie",
              },
            ].map((stat) => (
              <motion.div
                key={stat.label}
                variants={fadeUp}
                whileHover={{ y: -4 }}
                className="rounded-2xl border border-white/10 bg-white/[0.05] backdrop-blur-sm p-4 sm:p-5 flex flex-col justify-between">
                <i
                  className={`fas ${stat.icon} text-[#c9a84c] text-sm mb-2 sm:mb-3`}></i>
                <p
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                  className="text-xl sm:text-2xl text-white font-medium">
                  {stat.prefix}
                  <Counter value={stat.value} suffix={stat.suffix} />
                </p>
                <p className="text-[10px] sm:text-[11px] uppercase tracking-wide text-gray-500 mt-1">
                  {stat.label}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================ */
/*  SECTION 7 — HOTEL OPERATIONS                                 */
/* ============================================================ */
const OPS_FEATURES = [
  { icon: "fa-clipboard-list", label: "Activity Logs" },
  { icon: "fa-note-sticky", label: "Room Notes" },
  { icon: "fa-tags", label: "Pricing Management" },
  { icon: "fa-wifi", label: "WiFi Management" },
  { icon: "fa-utensils", label: "Digital Menu Upload" },
  { icon: "fa-chart-line", label: "Reports" },
  { icon: "fa-qrcode", label: "QR Downloads" },
  { icon: "fa-door-open", label: "Guest Portal" },
];

function Operations() {
  return (
    <section className="relative min-h-screen w-full snap-start snap-always flex items-center justify-center bg-[#0c1522] overflow-hidden pt-24 pb-12 md:pt-28">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,rgba(201,168,76,0.08),transparent_55%)]" />
      <div className="relative max-w-7xl mx-auto px-5 sm:px-6 w-full">
        <Reveal className="text-center max-w-2xl mx-auto mb-10 md:mb-16">
          <Eyebrow>Everything in one place</Eyebrow>
          <h2
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
            className="text-3xl sm:text-4xl md:text-5xl text-white font-medium leading-tight">
            Built For Daily{" "}
            <span className="italic text-[#c9a84c]">Operations.</span>
          </h2>
        </Reveal>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.1 }}
          variants={staggerContainer}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {OPS_FEATURES.map((f) => (
            <motion.div
              key={f.label}
              variants={fadeUp}
              whileHover={{ y: -5, borderColor: "rgba(201,168,76,0.4)" }}
              transition={{ duration: 0.2 }}
              className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm p-4 sm:p-6 flex flex-col items-center text-center gap-2 sm:gap-3">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#c9a84c]/15 flex items-center justify-center shrink-0">
                <i
                  className={`fas ${f.icon} text-[#c9a84c] text-sm sm:text-base`}></i>
              </div>
              <p className="text-xs sm:text-sm font-medium text-white leading-snug">
                {f.label}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ============================================================ */
/*  SECTION 8 — PRICING                                          */
/*  Simple, transparent pricing for properties of all sizes.     */
/* ============================================================ */
function Pricing() {
  const navigate = useNavigate();

  const plans = [
    {
      name: "Starter",
      price: "₱150",
      rooms: "Up to 15 Rooms",
      description: "Perfect for small boutique hotels and inns",
      features: [
        "Room management",
        "QR check-in system",
        "Basic analytics",
        "Guest messaging",
        "Email support",
      ],
      recommended: false,
    },
    {
      name: "Professional",
      price: "₱250",
      rooms: "Up to 40 Rooms",
      description: "Ideal for growing hotels and resorts",
      features: [
        "Everything in Starter",
        "Advanced analytics",
        "Revenue tracking",
        "Staff management",
        "Priority support",
        "Custom branding",
      ],
      recommended: true,
    },
    {
      name: "Enterprise",
      price: "₱400",
      rooms: "Up to 50 Rooms",
      description: "For large properties and hotel groups",
      features: [
        "Everything in Professional",
        "Multi-property management",
        "Advanced reporting",
        "Dedicated account manager",
        "API access",
        "24/7 phone support",
      ],
      recommended: false,
    },
  ];

  return (
    <section
      id="pricing"
      className="relative min-h-screen w-full snap-start snap-always flex items-center justify-center bg-[#0f1b2d] overflow-hidden pt-24 pb-12 md:pt-28">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(201,168,76,0.06),transparent_60%)]" />
      <div className="relative max-w-7xl mx-auto px-5 sm:px-6 py-8 md:py-12 w-full">
        <Reveal className="text-center max-w-2xl mx-auto mb-8 md:mb-12">
          <Eyebrow>Simple, transparent pricing</Eyebrow>
          <h2
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
            className="text-3xl sm:text-4xl md:text-5xl text-white font-medium leading-tight mb-3 md:mb-4">
            Choose Your <span className="italic text-[#c9a84c]">Plan.</span>
          </h2>
          <p className="text-gray-400 text-sm sm:text-base leading-relaxed">
            Start with what you need — upgrade as you grow.
          </p>
        </Reveal>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.15 }}
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <motion.div
              key={plan.name}
              variants={fadeUp}
              whileHover={{ y: -8 }}
              transition={{ duration: 0.3 }}
              className={`relative rounded-2xl p-6 flex flex-col ${
                plan.recommended
                  ? "bg-gradient-to-br from-[#c9a84c]/20 to-[#0f1b2d] border-2 border-[#c9a84c] shadow-xl shadow-[#c9a84c]/10"
                  : "bg-white/5 border border-white/10 hover:border-[#c9a84c]/30"
              }`}>
              {plan.recommended && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#c9a84c] text-[#0f1b2d] text-xs font-semibold px-4 py-1 rounded-full whitespace-nowrap">
                  Most Popular
                </div>
              )}

              <div className="mb-4">
                <h3 className="text-lg font-semibold text-white">
                  {plan.name}
                </h3>
                <p className="text-sm text-gray-400">{plan.rooms}</p>
              </div>

              <div className="mb-4">
                <span className="text-4xl font-bold text-white">
                  {plan.price}
                </span>
                <span className="text-gray-400 text-sm ml-1">/month</span>
              </div>

              <p className="text-sm text-gray-400 mb-4">{plan.description}</p>

              <ul className="space-y-2 mb-6 flex-1">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-sm text-gray-300">
                    <i className="fas fa-check text-[#c9a84c] text-xs mt-1"></i>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => navigate("/signin")}
                className={`w-full py-3 rounded-xl font-semibold transition-all duration-200 ${
                  plan.recommended
                    ? "bg-[#c9a84c] text-[#0f1b2d] hover:bg-[#b8973a] hover:shadow-lg hover:shadow-[#c9a84c]/30"
                    : "bg-white/10 text-white hover:bg-white/20 border border-white/10"
                }`}>
                Get Started
              </button>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ============================================================ */
/*  SECTION 9 — HOW IT WORKS                                     */
/*  This is the one place numbering earns its keep: these are    */
/*  genuinely sequential setup steps, not a feature list dressed */
/*  up as a process.                                              */
/* ============================================================ */
const HOW_IT_WORKS_STEPS = [
  { n: "01", label: "Create Hotel Account", icon: "fa-user-plus" },
  { n: "02", label: "Select Number Of Rooms", icon: "fa-bed" },
  { n: "03", label: "Generate QR Codes", icon: "fa-qrcode" },
  { n: "04", label: "Manage Guests", icon: "fa-users" },
  { n: "05", label: "Track Revenue", icon: "fa-chart-line" },
  { n: "06", label: "Grow Your Business", icon: "fa-arrow-trend-up" },
];

function HowItWorks() {
  return (
    <section className="relative min-h-screen w-full snap-start snap-always flex items-center justify-center bg-[#0f1b2d] overflow-hidden pt-24 pb-12 md:pt-28">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(201,168,76,0.06),transparent_60%)]" />
      <div className="relative max-w-5xl mx-auto px-5 sm:px-6 w-full">
        <Reveal className="text-center max-w-2xl mx-auto mb-10 md:mb-16">
          <Eyebrow>From signup to scale</Eyebrow>
          <h2
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
            className="text-3xl sm:text-4xl md:text-5xl text-white font-medium leading-tight">
            How It <span className="italic text-[#c9a84c]">Works.</span>
          </h2>
        </Reveal>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.1 }}
          variants={staggerContainer}
          className="relative">
          {/* Vertical line for mobile, horizontal-ish rhythm for desktop via spacing */}
          <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-[#c9a84c]/30 to-transparent md:-translate-x-1/2" />

          <div className="space-y-6 md:space-y-0">
            {HOW_IT_WORKS_STEPS.map((step, i) => {
              const isEven = i % 2 === 0;
              return (
                <motion.div
                  key={step.n}
                  variants={fadeUp}
                  className={`relative flex items-center gap-5 md:gap-0 md:py-7 ${
                    isEven ? "md:flex-row" : "md:flex-row-reverse"
                  }`}>
                  <div
                    className={`hidden md:block flex-1 ${
                      isEven ? "text-right pr-10" : "text-left pl-10"
                    }`}>
                    <p className="text-sm font-medium text-white">
                      {step.label}
                    </p>
                  </div>

                  <div className="relative z-10 w-11 h-11 md:w-12 md:h-12 rounded-full bg-[#0f1b2d] border border-[#c9a84c]/50 flex items-center justify-center shrink-0 shadow-[0_0_20px_-4px_rgba(201,168,76,0.4)]">
                    <i
                      className={`fas ${step.icon} text-[#c9a84c] text-sm`}></i>
                  </div>

                  <div className="flex-1 md:hidden">
                    <p className="text-[11px] text-[#c9a84c] font-semibold tracking-wide mb-0.5">
                      Step {step.n}
                    </p>
                    <p className="text-sm font-medium text-white">
                      {step.label}
                    </p>
                  </div>

                  <div
                    className={`hidden md:block flex-1 ${isEven ? "pl-10" : "pr-10"}`}>
                    <p className="text-[11px] text-[#c9a84c] font-semibold tracking-wide">
                      Step {step.n}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ============================================================ */
/*  SECTION 10 — TESTIMONIALS                                     */
/* ============================================================ */
const TESTIMONIALS = [
  {
    quote:
      "We replaced three different spreadsheets with StayKila in a single afternoon. Our front desk has never been calmer.",
    name: "A. Mercado",
    role: "Owner, Marea Boutique Lodge",
  },
  {
    quote:
      "The QR check-in alone cut our front desk queue time in half during peak season.",
    name: "D. Whitfield",
    role: "General Manager, Northshore Inn",
  },
  {
    quote:
      "Revenue reporting that used to take my accountant a day now updates itself. It's the calmest our books have ever looked.",
    name: "R. Santos",
    role: "Founder, Casa Alba Resorts",
  },
];

function Testimonials() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % TESTIMONIALS.length);
    }, 5500);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="relative min-h-screen w-full snap-start snap-always flex items-center justify-center bg-[#0c1522] overflow-hidden pt-24 pb-12 md:pt-28">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(201,168,76,0.08),transparent_55%)]" />
      <div className="relative max-w-3xl mx-auto px-5 sm:px-6 text-center w-full">
        <Reveal>
          <Eyebrow>Trusted by hoteliers</Eyebrow>
          <h2
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
            className="text-3xl sm:text-4xl md:text-5xl text-white font-medium leading-tight mb-10 md:mb-14">
            What Owners{" "}
            <span className="italic text-[#c9a84c]">Are Saying.</span>
          </h2>
        </Reveal>

        <div className="relative min-h-[220px] flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0 flex flex-col items-center justify-center px-4">
              <i className="fas fa-quote-left text-[#c9a84c]/40 text-2xl mb-5"></i>
              <p
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
                className="text-xl sm:text-2xl text-white italic leading-relaxed mb-6">
                "{TESTIMONIALS[index].quote}"
              </p>
              <p className="text-sm font-semibold text-white">
                {TESTIMONIALS[index].name}
              </p>
              <p className="text-xs text-gray-500">
                {TESTIMONIALS[index].role}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-center gap-2 mt-8">
          {TESTIMONIALS.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              aria-label={`Show testimonial ${i + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === index ? "w-6 bg-[#c9a84c]" : "w-1.5 bg-white/20"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================ */
/*  SECTION 11 — FINAL CTA                                       */
/* ============================================================ */
function FinalCTA() {
  const navigate = useNavigate();
  return (
    <section className="relative min-h-screen w-full snap-start snap-always flex items-center justify-center bg-[#0f1b2d] overflow-hidden pt-24 pb-12 md:pt-28">
      {/* Background with resort image */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-20"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1540541338287-41700207dee6?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80')",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 50% 30%, rgba(201,168,76,0.12), transparent 55%), linear-gradient(180deg, #0c1522 0%, #0f1b2d 100%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(201,168,76,1) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,1) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />
      <Reveal className="relative max-w-3xl mx-auto px-5 sm:px-6 text-center w-full">
        <Eyebrow>
          <span className="mx-auto">Ready when you are</span>
        </Eyebrow>
        <h2
          style={{ fontFamily: "'Cormorant Garamond', serif" }}
          className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-white font-medium leading-tight mb-5 md:mb-6">
          Modern Hotel Management
          <br />
          <span className="italic text-[#c9a84c]">Starts Here.</span>
        </h2>
        <p className="text-gray-300 text-base sm:text-lg leading-relaxed max-w-xl mx-auto mb-8 md:mb-10">
          Join hotels and lodges using StayKila to manage rooms smarter, one
          property at a time.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
          <button
            onClick={() => navigate("/signin")}
            className="w-full sm:w-auto text-[#0f1b2d] font-semibold bg-gradient-to-r from-[#c9a84c] to-[#e8d189] px-8 py-3.5 sm:py-4 rounded-xl hover:shadow-[0_16px_40px_-10px_rgba(201,168,76,0.6)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200">
            Start Free Trial
          </button>
          <button
            onClick={() => navigate("/signin")}
            className="w-full sm:w-auto text-white font-semibold border border-white/20 px-8 py-3.5 sm:py-4 rounded-xl hover:bg-white/10 hover:border-white/30 transition-all duration-200">
            Login
          </button>
        </div>
      </Reveal>
    </section>
  );
}

/* ============================================================ */
/*  FOOTER                                                        */
/*  Lives outside the snap-scroll flow as its own non-snapped,    */
/*  natural-height block so it never gets clipped by h-screen     */
/*  or fought over by snap-mandatory on short mobile viewports.   */
/* ============================================================ */
function Footer() {
  return (
    <footer className="relative bg-[#0c1522] border-t border-white/10 py-10 md:py-12 snap-none">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/5 border border-[#c9a84c]/40 flex items-center justify-center shrink-0">
            <i className="fas fa-hotel text-[#c9a84c] text-xs"></i>
          </div>
          <span
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
            className="text-lg text-white">
            StayKila
          </span>
        </div>

        <nav className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-sm text-gray-400">
          <a href="#rooms" className="hover:text-white transition-colors">
            Features
          </a>
          <a href="#pricing" className="hover:text-white transition-colors">
            Pricing
          </a>
          <a href="#" className="hover:text-white transition-colors">
            Contact
          </a>
          <a href="#" className="hover:text-white transition-colors">
            Privacy Policy
          </a>
          <a href="#" className="hover:text-white transition-colors">
            Terms
          </a>
        </nav>

        <p className="text-xs text-gray-500 text-center">
          © {new Date().getFullYear()} StayKila. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

/* ============================================================ */
/*  PAGE ASSEMBLY                                                */
/* ============================================================ */
export default function LandingPage() {
  useBrandFonts();

  return (
    <div
      style={{ fontFamily: "'Inter', sans-serif" }}
      className="bg-[#0f1b2d] h-screen overflow-y-scroll snap-y snap-mandatory scroll-smooth">
      <Navbar />
      <Hero />
      <RoomManagement />
      <QRSystem />
      <GuestMessaging />
      <CheckInSystem />
      <RevenueAnalytics />
      <Operations />
      <Pricing />
      <HowItWorks />
      <Testimonials />
      <FinalCTA />
      <Footer />
    </div>
  );
}
