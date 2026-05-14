const STATUS_LABELS = {
  available: "Available",
  temp_reserved: "Temporarily Held",
  pending: "Pending Approval",
  sold: "Sold"
};

export default function UnitModal({ unit, onClose, onReserve, loading }) {
  const isAvailable = unit.status === "available";
  const agentName = unit.reservations?.[0]?.user?.name ?? null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className={`modal-status-bar ${unit.status}`} />

        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>

        <div className="modal-body">
          <p className="modal-unit-label">Unit</p>
          <h2 className="modal-unit-code">{unit.unitCode}</h2>

          <span className={`status-badge ${unit.status}`}>
            {STATUS_LABELS[unit.status] ?? unit.status}
          </span>

          <div className="modal-price">${unit.price.toLocaleString()}</div>
          <p className="modal-price-label">Listing Price</p>

          <div className="modal-divider" />

          <div className="modal-details">
            <div className="detail-row">
              <span className="detail-label">Unit Code</span>
              <span className="detail-value">{unit.unitCode}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Status</span>
              <span className={`detail-value ${unit.status}`}>
                {STATUS_LABELS[unit.status] ?? unit.status}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Price</span>
              <span className="detail-value">${unit.price.toLocaleString()}</span>
            </div>
            {agentName && (
              <div className="detail-row">
                <span className="detail-label">Reserved By</span>
                <span className="detail-value">{agentName}</span>
              </div>
            )}
          </div>

          {isAvailable ? (
            <button
              className="btn-reserve"
              onClick={() => onReserve(unit.id)}
              disabled={loading}
            >
              {loading ? "Reserving..." : "Reserve — 15 min hold"}
            </button>
          ) : unit.status === "temp_reserved" ? (
            <div className="modal-notice orange">
              ⏱ This unit is temporarily held by another agent.
            </div>
          ) : unit.status === "pending" ? (
            <div className="modal-notice blue">
              📋 Pending approval{agentName ? ` · Reserved by ${agentName}` : ""}.
            </div>
          ) : (
            <div className="modal-notice gray">
              This unit is not available for reservation.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
