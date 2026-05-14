import { useState } from "react";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import "./App.css";

function App() {
  const [user, setUser] = useState(null);

  if (!user) return <Login onLogin={setUser} />;
  if (user.role === "admin") return <AdminDashboard user={user} onLogout={() => setUser(null)} />;
  return <Dashboard agent={user} onLogout={() => setUser(null)} />;
}

export default App;
