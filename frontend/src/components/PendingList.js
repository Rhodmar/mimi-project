import { useState } from "react";
import { approveReservation, denyReservation } from "../services/api";

const SDP_LABELS = { annual: "Annual", quarterly: "Quarterly", monthly: "Monthly" };
const WHY_LABELS = {
  good_location:            "Good Location",
  design_and_quality:       "Design and Quality",
  amenities:                "Amenities",
  affordable_payment:       "Affordable Payment Scheme",
  reliability_of_developer: "Reliability of Developer",
  excellent_agent_service:  "Excellent Service of Agent"
};
const HOW_LABELS = {
  newspaper: "Newspaper", exhibit: "Exhibit", billboard: "Billboard",
  internet: "Internet", magazine: "Magazine", referral: "Referral",
  television: "Television", others: "Others"
};
const STATUS_CONFIG = {
  fulfilled: { label: "Pending Review", className: "badge-pending" },
  approved:  { label: "Approved",       className: "badge-approved" },
  denied:    { label: "Denied",         className: "badge-denied" }
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr);
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function parseWhy(raw) {
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return [raw]; }
}

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="info-row">
      <span className="info-label">{label}</span>
      <span className="info-value">{value}</span>
    </div>
  );
}

function InfoSection({ title, children }) {
  return (
    <div className="expand-section">
      <p className="expand-section-title">{title}</p>
      {children}
    </div>
  );
}

function ExpandedDetails({ r }) {
  const why = parseWhy(r.whyChooseProject);
  const isMarried = r.civilStatus === "Married";

  return (
    <div className="expand-body">
      <InfoSection title="Purchase Intent">
        <InfoRow label="Purpose"             value={r.purpose === "to_live_in" ? "To Live In" : r.purpose === "to_be_rented_out" ? "To Be Rented Out" : r.purpose} />
        <InfoRow label="Why This Project"    value={why.map(v => WHY_LABELS[v] ?? v).join(", ")} />
        <InfoRow label="How They Learned"    value={HOW_LABELS[r.howLearnedAbout] ?? r.howLearnedAbout} />
        <InfoRow label="SDP Scheme"          value={SDP_LABELS[r.sdp] ?? r.sdp} />
        <InfoRow label="Computation Sheet"   value={r.computation ? `Sheet ${r.computation}` : null} />
      </InfoSection>

      <InfoSection title="Personal Information">
        <InfoRow label="Full Name"           value={[r.firstName, r.middleName, r.lastName].filter(Boolean).join(" ")} />
        <InfoRow label="Age"                 value={r.age} />
        <InfoRow label="Sex"                 value={r.sex} />
        <InfoRow label="Civil Status"        value={r.civilStatus} />
        <InfoRow label="Birthday"            value={r.birthday} />
        <InfoRow label="Nationality"         value={r.nationality} />
        <InfoRow label="Home Address"        value={r.homeAddress} />
        <InfoRow label="Tel No."             value={r.telNo} />
        <InfoRow label="Mobile"              value={r.mobileNumber} />
        <InfoRow label="Email"               value={r.emailAddress} />
        <InfoRow label="Address Abroad"      value={r.addressAbroad} />
        <InfoRow label="Office Address"      value={r.officeAddress} />
        <InfoRow label="Business / Office"   value={r.businessName} />
        <InfoRow label="Position"            value={r.position} />
        <InfoRow label="Occupational Field"  value={r.occupationalField} />
      </InfoSection>

      {isMarried && (
        <InfoSection title="Spouse Information">
          <InfoRow label="Full Name"          value={[r.spouseFirstName, r.spouseMiddleName, r.spouseSurname].filter(Boolean).join(" ")} />
          <InfoRow label="Age"                value={r.spouseAge} />
          <InfoRow label="Sex"                value={r.spouseSex} />
          <InfoRow label="Birthday"           value={r.spouseBirthday} />
          <InfoRow label="Nationality"        value={r.spouseNationality} />
          <InfoRow label="Mobile"             value={r.spouseMobile} />
          <InfoRow label="Email"              value={r.spouseEmail} />
          <InfoRow label="Address Abroad"     value={r.spouseAddressAbroad} />
          <InfoRow label="Tel Abroad"         value={r.spouseTelAbroad} />
          <InfoRow label="Office Address"     value={r.spouseOfficeAddress} />
          <InfoRow label="Tel Office"         value={r.spouseTelOffice} />
          <InfoRow label="Business / Office"  value={r.spouseBusinessName} />
          <InfoRow label="Position"           value={r.spousePosition} />
          <InfoRow label="Occupational Field" value={r.spouseOccupField} />
        </InfoSection>
      )}

      <InfoSection title="Certification — Buyer">
        <InfoRow label="Full Name"        value={r.certFullName} />
        <InfoRow label="TIN"              value={r.certTin} />
        <InfoRow label="Res. Cert / Passport" value={r.certResCertNo} />
        <InfoRow label="Date of Issue"    value={r.certDateIssue} />
        <InfoRow label="Place of Issue"   value={r.certPlaceIssue} />
      </InfoSection>

      {isMarried && (r.spouseCertFullName || r.spouseCertTin) && (
        <InfoSection title="Certification — Spouse">
          <InfoRow label="Full Name"        value={r.spouseCertFullName} />
          <InfoRow label="TIN"              value={r.spouseCertTin} />
          <InfoRow label="Res. Cert / Passport" value={r.spouseCertResCertNo} />
          <InfoRow label="Date of Issue"    value={r.spouseCertDateIssue} />
          <InfoRow label="Place of Issue"   value={r.spouseCertPlaceIssue} />
        </InfoSection>
      )}
    </div>
  );
}

export default function PendingList({ reservations, onAction }) {
  const [actionState, setActionState] = useState({});
  const [submitting, setSubmitting]   = useState(null);
  const [expandedId, setExpandedId]   = useState(null);

  const toggleExpand = (id) => setExpandedId(prev => prev === id ? null : id);

  const startAction = (id, type) =>
    setActionState(prev => ({ ...prev, [id]: { type, note: "" } }));

  const cancelAction = (id) =>
    setActionState(prev => { const n = { ...prev }; delete n[id]; return n; });

  const handleConfirm = async (id) => {
    const { type, note } = actionState[id];
    setSubmitting(id);
    try {
      if (type === "approve") await approveReservation(id, note);
      else await denyReservation(id, note);
      cancelAction(id);
      await onAction();
    } catch {
      alert("Action failed. Please try again.");
    } finally {
      setSubmitting(null);
    }
  };

  const pending  = reservations.filter(r => r.status === "fulfilled");
  const resolved = reservations.filter(r => r.status !== "fulfilled");

  if (reservations.length === 0) {
    return (
      <div className="pending-list-wrapper">
        <h2 className="section-heading">Reservations</h2>
        <div className="empty-list">No reservations yet.</div>
      </div>
    );
  }

  return (
    <div className="pending-list-wrapper">
      {pending.length > 0 && (
        <>
          <h2 className="section-heading">
            Pending Review <span className="count-badge">{pending.length}</span>
          </h2>
          <div className="reservation-list">
            {pending.map(r => (
              <ReservationCard key={r.id} r={r}
                expanded={expandedId === r.id}
                onToggle={() => toggleExpand(r.id)}
                action={actionState[r.id]}
                submitting={submitting === r.id}
                onApprove={() => startAction(r.id, "approve")}
                onDeny={() => startAction(r.id, "deny")}
                onNoteChange={note => setActionState(prev => ({ ...prev, [r.id]: { ...prev[r.id], note } }))}
                onConfirm={() => handleConfirm(r.id)}
                onCancel={() => cancelAction(r.id)}
              />
            ))}
          </div>
        </>
      )}

      {resolved.length > 0 && (
        <>
          <h2 className="section-heading" style={{ marginTop: pending.length ? 32 : 0 }}>
            History
          </h2>
          <div className="reservation-list">
            {resolved.map(r => (
              <ReservationCard key={r.id} r={r} resolved
                expanded={expandedId === r.id}
                onToggle={() => toggleExpand(r.id)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ReservationCard({ r, resolved, expanded, onToggle, action, submitting, onApprove, onDeny, onNoteChange, onConfirm, onCancel }) {
  const config = STATUS_CONFIG[r.status] ?? { label: r.status, className: "" };

  return (
    <div className={`res-card ${r.status} ${expanded ? "expanded" : ""}`}>
      {/* Clickable header — toggles expand */}
      <div className="res-card-header clickable" onClick={onToggle}>
        <div className="res-card-title">
          <span className="res-unit-badge">{r.unit.unitCode}</span>
          <div>
            <p className="res-client">{r.clientName || "—"}</p>
            <p className="res-meta">Agent: {r.user.name} · {timeAgo(r.createdAt)}</p>
          </div>
        </div>
        <div className="res-card-header-right">
          <span className={`badge ${config.className}`}>{config.label}</span>
          <span className="expand-chevron">{expanded ? "▲" : "▼"}</span>
        </div>
      </div>

      {/* Always-visible summary */}
      <div className="res-card-details">
        <div className="res-detail-item">
          <span className="res-detail-label">Price</span>
          <span className="res-detail-value">${r.unit.price.toLocaleString()}</span>
        </div>
        <div className="res-detail-item">
          <span className="res-detail-label">SDP</span>
          <span className="res-detail-value">{SDP_LABELS[r.sdp] ?? r.sdp ?? "—"}</span>
        </div>
        <div className="res-detail-item">
          <span className="res-detail-label">Computation</span>
          <span className="res-detail-value">{r.computation ? `Sheet ${r.computation}` : "—"}</span>
        </div>
      </div>

      {/* Expandable full details */}
      {expanded && <ExpandedDetails r={r} />}

      {/* Documents */}
      <div className="res-docs">
        {r.govIdPath  && <a href={`http://localhost:5000/uploads/${r.govIdPath}`}  target="_blank" rel="noreferrer" className="doc-link">🪪 Gov ID</a>}
        {r.appDocPath && <a href={`http://localhost:5000/uploads/${r.appDocPath}`} target="_blank" rel="noreferrer" className="doc-link">📄 Application</a>}
        {r.paymentPath&& <a href={`http://localhost:5000/uploads/${r.paymentPath}`}target="_blank" rel="noreferrer" className="doc-link">💳 Payment</a>}
      </div>

      {r.adminNote && (
        <div className={`admin-note-display ${r.status}`}>
          <span className="admin-note-label">Admin note:</span> {r.adminNote}
        </div>
      )}

      {!resolved && !action && (
        <div className="res-actions">
          <button className="btn-approve" onClick={onApprove}>✓ Approve</button>
          <button className="btn-deny"    onClick={onDeny}>✕ Deny</button>
        </div>
      )}

      {action && (
        <div className="res-action-panel">
          <p className="action-prompt">
            {action.type === "approve" ? "✓ Approving" : "✕ Denying"} — add a note (optional)
          </p>
          <textarea className="action-note" placeholder="Add a note for the agent..."
            value={action.note} onChange={e => onNoteChange(e.target.value)} rows={2} />
          <div className="action-buttons">
            <button className="btn-cancel-action" onClick={onCancel} disabled={submitting}>Cancel</button>
            <button
              className={action.type === "approve" ? "btn-confirm-approve" : "btn-confirm-deny"}
              onClick={onConfirm} disabled={submitting}
            >
              {submitting ? "Saving..." : `Confirm ${action.type === "approve" ? "Approval" : "Denial"}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
