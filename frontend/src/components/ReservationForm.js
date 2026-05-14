import { useEffect, useRef, useState } from "react";
import { fulfillReservation, getCustomers } from "../services/api";

const WHY_OPTIONS = [
  { value: "good_location",           label: "Good Location" },
  { value: "design_and_quality",      label: "Design and Quality" },
  { value: "amenities",               label: "Amenities" },
  { value: "affordable_payment",      label: "Affordable Payment Scheme" },
  { value: "reliability_of_developer",label: "Reliability of Developer" },
  { value: "excellent_agent_service", label: "Excellent Service of Agent" }
];

const CIVIL_STATUS = ["Single", "Married", "Widowed", "Separated", "Annulled"];
const HOW_LEARNED  = ["Newspaper", "Exhibit", "Billboard", "Internet", "Magazine", "Referral", "Television", "Others"];

const EMPTY_FORM = {
  purpose: "", whyChooseProject: [], howLearnedAbout: "",
  sdp: "", computation: "",
  firstName: "", middleName: "", lastName: "",
  age: "", sex: "", civilStatus: "", birthday: "", nationality: "",
  homeAddress: "", telNo: "", addressAbroad: "", officeAddress: "",
  emailAddress: "", mobileNumber: "", businessName: "", position: "", occupationalField: "",
  spouseFirstName: "", spouseMiddleName: "", spouseSurname: "",
  spouseAge: "", spouseSex: "", spouseBirthday: "", spouseNationality: "",
  spouseAddressAbroad: "", spouseTelAbroad: "", spouseOfficeAddress: "", spouseTelOffice: "",
  spouseEmail: "", spouseMobile: "", spouseBusinessName: "", spousePosition: "", spouseOccupField: "",
  certFullName: "", certTin: "", certResCertNo: "", certDateIssue: "", certPlaceIssue: "",
  spouseCertFullName: "", spouseCertTin: "", spouseCertResCertNo: "", spouseCertDateIssue: "", spouseCertPlaceIssue: "",
  isCertified: false
};

export default function ReservationForm({ reservation, unit, onClose, onSuccess }) {
  const [timeLeft, setTimeLeft]   = useState(null);
  const [expired, setExpired]     = useState(false);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [files, setFiles]         = useState({ govId: null, appDoc: null, payment: null });
  const [submitting, setSubmitting] = useState(false);
  const [section, setSection]     = useState(0);

  // Customer auto-fill
  const [customers, setCustomers]         = useState([]);
  const [customerQuery, setCustomerQuery] = useState("");
  const [showDropdown, setShowDropdown]   = useState(false);
  const [filledFrom, setFilledFrom]       = useState(null);

  useEffect(() => {
    getCustomers().then(res => setCustomers(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const expiresAt = new Date(reservation.expiresAt);
    const tick = () => {
      const remaining = expiresAt - Date.now();
      if (remaining <= 0) { setExpired(true); setTimeLeft(0); }
      else setTimeLeft(remaining);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [reservation.expiresAt]);

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const toggleWhy = (value) => {
    setForm(f => ({
      ...f,
      whyChooseProject: f.whyChooseProject.includes(value)
        ? f.whyChooseProject.filter(v => v !== value)
        : [...f.whyChooseProject, value]
    }));
  };

  // --- Customer auto-fill ---
  const customerMatches = customerQuery.trim().length >= 1
    ? customers.filter(c => {
        const q = customerQuery.toLowerCase().trim();
        const name = [c.firstName, c.middleName, c.lastName].filter(Boolean).join(" ").toLowerCase();
        return (
          name.includes(q) ||
          (c.email  ?? "").toLowerCase().includes(q) ||
          (c.mobile ?? "").toLowerCase().includes(q)
        );
      }).slice(0, 7)
    : [];

  const applyCustomer = (c) => {
    const fullName = [c.firstName, c.middleName, c.lastName].filter(Boolean).join(" ");
    setForm(f => ({
      ...f,
      firstName:    c.firstName    || "",
      middleName:   c.middleName   || "",
      lastName:     c.lastName     || "",
      emailAddress: c.email        || "",
      mobileNumber: c.mobile       || "",
      homeAddress:  c.homeAddress  || "",
      nationality:  c.nationality  || "",
      civilStatus:  c.civilStatus  || "",
      certFullName: fullName,
      certTin:      c.tin          || "",
    }));
    setFilledFrom(fullName);
    setCustomerQuery("");
    setShowDropdown(false);
  };

  const clearAutofill = () => {
    setForm(EMPTY_FORM);
    setFilledFrom(null);
  };
  // -------------------------

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (expired) return;
    if (!form.isCertified) { alert("Please certify that the information is correct."); return; }
    setSubmitting(true);
    try {
      const data = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (k === "whyChooseProject") data.append(k, JSON.stringify(v));
        else data.append(k, v);
      });
      if (files.govId)   data.append("govId",   files.govId);
      if (files.appDoc)  data.append("appDoc",  files.appDoc);
      if (files.payment) data.append("payment", files.payment);
      await fulfillReservation(reservation.id, data);
      onSuccess();
    } catch (err) {
      alert(err.response?.data?.error ?? "Failed to submit.");
    } finally {
      setSubmitting(false);
    }
  };

  const timePercent = timeLeft ? (timeLeft / (15 * 60 * 1000)) * 100 : 0;
  const isUrgent    = timeLeft !== null && timeLeft < 3 * 60 * 1000;
  const isMarried   = form.civilStatus === "Married";

  const formatTime = (ms) => {
    if (!ms || ms <= 0) return "00:00";
    const m = Math.floor(ms / 60000), s = Math.floor((ms % 60000) / 1000);
    return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  };

  const SECTIONS = ["Purchase", "Personal Info", isMarried ? "Spouse Info" : null, "Certification", "Documents"].filter(Boolean);

  return (
    <div className="modal-overlay">
      <div className="form-modal">
        {/* Sticky Header */}
        <div className="form-header">
          <div className="form-header-info">
            <h2>Unit {unit.unitCode} — Reservation Form</h2>
            <p>${unit.price.toLocaleString()} · Complete within the time limit</p>
          </div>
          <div className={`timer-block ${isUrgent ? "urgent" : ""} ${expired ? "expired" : ""}`}>
            <span className="timer-label">Time remaining</span>
            <span className="timer-value">{expired ? "EXPIRED" : formatTime(timeLeft)}</span>
            <div className="timer-bar-track">
              <div className="timer-bar-fill" style={{ width: `${timePercent}%` }} />
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Customer Auto-fill Bar */}
        <div className="autofill-bar">
          <div className="autofill-search-wrap">
            <span className="autofill-icon">🔍</span>
            <input
              className="autofill-input"
              type="text"
              placeholder="Auto-fill from customer records — search by name, email, or mobile..."
              value={customerQuery}
              onChange={e => { setCustomerQuery(e.target.value); setShowDropdown(true); }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
              autoComplete="off"
            />
            {customerQuery && (
              <button className="autofill-clear-btn" type="button"
                onClick={() => { setCustomerQuery(""); setShowDropdown(false); }}>✕</button>
            )}
          </div>

          {showDropdown && customerMatches.length > 0 && (
            <div className="autofill-dropdown">
              {customerMatches.map(c => (
                <button
                  key={c.id}
                  type="button"
                  className="autofill-option"
                  onMouseDown={() => applyCustomer(c)}
                >
                  <span className="autofill-name">
                    {[c.firstName, c.middleName, c.lastName].filter(Boolean).join(" ")}
                  </span>
                  <span className="autofill-meta">
                    {[c.email, c.mobile].filter(Boolean).join(" · ") || "No contact info"}
                  </span>
                </button>
              ))}
            </div>
          )}

          {showDropdown && customerQuery.trim().length >= 1 && customerMatches.length === 0 && (
            <div className="autofill-dropdown">
              <p className="autofill-no-results">No matching customer records found.</p>
            </div>
          )}

          {filledFrom && (
            <div className="autofill-applied-bar">
              <span>✓ Auto-filled from <strong>{filledFrom}</strong> — review and update fields as needed.</span>
              <button type="button" className="autofill-undo-btn" onClick={clearAutofill}>
                Clear &amp; start fresh
              </button>
            </div>
          )}
        </div>

        {/* Section Tabs */}
        <div className="form-tabs">
          {SECTIONS.map((s, i) => (
            <button
              key={s}
              className={`form-tab ${section === i ? "active" : ""}`}
              type="button"
              onClick={() => setSection(i)}
            >{s}</button>
          ))}
        </div>

        {expired ? (
          <div className="expired-state">
            <div className="expired-icon">⏱</div>
            <h3>Reservation Expired</h3>
            <p>Your 15-minute hold has ended. The unit is now available again.</p>
            <button className="btn-close-form" onClick={onClose}>Close</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="res-form">
            {/* ── SECTION 0: Purchase ── */}
            {section === 0 && (
              <>
                <div className="form-section">
                  <h3 className="section-title">Purchase Intent</h3>
                  <FieldRow label="Purpose of Buying" required>
                    <div className="radio-group">
                      {["to_live_in","to_be_rented_out"].map(v => (
                        <label key={v} className="radio-label">
                          <input type="radio" name="purpose" value={v}
                            checked={form.purpose === v} onChange={() => set("purpose", v)} required />
                          {v === "to_live_in" ? "To Live In" : "To Be Rented Out"}
                        </label>
                      ))}
                    </div>
                  </FieldRow>

                  <FieldRow label="Why Choose This Project?">
                    <div className="checkbox-group">
                      {WHY_OPTIONS.map(o => (
                        <label key={o.value} className="checkbox-label">
                          <input type="checkbox" checked={form.whyChooseProject.includes(o.value)}
                            onChange={() => toggleWhy(o.value)} />
                          {o.label}
                        </label>
                      ))}
                    </div>
                  </FieldRow>

                  <FieldRow label="How Did You Learn About the Project?" required>
                    <div className="radio-group wrap">
                      {HOW_LEARNED.map(v => (
                        <label key={v} className="radio-label">
                          <input type="radio" name="howLearnedAbout" value={v.toLowerCase()}
                            checked={form.howLearnedAbout === v.toLowerCase()}
                            onChange={() => set("howLearnedAbout", v.toLowerCase())} required />
                          {v}
                        </label>
                      ))}
                    </div>
                  </FieldRow>
                </div>

                <div className="form-section">
                  <h3 className="section-title">Payment Details</h3>
                  <div className="field-row two-col">
                    <div>
                      <label>SDP Payment Scheme <Req /></label>
                      <select value={form.sdp} onChange={e => set("sdp", e.target.value)} required>
                        <option value="">Select scheme</option>
                        <option value="annual">Annual</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                    <div>
                      <label>Computation Sheet <Req /></label>
                      <select value={form.computation} onChange={e => set("computation", e.target.value)} required>
                        <option value="">Select sheet</option>
                        {["1","2","3","4"].map(n => <option key={n} value={n}>Sheet {n}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ── SECTION 1: Personal Info ── */}
            {section === 1 && (
              <div className="form-section">
                <h3 className="section-title">Personal Information</h3>
                <div className="field-row three-col">
                  <TF label="First Name"   req value={form.firstName}   onChange={v => set("firstName", v)} />
                  <TF label="Middle Name"      value={form.middleName}  onChange={v => set("middleName", v)} />
                  <TF label="Last Name"    req value={form.lastName}    onChange={v => set("lastName", v)} />
                </div>
                <div className="field-row four-col">
                  <TF label="Age"          req value={form.age}         onChange={v => set("age", v)} type="number" min="1" />
                  <div>
                    <label>Sex <Req /></label>
                    <select value={form.sex} onChange={e => set("sex", e.target.value)} required>
                      <option value="">—</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <div>
                    <label>Civil Status <Req /></label>
                    <select value={form.civilStatus} onChange={e => set("civilStatus", e.target.value)} required>
                      <option value="">—</option>
                      {CIVIL_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <TF label="Nationality" req value={form.nationality} onChange={v => set("nationality", v)} />
                </div>
                <div className="field-row two-col">
                  <TF label="Birthday" req value={form.birthday} onChange={v => set("birthday", v)} type="date" />
                  <TF label="Tel No."      value={form.telNo}    onChange={v => set("telNo", v)} />
                </div>
                <TF label="Home Mailing Address" req value={form.homeAddress} onChange={v => set("homeAddress", v)} fullWidth />
                <TF label="Address Abroad (optional)" value={form.addressAbroad} onChange={v => set("addressAbroad", v)} fullWidth />
                <TF label="Office Address (optional)" value={form.officeAddress} onChange={v => set("officeAddress", v)} fullWidth />
                <div className="field-row three-col">
                  <TF label="Email Address" req value={form.emailAddress} onChange={v => set("emailAddress", v)} type="email" />
                  <TF label="Mobile Number" req value={form.mobileNumber} onChange={v => set("mobileNumber", v)} />
                  <TF label="Tel No."           value={form.telNo}        onChange={v => set("telNo", v)} />
                </div>
                <div className="field-row three-col">
                  <TF label="Office / Business Name" value={form.businessName}      onChange={v => set("businessName", v)} />
                  <TF label="Position"               value={form.position}          onChange={v => set("position", v)} />
                  <TF label="Occupational Field"     value={form.occupationalField} onChange={v => set("occupationalField", v)} />
                </div>
              </div>
            )}

            {/* ── SECTION 2: Spouse Info (only if married) ── */}
            {section === 2 && isMarried && (
              <div className="form-section">
                <h3 className="section-title">Spouse Information</h3>
                <div className="field-row three-col">
                  <TF label="First Name"   req value={form.spouseFirstName}   onChange={v => set("spouseFirstName", v)} />
                  <TF label="Middle Name"      value={form.spouseMiddleName}  onChange={v => set("spouseMiddleName", v)} />
                  <TF label="Surname"      req value={form.spouseSurname}     onChange={v => set("spouseSurname", v)} />
                </div>
                <div className="field-row four-col">
                  <TF label="Age" req value={form.spouseAge} onChange={v => set("spouseAge", v)} type="number" min="1" />
                  <div>
                    <label>Sex <Req /></label>
                    <select value={form.spouseSex} onChange={e => set("spouseSex", e.target.value)} required>
                      <option value="">—</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <TF label="Birthday"    req value={form.spouseBirthday}    onChange={v => set("spouseBirthday", v)} type="date" />
                  <TF label="Nationality" req value={form.spouseNationality} onChange={v => set("spouseNationality", v)} />
                </div>
                <TF label="Address Abroad (optional)" value={form.spouseAddressAbroad} onChange={v => set("spouseAddressAbroad", v)} fullWidth />
                <div className="field-row two-col">
                  <TF label="Tel No. Abroad (optional)" value={form.spouseTelAbroad}  onChange={v => set("spouseTelAbroad", v)} />
                  <TF label="Tel No. Office"             value={form.spouseTelOffice} onChange={v => set("spouseTelOffice", v)} />
                </div>
                <TF label="Office Address (optional)" value={form.spouseOfficeAddress} onChange={v => set("spouseOfficeAddress", v)} fullWidth />
                <div className="field-row three-col">
                  <TF label="Email Address" req value={form.spouseEmail}  onChange={v => set("spouseEmail", v)} type="email" />
                  <TF label="Mobile Number" req value={form.spouseMobile} onChange={v => set("spouseMobile", v)} />
                  <TF label="Tel No. Office"    value={form.spouseTelOffice} onChange={v => set("spouseTelOffice", v)} />
                </div>
                <div className="field-row three-col">
                  <TF label="Office / Business Name" value={form.spouseBusinessName} onChange={v => set("spouseBusinessName", v)} />
                  <TF label="Position"               value={form.spousePosition}     onChange={v => set("spousePosition", v)} />
                  <TF label="Occupational Field"     value={form.spouseOccupField}   onChange={v => set("spouseOccupField", v)} />
                </div>
              </div>
            )}

            {/* ── SECTION: Certification ── */}
            {section === (isMarried ? 3 : 2) && (
              <div className="form-section">
                <h3 className="section-title">Certification</h3>
                <label className="cert-checkbox">
                  <input type="checkbox" checked={form.isCertified}
                    onChange={e => set("isCertified", e.target.checked)} />
                  I hereby certify that all information provided above is true and correct.
                </label>

                <div className="cert-subsection">
                  <p className="cert-label">Buyer</p>
                  <div className="field-row two-col">
                    <TF label="Full Name" req value={form.certFullName}   onChange={v => set("certFullName", v)} />
                    <TF label="TIN"       req value={form.certTin}        onChange={v => set("certTin", v)} />
                  </div>
                  <div className="field-row three-col">
                    <TF label="Res. Cert. / Passport No." req value={form.certResCertNo}  onChange={v => set("certResCertNo", v)} />
                    <TF label="Date of Issue"             req value={form.certDateIssue}  onChange={v => set("certDateIssue", v)} type="date" />
                    <TF label="Place of Issue"            req value={form.certPlaceIssue} onChange={v => set("certPlaceIssue", v)} />
                  </div>
                </div>

                {isMarried && (
                  <div className="cert-subsection">
                    <p className="cert-label">Spouse</p>
                    <div className="field-row two-col">
                      <TF label="Full Name" value={form.spouseCertFullName}   onChange={v => set("spouseCertFullName", v)} />
                      <TF label="TIN"       value={form.spouseCertTin}        onChange={v => set("spouseCertTin", v)} />
                    </div>
                    <div className="field-row three-col">
                      <TF label="Res. Cert. / Passport No." value={form.spouseCertResCertNo}  onChange={v => set("spouseCertResCertNo", v)} />
                      <TF label="Date of Issue"             value={form.spouseCertDateIssue}  onChange={v => set("spouseCertDateIssue", v)} type="date" />
                      <TF label="Place of Issue"            value={form.spouseCertPlaceIssue} onChange={v => set("spouseCertPlaceIssue", v)} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── SECTION: Documents ── */}
            {section === (isMarried ? 4 : 3) && (
              <div className="form-section">
                <h3 className="section-title">Required Documents</h3>
                <p className="section-note">Accepted formats: PDF, JPG, PNG</p>
                <FileUpload label="Valid Government ID"   name="govId"   value={files.govId}   onChange={f => setFiles(p => ({ ...p, govId: f }))} />
                <FileUpload label="Application Document"  name="appDoc"  value={files.appDoc}  onChange={f => setFiles(p => ({ ...p, appDoc: f }))} />
                <FileUpload label="Proof of Payment"      name="payment" value={files.payment} onChange={f => setFiles(p => ({ ...p, payment: f }))} />
              </div>
            )}

            <div className="form-footer">
              <button type="button" className="btn-cancel-form" onClick={onClose}>Cancel</button>
              <div style={{ display: "flex", gap: 8 }}>
                {section > 0 && (
                  <button type="button" className="btn-cancel-form" onClick={() => setSection(s => s - 1)}>← Back</button>
                )}
                {section < SECTIONS.length - 1 ? (
                  <button type="button" className="btn-submit-form" onClick={() => setSection(s => s + 1)}>Next →</button>
                ) : (
                  <button type="submit" className="btn-submit-form" disabled={submitting}>
                    {submitting ? "Submitting..." : "Submit Reservation"}
                  </button>
                )}
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function Req() { return <span className="req">*</span>; }

function FieldRow({ label, required, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6 }}>
        {label} {required && <Req />}
      </label>
      {children}
    </div>
  );
}

function TF({ label, req, value, onChange, type = "text", fullWidth, ...rest }) {
  return (
    <div className={`field-row${fullWidth ? " full-width" : ""}`} style={fullWidth ? { marginBottom: 14 } : {}}>
      <label>{label} {req && <Req />}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        required={req} {...rest} />
    </div>
  );
}

function FileUpload({ label, name, value, onChange }) {
  const ref = useRef();
  return (
    <div className="file-row">
      <label>{label} <Req /></label>
      <div className={`file-drop ${value ? "has-file" : ""}`} onClick={() => ref.current.click()}>
        <input ref={ref} type="file" name={name} accept=".pdf,.jpg,.jpeg,.png"
          style={{ display: "none" }} required onChange={e => e.target.files[0] && onChange(e.target.files[0])} />
        {value ? <span className="file-chosen">📎 {value.name}</span>
               : <span className="file-prompt">Click to upload</span>}
      </div>
    </div>
  );
}
