import {
  photoDepot,
  photoGuestName,
  photoImageUrl,
  unit3,
  formatClock,
  type PhotoWithGuest,
} from "@/lib/photos";

type Props = {
  photo: PhotoWithGuest;
  onOpen: () => void;
  isFresh?: boolean;
};

export default function EntryRow({ photo, onOpen, isFresh }: Props) {
  const isPending = photo.status === "pending";
  return (
    <button
      type="button"
      onClick={onOpen}
      style={{
        display: "flex",
        width: "100%",
        textAlign: "left",
        background: isFresh
          ? "rgba(255, 250, 235, 0.55)"
          : isPending
            ? "var(--color-card-deep)"
            : "transparent",
        borderBottom: "1px dashed rgba(30, 27, 22, 0.27)",
        padding: "10px 12px",
        alignItems: "flex-start",
        gap: 10,
        border: 0,
        borderRadius: 0,
        cursor: "pointer",
        font: "inherit",
        color: "var(--color-ink)",
      }}
    >
      <div style={{ width: 36, flexShrink: 0 }}>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--color-faded)",
            letterSpacing: "0.1em",
          }}
        >
          NO.
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 16,
            fontWeight: 700,
          }}
        >
          {unit3(photo.unit_number)}
        </div>
      </div>

      <div
        style={{
          width: 64,
          height: 64,
          flexShrink: 0,
          position: "relative",
          background: "var(--color-card-deep)",
          border: "1px solid rgba(30, 27, 22, 0.2)",
          overflow: "hidden",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoImageUrl(photo)}
          alt=""
          loading="lazy"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
        {photo.type === "360" && (
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0,0,0,0.18)",
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <ellipse
                cx="12"
                cy="12"
                rx="9"
                ry="4"
                stroke="#fff"
                strokeWidth="1.5"
              />
              <path
                d="M12 5 L12 19"
                stroke="#fff"
                strokeWidth="1.5"
                strokeDasharray="2 2"
              />
            </svg>
          </div>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--color-faded)",
            letterSpacing: "0.06em",
          }}
        >
          <span>{formatClock(photo.created_at)}</span>
          <span
            style={{
              color:
                photo.type === "360"
                  ? "var(--color-blue)"
                  : "var(--color-faded)",
              fontWeight: 700,
            }}
          >
            {photo.type === "360" ? "360°" : "PHOTO"}
          </span>
        </div>
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 15,
            fontWeight: 600,
            marginTop: 2,
          }}
        >
          {photoGuestName(photo)}{" "}
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--color-blue)",
              marginLeft: 4,
            }}
          >
            {photoDepot(photo)}
          </span>
          {isPending && (
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                padding: "1px 4px",
                marginLeft: 6,
                background: "var(--color-olive)",
                color: "var(--color-paper)",
                letterSpacing: "0.12em",
                fontWeight: 700,
              }}
            >
              HOLD
            </span>
          )}
        </div>
        {photo.caption && (
          <div
            style={{
              fontSize: 13,
              marginTop: 2,
              color: "var(--color-ink)",
              opacity: 0.75,
              lineHeight: 1.3,
              fontStyle: "italic",
            }}
          >
            {photo.caption}
          </div>
        )}
      </div>
    </button>
  );
}
