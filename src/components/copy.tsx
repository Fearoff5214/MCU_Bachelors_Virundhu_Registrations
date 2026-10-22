"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Lang = "tanglish" | "english";

// All buyer-facing microcopy lives here so the Tanglish/English toggle covers everything.
const COPY = {
  heroKicker: { tanglish: "Kovai-oda periya bachelor party", english: "Coimbatore's biggest bachelor party" },
  heroCta: { tanglish: "Ticket edunga", english: "Get tickets" },
  welcome: { tanglish: "Vaanga mapla 👋", english: "Welcome 👋" },
  upcoming: { tanglish: "Varapora events", english: "Upcoming events" },
  noEvents: { tanglish: "Innum events announce aagala. Seekiram varum nga!", english: "No events announced yet. Stay tuned!" },
  soldOut: { tanglish: "Housefull nga 😅", english: "Sold out 😅" },
  fewLeft: { tanglish: "Konjam dhaan irukku!", english: "Only a few left!" },
  notOpen: { tanglish: "Sales innum open aagala", english: "Sales not open yet" },
  closed: { tanglish: "Sales mudinjiruchu", english: "Sales closed" },
  signInToBuy: { tanglish: "Google-la login pannunga", english: "Sign in with Google to buy" },
  buy: { tanglish: "Book pannunga", english: "Book now" },
  qty: { tanglish: "Ethana ticket?", english: "How many?" },
  holdTimer: { tanglish: "Unga seat hold-la irukku", english: "Your seats are on hold" },
  holdExpired: { tanglish: "Time mudinjiruchu — thirumba try pannunga", english: "Hold expired — please try again" },
  pay: { tanglish: "Pay pannunga", english: "Pay now" },
  confirmed: { tanglish: "Seat confirm aachu! 🎉", english: "You're in! 🎉" },
  confirmedSub: {
    tanglish: "QR unga mail-ku vandhurum. Inga 'My Tickets'-layum irukku.",
    english: "Your QR is on its way to your inbox, and always available under My Tickets.",
  },
  myTickets: { tanglish: "En Tickets", english: "My Tickets" },
  noTickets: { tanglish: "Innum ticket edukkala mapla", english: "You don't have any tickets yet" },
  showAtGate: { tanglish: "Gate-la indha QR-a kaatunga", english: "Show this QR at the gate" },
  brightness: { tanglish: "Screen brightness full-a vechukonga", english: "Turn your screen brightness up" },
  used: { tanglish: "Ulla poyachu ✅", english: "Checked in ✅" },
  cancelled: { tanglish: "Cancel aagiduchu", english: "Cancelled" },
  downloadPdf: { tanglish: "PDF download", english: "Download PDF" },
  signIn: { tanglish: "Login", english: "Sign in" },
  signOut: { tanglish: "Logout", english: "Sign out" },
} satisfies Record<string, Record<Lang, string>>;

export type CopyKey = keyof typeof COPY;

const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({ lang: "tanglish", setLang: () => {} });

export function CopyProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("tanglish");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("bv-lang");
      if (saved === "english" || saved === "tanglish") setLangState(saved);
    } catch {}
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem("bv-lang", l);
    } catch {}
  };

  return <Ctx.Provider value={{ lang, setLang }}>{children}</Ctx.Provider>;
}

export function useCopy() {
  const { lang } = useContext(Ctx);
  return (k: CopyKey) => COPY[k][lang];
}

/** Drop-in text for server components: <T k="soldOut" /> */
export function T({ k }: { k: CopyKey }) {
  return <>{useCopy()(k)}</>;
}

export function LangToggle() {
  const { lang, setLang } = useContext(Ctx);
  return (
    <button
      type="button"
      onClick={() => setLang(lang === "tanglish" ? "english" : "tanglish")}
      className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-mute transition hover:border-cyan hover:text-cyan"
      aria-label="Switch language style"
    >
      {lang === "tanglish" ? "Tanglish" : "English"}
    </button>
  );
}
