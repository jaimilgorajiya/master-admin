import { useState, useEffect, useContext } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import ResellerAddNewClient from "./ResellerAddNewClient";
import { TableSkeleton } from "./LoadingSkeleton";
import { SocketContext } from "../context/SocketContext";
import "./ClientDetails.css"; // Reuse the premium styles

const API = import.meta.env.VITE_API_BASE_URL;
const getToken = () => localStorage.getItem("resellerToken") || sessionStorage.getItem("resellerToken");
const authHeaders = () => ({ Authorization: `Bearer ${getToken()}` });
const fmt = (d) => d ? new Date(d).toLocaleDateString() : "—";
const fmtFull = (d) => d ? new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'numeric', year: 'numeric' }) : "—";

const ResellerClientManagement = () => {
  const [allClients, setAllClients] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [softwareList, setSoftwareList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [detailClient, setDetailClient] = useState(null);
  const [search, setSearch] = useState("");
  const [filterSoftware, setFilterSoftware] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [togglingId, setTogglingId] = useState(null);

  const socket = useContext(SocketContext);

  useEffect(() => {
    if (!socket) return;
    const handler = () => fetchAllClients();
    socket.on("software_client_change", handler);
    return () => socket.off("software_client_change", handler);
  }, [socket]);

  useEffect(() => { loadData(); }, []);
  useEffect(() => { applyFilters(); }, [allClients, search, filterSoftware, filterStatus]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/reseller-actions/my-permissions`, { headers: authHeaders() });
      if (res.data.success) {
        const softwares = res.data.data.allowedSoftware || [];
        setSoftwareList(softwares);
        await fetchAllClients(softwares);
      }
    } catch { toast.error("Failed to load software list"); }
    finally { setLoading(false); }
  };

  const fetchAllClients = async (softwares) => {
    const swList = softwares || softwareList;
    if (!swList.length) { setAllClients([]); return; }

    try {
      const localRes = await axios.get(`${API}/api/reseller-actions/clients`, { headers: authHeaders() }).then(r => r.data.data || []);
      const externalResults = await Promise.allSettled(
        swList.filter(s => s.clientsGetApi).map(sw =>
          axios.post(`${API}/api/proxy/external`, { targetUrl: sw.clientsGetApi, method: "GET" }, { headers: authHeaders() })
            .then(res => {
              const data = res.data;
              const list = Array.isArray(data) ? data : (data.clients || data.data || data.admins || data.tenants || []);
              return { swId: sw._id, list };
            })
            .catch(() => ({ swId: sw._id, list: [] }))
        )
      );

      const extMap = {};
      externalResults.forEach(r => {
        if (r.status === "fulfilled") {
          r.value.list.forEach(ec => {
            const email = (ec.email || ec.ownerEmail || "").toLowerCase().trim();
            if (email) extMap[`${r.value.swId}_${email}`] = ec;
          });
        }
      });

      const enriched = localRes.map(lc => {
        const swId = lc.softwareId?._id || lc.softwareId;
        const email = (lc.email || "").toLowerCase().trim();
        const ext = extMap[`${swId}_${email}`] || {};
        const packageName = ext.package?.name || ext.packageName || lc.packageName || "—";
        
        const isChequePending = lc.paymentStatus === 'cheque_pending';
        const isCompleted = lc.paymentStatus === 'completed' || isChequePending;

        return {
          _localId: lc._id,
          _localDetails: lc,
          _extId: ext._id || ext.id || lc.externalClientId,
          name: lc.ownerName || lc.clientName || ext.ownerName || "—",
          businessName: lc.businessName || lc.companyName || ext.businessName || "—",
          email: lc.email,
          phone: lc.phone,
          softwareName: lc.softwareId?.name || lc.softwareName || "—",
          softwareId: swId,
          packageName: packageName,
          paymentStatus: isCompleted ? 'completed' : 'pending',
          _paymentMethod: lc.paymentMethod,
          isActive: lc.isActive,
          createdAt: lc.createdAt,
          _software: swList.find(s => String(s._id) === String(swId)),
          _raw: ext
        };
      });

      setAllClients(enriched);
    } catch (err) {
      console.error("Error fetching portfolio:", err);
    }
  };

  const applyFilters = () => {
    let list = [...allClients];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.name?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.businessName?.toLowerCase().includes(q)
      );
    }
    if (filterSoftware) list = list.filter(c => c.softwareId === filterSoftware);
    if (filterStatus === "active") list = list.filter(c => c.isActive);
    if (filterStatus === "inactive") list = list.filter(c => !c.isActive);
    setFiltered(list);
  };

  const handleToggle = async (client) => {
    const action = client.isActive ? "deactivate" : "activate";
    const result = await Swal.fire({
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} Client?`,
      html: `Are you sure you want to ${action} <strong>"${client.name}"</strong>?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#00c8ff",
      cancelButtonColor: "rgba(255,255,255,0.05)",
      confirmButtonText: `Yes, ${action}!`,
      cancelButtonText: "Cancel",
      background: "#0f172a",
      color: "#fff",
      customClass: {
        popup: "premium-swal-popup",
        confirmButton: "premium-swal-confirm",
        cancelButton: "premium-swal-cancel",
      },
    });
    if (!result.isConfirmed) return;

    const sw = client._software;
    if (!sw?.clientToggleStatusApi || !client._extId) {
      return toast.error("Toggle status API not available for this software");
    }

    setTogglingId(client._localId);
    try {
      const res = await axios.patch(`${API}/api/reseller-actions/clients/toggle-status/${client._localId}`, {}, { headers: authHeaders() });

      if (res.data?.success) {
        toast.success(`Client ${action}d successfully`);
        await fetchAllClients();
      } else {
        toast.error(res.data?.message || "Action failed");
      }
    } catch (err) {
      toast.error("Failed to update status");
    } finally {
      setTogglingId(null);
    }
  };

  if (detailClient) {
    return <ResellerClientDetailView client={detailClient} onBack={() => setDetailClient(null)} />;
  }

  return (
    <div className="module-container">
      <div className="page-header">
        <h1 className="page-title">My Clients</h1>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>+ Add New Client</button>
      </div>

      {showAdd && (
        <ResellerAddNewClient
          onClose={() => setShowAdd(false)}
          onSuccess={() => { setShowAdd(false); loadData(); }}
        />
      )}

      <div className="search-filter-section">
        <div className="search-box">
          <input type="text" placeholder="Search by name or email..." value={search}
            onChange={e => setSearch(e.target.value)} className="search-input" />
          <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
            <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2"/>
          </svg>
        </div>
        <div className="filter-section">
          <select value={filterSoftware} onChange={e => setFilterSoftware(e.target.value)} className="filter-select">
            <option value="">All Software</option>
            {softwareList.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="filter-select">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          {(search || filterSoftware || filterStatus) && (
            <button className="clear-filters-btn" onClick={() => { setSearch(""); setFilterSoftware(""); setFilterStatus(""); }}>
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {loading ? <TableSkeleton rows={5} columns={8} /> : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Software</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Added By</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="8" className="no-data">No portfolio records found.</td></tr>
              ) : filtered.map((c, i) => {
                const local = c._localDetails || {};
                let addedByLabel = "You";
                if (local.createdByResellerEmployee) {
                    addedByLabel = local.createdByResellerEmployee.name || "Team Member";
                }

                return (
                <tr key={`${c.softwareId}-${c._extId || i}`}>
                  <td style={{ cursor: 'pointer', color: '#00c8ff', fontWeight: 600 }}
                    onClick={() => setDetailClient(c)}>{c.businessName}</td>
                  <td>{c.email}</td>
                  <td>{c.softwareName}</td>
                  <td>
                    <span style={{
                      padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                      background: c.paymentStatus === 'completed' 
                        ? (c._paymentMethod === 'cheque' ? 'rgba(0,122,255,0.1)' : 'rgba(52,199,89,0.1)') 
                        : 'rgba(255,149,0,0.1)',
                      color: c.paymentStatus === 'completed' 
                        ? (c._paymentMethod === 'cheque' ? '#007aff' : '#34c759') 
                        : '#ff9500'
                    }}>
                      {c.paymentStatus === 'completed' && c._paymentMethod === 'cheque' ? 'cheque received' : c.paymentStatus}
                    </span>
                  </td>
                  <td>
                    {togglingId === c._localId ? (
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>...</span>
                    ) : (
                      <label className="toggle-switch">
                        <input type="checkbox" checked={c.isActive}
                          disabled={togglingId !== null || !c._software?.clientToggleStatusApi}
                          onChange={() => handleToggle(c)} />
                        <span className="toggle-slider"></span>
                      </label>
                    )}
                  </td>
                  <td>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{addedByLabel}</span>
                  </td>
                  <td>{fmt(c.createdAt)}</td>
                  <td>
                    <button className="btn-icon" onClick={() => setDetailClient(c)} title="View Details">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2"/>
                        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                    </button>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ── Detail View (Exact mirror of Admin's ClientDetailView) ───────────────
const ResellerClientDetailView = ({ client: c, onBack }) => {
  const raw = c._raw || {};
  const localData = c._localDetails || {};
  
  const [transactions, setTransactions] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (localData._id) fetchHistory();
  }, [localData._id]);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      // Using the singular client path confirmed in routes
      const res = await axios.get(`${API}/api/client/history/${localData._id}`, { headers: authHeaders() });
      if (res.data.success) {
          setTransactions(res.data.history || []);
      }
    } catch (err) {
      console.error("Failed to fetch history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const currentHistory = transactions.length > 0 ? transactions : [];

  // Fallback: If no transactions yet, synthesize one from the summary (for new clients)
  if (currentHistory.length === 0 && (localData.transactionId || localData.paymentDate || c.paymentStatus === 'completed')) {
      currentHistory.push({
          _synthesized: true,
          paymentDate: localData.paymentDate || raw.paymentDate || raw.packageStartDate || raw.createdAt || c.createdAt,
          packageId: { name: localData.packageName || raw.package?.name || c.packageName },
          amount: (localData.paymentAmount !== undefined && localData.paymentAmount !== null) ? localData.paymentAmount : (raw.package?.price || "—"),
          orderId: localData.orderId || raw.orderId || "—",
          paymentId: localData.transactionId || raw.transactionId || "—",
          status: localData.paymentStatus || c.paymentStatus || "completed"
      });
  }

  const getExpiryStatus = (dateString) => {
      if (!dateString) return 'active';
      const expiry = new Date(dateString);
      const now = new Date();
      const diffTime = expiry - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays < 0) return 'expired';
      if (diffDays <= 7) return 'warning';
      return 'active';
  };

  const expiryStatus = getExpiryStatus(localData.packageEndDate || raw.packageEndDate || raw.subscription?.expiryDate);

  return (
    <div className="client-details-page">
      {/* Header */}
      <div className="page-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button className="btn-secondary" onClick={onBack}>
                  ← Back to List
              </button>
              <h1 className="page-title" style={{ fontSize: '24px', margin: 0 }}>
                  {c.businessName}
              </h1>
          </div>
      </div>

      {/* Client Profile Card */}
      <div className="pro-card">
          <div className="details-grid">
              {/* Column 1: Contact Info */}
              <div className="detail-group">
                  <label className="detail-label">Client Details</label>
                  <div className="detail-value highlight">{c.businessName}</div>
                  <div className="detail-value" style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                      {c.email}
                  </div>
                  <div className="detail-value" style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                      {c.phone}
                  </div>
                  <div className="detail-value" style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '8px' }}>
                      Created: <span style={{ color: 'var(--text-secondary)' }}>{fmtFull(c.createdAt)}</span>
                  </div>
              </div>

              {/* Column 2: Software Access */}
              <div className="detail-group">
                  <label className="detail-label">Software Access</label>
                  <div className="detail-value">
                      {c.softwareName || "N/A"}
                  </div>
                  <div style={{ marginTop: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span className={`status-badge ${c.isActive ? 'active' : 'inactive'}`}>
                          {c.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <span className="info-badge" 
                          style={{ 
                              background: 'rgba(59, 130, 246, 0.15)',
                              color: '#3b82f6',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 600,
                              textTransform: 'uppercase'
                          }}
                      >
                          Software
                      </span>
                  </div>
              </div>

               {/* Column 3: Plan & Validity */}
              <div className="detail-group">
                  <label className="detail-label">Current Subscription</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span className="plan-badge">
                          {c.packageName || "No Plan"}
                      </span>
                  </div>
                  <div className={`detail-value ${expiryStatus === 'expired' ? 'text-red-500' : (expiryStatus === 'warning' ? 'text-orange-500' : 'text-green-500')}`} style={{ fontSize: '14px' }}>
                        {(localData.packageEndDate || raw.packageEndDate || raw.subscription?.expiryDate)
                          ? `Expires ${new Date(localData.packageEndDate || raw.packageEndDate || raw.subscription?.expiryDate).toLocaleDateString('en-GB')}` 
                          : "No Expiry Date"}
                  </div>
              </div>

              {/* Column 4: Add-on Services */}
              {localData.selectedServices?.length > 0 && (
                <div className="detail-group">
                    <label className="detail-label">Add-on Services</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                        {localData.selectedServices.map(s => (
                            <span key={s._id} style={{ 
                                background: 'rgba(40, 167, 69, 0.1)', 
                                color: '#28a745', 
                                border: '1px solid rgba(40, 167, 69, 0.2)',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 500
                            }}>
                                {s.name} (₹{s.price})
                            </span>
                        ))}
                    </div>
                </div>
              )}
          </div>
      </div>

      {/* History Table Section */}
      <div className="section-header">
          <h2 className="section-title">Payment History</h2>
      </div>
      
      <div className="table-container">
          <table className="data-table history-table">
              <thead>
                  <tr>
                      <th style={{ width: '20%' }}>Date</th>
                      <th style={{ width: '25%' }}>Package</th>
                      <th style={{ width: '15%' }}>Amount</th>
                      <th style={{ width: '15%' }}>Payment ID</th>
                      <th style={{ width: '10%', textAlign: 'right' }}>Status</th>
                  </tr>
              </thead>
              <tbody>
                  {loadingHistory ? (
                      <tr><td colSpan="6" className="no-data">Fetching history...</td></tr>
                  ) : currentHistory.length === 0 ? (
                      <tr><td colSpan="6" className="no-data">No payment history found.</td></tr>
                  ) : (
                      currentHistory.map((record, idx) => {
                          const recordDate = record.paymentDate || record.date || record.createdAt;
                          const recordPkg = record.packageName || record.packageId?.name || "Unknown Package";
                          const recordAmt = record.amount !== undefined ? record.amount : "—";
                          const recordPaymentId = record.paymentId || record.transactionId || "—";
                          const recordStatus = record.status || "completed";

                          return (
                              <tr key={record._id || idx}>
                                  <td>
                                      <span className="date-text">
                                          {recordDate ? new Date(recordDate).toLocaleDateString('en-GB') : "—"}
                                      </span>
                                      { recordDate && (
                                        <div style={{ fontSize: '11px', color: '#666' }}>
                                            {new Date(recordDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </div>
                                      )}
                                  </td>
                                  <td>
                                      <span style={{ fontWeight: 500, color: 'white' }}>
                                          {recordPkg}
                                      </span>
                                  </td>
                                  <td>
                                      <span className="amount-text">
                                          <span className="currency-symbol">₹</span>
                                          {recordAmt}
                                      </span>
                                  </td>
                                  <td>
                                      <span className="detail-value mono" style={{ fontSize: '12px' }}>
                                          {recordPaymentId}
                                      </span>
                                  </td>
                                  <td style={{ textAlign: 'right' }}>
                                      <span className={`status-badge ${recordStatus === 'completed' || recordStatus === 'success' ? 'active' : 'pending'}`}>
                                          {recordStatus}
                                      </span>
                                  </td>
                              </tr>
                          );
                      })
                  )}
              </tbody>
          </table>
      </div>
    </div>
  );
};

export default ResellerClientManagement;
