import { useState, useEffect, useContext } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import toast from "react-hot-toast";
import AddClient from "./AddClient";
import AddNewClient from "./AddNewClient";
import EditClient from "./EditClient";
import ClientDetails from "./ClientDetails";
import ClientsManagement, { ClientDetailView } from "./ClientsManagement";
import { TableSkeleton } from "./LoadingSkeleton";
import { SocketContext } from "../context/SocketContext";

const API = import.meta.env.VITE_API_BASE_URL;
const getToken = () => localStorage.getItem("adminToken") || sessionStorage.getItem("adminToken");
const authHeaders = () => ({ Authorization: `Bearer ${getToken()}` });

// Normalize external software client fields
const normalizeSw = (client, software) => ({
  _type: 'software',
  _id: `sw_${software._id}_${client._id || client.id}`,
  _extId: client._id || client.id,
  _localId: null,
  _raw: client,
  _localDetails: null,
  clientName: client.ownerName || client.name || client.fullName || "—",
  clientEmail: client.email || client.ownerEmail || "—",
  clientPhone: client.phoneNumber || client.phone || "—",
  softwareName: software.name,
  softwareId: software._id,
  packageName: client.package?.name || client.packageName || "—",
  paymentStatus: client.packageHistory?.some(h => h.paymentId) ? "completed" : "pending",
  isActive: client.status === "active",
  createdAt: client.createdAt,
});

const ClientManagement = ({ initialShowAddForm = false, onFormClose }) => {
  const [clientList, setClientList] = useState([]);
  const [softwareClients, setSoftwareClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [showAddForm, setShowAddForm] = useState(initialShowAddForm);
  const [addClientType, setAddClientType] = useState(null); // null | 'service' | 'software' — type selector
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedSwClient, setSelectedSwClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSoftware, setSelectedSoftware] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterType, setFilterType] = useState(""); // '' | 'service' | 'software'
  const [softwareList, setSoftwareList] = useState([]);
  const [serviceList, setServiceList] = useState([]);
  const [activeTab, setActiveTab] = useState("total"); // 'total' | 'service' | 'software'
  const [swViewingDetail, setSwViewingDetail] = useState(false);
  const [swAddTrigger, setSwAddTrigger] = useState(0);

  useEffect(() => {
    if (initialShowAddForm) {
      setShowAddForm(true);
    }
  }, [initialShowAddForm]);

  const socket = useContext(SocketContext);

  useEffect(() => {
    if (!socket) return;

    const handleClientChange = (data) => {
        fetchClients();
    };
    const handleSwChange = () => fetchSoftwareClients();

    socket.on("client_data_change", handleClientChange);
    socket.on("software_client_change", handleSwChange);

    return () => {
        socket.off("client_data_change", handleClientChange);
        socket.off("software_client_change", handleSwChange);
    };
  }, [socket]);

  useEffect(() => {
    fetchClients();
    fetchSoftware();
    fetchServices();
    fetchSoftwareClients();
  }, []);

  // Re-fetch when returning from add form
  useEffect(() => {
    if (addClientType === null) {
      fetchClients();
      fetchSoftwareClients();
    }
  }, [addClientType]);

  useEffect(() => {
    filterClients();
  }, [clientList, softwareClients, searchTerm, selectedSoftware, selectedService, dateFrom, dateTo, filterType, activeTab]);

  const fetchSoftware = async () => {
    try {
      const token = localStorage.getItem("adminToken") || sessionStorage.getItem("adminToken");
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/software/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setSoftwareList(response.data.softwareList);
      }
    } catch (err) {
      console.error("Error fetching software:", err);
    }
  };

  const fetchServices = async () => {
    try {
        const token = localStorage.getItem("adminToken");
        const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/service/all`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if(res.data.success) {
            setServiceList(res.data.services);
        }
    } catch (error) {
        console.error("Fetch services error", error);
    }
  };

  const fetchSoftwareClients = async () => {
    try {
      const swRes = await axios.get(`${API}/api/software/all`, { headers: authHeaders() });
      const swList = (swRes.data.softwares || []).filter(s => s.isActive && s.clientsGetApi);
      if (!swList.length) { setSoftwareClients([]); return; }

      const [externalResults, localRes] = await Promise.all([
        Promise.allSettled(
          swList.map(sw =>
            axios.post(`${API}/api/proxy/external`, { targetUrl: sw.clientsGetApi, method: "GET" }, { headers: authHeaders() })
              .then(res => {
                const data = res.data;
                const list = Array.isArray(data) ? data : (data.clients || data.data || data.admins || data.tenants || []);
                return list.map(c => normalizeSw(c, sw));
              })
              .catch(() => [])
          )
        ),
        axios.get(`${API}/api/software-clients/all`, { headers: authHeaders() })
          .then(r => r.data.clients || []).catch(() => [])
      ]);

      // Merge external + local-only software clients
      const external = externalResults.flatMap(r => r.status === "fulfilled" ? r.value : []);
      const externalEmails = new Set(external.map(c => c.clientEmail?.toLowerCase().trim()).filter(Boolean));

      // Build email → local record map
      const localMap = {};
      for (const l of localRes) {
        if (l.email) localMap[l.email.toLowerCase().trim()] = l;
      }

      // Attach _localId to external records
      const externalMerged = external.map(c => {
        const emailKey = c.clientEmail?.toLowerCase().trim();
        const local = emailKey ? localMap[emailKey] : null;
        return {
          ...c,
          _localId: local?._id || null,
          _localDetails: local || null,
          isActive: local ? local.isActive : c.isActive,
          paymentStatus: (c.paymentStatus === 'completed' || local?.paymentStatus === 'completed') ? 'completed' : 'pending',
        };
      });

      setSoftwareClients(externalMerged);
    } catch (err) {
      console.error("Failed to fetch software clients", err);
    }
  };

  const filterClients = () => {
    let filtered;

    if (activeTab === 'total') {
      // Combine service clients + software clients, tag each with _type
      const serviceTagged = clientList.map(c => ({ ...c, _type: c.clientType || 'service' }));
      filtered = [...serviceTagged, ...softwareClients];
    } else if (activeTab === 'service') {
      filtered = clientList.filter(c => (c.clientType || 'software') === 'service');
    } else {
      filtered = [];
    }

    // Filter by search term
    if (searchTerm.trim() !== "") {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(client =>
        (client.clientName || "").toLowerCase().includes(searchLower) ||
        (client.clientEmail || "").toLowerCase().includes(searchLower) ||
        (client.clientPhone || "").toLowerCase().includes(searchLower) ||
        (client.softwareName && client.softwareName.toLowerCase().includes(searchLower)) ||
        (client.softwareId?.name && client.softwareId.name.toLowerCase().includes(searchLower)) ||
        (client.serviceIds && client.serviceIds.some(s => s.name.toLowerCase().includes(searchLower)))
      );
    }

    // Filter by service (only relevant for service clients)
    if (selectedService !== "") {
      filtered = filtered.filter(client =>
        client.serviceIds?.some(s => s._id === selectedService)
      );
    }

    // Filter by date range
    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      filtered = filtered.filter(c => c.createdAt && new Date(c.createdAt) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      filtered = filtered.filter(c => c.createdAt && new Date(c.createdAt) <= to);
    }

    // Filter by client type (only on total tab)
    if (activeTab === 'total' && filterType) {
      filtered = filtered.filter(c => c._type === filterType);
    }

    setFilteredClients(filtered);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleSoftwareFilterChange = (e) => {
    setSelectedSoftware(e.target.value);
  };

  const handleServiceFilterChange = (e) => {
      setSelectedService(e.target.value);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedSoftware("");
    setSelectedService("");
    setDateFrom("");
    setDateTo("");
    setFilterType("");
  };

  const exportCSV = () => {
    const headers = ["Name", "Email", "Phone", "Type", "Service / Software", "Status", "Created At"];
    const rows = filteredClients.map(c => {
      const isSw = c._type === 'software';
      const serviceOrSoftware = isSw
        ? (c.softwareName || "—")
        : (c.serviceIds?.length > 0 ? c.serviceIds.map(s => s.name).join("; ") : "No Services");
      return [
        c.clientName || "—",
        c.clientEmail || "—",
        c.clientPhone || "—",
        isSw ? "Software" : "Service",
        serviceOrSoftware,
        c.isActive ? "Active" : "Inactive",
        c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "—",
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(",");
    });
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clients_${activeTab}_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const fetchClients = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("adminToken") || sessionStorage.getItem("adminToken");
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/client/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setClientList(response.data.clients);
        // filterClients will run via useEffect
        
        // Log summary for debugging
        if (response.data.summary) {
          console.log("Client Summary:", response.data.summary);
        }
      }
    } catch (err) {
      console.error("Error fetching clients:", err);
      toast.error("Failed to load clients");
    } finally {
      setLoading(false);
    }
  };

  const handleAddSuccess = (message) => {
    toast.success(message);
    setShowAddForm(false);
    if (onFormClose) onFormClose();
    fetchClients();
  };



  const handleToggleStatus = async (id, currentStatus, clientName) => {
    const action = currentStatus ? "deactivate" : "activate";
    const result = await Swal.fire({
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} Client?`,
      html: `Are you sure you want to ${action} <strong>"${clientName}"</strong>?`,
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

    if (!result.isConfirmed) {
      return;
    }

    try {
      const token = localStorage.getItem("adminToken") || sessionStorage.getItem("adminToken");
      const response = await axios.patch(
        `${import.meta.env.VITE_API_BASE_URL}/api/client/toggle-status/${id}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        await Swal.fire({
          title: "Success!",
          text: `Client has been ${action}d successfully.`,
          icon: "success",
          confirmButtonColor: "#00c8ff",
          timer: 2000,
          showConfirmButton: false,
          background: "#0f172a",
          color: "#fff",
          customClass: {
            popup: "premium-swal-popup"
          }
        });
        fetchClients();
      }
    } catch (err) {
      Swal.fire({
        title: "Error!",
        text: err.response?.data?.message || "Failed to toggle client status",
        icon: "error",
        confirmButtonColor: "#00c8ff",
        background: "#0f172a",
        color: "#ffffff",
        customClass: {
            popup: "premium-swal-popup"
        }
      });
    }
  };

  const handleToggleSoftwareClient = async (client) => {
    const action = client.isActive ? "deactivate" : "activate";
    try {
      let res;
      if (client._localId) {
        res = await axios.patch(`${API}/api/software-clients/toggle-status/${client._localId}`, {}, { headers: authHeaders() });
      } else if (client.softwareId && client._extId) {
        res = await axios.patch(
          `${API}/api/software-clients/external/${client.softwareId}/${client._extId}/toggle-status`,
          { status: action === "activate" ? "active" : "inactive" },
          { headers: authHeaders() }
        );
      } else {
        toast.error("Cannot toggle: missing client identification");
        return;
      }
      if (res.data?.success) {
        toast.success(`Client ${action}d successfully`);
        await fetchSoftwareClients();
      } else {
        toast.error(res.data?.message || "Toggle failed");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to toggle status");
    }
  };

  const handleDeleteExternal = async (client) => {
    const result = await Swal.fire({
      title: "Delete External Client?",
      html: `
        <div style="text-align: left;">
          <p>You are about to delete <strong>"${client.clientName}"</strong> from <strong>${client.softwareId?.name}</strong>.</p>
          <p><strong>⚠️ Important:</strong></p>
          <ul style="margin-left: 20px;">
            <li>This will delete the client from the external software</li>
            <li>The client will no longer be able to login</li>
            <li>This action cannot be undone</li>
          </ul>
        </div>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "rgba(255,255,255,0.05)",
      confirmButtonText: "Yes, delete from external software!",
      cancelButtonText: "Cancel",
      background: "#0f172a",
      color: "#fff",
      customClass: {
        popup: "premium-swal-popup",
        confirmButton: "premium-swal-confirm-danger",
        cancelButton: "premium-swal-cancel",
      },
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      const token = localStorage.getItem("adminToken") || sessionStorage.getItem("adminToken");
      
      // Create a payload for external client deletion
      const deletePayload = {
        clientEmail: client.clientEmail,
        softwareId: client.softwareId._id,
        externalId: client.externalId,
        isExternal: true
      };

      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/client/delete-external`,
        deletePayload,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        await Swal.fire({
          title: "Deleted!",
          text: "External client has been deleted successfully.",
          icon: "success",
          confirmButtonColor: "#00c8ff",
          timer: 2000,
          showConfirmButton: false,
          background: "#0f172a",
          color: "#fff",
          customClass: {
            popup: "premium-swal-popup"
          }
        });
        fetchClients();
      }
    } catch (err) {
      Swal.fire({
        title: "Error!",
        text: err.response?.data?.message || "Failed to delete external client",
        icon: "error",
        confirmButtonColor: "#00c8ff",
        background: "#0f172a",
        color: "#ffffff",
        customClass: {
          popup: "premium-swal-popup"
        }
      });
    }
  };

  const handleDelete = async (id, name) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      html: `You are about to delete client <strong>"${name}"</strong>.<br/>This action cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#00c8ff",
      cancelButtonColor: "rgba(255,255,255,0.05)",
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
      background: "#0f172a",
      color: "#fff",
      customClass: {
        popup: "premium-swal-popup",
        confirmButton: "premium-swal-confirm",
        cancelButton: "premium-swal-cancel",
      },
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      const token = localStorage.getItem("adminToken") || sessionStorage.getItem("adminToken");
      const response = await axios.delete(
        `${import.meta.env.VITE_API_BASE_URL}/api/client/delete/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        await Swal.fire({
          title: "Deleted!",
          text: "Client has been deleted successfully.",
          icon: "success",
          confirmButtonColor: "#00c8ff",
          timer: 2000,
          showConfirmButton: false,
          background: "#0f172a",
          color: "#fff",
          customClass: {
            popup: "premium-swal-popup"
          }
        });
        fetchClients();
      }
    } catch (err) {
      Swal.fire({
        title: "Error!",
        text: err.response?.data?.message || "Failed to delete client",
        icon: "error",
        confirmButtonColor: "#00c8ff",
        background: "#0f172a",
        color: "#ffffff",
        customClass: {
          popup: "premium-swal-popup"
        }
      });
    }
  };



  if (addClientType === 'service' || showAddForm) {
    return (
      <AddClient
        onBack={() => { setAddClientType(null); setShowAddForm(false); if (onFormClose) onFormClose(); }}
        onSuccess={(msg) => { toast.success(msg); setAddClientType(null); setShowAddForm(false); if (onFormClose) onFormClose(); fetchClients(); }}
      />
    );
  }

  if (addClientType === 'software') {
    return (
      <AddNewClient
        onClose={() => { setAddClientType(null); if (onFormClose) onFormClose(); }}
        onSuccess={() => { setAddClientType(null); if (onFormClose) onFormClose(); fetchSoftwareClients(); }}
      />
    );
  }

  if (selectedClient) {
    return (
        <ClientDetails 
            client={selectedClient} 
            onBack={() => setSelectedClient(null)} 
        />
    );
  }

  if (selectedSwClient) {
    return <ClientDetailView client={selectedSwClient} onBack={() => setSelectedSwClient(null)} />;
  }

  return (
    <div>
      {/* Type selector modal */}
      {addClientType === 'select' && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px', padding: '36px', width: '420px', maxWidth: '90vw'
          }}>
            <h2 style={{ margin: '0 0 8px', fontSize: '20px', color: '#fff' }}>Add New Client</h2>
            <p style={{ margin: '0 0 28px', color: 'var(--text-secondary)', fontSize: '14px' }}>
              What type of client do you want to add?
            </p>
            <div style={{ display: 'flex', gap: '16px' }}>
              <button onClick={() => setAddClientType('service')} style={{
                flex: 1, padding: '20px 16px', borderRadius: '12px', cursor: 'pointer',
                background: 'rgba(0,200,255,0.08)', border: '1px solid rgba(0,200,255,0.25)',
                color: '#fff', textAlign: 'center', transition: 'all 0.2s'
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,200,255,0.15)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,200,255,0.08)'}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00c8ff" strokeWidth="1.5" style={{marginBottom:'8px'}}><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                <div style={{ fontWeight: 700, fontSize: '15px', color: '#00c8ff' }}>Service</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>SMS, packages & services</div>
              </button>
              <button onClick={() => setAddClientType('software')} style={{
                flex: 1, padding: '20px 16px', borderRadius: '12px', cursor: 'pointer',
                background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.25)',
                color: '#fff', textAlign: 'center', transition: 'all 0.2s'
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(139,92,246,0.15)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(139,92,246,0.08)'}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="1.5" style={{marginBottom:'8px'}}><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
                <div style={{ fontWeight: 700, fontSize: '15px', color: '#8b5cf6' }}>Software</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>External software clients</div>
              </button>
            </div>
            <button onClick={() => setAddClientType(null)} style={{
              marginTop: '20px', width: '100%', padding: '10px', borderRadius: '8px',
              background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
              color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '14px'
            }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {!swViewingDetail && (
      <>
      <div className="page-header">
        <h1 className="page-title">Client Management</h1>
        <button className="btn-primary" onClick={() => setAddClientType('select')}>
          + Add New Client
        </button>
      </div>

      {/* Toggle Tabs */}
      <div className="tabs-container" style={{ display: 'flex', gap: '1rem', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '0' }}>
            <button 
                className={`tab-btn ${activeTab === 'total' ? 'active' : ''}`}
                onClick={() => setActiveTab('total')}
                style={{
                    background: 'transparent',
                    border: 'none',
                    borderBottom: activeTab === 'total' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                    color: activeTab === 'total' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    padding: '10px 20px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '16px',
                    transition: 'all 0.3s ease'
                }}
            >
                Total Clients
            </button>
            <button 
                className={`tab-btn ${activeTab === 'service' ? 'active' : ''}`}
                onClick={() => setActiveTab('service')}
                style={{
                    background: 'transparent',
                    border: 'none',
                    borderBottom: activeTab === 'service' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                    color: activeTab === 'service' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    padding: '10px 20px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '16px',
                    transition: 'all 0.3s ease'
                }}
            >
                Service
            </button>
            <button 
                className={`tab-btn ${activeTab === 'software' ? 'active' : ''}`}
                onClick={() => setActiveTab('software')}
                style={{
                    background: 'transparent',
                    border: 'none',
                    borderBottom: activeTab === 'software' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                    color: activeTab === 'software' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    padding: '10px 20px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '16px',
                    transition: 'all 0.3s ease'
                }}
            >
                Software
            </button>
      </div>
      </>
      )}

      {/* Software tab renders its own component */}
      {activeTab === 'software' && (
        <ClientsManagement embedded onViewingDetail={setSwViewingDetail} addTrigger={swAddTrigger} />
      )}

      {/* Search and Filter Section */}
      {activeTab !== 'software' && (
      <>
      <div className="search-filter-section">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by name, email, phone..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="search-input"
          />
          <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
            <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2"/>
          </svg>
        </div>
        
        <div className="filter-section">
          <select
              value={selectedService}
              onChange={handleServiceFilterChange}
              className="filter-select"
          >
              <option value="">All Services</option>
              {serviceList.map((service) => (
              <option key={service._id} value={service._id}>
                  {service.name}
              </option>
              ))}
          </select>

          {activeTab === 'total' && (
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="filter-select"
            >
              <option value="">All Types</option>
              <option value="service">Service</option>
              <option value="software">Software</option>
            </select>
          )}

          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            style={{ padding: '10px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px', colorScheme: 'dark', cursor: 'pointer' }}
            title="From date"
          />
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            style={{ padding: '10px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px', colorScheme: 'dark', cursor: 'pointer' }}
            title="To date"
          />

          {(searchTerm || selectedSoftware || selectedService || dateFrom || dateTo || filterType) && (
            <button onClick={clearFilters} className="clear-filters-btn">
              Clear Filters
            </button>
          )}

          <button
            onClick={exportCSV}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
            title="Export filtered data as CSV"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export CSV
          </button>
        </div>
      </div>

      {/* Results Summary */}
      {(searchTerm || selectedSoftware || selectedService || dateFrom || dateTo || filterType) && (
        <div className="results-summary">
          Showing {filteredClients.length} of {activeTab === 'total' ? clientList.length : clientList.filter(c => (c.clientType || 'software') === activeTab).length} clients
          {searchTerm && <span> matching "{searchTerm}"</span>}
          {selectedService && (
            <span> with service {serviceList.find(s => s._id === selectedService)?.name}</span>
          )}
        </div>
      )}

      {loading ? (
        <TableSkeleton rows={5} columns={7} />
      ) : (
        <>
          <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Type</th>
              <th>Service / Software</th>
              <th>Status</th>
              <th>Created At</th>
              {activeTab !== 'total' && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filteredClients.length === 0 ? (
              <tr>
                <td colSpan="8" className="no-data">
                  No clients found.
                </td>
              </tr>
            ) : (
              filteredClients.map((client) => {
                const isSw = client._type === 'software';
                return (
                <tr key={client._id}>
                  <td
                    className="font-semibold"
                    style={{ cursor: 'pointer', color: isSw ? '#8b5cf6' : '#00c8ff' }}
                    onClick={() => isSw ? setSelectedSwClient({
                      ...client,
                      name: client.clientName,
                      email: client.clientEmail,
                      phone: client.clientPhone,
                    }) : setSelectedClient(client)}
                  >
                    {client.clientName}
                  </td>
                  <td>{client.clientEmail}</td>
                  <td>{client.clientPhone}</td>
                  <td>
                    <span style={{
                      display: 'inline-block', padding: '3px 10px', borderRadius: '50px',
                      fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
                      background: isSw ? 'rgba(139, 92, 246, 0.1)' : 'rgba(0, 200, 255, 0.1)',
                      color: isSw ? '#8b5cf6' : '#00c8ff',
                      border: `1px solid ${isSw ? 'rgba(139,92,246,0.2)' : 'rgba(0,200,255,0.2)'}`
                    }}>
                      {isSw ? 'Software' : 'Service'}
                    </span>
                  </td>
                  <td>
                    {isSw ? (
                      client.softwareName || "—"
                    ) : (
                      client.serviceIds && client.serviceIds.length > 0
                        ? <div title={client.serviceIds.map(s => s.name).join(', ')}>
                            {client.serviceIds.length === 1 ? client.serviceIds[0].name : `${client.serviceIds.length} Services`}
                          </div>
                        : "No Services"
                    )}
                  </td>
                  <td>
                    {isSw ? (
                      <label className="toggle-switch">
                        <input type="checkbox" checked={client.isActive}
                          onChange={() => handleToggleSoftwareClient(client)} />
                        <span className="toggle-slider"></span>
                      </label>
                    ) : (
                      <label className="toggle-switch">
                        <input type="checkbox" checked={client.isActive}
                          onChange={() => handleToggleStatus(client._id, client.isActive, client.clientName)} />
                        <span className="toggle-slider"></span>
                      </label>
                    )}
                  </td>
                  <td>{client.createdAt ? new Date(client.createdAt).toLocaleDateString() : "—"}</td>
                  {activeTab !== 'total' && (
                    <td>
                      <button className="btn-icon btn-delete"
                        onClick={() => client.source === 'external' ? handleDeleteExternal(client) : handleDelete(client._id, client.clientName)}
                        title="Delete">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <line x1="10" y1="11" x2="10" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <line x1="14" y1="11" x2="14" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </td>
                  )}
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
        </>
      )}
      </>
      )}
    </div>
  );
};

export default ClientManagement;
