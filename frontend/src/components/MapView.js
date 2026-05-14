export default function MapView({ units, onUnitClick }) {
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <svg
        width="800"
        height="530"
        style={{ display: "block", borderRadius: "12px", boxShadow: "0 4px 20px rgba(0,0,0,0.12)" }}
      >
        {/* Background */}
        <rect width="800" height="530" fill="#f0fdf4" rx="12" />

        {/* Vertical road */}
        <rect x="350" y="0" width="100" height="380" fill="#d1d5db" />
        {/* Horizontal road */}
        <rect x="0" y="360" width="800" height="60" fill="#d1d5db" />

        {/* Road dashes */}
        <line x1="400" y1="0" x2="400" y2="360" stroke="white" strokeWidth="2" strokeDasharray="22,14" />
        <line x1="0" y1="390" x2="350" y2="390" stroke="white" strokeWidth="2" strokeDasharray="22,14" />
        <line x1="450" y1="390" x2="800" y2="390" stroke="white" strokeWidth="2" strokeDasharray="22,14" />

        {/* Block A */}
        <rect x="30" y="30" width="285" height="295" rx="10" fill="#fef9ec" stroke="#f0d88a" strokeWidth="2" />
        <text x="172" y="68" textAnchor="middle" fontSize="17" fontWeight="700" fill="#78580a">Block A</text>

        {/* Block B */}
        <rect x="485" y="30" width="285" height="295" rx="10" fill="#fef3c7" stroke="#fbbf24" strokeWidth="2" />
        <text x="627" y="68" textAnchor="middle" fontSize="17" fontWeight="700" fill="#92400e">Block B</text>

        {/* Block C */}
        <rect x="180" y="430" width="440" height="85" rx="10" fill="#d1fae5" stroke="#6ee7b7" strokeWidth="2" />
        <text x="400" y="460" textAnchor="middle" fontSize="16" fontWeight="700" fill="#065f46">Block C</text>

        {/* Trees */}
        <circle cx="172" cy="340" r="18" fill="#86efac" />
        <circle cx="172" cy="340" r="10" fill="#4ade80" />
        <circle cx="627" cy="340" r="18" fill="#86efac" />
        <circle cx="627" cy="340" r="10" fill="#4ade80" />
        <circle cx="60"  cy="490" r="14" fill="#86efac" />
        <circle cx="740" cy="490" r="14" fill="#86efac" />

        {/* Parking indicator */}
        <rect x="360" y="420" width="80" height="30" rx="5" fill="#9ca3af" />
        <text x="400" y="440" textAnchor="middle" fontSize="11" fill="white" fontWeight="600">ROAD</text>

        {/* Compass */}
        <circle cx="756" cy="486" r="24" fill="white" stroke="#9ca3af" strokeWidth="1.5" />
        <text x="756" y="481" textAnchor="middle" fontSize="10" fontWeight="700" fill="#374151">N</text>
        <polygon points="756,464 752,480 756,474 760,480" fill="#374151" />
        <text x="756" y="504" textAnchor="middle" fontSize="9" fill="#9ca3af">S</text>
        <text x="739" y="491" textAnchor="middle" fontSize="9" fill="#9ca3af">W</text>
        <text x="773" y="491" textAnchor="middle" fontSize="9" fill="#9ca3af">E</text>
      </svg>

      {units.map((unit) => (
        <UnitPin key={unit.id} unit={unit} onClick={onUnitClick} />
      ))}
    </div>
  );
}

const PIN_COLORS = {
  available:     "#16a34a",
  temp_reserved: "#f97316",
  pending:       "#2563eb",
  sold:          "#6b7280"
};

function UnitPin({ unit, onClick }) {
  const available = unit.status === "available";

  return (
    <button
      onClick={() => onClick(unit)}
      title={`${unit.unitCode} — $${unit.price.toLocaleString()} — ${unit.status}`}
      style={{
        position: "absolute",
        top: unit.y,
        left: unit.x,
        width: "52px",
        height: "52px",
        backgroundColor: PIN_COLORS[unit.status] ?? "#6b7280",
        color: "white",
        border: "3px solid white",
        borderRadius: "10px",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "11px",
        fontWeight: "700",
        boxShadow: "0 3px 8px rgba(0,0,0,0.35)",
        transition: "transform 0.12s, box-shadow 0.12s",
        lineHeight: 1.2,
        padding: 0,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "scale(1.15)";
        e.currentTarget.style.boxShadow = "0 6px 16px rgba(0,0,0,0.45)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "scale(1)";
        e.currentTarget.style.boxShadow = "0 3px 8px rgba(0,0,0,0.35)";
      }}
    >
      <span>{unit.unitCode}</span>
      <span style={{ fontSize: "9px", opacity: 0.85 }}>{available ? "●" : "✕"}</span>
    </button>
  );
}
