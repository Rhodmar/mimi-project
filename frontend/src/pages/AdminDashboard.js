import { useEffect, useState } from "react";
import { getUnits, getAdminReservations, seedData, reserveUnit } from "../services/api";
import MapView from "../components/MapView";
import UnitModal from "../components/UnitModal";
import PendingList from "../components/PendingList";
import CustomerList from "../components/CustomerList";
import ReservationForm from "../components/ReservationForm";

export default function AdminDashboard({ user, onLogout }) {
  const [units, setUnits]                     = useState([]);
  const [reservations, setReservations]       = useState([]);
  const [selectedUnit, setSelectedUnit]       = useState(null);
  const [activeReservation, setActiveReservation] = useState(null);
  const [reserving, setReserving]             = useState(false);
  const [seeding, setSeeding]                 = useState(false);
  const [tab, setTab]                         = useState("reservations");

  const fetchAll = async () => {
    try {
      const [u, r] = await Promise.all([getUnits(), getAdminReservations()]);
      setUnits(u.data);
      setReservations(r.data);
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleUnitClick = (unit) => {
    // If admin holds an active temp reservation on this unit, re-open the form
    const myActiveRes = unit.reservations?.[0];
    if (
      unit.status === "temp_reserved" &&
      myActiveRes?.status === "pending_fulfillment" &&
      myActiveRes?.userId === user.id
    ) {
      setActiveReservation({ reservation: myActiveRes, unit });
      return;
    }
    setSelectedUnit(unit);
  };

  const handleReserve = async (unitId) => {
    setReserving(true);
    try {
      const res = await reserveUnit({ userId: user.id, unitId });
      setSelectedUnit(null);
      setActiveReservation({ reservation: res.data, unit: units.find((u) => u.id === unitId) });
      await fetchAll();
    } catch (err) {
      alert(err.response?.data?.error ?? "Could not reserve unit.");
    } finally {
      setReserving(false);
    }
  };

  const handleFormSuccess = async () => {
    setActiveReservation(null);
    await fetchAll();
  };

  const handleFormClose = async () => {
    setActiveReservation(null);
    await fetchAll();
  };

  const handleSeed = async () => {
    if (!window.confirm("Reset all data?")) return;
    setSeeding(true);
    try {
      await seedData();
      await fetchAll();
    } finally {
      setSeeding(false);
    }
  };

  const available = units.filter((u) => u.status === "available").length;
  const pending   = units.filter((u) => u.status === "pending").length;
  const sold      = units.filter((u) => u.status === "sold").length;

  return (
    <div className="dashboard">
      <header className="header">
        <div className="header-brand">
          <img src="/logo.png" alt="Primary Homes" className="header-logo" />
          <span className="header-subtitle-tag">Admin Panel</span>
        </div>

        <div className="header-center">
          <div className="stat-card available">
            <span className="stat-number">{available}</span>
            <span className="stat-label">Available</span>
          </div>
          <div className="stat-card reserved">
            <span className="stat-number">{pending}</span>
            <span className="stat-label">Pending</span>
          </div>
          <div className="stat-card total">
            <span className="stat-number">{sold}</span>
            <span className="stat-label">Sold</span>
          </div>
        </div>

        <div className="header-right">
          <span className="admin-badge">Admin</span>
          <span className="agent-name">👤 {user.name}</span>
          <button className="btn-logout" onClick={onLogout}>Logout</button>
        </div>
      </header>

      {/* Tab bar */}
      <div className="admin-tab-bar">
        <button
          className={`admin-tab ${tab === "reservations" ? "active" : ""}`}
          onClick={() => setTab("reservations")}
        >
          Map &amp; Reservations
        </button>
        <button
          className={`admin-tab ${tab === "customers" ? "active" : ""}`}
          onClick={() => setTab("customers")}
        >
          Customer Records
        </button>
      </div>

      <main className="main-content">
        {tab === "reservations" && (
          <>
            <div className="map-wrapper">
              <div className="map-toolbar">
                <div className="legend">
                  <span className="legend-dot available" /> Available
                  <span className="legend-dot temp_reserved" /> Held
                  <span className="legend-dot pending" /> Pending
                  <span className="legend-dot sold" /> Sold
                </div>
                <button className="btn-seed" onClick={handleSeed} disabled={seeding}>
                  {seeding ? "Resetting..." : "↺ Reset Demo Data"}
                </button>
              </div>
              <div className="map-scroll">
                <MapView units={units} onUnitClick={handleUnitClick} />
              </div>
            </div>

            <PendingList reservations={reservations} onAction={fetchAll} />
          </>
        )}

        {tab === "customers" && <CustomerList />}
      </main>

      {selectedUnit && !activeReservation && (
        <UnitModal
          unit={selectedUnit}
          onClose={() => setSelectedUnit(null)}
          onReserve={handleReserve}
          loading={reserving}
        />
      )}

      {activeReservation && (
        <ReservationForm
          reservation={activeReservation.reservation}
          unit={activeReservation.unit}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
}
