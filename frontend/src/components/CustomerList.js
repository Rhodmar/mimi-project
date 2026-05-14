import { useState, useEffect } from "react";
import { getCustomers, updateCustomer } from "../services/api";

const TAGS = [
  { key: "good_payer",        label: "Good Payer",        cls: "green"  },
  { key: "vip",               label: "VIP Client",        cls: "gold"   },
  { key: "repeat_buyer",      label: "Repeat Buyer",      cls: "blue"   },
  { key: "previously_denied", label: "Previously Denied", cls: "red"    },
  { key: "payment_delayed",   label: "Payment Delayed",   cls: "amber"  },
  { key: "verified",          label: "Verified Buyer",    cls: "teal"   },
];

const STATUS_LABELS = {
  fulfilled:           "Pending Review",
  approved:            "Approved",
  denied:              "Denied",
  pending_fulfillment: "Held",
  expired:             "Expired",
};

function parseTags(raw) {
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr);
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function CustomerList() {
  const [customers, setCustomers]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [saving, setSaving]         = useState(null);
  const [drafts, setDrafts]         = useState({});

  const fetchCustomers = async () => {
    try {
      const res = await getCustomers();
      setCustomers(res.data);
    } catch (err) {
      console.error("Failed to fetch customers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCustomers(); }, []);

  const toggleExpand = (id, customer) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    if (!drafts[id]) {
      setDrafts(prev => ({
        ...prev,
        [id]: { tags: parseTags(customer.tags), notes: customer.notes || "" }
      }));
    }
  };

  const toggleTag = (customerId, tagKey) => {
    setDrafts(prev => {
      const current = prev[customerId]?.tags || [];
      const updated = current.includes(tagKey)
        ? current.filter(t => t !== tagKey)
        : [...current, tagKey];
      return { ...prev, [customerId]: { ...prev[customerId], tags: updated } };
    });
  };

  const handleSave = async (customerId) => {
    const draft = drafts[customerId];
    if (!draft) return;
    setSaving(customerId);
    try {
      await updateCustomer(customerId, {
        tags:  JSON.stringify(draft.tags),
        notes: draft.notes
      });
      await fetchCustomers();
    } catch {
      alert("Failed to save. Please try again.");
    } finally {
      setSaving(null);
    }
  };

  const filtered = customers.filter(c => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    const fullName = [c.firstName, c.middleName, c.lastName]
      .filter(Boolean).join(" ").toLowerCase();
    return (
      fullName.includes(q) ||
      (c.email  ?? "").toLowerCase().includes(q) ||
      (c.mobile ?? "").toLowerCase().includes(q)
    );
  });

  if (loading) return <div className="empty-list">Loading customer records...</div>;

  return (
    <div className="customer-list-wrapper">
      <div className="customer-list-header">
        <h2 className="section-heading">
          Customer Records <span className="count-badge">{customers.length}</span>
        </h2>
        <input
          className="customer-search"
          type="text"
          placeholder="Search by name, email, or mobile..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 && (
        <div className="empty-list">
          {search
            ? "No customers match your search."
            : "No customer records yet. They are created automatically when an agent submits a reservation form."}
        </div>
      )}

      <div className="customer-cards">
        {filtered.map(c => (
          <CustomerCard
            key={c.id}
            customer={c}
            expanded={expandedId === c.id}
            onToggle={() => toggleExpand(c.id, c)}
            draft={drafts[c.id]}
            onTagToggle={tagKey => toggleTag(c.id, tagKey)}
            onNotesChange={notes =>
              setDrafts(prev => ({ ...prev, [c.id]: { ...prev[c.id], notes } }))
            }
            onSave={() => handleSave(c.id)}
            saving={saving === c.id}
          />
        ))}
      </div>
    </div>
  );
}

function CustomerCard({ customer: c, expanded, onToggle, draft, onTagToggle, onNotesChange, onSave, saving }) {
  const tags     = parseTags(c.tags);
  const approved = c.reservations.filter(r => r.status === "approved").length;
  const denied   = c.reservations.filter(r => r.status === "denied").length;
  const pending  = c.reservations.filter(r => r.status === "fulfilled").length;
  const lastRes  = c.reservations[0];

  const initials = `${c.firstName?.[0] ?? ""}${c.lastName?.[0] ?? ""}`.toUpperCase();

  return (
    <div className={`customer-card ${expanded ? "expanded" : ""}`}>
      {/* Header — always visible, click to expand */}
      <div className="customer-card-header clickable" onClick={onToggle}>
        <div className="customer-card-left">
          <div className="customer-avatar">{initials}</div>
          <div>
            <p className="customer-name">
              {c.firstName} {c.middleName ? c.middleName + " " : ""}{c.lastName}
            </p>
            <p className="customer-contact">
              {c.email   && <span>{c.email}</span>}
              {c.email && c.mobile && <span className="contact-sep">·</span>}
              {c.mobile  && <span>{c.mobile}</span>}
              {!c.email && !c.mobile && <span className="contact-none">No contact info</span>}
            </p>
          </div>
        </div>

        <div className="customer-card-right">
          {tags.length > 0 && (
            <div className="customer-tags">
              {tags.map(t => {
                const tag = TAGS.find(x => x.key === t);
                return tag
                  ? <span key={t} className={`customer-tag ${tag.cls}`}>{tag.label}</span>
                  : null;
              })}
            </div>
          )}
          <div className="customer-stats">
            {approved > 0 && <span className="cstat approved">{approved} approved</span>}
            {denied   > 0 && <span className="cstat denied">{denied} denied</span>}
            {pending  > 0 && <span className="cstat pending">{pending} pending</span>}
            {c.reservations.length === 0 && <span className="cstat gray">No reservations</span>}
            {lastRes && <span className="cstat gray">{timeAgo(lastRes.createdAt)}</span>}
          </div>
          <span className="expand-chevron">{expanded ? "▲" : "▼"}</span>
        </div>
      </div>

      {/* Expanded body */}
      {expanded && draft && (
        <div className="customer-expand-body">

          {/* Profile summary */}
          <div className="customer-section">
            <p className="customer-section-title">Profile</p>
            <div className="customer-profile-grid">
              {c.nationality  && <div className="cp-item"><span className="cp-label">Nationality</span><span className="cp-value">{c.nationality}</span></div>}
              {c.civilStatus  && <div className="cp-item"><span className="cp-label">Civil Status</span><span className="cp-value">{c.civilStatus}</span></div>}
              {c.homeAddress  && <div className="cp-item cp-wide"><span className="cp-label">Address</span><span className="cp-value">{c.homeAddress}</span></div>}
              {c.tin          && <div className="cp-item"><span className="cp-label">TIN</span><span className="cp-value">{c.tin}</span></div>}
            </div>
          </div>

          {/* Reservation history */}
          <div className="customer-section">
            <p className="customer-section-title">
              Reservation History
              <span className="cres-count">{c.reservations.length} total</span>
            </p>
            {c.reservations.length === 0 ? (
              <p className="cres-empty">No reservations on record.</p>
            ) : (
              <div className="cres-list">
                {c.reservations.map(r => {
                  const badgeCls = r.status === "approved" ? "badge-approved"
                                 : r.status === "denied"   ? "badge-denied"
                                 : "badge-pending";
                  return (
                    <div key={r.id} className="cres-row">
                      <span className="cres-unit">{r.unit.unitCode}</span>
                      <span className="cres-price">${r.unit.price.toLocaleString()}</span>
                      <span className={`badge ${badgeCls} cres-badge`}>
                        {STATUS_LABELS[r.status] ?? r.status}
                      </span>
                      <span className="cres-agent">via {r.user?.name ?? "—"}</span>
                      <span className="cres-date">{new Date(r.createdAt).toLocaleDateString()}</span>
                      {r.adminNote && (
                        <span className="cres-note">"{r.adminNote}"</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Labels / Tags */}
          <div className="customer-section">
            <p className="customer-section-title">Labels</p>
            <div className="tag-editor">
              {TAGS.map(tag => (
                <button
                  key={tag.key}
                  className={`tag-btn ${tag.cls} ${draft.tags.includes(tag.key) ? "active" : ""}`}
                  onClick={() => onTagToggle(tag.key)}
                >
                  {draft.tags.includes(tag.key) ? "✓" : "+"} {tag.label}
                </button>
              ))}
            </div>
          </div>

          {/* Admin notes */}
          <div className="customer-section">
            <p className="customer-section-title">Private Notes</p>
            <textarea
              className="customer-notes-input"
              placeholder="Add private notes about this customer (payment behavior, follow-up reminders, etc.)..."
              value={draft.notes}
              onChange={e => onNotesChange(e.target.value)}
              rows={3}
            />
          </div>

          <div className="customer-save-row">
            <button
              className="btn-save-customer"
              onClick={onSave}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Labels & Notes"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
