import {
  Defs,
  Document,
  Image,
  LinearGradient,
  Page,
  Rect,
  Stop,
  StyleSheet,
  Svg,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import { eventDate } from "@/lib/format";
import { qrDataUrl } from "@/lib/qr";

export type PdfTicket = {
  code: string;
  tierName: string;
  holderName: string;
  /** Signed token from signTicket(ticket.id) */
  qrToken: string;
  status?: "valid" | "used" | "cancelled";
};

export type RenderTicketsPdfInput = {
  event: { name: string; venue: string; startsAt: Date };
  tickets: PdfTicket[];
};

// Ticket-sized page (roughly A6 width, a bit taller for the QR stub). Units are points.
const PAGE = { width: 298, height: 490 };

const c = {
  void: "#07070c",
  panel: "#141423",
  line: "#2a2a3d",
  ink: "#f4f4fb",
  mute: "#9a9ab5",
  cyan: "#00e5ff",
  magenta: "#ff2e88",
  lime: "#c6ff00",
  saffron: "#ff9f1c",
};

const s = StyleSheet.create({
  page: { backgroundColor: c.void, color: c.ink, fontFamily: "Helvetica", padding: 0 },
  body: { paddingHorizontal: 22, paddingTop: 18 },
  brandRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brand: { fontFamily: "Helvetica-Bold", fontSize: 9, letterSpacing: 2, color: c.cyan },
  admit: { fontFamily: "Helvetica-Bold", fontSize: 8, letterSpacing: 2, color: c.saffron },
  eventName: { fontFamily: "Helvetica-Bold", fontSize: 20, marginTop: 12, lineHeight: 1.15 },
  metaLabel: { fontSize: 7, letterSpacing: 1.5, color: c.mute, marginTop: 10 },
  metaValue: { fontSize: 11, marginTop: 2 },
  row: { flexDirection: "row", gap: 16 },
  col: { flexGrow: 1, flexBasis: 0 },
  chip: {
    alignSelf: "flex-start",
    marginTop: 3,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.magenta,
    color: c.magenta,
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    letterSpacing: 1,
  },
  perfWrap: { marginTop: 16, height: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  notch: { width: 14, height: 14, borderRadius: 7, backgroundColor: "#1d1d2c" },
  stub: { alignItems: "center", paddingHorizontal: 22, paddingTop: 10 },
  qrPanel: { backgroundColor: "#ffffff", padding: 10, borderRadius: 10 },
  qr: { width: 170, height: 170 },
  code: { fontFamily: "Courier-Bold", fontSize: 16, letterSpacing: 2, marginTop: 10 },
  hint: { fontSize: 7.5, color: c.mute, marginTop: 4 },
  status: { fontFamily: "Helvetica-Bold", fontSize: 9, marginTop: 6, color: c.lime },
});

function GradientStrip({ height = 6 }: { height?: number }) {
  return (
    <Svg width={PAGE.width} height={height}>
      <Defs>
        <LinearGradient id="neon" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={c.cyan} />
          <Stop offset="0.5" stopColor={c.magenta} />
          <Stop offset="1" stopColor={c.saffron} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width={PAGE.width} height={height} fill="url(#neon)" />
    </Svg>
  );
}

function Perforation() {
  // Dashed line between two half-circle notches, like a torn boarding pass.
  const dashes = Array.from({ length: 22 });
  return (
    <View style={s.perfWrap}>
      <View style={[s.notch, { marginLeft: -7 }]} />
      <View style={{ flexDirection: "row", flexGrow: 1, justifyContent: "space-between", paddingHorizontal: 6 }}>
        {dashes.map((_, i) => (
          <View key={i} style={{ width: 5, height: 1, backgroundColor: c.line }} />
        ))}
      </View>
      <View style={[s.notch, { marginRight: -7 }]} />
    </View>
  );
}

function TicketPage({
  event,
  ticket,
  qrSrc,
  index,
  total,
}: {
  event: RenderTicketsPdfInput["event"];
  ticket: PdfTicket;
  qrSrc: string;
  index: number;
  total: number;
}) {
  return (
    <Page size={[PAGE.width, PAGE.height]} style={s.page}>
      <GradientStrip />
      <View style={s.body}>
        <View style={s.brandRow}>
          <Text style={s.brand}>BACHELORS VIRUNDHU</Text>
          <Text style={s.admit}>
            ADMIT ONE{total > 1 ? `  ·  ${index + 1}/${total}` : ""}
          </Text>
        </View>
        <Text style={s.eventName}>{event.name}</Text>

        <Text style={s.metaLabel}>WHEN (IST)</Text>
        <Text style={s.metaValue}>{eventDate(event.startsAt)}</Text>

        <Text style={s.metaLabel}>WHERE</Text>
        <Text style={s.metaValue}>{event.venue}</Text>

        <View style={s.row}>
          <View style={s.col}>
            <Text style={s.metaLabel}>HOLDER</Text>
            <Text style={s.metaValue}>{ticket.holderName}</Text>
          </View>
          <View style={s.col}>
            <Text style={s.metaLabel}>TIER</Text>
            <Text style={s.chip}>{ticket.tierName.toUpperCase()}</Text>
          </View>
        </View>
      </View>

      <Perforation />

      <View style={s.stub}>
        <View style={s.qrPanel}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={qrSrc} style={s.qr} />
        </View>
        <Text style={s.code}>{ticket.code}</Text>
        <Text style={s.hint}>Show this QR at the gate · Gate-la indha QR-a kaatunga</Text>
        {ticket.status === "used" && <Text style={s.status}>CHECKED IN</Text>}
      </View>

      <View style={{ position: "absolute", bottom: 0, left: 0 }}>
        <GradientStrip height={4} />
      </View>
    </Page>
  );
}

export async function renderTicketsPdf(input: RenderTicketsPdfInput): Promise<Buffer> {
  const qrs = await Promise.all(input.tickets.map((t) => qrDataUrl(t.qrToken, 600)));
  const doc = (
    <Document title={`${input.event.name} — Tickets`} author="Bachelors Virundhu">
      {input.tickets.map((t, i) => (
        <TicketPage key={t.code} event={input.event} ticket={t} qrSrc={qrs[i]} index={i} total={input.tickets.length} />
      ))}
    </Document>
  );
  return renderToBuffer(doc);
}
