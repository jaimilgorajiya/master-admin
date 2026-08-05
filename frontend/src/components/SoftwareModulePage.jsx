import { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import AddExternalPackage from "./AddExternalPackage";
import AddNewClient from "./AddNewClient";
import Swal from "sweetalert2";

const SoftwareModulePage = ({ software }) => {
  const [clients, setClients] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [loadingPackages, setLoadingPackages] = useState(true);
  const [clientError, setClientError] = useState(false);
  const [packageError, setPackageError] = useState(false);
  const [showAddPackage, setShowAddPackage] = useState(false);
  const [showAddClient, setShowAddClient] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  const [showDevApis, setShowDevApis] = useState(false);

  useEffect(() => {
    fetchExternalData();
  }, [software]);

  const fetchExternalData = async () => {
    setLoadingClients(true);
    setLoadingPackages(true);
    setClientError(false);
    setPackageError(false);

    const token = localStorage.getItem("adminToken") || sessionStorage.getItem("adminToken");

    // Fetch Clients (External + Local Merge)
    try {
      const [extRes, localRes] = await Promise.all([
        software.clientsGetApi ? axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/proxy/external`, {
          targetUrl: software.clientsGetApi,
          method: "GET"
        }, { headers: { Authorization: `Bearer ${token}` } }).catch(err => {
          console.warn("External client API failed or requires auth:", err.message);
          return null;
        }) : Promise.resolve(null),
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/software-clients/all`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: { clients: [] } }))
      ]);
      
      const allLocalClients = localRes.data?.clients || [];
      const localClients = allLocalClients.filter(lc => {
        const swId = lc.softwareId?._id || lc.softwareId;
        const swName = lc.softwareId?.name || lc.softwareName;
        return (swId && String(swId) === String(software._id)) || 
               (swName && swName.toLowerCase() === software.name.toLowerCase());
      });
      
      // Aggressive search for array in external response
      let extData = extRes?.data?.clients || extRes?.data?.data || extRes?.data?.results || (Array.isArray(extRes?.data) ? extRes.data : null);
      if (!extData && extRes?.data && typeof extRes.data === 'object') {
          const firstArray = Object.values(extRes.data).find(val => Array.isArray(val));
          if (firstArray) extData = firstArray;
      }

      const extList = Array.isArray(extData) ? extData : [];
      const mergedMap = new Map();

      extList.forEach(ext => {
        const key = (ext.email || ext.ownerEmail || ext.clientEmail || ext._id || Math.random()).toLowerCase().trim();
        const local = localClients.find(lc => 
            lc.email?.toLowerCase().trim() === (ext.email || ext.ownerEmail || ext.clientEmail || "").toLowerCase().trim()
        );
        mergedMap.set(key, {
          ...ext,
          packageName: local?.packageName || ext.packageName || (typeof ext.package === 'string' ? ext.package : ext.package?.name) || ext.planName || ext.plan?.name,
          isActive: local ? local.isActive : (ext.status === 'active' || ext.isActive === true),
        });
      });

      localClients.forEach(lc => {
        const key = (lc.email || lc._id).toLowerCase().trim();
        if (!mergedMap.has(key)) {
          mergedMap.set(key, {
            _id: lc._id,
            businessName: lc.businessName,
            ownerName: lc.ownerName,
            email: lc.email,
            phoneNumber: lc.phone,
            packageName: lc.packageName,
            isActive: lc.isActive,
            packageStartDate: lc.packageStartDate,
            packageEndDate: lc.packageEndDate,
            paymentStatus: lc.paymentStatus
          });
        }
      });

      const mergedList = Array.from(mergedMap.values());
      setClients(mergedList);

      if (!extRes && mergedList.length === 0) {
        setClientError(true);
      }
    } catch (err) {
      console.error("Error fetching clients:", err);
      setClientError(true);
    } finally {
      setLoadingClients(false);
    }

    // Fetch Packages via Proxy
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/proxy/external`, {
        targetUrl: software.packageGetApi,
        method: "GET"
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      let packageData = res.data.packages || res.data.data || res.data.results || (Array.isArray(res.data) ? res.data : null);
      if (!packageData && typeof res.data === 'object') {
          const firstArray = Object.values(res.data).find(val => Array.isArray(val));
          if (firstArray) packageData = firstArray;
      }

      setPackages(Array.isArray(packageData) ? packageData : []);
    } catch (err) {
      console.error("Error fetching external packages:", err);
      setPackageError(true);
    } finally {
      setLoadingPackages(false);
    }
  };

  const testApi = async (url, method = 'GET') => {
    if (!url) return toast.error("API endpoint not defined in registry");
    const testUrl = url.includes(':id') ? url.replace(':id', 'test-id') : url;
    const toastId = toast.loading(`Testing ${method} connection (via Proxy)...`);
    try {
      const token = localStorage.getItem("adminToken") || sessionStorage.getItem("adminToken");
      const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/proxy/external`, {
        targetUrl: testUrl, method
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      if (res.status >= 200 && res.status < 300) {
        toast.success(`Success! Connected to endpoint.`, { id: toastId });
      } else {
        toast.error(`Reached but returned status: ${res.status}`, { id: toastId });
      }
    } catch (err) {
      console.error("Connectivity check fail:", err);
      toast.error(err.response?.data?.message || "Connection Failed", { id: toastId });
    }
  };

  const handleDeletePackage = async (packageId) => {
    const result = await Swal.fire({
      title: "Delete Package?",
      text: "This will remove the plan from the external software. This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#00c8ff",
      cancelButtonColor: "rgba(255,255,255,0.05)",
      confirmButtonText: "Yes, Delete It",
      cancelButtonText: "Cancel",
      background: "#0f172a",
      color: "#fff",
      customClass: {
        popup: "premium-swal-popup",
        confirmButton: "premium-swal-confirm-danger",
        cancelButton: "premium-swal-cancel",
      }
    });

    if (result.isConfirmed) {
      const toastId = toast.loading("Deleting package...");
      try {
        const token = localStorage.getItem("adminToken") || sessionStorage.getItem("adminToken");
        const deleteUrl = software.packageDeleteApi.replace(":id", packageId);

        await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/proxy/external`, {
          targetUrl: deleteUrl,
          method: "DELETE"
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });

        toast.success("Package deleted!", { id: toastId });
        fetchExternalData();
      } catch (err) {
        console.error("Delete package fail:", err);
        toast.error("Failed to delete package", { id: toastId });
      }
    }
  };

  if (showAddPackage || editingPackage) {
    return (
      <AddExternalPackage 
        software={software} 
        packageData={editingPackage}
        onBack={() => {
          setShowAddPackage(false);
          setEditingPackage(null);
        }} 
        onSuccess={() => {
          setShowAddPackage(false);
          setEditingPackage(null);
          fetchExternalData();
        }}
      />
    );
  }

  const activeClientsCount = clients.filter(c => c.isActive).length;

  return (
    <div className="management-content">
      {/* Header */}
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div className="title-group">
          <h1 className="page-title">{software.name} Module</h1>
          <p className="page-description">{software.description || 'Developer-defined integration dashboard'}</p>
        </div>
        <div className="header-actions" style={{ display: 'flex', gap: '12px' }}>
          <button 
            className={`btn-secondary ${showDevApis ? 'active' : ''}`} 
            onClick={() => setShowDevApis(!showDevApis)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6"></polyline>
              <polyline points="8 6 2 12 8 18"></polyline>
            </svg>
            {showDevApis ? "Hide APIs" : "Show Developer APIs"}
          </button>
          <button className="btn-secondary" onClick={fetchExternalData} title="Refresh Dashboard data">
            Sync Data
          </button>
        </div>
      </div>

      {/* Quick Status Indicators / Stats */}
      <div className="stats-grid" style={{ marginBottom: '32px', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
            </svg>
          </div>
          <div className="stat-info">
            <div className="stat-value">{clients.length}</div>
            <div className="stat-label">Total Subscribed Clients</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div className="stat-info">
            <div className="stat-value">{activeClientsCount}</div>
            <div className="stat-label">Active Clients</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            </svg>
          </div>
          <div className="stat-info">
            <div className="stat-value">{packages.length}</div>
            <div className="stat-label">Package Plans</div>
          </div>
        </div>
      </div>

      {/* Developer APIs Section (Collapsible debug panel) */}
      {showDevApis && (
        <div className="form-card" style={{ marginBottom: '32px', border: '1px solid rgba(168, 85, 247, 0.3)', background: 'rgba(15, 23, 42, 0.6)' }}>
          <h2 className="section-subtitle" style={{ color: 'var(--accent-secondary)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
            Integration Registry Config (Read-Only)
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { label: "Clients List (GET)", value: software.clientsGetApi, method: "GET" },
              { label: "Client Signup (POST)", value: software.clientSignupApi, method: "POST" },
              { label: "Client Status Toggle (PATCH)", value: software.clientToggleStatusApi, method: "PATCH" },
              { label: "Client Delete (DELETE)", value: software.clientDeleteApi, method: "DELETE" },
              { label: "Packages List (GET)", value: software.packageGetApi, method: "GET" },
              { label: "Package Create (POST)", value: software.packagePostApi, method: "POST" },
              { label: "Package Update (PUT)", value: software.packagePutApi, method: "PUT" },
              { label: "Package Delete (DELETE)", value: software.packageDeleteApi, method: "DELETE" }
            ].map((api, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '250px 1fr auto', gap: '16px', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>{api.label}</span>
                <span style={{ fontFamily: 'monospace', fontSize: '12px', wordBreak: 'break-all', color: 'var(--text-primary)', background: 'rgba(0,0,0,0.2)', padding: '6px 12px', borderRadius: '4px' }}>
                  {api.value || "Not Configured / Disabled"}
                </span>
                <button 
                  type="button" 
                  className="btn-test-connection" 
                  style={{ padding: '6px 16px', fontSize: '12px' }}
                  onClick={() => testApi(api.value, api.method)}
                  disabled={!api.value}
                >
                  Test
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Layout (Side by Side client and package views) */}
      <div className="software-detail-layout">
        
        {/* Clients list section */}
        <section className="detail-main-section">
          <div className="section-header-inline" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h2 className="section-subtitle">Subscribed Clients</h2>
              <span className="badge-count">{clients.length} Total</span>
            </div>
            <button className="btn-add-mini" onClick={() => setShowAddClient(true)}>+ New Client</button>
          </div>

          {loadingClients ? (
            <div className="no-data-card">Connecting to Integration API...</div>
          ) : clientError ? (
            <div className="connection-error-card">
              <h3 className="error-title">Connection Failed</h3>
              <p className="text-secondary">Unable to reach client list API. Verify connectivity under Developer APIs.</p>
              <button className="btn-secondary" style={{ marginTop: '16px' }} onClick={fetchExternalData}>Retry Sync</button>
            </div>
          ) : clients.length === 0 ? (
            <div className="no-data-card">No clients found in this software.</div>
          ) : (
            <div className="client-cards-grid">
              {clients.map((client, index) => (
                <div key={client._id || index} className="client-card-premium">
                  <div className="client-card-header">
                    <div className="client-avatar-small">
                      {(client.businessName || client.business_name || client.name || 'B').charAt(0).toUpperCase()}
                    </div>
                    <div className="client-card-title">
                        <h3>{client.businessName || client.business_name || 'Unnamed Business'}</h3>
                        <p className="text-accent">{client.ownerName || client.owner_name || 'No Owner'}</p>
                    </div>
                  </div>
                  
                  <div className="client-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '4px 0' }}>
                    <div className="client-info-row">
                        <span>Email</span>
                        <span style={{ color: 'var(--text-primary)' }}>{client.email || client.clientEmail || 'N/A'}</span>
                    </div>
                    <div className="client-info-row">
                        <span>Phone</span>
                        <span style={{ color: 'var(--text-primary)' }}>{client.phoneNumber || client.phone || client.mobile || 'N/A'}</span>
                    </div>
                    
                    <div style={{ margin: '12px 0', padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <div className="client-info-row">
                            <span>Plan</span>
                            <span style={{ color: 'var(--accent-secondary)', fontWeight: '600' }}>
                              {client.packageName || (typeof client.package === 'string' ? client.package : client.package?.name) || 'Custom Plan'}
                            </span>
                        </div>
                        <div className="client-info-row" style={{ marginTop: '4px' }}>
                            <span>Start Date</span>
                            <span style={{ fontSize: '13px' }}>{client.packageStartDate || client.subscriptionStart ? new Date(client.packageStartDate || client.subscriptionStart).toLocaleDateString('en-GB') : 'N/A'}</span>
                        </div>
                        <div className="client-info-row">
                            <span>End Date</span>
                            <span style={{ fontSize: '13px', color: 'var(--accent-secondary)' }}>{client.packageEndDate || client.subscriptionEnd ? new Date(client.packageEndDate || client.subscriptionEnd).toLocaleDateString('en-GB') : 'N/A'}</span>
                        </div>
                    </div>
                  </div>

                  <div className="client-card-footer">
                    <div className="client-info-row">
                        <span>Account Status</span>
                        <span className={`status-text ${client.isActive ? 'active' : 'inactive'}`}>
                            {client.isActive ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Packages Section */}
        <aside className="detail-sidebar-section">
          <div className="section-header-inline">
            <h2 className="section-subtitle">Package Plans</h2>
            <button className="btn-add-mini" onClick={() => setShowAddPackage(true)}>+ New Plan</button>
          </div>

          <div className="package-list-external">
            {loadingPackages ? (
                <p>Syncing plans...</p>
            ) : packageError ? (
                <div className="connection-error-card" style={{ padding: '20px' }}>
                    <p className="text-secondary" style={{ fontSize: '12px' }}>Package API unreachable</p>
                </div>
            ) : packages.length === 0 ? (
                <div className="no-data-card" style={{ padding: '30px' }}>No packages defined.</div>
            ) : (
                packages.map((pkg, index) => (
                    <div key={pkg._id || index} className="package-card-compact">
                        <div className="pkg-header-mini">
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                    <h3 style={{ margin: 0 }}>{pkg.name}</h3>
                                    <span style={{ 
                                        background: 'rgba(168, 85, 247, 0.1)', 
                                        color: 'var(--accent-secondary)', 
                                        padding: '2px 8px', 
                                        borderRadius: '4px', 
                                        fontSize: '13px', 
                                        fontWeight: '700',
                                        border: '1px solid rgba(168, 85, 247, 0.2)'
                                    }}>
                                        {pkg.duration?.value || pkg.durationValue || '0'} {pkg.duration?.unit || pkg.durationUnit || 'duration'}
                                        {(pkg.duration?.value || pkg.durationValue) > 1 ? 's' : ''}
                                    </span>
                                </div>
                                <span className="pkg-price-mini">₹{pkg.price}</span>
                            </div>
                            <div className="pkg-actions-mini" style={{ display: 'flex', gap: '8px', marginLeft: '12px' }}>
                                <button className="btn-icon-mini" onClick={() => setEditingPackage(pkg)} title="Edit Plan">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                </button>
                                <button className="btn-icon-mini delete" onClick={() => handleDeletePackage(pkg._id)} title="Delete Plan">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path></svg>
                                </button>
                            </div>
                        </div>
                        <p className="pkg-desc-mini" style={{ margin: '12px 0' }}>{pkg.description || 'No description provided.'}</p>
                        
                        <div className="pkg-services-list" style={{ marginTop: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                            <p style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '8px', fontWeight: '600' }}>Features Included:</p>
                            <div className="pkg-meta-tags">
                                {pkg.services && Array.isArray(pkg.services) && pkg.services.map((s, i) => (
                                    <span key={i} className="mini-badge" style={{ borderColor: 'var(--accent-primary)', opacity: 0.8 }}>
                                        {typeof s === 'string' ? s : (s.name || 'Feature')}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                ))
            )}
          </div>
        </aside>

      </div>

      {showAddClient && (
        <AddNewClient
          initialSoftware={software}
          onClose={() => setShowAddClient(false)}
          onSuccess={() => {
            setShowAddClient(false);
            fetchExternalData();
          }}
        />
      )}
    </div>
  );
};

export default SoftwareModulePage;
