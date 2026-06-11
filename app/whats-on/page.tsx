import Link from "next/link";
import WBLetterhead from "@/components/waybill/WBLetterhead";
import WBLabel from "@/components/waybill/WBLabel";
import WBHint from "@/components/waybill/WBHint";
import WBPerfBar from "@/components/waybill/WBPerfBar";

type AgendaItem = {
  time: string;
  title: string;
  sub?: string[];
};

const AGENDA: AgendaItem[] = [
  { time: "10:30", title: "Party Starts & Bar Opens" },
  { time: "11:00", title: "Ice Cream Van" },
  {
    time: "12:00",
    title: "Food Starts",
    sub: [
      "Authentic Singaporean Noodles Street Food",
      "Neapolitan Pizzas",
      "Freshly Baked Cookies",
    ],
  },
  { time: "16:00", title: "Competition Winners Announced" },
  { time: "16:30", title: "Close or Taxi into Town" },
];

const WHATS_ON: string[] = [
  "2x Kids Bouncy Castles",
  "1x Inflatable Football Goal Challenge (Adult & Child High Score prize)",
  "Free Food",
  "Free Soft Drinks",
  "3x alcoholic drinks tokens per adult (card bar after that)",
  "Kids Design a Lorry competition",
  "Other kids activities on the tables",
  "Request a Song sound system",
  "Trucks on Show",
];

export default function WhatsOnPage() {
  return (
    <main className="min-h-dvh bg-paper text-ink font-sans flex flex-col w-full max-w-md mx-auto relative">
      <WBLetterhead subtitle="Running Order" code="Form W/RUN-25" />

      <WBHint>
        The plan for the day &mdash; when things kick off, when the food starts,
        and everything that&rsquo;s on at the depot. No need to sign in.
      </WBHint>

      <div style={{ flex: 1, paddingBottom: 64 }}>
        {/* Agenda — timed running sheet */}
        <section>
          <div
            style={{
              padding: "10px 16px 6px",
              background: "var(--color-card)",
              borderBottom: "1.5px solid var(--color-ink)",
            }}
          >
            <WBLabel>Agenda · Saturday</WBLabel>
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontWeight: 700,
                fontSize: 18,
                lineHeight: 1.1,
                marginTop: 2,
              }}
            >
              Running Sheet
            </div>
          </div>

          <ol
            style={{
              listStyle: "none",
              margin: 0,
              padding: "14px 16px 18px",
            }}
          >
            {AGENDA.map((item, i) => {
              const last = i === AGENDA.length - 1;
              return (
                <li
                  key={item.time}
                  style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "stretch",
                  }}
                >
                  {/* Time */}
                  <div
                    style={{
                      flexShrink: 0,
                      width: 52,
                      paddingTop: 1,
                      fontFamily: "var(--font-mono)",
                      fontSize: 15,
                      fontWeight: 700,
                      letterSpacing: "0.04em",
                      color: "var(--color-blue-deep)",
                      fontVariantNumeric: "tabular-nums",
                      textAlign: "right",
                    }}
                  >
                    {item.time}
                  </div>

                  {/* Rail with marker */}
                  <div
                    aria-hidden
                    style={{
                      flexShrink: 0,
                      width: 14,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        width: 11,
                        height: 11,
                        marginTop: 3,
                        borderRadius: "50%",
                        background: "var(--color-paper)",
                        border: "2px solid var(--color-ink)",
                        boxShadow: "1.5px 1.5px 0 var(--color-ink)",
                      }}
                    />
                    {!last && (
                      <span
                        style={{
                          flex: 1,
                          width: 2,
                          marginTop: 4,
                          marginBottom: 0,
                          background:
                            "repeating-linear-gradient(var(--color-ink) 0 4px, transparent 4px 8px)",
                        }}
                      />
                    )}
                  </div>

                  {/* Title + sub-items */}
                  <div
                    style={{
                      flex: 1,
                      minWidth: 0,
                      paddingBottom: last ? 0 : 18,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: 17,
                        fontWeight: 700,
                        lineHeight: 1.25,
                      }}
                    >
                      {item.title}
                    </div>

                    {item.sub && (
                      <ul
                        style={{
                          listStyle: "none",
                          margin: "6px 0 0",
                          padding: 0,
                        }}
                      >
                        {item.sub.map((s) => (
                          <li
                            key={s}
                            style={{
                              display: "flex",
                              gap: 8,
                              alignItems: "baseline",
                              fontFamily: "var(--font-sans)",
                              fontSize: 15,
                              lineHeight: 1.4,
                              color: "var(--color-ink)",
                              marginTop: 3,
                            }}
                          >
                            <span
                              aria-hidden
                              style={{
                                flexShrink: 0,
                                fontFamily: "var(--font-mono)",
                                fontWeight: 700,
                                color: "var(--color-stamp)",
                              }}
                            >
                              ·
                            </span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        {/* Dashed perforation divider between the two sections */}
        <WBPerfBar />

        {/* What's On — list */}
        <section>
          <div
            style={{
              padding: "10px 16px 6px",
              background: "var(--color-card)",
              borderTop: "1.5px solid var(--color-ink)",
              borderBottom: "1.5px solid var(--color-ink)",
            }}
          >
            <WBLabel>What&rsquo;s On · Depot</WBLabel>
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontWeight: 700,
                fontSize: 18,
                lineHeight: 1.1,
                marginTop: 2,
              }}
            >
              On Offer
            </div>
          </div>

          <ul
            style={{
              listStyle: "none",
              margin: 0,
              padding: "8px 16px 14px",
            }}
          >
            {WHATS_ON.map((entry) => (
              <li
                key={entry}
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "baseline",
                  padding: "9px 0",
                  borderBottom: "1px dashed rgba(30, 27, 22, 0.18)",
                }}
              >
                <span
                  aria-hidden
                  style={{
                    flexShrink: 0,
                    marginTop: 2,
                    fontFamily: "var(--font-mono)",
                    fontSize: 13,
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    color: "var(--color-blue-deep)",
                  }}
                >
                  ✓
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 16,
                    lineHeight: 1.35,
                    color: "var(--color-ink)",
                  }}
                >
                  {entry}
                </span>
              </li>
            ))}
          </ul>

          {/* Handwritten-style aside / footnote */}
          <p
            style={{
              margin: "2px 18px 18px",
              fontFamily: "var(--font-sans)",
              fontStyle: "italic",
              fontSize: 16,
              lineHeight: 1.4,
              color: "var(--color-olive)",
              transform: "rotate(-1.2deg)",
              transformOrigin: "left center",
            }}
          >
            &hellip;and I&rsquo;m sure the kids&rsquo; Welch&rsquo;s lorry will be
            out as well!
          </p>
        </section>
      </div>

      {/* Bottom nav (mirrors /feed /songs /awards /designs) */}
      <div
        className="fixed bottom-0 inset-x-0 mx-auto max-w-md"
        style={{
          borderTop: "1.5px solid var(--color-ink)",
          background: "var(--color-card)",
          display: "flex",
          padding: "10px 14px",
          alignItems: "center",
          fontFamily: "var(--font-mono)",
          fontSize: 15,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
        }}
      >
        <Link
          href="/feed"
          style={{ flex: 1, textAlign: "center", opacity: 0.55, color: "inherit" }}
        >
          Photos
        </Link>
        <Link
          href="/songs"
          style={{ flex: 1, textAlign: "center", opacity: 0.55, color: "inherit" }}
        >
          Songs
        </Link>
        <Link
          href="/awards"
          style={{ flex: 1, textAlign: "center", opacity: 0.55, color: "inherit" }}
        >
          Awards
        </Link>
        <Link
          href="/designs"
          style={{ flex: 1, textAlign: "center", opacity: 0.55, color: "inherit" }}
        >
          Design
        </Link>
        <span style={{ flex: 1, textAlign: "center", fontWeight: 700 }}>
          <span
            style={{
              borderBottom: "2px solid var(--color-blue-deep)",
              paddingBottom: 2,
            }}
          >
            Agenda
          </span>
        </span>
      </div>
    </main>
  );
}
