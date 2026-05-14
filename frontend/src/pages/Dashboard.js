import { useEffect, useState } from "react";
import { getUnits, reserveUnit, seedData } from "../services/api";
import MapView from "../components/MapView";
import UnitModal from "../components/UnitModal";
import ReservationForm from "../components/ReservationForm";
import MyReservations from "../components/MyReservations";

export default function Dashboard({ agent, onLogout }) {
  const [units, setUnits] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [activeReservation, setActiveReservation] = useState(null);
  const [reserving, setReserving] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const fetchUnits = async () => {
    try {
      const res = await getUnits();
      setUnits(res.data);
    } catch (err) {
      console.error("Failed to fetch units:", err);
    }
  };

  useEffect(() => {
    fetchUnits();
    const interval = setInterval(fetchUnits, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleUnitClick = (unit) => {
    // If this agent already holds a temp reservation on this unit, re-open the form
    const myActiveRes = unit.reservations?.[0];
    if (
      unit.status === "temp_reserved" &&
      myActiveRes?.status === "pending_fulfillment" &&
      myActiveRes?.userId === agent.id
    ) {
      setActiveReservation({ reservation: myActiveRes, unit });
      return;
    }
    setSelectedUnit(unit);
  };

  const handleReserve = async (unitId) => {
    setReserving(true);
    try {
      const res = await reserveUnit({ userId: agent.id, unitId });
      setSelectedUnit(null);
      setActiveReservation({ reservation: res.data, unit: units.find((u) => u.id === unitId) });
      await fetchUnits();
    } catch (err) {
      alert(err.response?.data?.error ?? "Could not reserve unit.");
    } finally {
      setReserving(false);
    }
  };

  const handleFormSuccess = async () => {
    setActiveReservation(null);
    await fetchUnits();
  };

  const handleFormClose = async () => {
    setActiveReservation(null);
    await fetchUnits();
  };

  const handleSeed = async () => {
    if (!window.confirm("This will reset all units to available. Continue?")) return;
    setSeeding(true);
    try {
      await seedData();
      await fetchUnits();
    } catch (err) {
      alert("Failed to reset demo data.");
    } finally {
      setSeeding(false);
    }
  };

  const available = units.filter((u) => u.status === "available").length;
  const reserved = units.filter((u) => u.status !== "available").length;

  return (
    <div className="dashboard">
      <header className="header">
        <div className="header-brand">
          <img src="/logo.png" alt="Primary Homes" className="header-logo" />
          <span className="header-subtitle-tag">Reservation System</span>
        </div>

        <div className="header-center">
          <div className="stat-card available">
            <span className="stat-number">{available}</span>
            <span className="stat-label">Available</span>
          </div>
          <div className="stat-card reserved">
            <span className="stat-number">{reserved}</span>
            <span className="stat-label">Reserved</span>
          </div>
          <div className="stat-card total">
            <span className="stat-number">{units.length}</span>
            <span className="stat-label">Total Units</span>
          </div>
        </div>

        <div className="header-right">
          <span className="agent-name">👤 {agent.name}</span>
          <button className="btn-logout" onClick={onLogout}>Logout</button>
        </div>
      </header>

      <main className="main-content">
        <div className="map-wrapper">
          <div className="map-toolbar">
            <div className="legend">
              <span className="legend-dot available" /> Available
              <span className="legend-dot temp_reserved" /> Held (15 min)
              <span className="legend-dot pending" /> Pending
            </div>
            <button className="btn-seed" onClick={handleSeed} disabled={seeding}>
              {seeding ? "Resetting..." : "↺ Reset Demo Data"}
            </button>
          </div>
          <div className="map-scroll">
            <MapView units={units} onUnitClick={handleUnitClick} />
          </div>
        </div>

        <MyReservations agent={agent} />
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
