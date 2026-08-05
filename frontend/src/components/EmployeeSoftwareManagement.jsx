import { useState, useEffect, useContext } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { TableSkeleton } from "./LoadingSkeleton";
import { SocketContext } from "../context/SocketContext";

const API = import.meta.env.VITE_API_BASE_URL;
const getToken = () => localStorage.getItem("employeeToken") || sessionStorage.getItem("employeeToken");
const authHeaders = () => ({ Authorization: `Bearer ${getToken()}` });

const EmployeeSoftwareManagement = () => {
  const [softwareList, setSoftwareList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null); // selected software for detail view
  const [search, setSearch] = useState("");
  const socket = useContext(SocketContext);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handler = () => fetchData();
    socket.on("software_data_change", handler);
    socket.on("package_data_change", handler);
    return () => {
      socket.off("software_data_change", handler);
      socket.off("package_data_change", handler);
    };
  }, [socket]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/software/all`, { headers: authHeaders() });
      if (res.data.success) setSoftwareList((res.data.softwares || res.data.softwareList || []).filter(s => s.isActive));
    } catch {
      toast.error("Failed to load software");
    } finally {
      setLoading(false);
    }
  };

  const filtered = softwareList.filter(s =>
    !search.trim() || s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.description || "").toLowerCase().includes(search.toLowerCase())
  );

  if (selected) {
    return <SoftwareDetail software={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Software</h1>
        <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          {filtered.length} software available
        </span>
      </div>

      <div className="search-filter-section" style={{ marginBottom: '24px' }}>
        <div className="search-box" style={{ maxWidth: '400px' }}>
          <input type="text" placeholder="Search software..." value={search}
            onChange={e => setSearch(e.target.value)} className="search-input" />
          <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
            <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2"/>
          </svg>
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={3} columns={3} />
      ) : filtered.length === 0 ? (
        <div className="table-container"><div className="no-data" style={{ padding: '60px' }}>No software available.</div></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {filtered.map(sw => (
            <SoftwareCard key={sw._id} software={sw} onClick={() => setSelected(sw)} />
          ))}
        </div>
      )}
    </div>
  );
};

const SoftwareCard = ({ software: sw, onClick }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--glass-bg)', border: `1px solid ${hovered ? 'rgba(0,200,255,0.35)' : 'var(--glass-border)'}`,
        borderRadius: '16px', padding: '24px', cursor: 'pointer',
        transition: 'all 0.2s ease', position: 'relative', overflow: 'hidden',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
        boxShadow: hovered ? '0 8px 28px rgba(0,200,255,0.12)' : 'none',
      }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #00c8ff, #a855f7)' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
        <div style={{
          width: 48, height: 48, borderRadius: '12px', flexShrink: 0,
          background: 'linear-gradient(135deg, rgba(0,200,255,0.2), rgba(168,85,247,0.2))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '20px', fontWeight: 800, color: '#00c8ff',
        }}>{sw.name.charAt(0).toUpperCase()}</div>
        <div>
          <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#fff' }}>{sw.name}</h3>
          <span style={{ fontSize: '12px', color: '#34c759' }}>● Active</span>
        </div>
      </div>

      {sw.description && (
        <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {sw.description}
        </p>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
          Cloud Based Solutions
        </span>
        <span style={{ fontSize: '12px', color: '#00c8ff', fontWeight: 600 }}>View Details →</span>
      </div>
    </div>
  );
};

const SoftwareDetail = ({ software: sw, onBack }) => {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchPackages(); }, [sw._id]);

  const fetchPackages = async () => {
    setLoading(true);
    try {
      // Fetch from external software package API via proxy
      if (sw.packageGetApi) {
        const res = await axios.post(`${API}/api/proxy/external`, {
          targetUrl: sw.packageGetApi, method: "GET"
        }, { headers: authHeaders() });
        const data = res.data;
        const list = Array.isArray(data) ? data : (data.packages || data.data || data.results || []);
        setPackages(list);
      }
    } catch {
      toast.error("Failed to load packages");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
    <div className="page-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button className="btn-secondary" onClick={onBack}>← Back</button>
        <h1 className="page-title" style={{ margin: 0 }}>{sw.name}</h1>
        <span style={{ fontSize: '12px', color: '#34c759', background: 'rgba(52,199,89,0.1)', border: '1px solid rgba(52,199,89,0.2)', padding: '3px 10px', borderRadius: '20px' }}>Active</span>
      </div>
    </div>

    {/* Info Card */}
    <div className="pro-card" style={{ marginBottom: '28px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Software Name</div>
          <div style={{ fontWeight: 700, fontSize: '16px', color: '#00c8ff' }}>{sw.name}</div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Added On</div>
          <div>{new Date(sw.createdAt).toLocaleDateString()}</div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Packages</div>
          <div style={{ fontWeight: 700, fontSize: '20px', color: '#a855f7' }}>{packages.length}</div>
        </div>
      </div>
      {sw.description && (
        <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Description</div>
          <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '14px' }}>{sw.description}</p>
        </div>
      )}
    </div>

    {/* Packages */}
    <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>Packages</h2>
    {loading ? (
      <div style={{ color: 'var(--text-secondary)', padding: '20px' }}>Loading packages...</div>
    ) : packages.length === 0 ? (
      <div className="table-container"><div className="no-data" style={{ padding: '40px' }}>No packages for this software.</div></div>
    ) : (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
        {packages.map((pkg, i) => {
          const name = pkg.name || pkg.packageName || pkg.title || "—";
          const price = pkg.price ?? pkg.amount ?? pkg.cost ?? null;
          const desc = pkg.description || pkg.details || "";
          const rawValidity = pkg.validity || pkg.duration || pkg.durationDays || null;
          const validity = rawValidity && typeof rawValidity === 'object'
            ? rawValidity.value ?? null
            : rawValidity;
          const validityUnit = (rawValidity && typeof rawValidity === 'object' ? rawValidity.unit : null)
            || pkg.validityUnit || pkg.unit || "days";
          return (
            <div key={pkg._id || pkg.id || i} style={{
              background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
              borderRadius: '14px', padding: '20px', position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #a855f7, #00c8ff)' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#fff' }}>{name}</h4>
                {price != null && <span style={{ fontSize: '18px', fontWeight: 800, color: '#00c8ff', whiteSpace: 'nowrap', marginLeft: '8px' }}>₹{Number(price).toLocaleString()}</span>}
              </div>
              {validity && (
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                  {validity} {validityUnit}
                </div>
              )}
              {desc && <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-tertiary)', lineHeight: 1.5 }}>{desc}</p>}
            </div>
          );
        })}
      </div>
    )}
  </div>
  );
};

export default EmployeeSoftwareManagement;
