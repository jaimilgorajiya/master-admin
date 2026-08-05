import { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { TableSkeleton } from "./LoadingSkeleton";

const API = import.meta.env.VITE_API_BASE_URL;
const getToken = () => localStorage.getItem("adminToken") || sessionStorage.getItem("adminToken");
const authHeaders = () => ({ Authorization: `Bearer ${getToken()}` });
const fmt = (d) => d ? new Date(d).toLocaleDateString() : "—";

const ResellerProfile = ({ resellerId, onBack }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => { fetchProfile(); }, [resellerId]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/reseller/${resellerId}/profile`, { headers: authHeaders() });
      if (res.data.success) setData(res.data);
      else toast.error("Failed to load profile");
    } catch {
      toast.error("Failed to load reseller profile");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ padding: "20px" }}><TableSkeleton rows={6} columns={4} /></div>;
  if (!data) return <div className="no-data">Reseller not found.</div>;

  const { reseller: r, clients } = data;

  const filtered = clients.filter(c =>
    !search ||
    (c.ownerName || c.businessName || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.email || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.softwareName || c.softwareId?.name || "").toLowerCase().includes(search.toLowerCase())
  );

  const totalRevenue = clients.filter(c => c.paymentStatus === "completed").reduce((s, c) => s + (c.paymentAmount || 0), 0);

  const statusBadge = (active) => (
    <span style={{
      display: "inline-block", padding: "3px 10px", borderRadius: "50px",
      fontSize: "11px", fontWeight: 700, textTransform: "uppercase",
      background: active ? "rgba(52,199,89,0.1)" : "rgba(255,59,48,0.1)",
      color: active ? "#34c759" : "#ff3b30",
      border: `1px solid ${active ? "rgba(52,199,89,0.2)" : "rgba(255,59,48,0.2)"}`,
    }}>{active ? "Active" : "Inactive"}</span>
  );

  const payBadge = (status) => {
    const map = {
      completed: { bg: "rgba(52,199,89,0.1)", color: "#34c759", border: "rgba(52,199,89,0.2)", label: "Completed" },
      cheque_pending: { bg: "rgba(255,149,0,0.1)", color: "#ff9500", border: "rgba(255,149,0,0.2)", label: "Cheque Pending" },
      pending: { bg: "rgba(255,255,255,0.05)", color: "var(--text-tertiary)", border: "rgba(255,255,255,0.1)", label: "Pending" },
    };
    const s = map[status] || map.pending;
    return <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: "50px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>{s.label}</span>;
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button className="btn-secondary" onClick={onBack}>← Back</button>
          <h1 className="page-title" style={{ margin: 0 }}>{r.companyName}</h1>
          {statusBadge(r.status === "Active")}
        </div>
      </div>

      {/* Profile Card */}
      <div className="pro-card" style={{ marginBottom: "24px" }}>
        {/* Basic Info */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "20px" }}>
          {[
            { label: "Partner Name", value: r.name, color: "#00c8ff" },
            { label: "Email", value: r.email },
            { label: "Phone", value: r.phone },
            { label: "Address", value: r.address || "—" },
            { label: "Joined", value: fmt(r.createdAt) },
            { label: "Total Clients", value: clients.length, big: true },
            { label: "Total Revenue", value: `₹${totalRevenue.toLocaleString()}`, big: true, color: "#34c759" },
          ].map(({ label, value, color, big }) => (
            <div key={label}>
              <div style={{ fontSize: "11px", color: "var(--text-tertiary)", textTransform: "uppercase", marginBottom: "6px" }}>{label}</div>
              <div style={{ fontWeight: big ? 700 : 500, fontSize: big ? "20px" : "14px", color: color || "inherit" }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Allowed Software & Services */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginTop: "20px", paddingTop: "20px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <div>
            <div style={{ fontSize: "11px", color: "var(--text-tertiary)", textTransform: "uppercase", marginBottom: "8px" }}>Allowed Software</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {r.allowedSoftware?.length > 0
                ? r.allowedSoftware.map(s => <span key={s._id} style={{ background: "rgba(139,92,246,0.1)", color: "#8b5cf6", border: "1px solid rgba(139,92,246,0.2)", padding: "3px 10px", borderRadius: "50px", fontSize: "12px" }}>{s.name}</span>)
                : <span style={{ color: "var(--text-tertiary)", fontSize: "13px" }}>None assigned</span>}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "11px", color: "var(--text-tertiary)", textTransform: "uppercase", marginBottom: "8px" }}>Allowed Services</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {r.allowedServices?.length > 0
                ? r.allowedServices.map(s => <span key={s._id} style={{ background: "rgba(0,200,255,0.1)", color: "#00c8ff", border: "1px solid rgba(0,200,255,0.2)", padding: "3px 10px", borderRadius: "50px", fontSize: "12px" }}>{s.name}</span>)
                : <span style={{ color: "var(--text-tertiary)", fontSize: "13px" }}>None assigned</span>}
            </div>
          </div>
        </div>

        {/* Commission */}
        <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ fontSize: "11px", color: "var(--text-tertiary)", textTransform: "uppercase", marginBottom: "8px" }}>Commission Mode</div>
          <span style={{ background: "rgba(255,149,0,0.1)", color: "#ff9500", border: "1px solid rgba(255,149,0,0.2)", padding: "3px 12px", borderRadius: "50px", fontSize: "12px", fontWeight: 600 }}>
            {r.marginConfig?.mode === "overall"
              ? `Overall — ${r.marginConfig.overall?.type === "percentage" ? `${r.marginConfig.overall?.value}%` : `₹${r.marginConfig.overall?.value}`}`
              : (r.marginConfig?.mode || "—").replace("_", " ")}
          </span>
        </div>
      </div>

      {/* Clients Section */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <h2 style={{ margin: 0, fontSize: "18px" }}>Client History ({clients.length})</h2>
        <div className="search-box" style={{ width: "280px" }}>
          <input
            type="text"
            placeholder="Search by name, email, software..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="search-input"
          />
          <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
            <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2"/>
          </svg>
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Software</th>
              <th>Package</th>
              <th>Amount</th>
              <th>Payment</th>
              <th>Added By</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="10" className="no-data">No clients found.</td></tr>
            ) : filtered.map(c => (
              <tr key={c._id}>
                <td style={{ fontWeight: 600 }}>{c.ownerName || c.businessName || "—"}</td>
                <td>{c.email}</td>
                <td>{c.phone}</td>
                <td>{c.softwareId?.name || c.softwareName || "—"}</td>
                <td>{c.packageName || "—"}</td>
                <td>{c.paymentAmount ? `₹${c.paymentAmount.toLocaleString()}` : "—"}</td>
                <td>{payBadge(c.paymentStatus)}</td>
                <td style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                  {c.createdByResellerEmployee?.name || "Owner"}
                </td>
                <td>{statusBadge(c.isActive)}</td>
                <td>{fmt(c.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ResellerProfile;
