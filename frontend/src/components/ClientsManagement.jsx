import { useState, useEffect, useContext } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import AddNewClient from "./AddNewClient";
import { TableSkeleton } from "./LoadingSkeleton";
import { SocketContext } from "../context/SocketContext";
import "./ClientDetails.css"; // Import the premium styles

const API = import.meta.env.VITE_API_BASE_URL;
const getToken = () => localStorage.getItem("adminToken") || sessionStorage.getItem("adminToken");
const authHeaders = () => ({ Authorization: `Bearer ${getToken()}` });
const fmt = (d) => d ? new Date(d).toLocaleDateString() : "—";

// Normalize external client fields across different API shapes
const normalize = (client, software) => ({
  _extId:      client._id || client.id,
  name:        client.ownerName || client.name || client.fullName || "—",
  email:       client.email || client.ownerEmail || "—",
  phone:       client.phoneNumber || client.phone || "—",
  softwareName: software.name,
  softwareId:  software._id,
  packageName: client.package?.name || client.packageName || "—",
  paymentStatus: client.packageHistory?.some(h => h.paymentId) ? "completed" : "pending",
  isActive:    client.status === "active",
  createdAt:   client.createdAt,
  _raw:        client,
  _software:   software,
});

const ClientsManagement = ({ initialShowAddForm = false, onFormClose, onViewingDetail, embedded = false, addTrigger = 0 }) => {
  const [allClients, setAllClients] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [softwareList, setSoftwareList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(initialShowAddForm);
  const [detailClient, setDetailClient] = useState(null);
  const [search, setSearch] = useState("");
  const [filterSoftware, setFilterSoftware] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [togglingId, setTogglingId] = useState(null);
  const [deletedEmails, setDeletedEmails] = useState(new Set());

  const socket = useContext(SocketContext);

  useEffect(() => { if (initialShowAddForm) setShowAdd(true); }, [initialShowAddForm]);
  useEffect(() => { if (addTrigger > 0) setShowAdd(true); }, [addTrigger]);

  useEffect(() => {
    onViewingDetail?.(!!detailClient);
  }, [detailClient]);

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
      const res = await axios.get(`${API}/api/software/all`, { headers: authHeaders() });
      const softwares = (res.data.softwares || []).filter(s => s.isActive && s.clientsGetApi);
      setSoftwareList(res.data.softwares || []);
      await fetchAllClients(softwares);
    } catch { toast.error("Failed to load software list"); }
    finally { setLoading(false); }
  };

  const fetchAllClients = async (softwares) => {
    const swList = softwares || softwareList.filter(s => s.isActive && s.clientsGetApi);
    if (!swList.length) { setAllClients([]); return; }

    // Fetch external clients + our local DB records in parallel
    const [externalResults, localRes] = await Promise.all([
      Promise.allSettled(
        swList.map(sw =>
          axios.post(`${API}/api/proxy/external`, { targetUrl: sw.clientsGetApi, method: "GET" }, { headers: authHeaders() })
            .then(res => {
              const data = res.data;
              const list = Array.isArray(data) ? data : (data.clients || data.data || data.admins || []);
              return list.map(c => normalize(c, sw));
            })
            .catch(() => [])
        )
      ),
      axios.get(`${API}/api/software-clients/all`, { headers: authHeaders() }).then(r => r.data.clients || []).catch(() => [])
    ]);

    // Build email → local record map for quick lookup
    const localMap = {};
    const unvisitedLocal = new Set();
    for (const lc of localRes) {
      if (lc.email) {
        const emailKey = lc.email.toLowerCase().trim();
        localMap[emailKey] = lc;
        unvisitedLocal.add(emailKey);
      }
    }

    const merged = externalResults.flatMap(r => r.status === "fulfilled" ? r.value : []).map(c => {
      const emailKey = c.email?.toLowerCase().trim();
      const local = localMap[emailKey];
      if (emailKey) unvisitedLocal.delete(emailKey);

      // TRUTH RECONCILIATION:
      // 1. If either local OR external says 'completed', it's completed.
      // 2. If it's a local online payment, it should be active.
      const localPaymentStatus = local?.paymentStatus === 'cheque_pending' ? 'completed' : local?.paymentStatus;
      const isCompleted = (c.paymentStatus === 'completed' || localPaymentStatus === 'completed');

      return {
        ...c,
        paymentStatus: isCompleted ? 'completed' : 'pending',
        _paymentMethod: local?.paymentMethod || null,
        _localId: local?._id || null,
        _localDetails: local || null,
        isActive: local?._id ? local.isActive : c.isActive,
      };
    });

    // Add local records that aren't on the external software yet
    const localOnly = [];
    unvisitedLocal.forEach(email => {
      const local = localMap[email];
      localOnly.push({
        _extId: null,
        name: local.ownerName || local.businessName || "—",
        email: local.email,
        phone: local.phone,
        softwareName: local.softwareName || "—",
        softwareId: local.softwareId?._id || local.softwareId,
        packageName: local.packageName || "—",
        paymentStatus: local.paymentStatus === 'cheque_pending' ? 'completed' : local.paymentStatus,
        _paymentMethod: local.paymentMethod,
        _localId: local._id,
        _localDetails: local,
        isActive: local.isActive,
        createdAt: local.createdAt,
        _software: swList.find(s => String(s._id) === String(local.softwareId?._id || local.softwareId))
      });
    });

    const finalResults = [...merged, ...localOnly];

    // Deduplicate by email and filter out recently deleted ones
    const seen = new Map();
    for (const c of finalResults) {
      const key = c.email?.toLowerCase();
      if (!key || deletedEmails.has(key)) continue;
      if (!seen.has(key) || c.paymentStatus === 'completed') seen.set(key, c);
    }

    // Final filter: only show clients that have a valid software assignment in this specific list
    const finalFiltered = [...seen.values()].filter(c => c.softwareId);
    setAllClients(finalFiltered);
  };

  const applyFilters = () => {
    let list = [...allClients];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.name?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q)
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
      }
    });
    if (!result.isConfirmed) return;

    const sw = client._software;
    // Block only if: no local record AND no external toggle API AND no external ID
    if (!client._localId && (!sw?.clientToggleStatusApi || !client._extId)) {
      return toast.error("Toggle status API not configured for this software");
    }

    // Use localId for UI tracking, or extId if it's external-only
    const uiId = client._localId || client._extId;
    setTogglingId(uiId);
    
    try {
      let res;
      if (client._localId) {
        res = await axios.patch(`${API}/api/software-clients/toggle-status/${client._localId}`, {}, { headers: authHeaders() });
      } else {
        // External-only toggle
        res = await axios.patch(`${API}/api/software-clients/external/${client.softwareId}/${client._extId}/toggle-status`, 
          { status: action === "activate" ? "active" : "inactive" }, 
          { headers: authHeaders() }
        );
      }

      if (res.data?.success) {
        toast.success(`Client ${action}d successfully`);
        await fetchAllClients();
      } else {
        toast.error(res.data?.message || "Toggle failed");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to toggle status");
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeleteClient = async (client) => {
    const result = await Swal.fire({
      title: "Delete Client?",
      icon: "warning",
      iconColor: "#ff3b30",
      html: `
        <div style="margin-top: 8px; color: #fff;">
          <p style="margin-bottom: 16px; font-size: 16px; opacity: 0.9;">
            Are you sure you want to delete <strong>"${client.name}"</strong>?
          </p>
          <div style="background: rgba(255, 59, 48, 0.1); border: 1px solid rgba(255, 59, 48, 0.2); border-radius: 8px; padding: 12px; color: #ff3b30; font-size: 13px; line-height: 1.5; text-align: left;">
             <strong>Caution:</strong> This will permanently remove the client from both <strong>Master Admin</strong> and the <strong>${client.softwareName}</strong> external system. This action cannot be undone.
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonColor: "#00c8ff",
      cancelButtonColor: "rgba(255,255,255,0.05)",
      confirmButtonText: "Yes, Delete Permanently",
      cancelButtonText: "Cancel",
      background: "#0f172a",
      color: "#fff",
      customClass: {
        popup: "premium-swal-popup",
        confirmButton: "premium-swal-confirm-danger",
        cancelButton: "premium-swal-cancel",
      }
    });

    if (!result.isConfirmed) return;

    const targetId = client._localId;
    const softwareId = client.softwareId;
    const extId = client._extId;

    try {
      let res;
      if (targetId) {
        // Normal delete (Local record exists)
        res = await axios.delete(`${API}/api/software-clients/${targetId}`, { headers: authHeaders() });
      } else if (softwareId && extId) {
        // External-only delete (No local record, but we have software/ext info)
        res = await axios.delete(`${API}/api/software-clients/external/${softwareId}/${extId}`, { headers: authHeaders() });
      } else {
        return toast.error("Cannot delete: Missing identification data for this client.");
      }

      if (res.data.success) {
        if (client.email) {
          setDeletedEmails(prev => new Set([...prev, client.email.toLowerCase().trim()]));
        }
        toast.success(res.data.message || "Client removed successfully");
        await fetchAllClients();
      } else {
        toast.error(res.data.message || "Failed to delete client");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Error deleting client");
    }
  };

  if (detailClient) {
    return <ClientDetailView client={detailClient} onBack={() => setDetailClient(null)} />;
  }

  return (
    <div>
      {!embedded && (
        <div className="page-header">
          <h1 className="page-title">Software Clients</h1>
          <button className="btn-primary" onClick={() => setShowAdd(true)}>+ Add New Client</button>
        </div>
      )}

      {showAdd && (
        <AddNewClient
          onClose={() => { setShowAdd(false); if (onFormClose) onFormClose(); }}
          onSuccess={() => { setShowAdd(false); if (onFormClose) onFormClose(); fetchAllClients(); }}
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
            {softwareList.filter(s => s.isActive).map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
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

      {loading ? <TableSkeleton rows={5} columns={7} /> : (
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
                <tr><td colSpan="8" className="no-data">No clients found.</td></tr>
              ) : filtered.map((c, i) => {
                const local = c._localDetails || {};
                let addedByLabel = "External";
                
                if (local._id) {
                    if (local.createdByAdmin) {
                        addedByLabel = "Admin";
                    } else if (local.createdByAdminEmployee) {
                        addedByLabel = `Staff: ${local.createdByAdminEmployee.name || "Unknown"}`;
                    } else if (local.createdByReseller && local.createdByReseller.name) {
                        addedByLabel = `Partner: ${local.createdByReseller.name}`;
                    } else if (local.createdByResellerEmployee && local.createdByResellerEmployee.name) {
                        addedByLabel = `Team: ${local.createdByResellerEmployee.name}`;
                    } else {
                        // If there's an external ID and no specific human creator, it's external
                        addedByLabel = c._extId ? "External" : "Admin";
                    }
                } else if (c._extId) {
                    addedByLabel = "External";
                }

                return (
                <tr key={`${c.softwareId}-${c._extId || (local?._id) || i}`}>
                  <td style={{ cursor: 'pointer', color: '#00c8ff', fontWeight: 600 }}
                    onClick={() => setDetailClient(c)}>{c.name}</td>
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
                      {c.paymentStatus === 'completed' && c._paymentMethod === 'cheque'
                        ? 'cheque received'
                        : c.paymentStatus}
                    </span>
                  </td>
                  <td>
                    {togglingId && togglingId === (c._localId || c._extId) ? (
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>...</span>
                    ) : (
                      <label className="toggle-switch">
                        <input type="checkbox" checked={c.isActive}
                          disabled={togglingId === null && !c._software?.clientToggleStatusApi}
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
                    <button className="btn-icon delete-btn" onClick={() => handleDeleteClient(c)} title="Delete Client" style={{ marginLeft: '8px', color: '#ff3b30' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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

// ── Detail View ───────────────────────────────────────────────────────────────
const ClientDetailView = ({ client: c, onBack }) => {
  const raw = c._raw || {};
  const [localData, setLocalData] = useState(c._localDetails || {});
  
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    const id = c._localDetails?._id || c._localId;
    if (id) fetchLocalRecord(id);
  }, []);

  const fetchLocalRecord = async (id) => {
    setLoadingHistory(true);
    try {
      const res = await axios.get(`${API}/api/software-clients/${id}`, { headers: authHeaders() });
      if (res.data.success) {
        setLocalData(res.data.client);
      }
    } catch (err) {
      console.error("Failed to fetch software client record:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const currentHistory = [];

  // Build payment history from the local record fields
  if (localData._id && (localData.transactionId || localData.paymentDate || localData.paymentStatus === 'completed' || localData.paymentStatus === 'cheque_pending')) {
    currentHistory.push({
      paymentDate: localData.paymentDate || localData.packageStartDate || localData.createdAt,
      packageId: { name: localData.packageName || raw.package?.name || c.packageName },
      amount: localData.paymentAmount ?? (raw.package?.price ?? "—"),
      paymentId: localData.transactionId || raw.transactionId || "—",
      status: localData.paymentStatus === 'cheque_pending' ? 'completed' : (localData.paymentStatus || 'completed'),
    });
  }

  const getExpiryStatus = (dateString) => {
      if (!dateString) return 'neutral';
      const expiry = new Date(dateString);
      const now = new Date();
      const diffTime = expiry - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) return 'expired';
      if (diffDays <= 7) return 'warning';
      return 'active';
  };

  const expiryStatus = getExpiryStatus(localData.packageEndDate || raw.packageEndDate);

  return (
    <div className="client-details-page">
      {/* Header */}
      <div className="page-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button className="btn-secondary" onClick={onBack}>
                  ← Back to List
              </button>
              <h1 className="page-title" style={{ fontSize: '24px', margin: 0 }}>
                  {c.name}
              </h1>
          </div>
          <div className="header-actions">
          </div>
      </div>

      {/* Client Profile Card */}
      <div className="pro-card">
          <div className="details-grid">
              {/* Column 1: Contact Info */}
              <div className="detail-group">
                  <label className="detail-label">Client Details</label>
                  <div className="detail-value highlight">{c.name}</div>
                  <div className="detail-value" style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                      {c.email}
                  </div>
                  <div className="detail-value" style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                      {c.phone}
                  </div>
                  <div className="detail-value" style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '8px' }}>
                      Created: <span style={{ color: 'var(--text-secondary)' }}>{fmt(c.createdAt)}</span>
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
                  <div className={`detail-value ${expiryStatus === 'expired' ? 'text-red-500' : (expiryStatus === 'warning' ? 'text-orange-500' : 'text-green-500')}`}>
                        {(localData.packageEndDate || raw.packageEndDate)
                          ? `Expires ${new Date(localData.packageEndDate || raw.packageEndDate).toLocaleDateString('en-GB')}` 
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
                      {/* <th style={{ width: '15%' }}>Order ID</th> */}
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
                          const recordOrderId = record.orderId || "—";
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
                                  {/* <td>
                                      <span className="duration-text" style={{ fontSize: '12px' }}>
                                          {recordOrderId}
                                      </span>
                                  </td> */}
                                  <td>
                                      <span className="detail-value mono" style={{ fontSize: '12px' }}>
                                          {recordPaymentId}
                                      </span>
                                  </td>
                                  <td style={{ textAlign: 'right' }}>
                                      <span className={`status-badge ${recordStatus}`}>
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

export { ClientDetailView };
export default ClientsManagement;
