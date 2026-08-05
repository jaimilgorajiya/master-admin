import { useState, useEffect, useContext } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import toast from "react-hot-toast";
import EmployeeAddClient from "./EmployeeAddClient";
import EmployeeAddNewClient from "./EmployeeAddNewClient";
import EmployeeEditClient from "./EmployeeEditClient";
import ClientDetails from "./ClientDetails";
import { TableSkeleton } from "./LoadingSkeleton";
import { SocketContext } from "../context/SocketContext";

const EmployeeClientManagement = ({ initialShowAddForm = false, onFormClose, initialClientId }) => {
  const [clientList, setClientList] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [addClientType, setAddClientType] = useState(null); // null | 'select' | 'service' | 'software'
  const [showAddForm, setShowAddForm] = useState(initialShowAddForm);
  const [selectedClient, setSelectedClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSoftware, setSelectedSoftware] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [softwareList, setSoftwareList] = useState([]);
  const [serviceList, setServiceList] = useState([]);
  const [activeTab, setActiveTab] = useState("total"); // 'total' | 'service' | 'software'

  useEffect(() => {
    if (initialShowAddForm) {
      setAddClientType('select');
    }
  }, [initialShowAddForm]);

  useEffect(() => {
    if (initialClientId && clientList.length > 0) {
        const client = clientList.find(c => c._id === initialClientId);
        if (client) {
            setSelectedClient(client);
        }
    }
  }, [initialClientId, clientList]);

  const socket = useContext(SocketContext);

  useEffect(() => {
    if (!socket) return;

    const handleClientChange = (data) => {
        // console.log("Client Update Received:", data);
        fetchClients();
    };

    socket.on("client_data_change", handleClientChange);
    socket.on("software_client_change", handleClientChange);

    return () => {
        socket.off("client_data_change", handleClientChange);
        socket.off("software_client_change", handleClientChange);
    };
  }, [socket]);

  useEffect(() => {
    fetchClients();
    fetchSoftware();
    fetchServices();
  }, []);

  // Re-fetch when returning from add form
  useEffect(() => {
    if (!showAddForm && addClientType === null) fetchClients();
  }, [showAddForm, addClientType]);

  useEffect(() => {
    filterClients();
  }, [clientList, searchTerm, selectedSoftware, selectedService, activeTab]);

  const fetchSoftware = async () => {
    try {
      const token = localStorage.getItem("employeeToken");
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
        const token = localStorage.getItem("employeeToken");
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

  const filterClients = () => {
    let filtered = [...clientList];

    // Filter by Active Tab (Client Type)
    if (activeTab !== 'total') {
      filtered = filtered.filter(client => {
          const type = client.clientType || 'service';
          return type === activeTab;
      });
    }

    // Filter by search term
    if (searchTerm.trim() !== "") {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(client => 
        client.clientName.toLowerCase().includes(searchLower) ||
        client.clientEmail.toLowerCase().includes(searchLower) ||
        client.clientPhone.toLowerCase().includes(searchLower) ||
        (client.softwareId?.name && client.softwareId.name.toLowerCase().includes(searchLower)) ||
        (client.serviceIds && client.serviceIds.some(s => s.name.toLowerCase().includes(searchLower)))
      );
    }

    // Filter by software (only in software mode)
    if (activeTab === 'software' && selectedSoftware !== "") {
      filtered = filtered.filter(client => 
        client.softwareId?._id === selectedSoftware
      );
    }

    // Filter by service (only in service/total mode)
    if (activeTab !== 'software' && selectedService !== "") {
        filtered = filtered.filter(client => 
            client.serviceIds?.some(s => s._id === selectedService)
        );
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
  };

  const fetchClients = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("employeeToken");
      // Fetch service clients
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/client/my-clients`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Fetch software clients created by this employee
      const swResponse = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/software-clients/my-clients`, {
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => ({ data: { success: false } }));

      const serviceClients = response.data.success ? response.data.clients.map(c => ({ ...c, clientType: 'service' })) : [];
      const softwareClients = swResponse.data.success
        ? swResponse.data.clients.map(c => ({
            _id: c._id,
            clientName: c.ownerName || c.businessName,
            clientEmail: c.email,
            clientPhone: c.phone,
            clientType: 'software',
            softwareId: c.softwareId,
            isActive: c.isActive,
            paymentStatus: c.paymentStatus,
            createdAt: c.createdAt,
            validityPeriod: c.packageName || "—",
            expiryDate: c.packageEndDate || null,
            businessName: c.businessName,
          }))
        : [];

      setClientList([...serviceClients, ...softwareClients]);
    } catch (err) {
      console.error("Error fetching clients:", err);
      toast.error("Failed to load clients");
    } finally {
      setLoading(false);
    }
  };

  const handleAddSuccess = (message) => {
    toast.success(message);
    setAddClientType(null);
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
      const token = localStorage.getItem("employeeToken");
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
          background: "#0f172a",
          color: "#fff",
          customClass: {
            popup: "premium-swal-popup",
            confirmButton: "premium-swal-confirm",
          },
          timer: 2000,
          showConfirmButton: false,
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
        color: "#fff",
        customClass: {
          popup: "premium-swal-popup",
          confirmButton: "premium-swal-confirm",
        },
      });
    }
  };

  const handleDeleteExternal = async (client) => {
    const result = await Swal.fire({
      title: "Delete External Client?",
      html: `
        <div style="text-align: left; color: #fff;">
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
      },
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      const token = localStorage.getItem("employeeToken");
      
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
          background: "#0f172a",
          color: "#fff",
          customClass: {
            popup: "premium-swal-popup",
            confirmButton: "premium-swal-confirm",
          },
          timer: 2000,
          showConfirmButton: false,
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
        color: "#fff",
        customClass: {
          popup: "premium-swal-popup",
          confirmButton: "premium-swal-confirm",
        },
      });
    }
  };

  const handleDelete = async (id, name) => {
    const result = await Swal.fire({
      title: "Delete Client?",
      html: `<div style="color: #fff;">You are about to delete client <strong>"${name}"</strong>.<br/>This action cannot be undone.</div>`,
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
      },
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      const token = localStorage.getItem("employeeToken");
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
          background: "#0f172a",
          color: "#fff",
          customClass: {
            popup: "premium-swal-popup",
            confirmButton: "premium-swal-confirm",
          },
          timer: 2000,
          showConfirmButton: false,
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
        color: "#fff",
        customClass: {
          popup: "premium-swal-popup",
          confirmButton: "premium-swal-confirm",
        },
      });
    }
  };


  if (addClientType === 'service' || showAddForm) {
    return (
      <EmployeeAddClient
        onBack={() => { setAddClientType(null); setShowAddForm(false); if (onFormClose) onFormClose(); }}
        onSuccess={(msg) => { toast.success(msg); setAddClientType(null); setShowAddForm(false); if (onFormClose) onFormClose(); fetchClients(); }}
      />
    );
  }

  if (addClientType === 'software') {
    return (
      <EmployeeAddNewClient
        onClose={() => { setAddClientType(null); if (onFormClose) onFormClose(); }}
        onSuccess={() => { setAddClientType(null); if (onFormClose) onFormClose(); fetchClients(); }}
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

  return (
    <div>
      {/* Type selector modal — same as admin */}
      {addClientType === 'select' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '36px', width: '420px', maxWidth: '90vw' }}>
            <h2 style={{ margin: '0 0 8px', fontSize: '20px', color: '#fff' }}>Add New Client</h2>
            <p style={{ margin: '0 0 28px', color: 'var(--text-secondary)', fontSize: '14px' }}>What type of client do you want to add?</p>
            <div style={{ display: 'flex', gap: '16px' }}>
              <button onClick={() => setAddClientType('service')} style={{ flex: 1, padding: '20px 16px', borderRadius: '12px', cursor: 'pointer', background: 'rgba(0,200,255,0.08)', border: '1px solid rgba(0,200,255,0.25)', color: '#fff', textAlign: 'center', transition: 'all 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,200,255,0.15)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,200,255,0.08)'}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00c8ff" strokeWidth="1.5" style={{ marginBottom: '8px' }}><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                <div style={{ fontWeight: 700, fontSize: '15px', color: '#00c8ff' }}>Service</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>SMS, packages & services</div>
              </button>
              <button onClick={() => setAddClientType('software')} style={{ flex: 1, padding: '20px 16px', borderRadius: '12px', cursor: 'pointer', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.25)', color: '#fff', textAlign: 'center', transition: 'all 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(139,92,246,0.15)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(139,92,246,0.08)'}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="1.5" style={{ marginBottom: '8px' }}><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
                <div style={{ fontWeight: 700, fontSize: '15px', color: '#8b5cf6' }}>Software</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>External software clients</div>
              </button>
            </div>
            <button onClick={() => { setAddClientType(null); if (onFormClose) onFormClose(); }} style={{ marginTop: '20px', width: '100%', padding: '10px', borderRadius: '8px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '14px' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="page-header">
        <h1 className="page-title">Client Management</h1>
        <button className="btn-primary" onClick={() => setAddClientType('select')}>
          + Add New Client
        </button>
      </div>

      {/* Toggle Tabs */}
      <div className="tabs-container" style={{ display: 'flex', gap: '1rem', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '0' }}>
            {['total', 'service', 'software'].map(tab => (
              <button
                key={tab}
                className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
                style={{
                  background: 'transparent', border: 'none',
                  borderBottom: activeTab === tab ? '2px solid var(--accent-primary)' : '2px solid transparent',
                  color: activeTab === tab ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  padding: '10px 20px', cursor: 'pointer', fontWeight: 600, fontSize: '16px', transition: 'all 0.3s ease'
                }}
              >
                {tab === 'total' ? `Total Clients (${clientList.length})` : tab === 'service' ? `Service (${clientList.filter(c => (c.clientType || 'service') === 'service').length})` : `Software (${clientList.filter(c => c.clientType === 'software').length})`}
              </button>
            ))}
      </div>

      {/* Search and Filter Section */}
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

          
          {(searchTerm || selectedSoftware || selectedService) && (
            <button onClick={clearFilters} className="clear-filters-btn">
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Results Summary */}
      {(searchTerm || selectedSoftware || selectedService) && (
        <div className="results-summary">
          Showing {filteredClients.length} of {clientList.filter(c => activeTab === 'total' ? true : (c.clientType || 'service') === activeTab).length} clients
          {searchTerm && <span> matching "{searchTerm}"</span>}
          {activeTab === 'software' && selectedSoftware && (
            <span> in {softwareList.find(s => s._id === selectedSoftware)?.name}</span>
          )}
          {activeTab === 'service' && selectedService && (
            <span> with service {serviceList.find(s => s._id === selectedService)?.name}</span>
          )}
        </div>
      )}

      {loading ? (
        <TableSkeleton rows={5} columns={6} />
      ) : (
        <>
          <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>{activeTab === 'software' ? 'Software' : activeTab === 'total' ? 'Type / Service' : 'Services'}</th>
              <th>Status</th>
              <th>Created At</th>
            </tr>
          </thead>
          <tbody>
            {filteredClients.length === 0 ? (
              <tr>
                <td colSpan="6" className="no-data">
                  {clientList.filter(c => activeTab === 'total' ? true : (c.clientType || 'service') === activeTab).length === 0 
                    ? `No ${activeTab === 'total' ? '' : activeTab + ' '}clients found. Add your first client.`
                    : "No clients match your search criteria."
                  }
                </td>
              </tr>
            ) : (
              filteredClients.map((client) => (
                <tr key={client._id}>
                  <td 
                      className="font-semibold" 
                      style={{ cursor: 'pointer', color: '#00c8ff' }}
                      onClick={() => setSelectedClient(client)}
                  >
                      {client.clientName}
                  </td>
                  <td>{client.clientEmail}</td>
                  <td>{client.clientPhone}</td>
                  <td>
                      {activeTab === 'software' ? (
                          client.softwareId?.name || "N/A"
                      ) : activeTab === 'total' ? (
                          client.clientType === 'software' ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, background: 'rgba(139,92,246,0.15)', color: '#8b5cf6', padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase' }}>Software</span>
                              <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{client.softwareId?.name || '—'}</span>
                            </span>
                          ) : (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, background: 'rgba(0,200,255,0.12)', color: '#00c8ff', padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase' }}>Service</span>
                              <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                                {client.serviceIds?.length > 0 ? (client.serviceIds.length === 1 ? client.serviceIds[0].name : `${client.serviceIds.length} Services`) : '—'}
                              </span>
                            </span>
                          )
                      ) : (
                          client.serviceIds && client.serviceIds.length > 0 
                            ? (
                                <div title={client.serviceIds.map(s => s.name).join(', ')}>
                                    {client.serviceIds.length === 1 
                                        ? client.serviceIds[0].name 
                                        : `${client.serviceIds.length} Services`
                                    }
                                </div>
                            )
                            : "No Services"
                      )}
                  </td>
                  <td>
                    <span 
                        className="status-badge"
                        style={{
                            backgroundColor: client.isActive ? 'rgba(74, 222, 128, 0.1)' : 'rgba(248, 113, 113, 0.1)',
                            color: client.isActive ? '#4ade80' : '#f87171',
                            border: `1px solid ${client.isActive ? 'rgba(74, 222, 128, 0.2)' : 'rgba(248, 113, 113, 0.2)'}`,
                            padding: '4px 12px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                       
                      {client.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>{new Date(client.createdAt).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
        </>
      )}
    </div>
  );
};

export default EmployeeClientManagement;
