import { useEffect, useState } from "react";
import { getMyReservations } from "../services/api";

const SDP_LABELS = { annual: "Annual", quarterly: "Quarterly", monthly: "Monthly" };

const STATUS_CONFIG = {
  fulfilled: { label: "Pending Approval", className: "badge-pending" },
  approved:  { label: "Approved",         className: "badge-approved" },
  denied:    { label: "Denied",           className: "badge-denied" }
};

export default function MyReservations({ agent }) {
  const [reservations, setReservations] = useState([]);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getMyReservations(agent.id);
        setReservations(res.data);
      } catch (err) {
        console.error("Failed to fetch reservations:", err);
      }
    };
    fetch();
    const interval = setInterval(fetch, 5000);
    return () => clearInterval(interval);
  }, [agent.id]);

  if (reservations.length === 0) {
    return (
      <div className="my-reservations-wrapper">
        <h2 className="section-heading">My Reservations</h2>
        <div className="empty-list">You have no reservations yet.</div>
      </div>
    );
  }

  return (
    <div className="my-reservations-wrapper">
      <h2 className="section-heading">
        My Reservations
        <span className="count-badge">{reservations.length}</span>
      </h2>
      <div className="my-res-table-wrap">
        <table className="my-res-table">
          <thead>
            <tr>
              <th>Unit</th>
              <th>Client</th>
              <th>Price</th>
              <th>SDP</th>
              <th>Sheet</th>
              <th>Status</th>
              <th>Admin Note</th>
            </tr>
          </thead>
          <tbody>
            {reservations.map((r) => {
              const config = STATUS_CONFIG[r.status] ?? { label: r.status, className: "" };
              return (
                <tr key={r.id}>
                  <td>
                    <span className="res-unit-badge">{r.unit.unitCode}</span>
                  </td>
                  <td className="td-client">{r.clientName}</td>
                  <td>${r.unit.price.toLocaleString()}</td>
                  <td>{SDP_LABELS[r.sdp] ?? r.sdp}</td>
                  <td>Sheet {r.computation}</td>
                  <td>
                    <span className={`badge ${config.className}`}>{config.label}</span>
                  </td>
                  <td className="td-note">
                    {r.adminNote ? (
                      <span className={`note-text ${r.status}`}>{r.adminNote}</span>
                    ) : (
                      <span className="note-empty">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
