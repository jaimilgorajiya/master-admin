import { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import AddExternalPackage from "./AddExternalPackage";
import AddNewClient from "./AddNewClient";
import Swal from "sweetalert2";

const SoftwareModulePage = ({ software }) => {
  const isSendzyy = software.key === "sendzyy";
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

  // Sendzyy specific states
  const [sendzyyToken, setSendzyyToken] = useState(localStorage.getItem("sendzyy_token") || "");
  const [authStatus, setAuthStatus] = useState("idle"); // 'idle' | 'authenticating' | 'authenticated' | 'error'
  const [sendzyyAdminInfo, setSendzyyAdminInfo] = useState(null);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showManualRegisterModal, setShowManualRegisterModal] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    name: "",
    email: "",
    password: "",
    planId: "",
    paymentReference: ""
  });
  const [registering, setRegistering] = useState(false);
  const [registerMode, setRegisterMode] = useState("manual"); // 'manual' | 'online'
  const [inviteResult, setInviteResult] = useState(null); // stores invitation response

  // Details Drawer States
  const [selectedTenantDetails, setSelectedTenantDetails] = useState(null);
  const [tenantLocalRecord, setTenantLocalRecord] = useState(null);
  const [tenantHistory, setTenantHistory] = useState([]);
  const [loadingTenantDetails, setLoadingTenantDetails] = useState(false);
  const [razorpayDetails, setRazorpayDetails] = useState(null);

  useEffect(() => {
    if (selectedTenantDetails) {
      fetchTenantFullDetails(selectedTenantDetails._id || selectedTenantDetails.id);
    } else {
      setTenantLocalRecord(null);
      setTenantHistory([]);
      setRazorpayDetails(null);
    }
  }, [selectedTenantDetails]);

  const fetchTenantFullDetails = async (id) => {
    setTenantLocalRecord(null);
    setTenantHistory([]);
    setRazorpayDetails(null);
    setLoadingTenantDetails(true);
    try {
      const adminToken = localStorage.getItem("adminToken") || sessionStorage.getItem("adminToken");
      const baseApi = import.meta.env.VITE_API_BASE_URL;
      const headers = { Authorization: `Bearer ${adminToken}` };

      // 1. Fetch local record details
      let localClient = null;
      const detailRes = await axios.get(`${baseApi}/api/software-clients/${id}`, { headers });
      if (detailRes.data.success) {
        localClient = detailRes.data.client;
        setTenantLocalRecord(localClient);
      }

      // 2. Fetch Razorpay details if transactionId is a Razorpay ID
      const txId = localClient?.transactionId || selectedTenantDetails?.subscription?.transactionId;
      if (txId && txId.replace(/\s+/g, "").toLowerCase().startsWith("pay_")) {
        try {
          const sanitizedTxId = txId.replace(/\s+/g, "").trim();
          const rpRes = await axios.get(`${baseApi}/api/payments/razorpay/${sanitizedTxId}`, { headers });
          if (rpRes.data.success) {
            setRazorpayDetails(rpRes.data.payment);
          }
        } catch (rpErr) {
          console.warn("Could not load details from Razorpay:", rpErr.message);
        }
      }

      // 3. Fetch history
      const historyRes = await axios.get(`${baseApi}/api/clients/history/${id}`, { headers });
      if (historyRes.data.success) {
        setTenantHistory(historyRes.data.history || []);
      }
    } catch (err) {
      console.warn("Could not load local tenant record or payment history:", err.message);
    } finally {
      setLoadingTenantDetails(false);
    }
  };

  useEffect(() => {
    if (isSendzyy) {
      performSendzyyAutoLogin();
    } else {
      fetchExternalData();
    }
  }, [software]);

  // ---------------------------------------------------------------------------
  // Sendzyy Auto-Login Flow
  // ---------------------------------------------------------------------------
  const performSendzyyAutoLogin = async () => {
    setAuthStatus("authenticating");
    const toastId = toast.loading("Auto-authenticating with Sendzyy Super Admin...");

    try {
      const adminToken = localStorage.getItem("adminToken") || sessionStorage.getItem("adminToken");
      const loginUrl = software.loginApi || "https://appapi.sendzyy.com/api/superadmin/login";
      const creds = software.autoLoginCreds || {
        email: "superadmin@sendzyy.com",
        password: "Sendzyy@Admin2026"
      };

      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/proxy/external`,
        {
          targetUrl: loginUrl,
          method: "POST",
          data: creds
        },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );

      if (res.data && res.data.token) {
        const token = res.data.token;
        setSendzyyToken(token);
        localStorage.setItem("sendzyy_token", token);
        setSendzyyAdminInfo(res.data.admin || { email: creds.email, role: "superadmin" });
        setAuthStatus("authenticated");
        toast.success("Connected to Sendzyy Super Admin!", { id: toastId });
        
        // Fetch Sendzyy data with token
        fetchSendzyyAllData(token);
      } else {
        setAuthStatus("error");
        toast.error("Auto-login failed: Token not returned from Sendzyy", { id: toastId });
      }
    } catch (err) {
      console.error("[Sendzyy Auto-Login Error]", err);
      setAuthStatus("error");
      toast.error(err.response?.data?.message || "Sendzyy Super Admin login failed", { id: toastId });
    }
  };

  const fetchSendzyyAllData = async (token = sendzyyToken) => {
    const adminToken = localStorage.getItem("adminToken") || sessionStorage.getItem("adminToken");
    const headers = { Authorization: `Bearer ${token}` };

    setLoadingClients(true);
    setLoadingPackages(true);
    setClientError(false);
    setPackageError(false);

    // 1. Fetch Dashboard Stats
    try {
      const statsRes = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/proxy/external`,
        {
          targetUrl: software.dashboardStatsApi || "https://appapi.sendzyy.com/api/superadmin/dashboard-stats",
          method: "GET",
          headers
        },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      if (statsRes.data?.stats) {
        setDashboardStats(statsRes.data.stats);
      }
    } catch (err) {
      console.warn("Could not fetch Sendzyy dashboard stats:", err.message);
    }

    // 2. Fetch Tenants and Merge with Local Clients
    try {
      const [tenantsRes, localRes] = await Promise.all([
        axios.post(
          `${import.meta.env.VITE_API_BASE_URL}/api/proxy/external`,
          {
            targetUrl: software.clientsGetApi || "https://appapi.sendzyy.com/api/superadmin/tenants",
            method: "GET",
            headers
          },
          { headers: { Authorization: `Bearer ${adminToken}` } }
        ),
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/software-clients/all`, {
          headers: { Authorization: `Bearer ${adminToken}` }
        }).catch(() => ({ data: { clients: [] } }))
      ]);

      const tenantList = tenantsRes.data?.tenants || tenantsRes.data?.clients || (Array.isArray(tenantsRes.data) ? tenantsRes.data : []);
      const allLocalClients = localRes.data?.clients || [];
      const localClients = allLocalClients.filter(lc => {
        const swId = lc.softwareId?._id || lc.softwareId;
        const swName = lc.softwareId?.name || lc.softwareName;
        return (swId && String(swId) === String(software._id)) || 
               (swName && swName.toLowerCase() === software.name.toLowerCase());
      });

      const mergedMap = new Map();

      tenantList.forEach(t => {
        const key = (t.email || "").toLowerCase().trim();
        mergedMap.set(key, {
          _id: t.id || t._id,
          businessName: t.name || t.businessName || "Unnamed Business",
          ownerName: t.name || t.ownerName || "—",
          email: t.email || "—",
          phoneNumber: t.whatsappConfig?.displayPhone || t.phoneNumber || t.phone || "—",
          status: t.status || "active",
          computedStatus: t.computedStatus || t.status || "active",
          isActive: (t.computedStatus || t.status) === "active",
          subscription: t.subscription || {},
          packageName: t.subscription?.planName || t.packageName || "—",
          packageEndDate: t.subscription?.expiryDate || null,
          daysRemaining: t.subscription?.daysRemaining ?? null,
          whatsappConfig: t.whatsappConfig || {},
          createdAt: t.createdAt
        });
      });



      setClients([...mergedMap.values()]);
      setClientError(false);
    } catch (err) {
      console.error("Sendzyy Tenants fetch error:", err);
      setClientError(true);
    } finally {
      setLoadingClients(false);
    }

    // 3. Fetch Packages
    try {
      const pkgRes = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/proxy/external`,
        {
          targetUrl: software.packageGetApi || "https://appapi.sendzyy.com/api/superadmin/packages",
          method: "GET",
          headers
        },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );

      const pkgList = pkgRes.data?.packages || (Array.isArray(pkgRes.data) ? pkgRes.data : []);
      setPackages(pkgList);
      setPackageError(false);
    } catch (err) {
      console.error("Sendzyy Packages fetch error:", err);
      setPackageError(true);
    } finally {
      setLoadingPackages(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Non-Sendzyy Generic Software Fetch
  // ---------------------------------------------------------------------------
  const fetchExternalData = async () => {
    setLoadingClients(true);
    setLoadingPackages(true);
    setClientError(false);
    setPackageError(false);

    const token = localStorage.getItem("adminToken") || sessionStorage.getItem("adminToken");

    try {
      const [extRes, localRes] = await Promise.all([
        software.clientsGetApi ? axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/proxy/external`, {
          targetUrl: software.clientsGetApi,
          method: "GET"
        }, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null) : Promise.resolve(null),
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
      
      let extData = extRes?.data?.clients || extRes?.data?.tenants || extRes?.data?.data || (Array.isArray(extRes?.data) ? extRes.data : null);
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
          packageName: local?.packageName || ext.packageName || ext.subscription?.planName || ext.planName,
          isActive: local ? local.isActive : (ext.status === 'active' || ext.isActive === true),
          computedStatus: ext.computedStatus || (ext.status === 'active' ? 'active' : 'inactive')
        });
      });



      setClients(Array.from(mergedMap.values()));
      setClientError(false);
    } catch (err) {
      console.error("Error fetching clients:", err);
      setClientError(clients.length === 0);
    } finally {
      setLoadingClients(false);
    }

    try {
      const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/proxy/external`, {
        targetUrl: software.packageGetApi,
        method: "GET"
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      let packageData = res.data.packages || res.data.data || (Array.isArray(res.data) ? res.data : null);
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

  // ---------------------------------------------------------------------------
  // Actions: Toggle Tenant Status (Sendzyy)
  // ---------------------------------------------------------------------------
  const handleToggleTenantStatus = async (tenant) => {
    const isCurrentlyActive = tenant.computedStatus === "active" || tenant.status === "active";
    const newStatus = isCurrentlyActive ? "inactive" : "active";

    const result = await Swal.fire({
      title: `${newStatus === "inactive" ? "Deactivate" : "Activate"} Tenant?`,
      text: newStatus === "inactive" 
        ? `Deactivating "${tenant.businessName}" will IMMEDIATELY block login for this account.`
        : `Re-activating "${tenant.businessName}" will restore account access instantly.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: newStatus === "inactive" ? "#ef4444" : "#10b981",
      cancelButtonColor: "rgba(255,255,255,0.1)",
      confirmButtonText: `Yes, ${newStatus === "inactive" ? "Deactivate" : "Activate"}`,
      background: "#0f172a",
      color: "#fff"
    });

    if (!result.isConfirmed) return;

    const toastId = toast.loading(`Updating status for ${tenant.businessName}...`);
    try {
      const adminToken = localStorage.getItem("adminToken") || sessionStorage.getItem("adminToken");
      const targetUrl = (software.clientToggleStatusApi || "https://appapi.sendzyy.com/api/superadmin/tenants/:id/status")
        .replace(":id", tenant._id);

      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/proxy/external`,
        {
          targetUrl,
          method: "PATCH",
          headers: { Authorization: `Bearer ${sendzyyToken}` },
          data: { status: newStatus }
        },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );

      if (res.data?.success || res.status === 200) {
        toast.success(`Tenant ${newStatus === "inactive" ? "deactivated" : "activated"} successfully`, { id: toastId });
        if (isSendzyy) {
          fetchSendzyyAllData();
        } else {
          fetchExternalData();
        }
      } else {
        toast.error(res.data?.message || "Failed to update tenant status", { id: toastId });
      }
    } catch (err) {
      console.error("Toggle tenant status error:", err);
      toast.error(err.response?.data?.message || "Status update failed", { id: toastId });
    }
  };



  // ---------------------------------------------------------------------------
  // Actions: Sendzyy Manual Registration
  // ---------------------------------------------------------------------------
  const handleRegisterManualTenant = async (e) => {
    e.preventDefault();
    
    if (!registerForm.name || !registerForm.email || !registerForm.password || !registerForm.planId) {
      return toast.error("Please fill all required fields");
    }

    setRegistering(true);
    const toastId = toast.loading("Registering tenant in Sendzyy...");

    try {
      const adminToken = localStorage.getItem("adminToken") || sessionStorage.getItem("adminToken");
      
      const targetUrl = software.clientSignupApi || "https://appapi.sendzyy.com/api/superadmin/tenants/register-manual";
      const payload = {
        name: registerForm.name,
        email: registerForm.email,
        password: registerForm.password,
        planId: registerForm.planId,
        paymentReference: "MASTER_ADMIN_DIRECT",
        sendWelcomeEmail: true
      };

      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/proxy/external`,
        {
          targetUrl,
          method: "POST",
          headers: { Authorization: `Bearer ${sendzyyToken}` },
          data: payload
        },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );

      if (res.data?.success || res.status === 201 || res.status === 200) {
        const tenantId = res.data?.tenant?.id || res.data?.tenant?._id || res.data?.client?._id || res.data?._id;

        if (tenantId) {
          try {
            const toggleUrl = (software.clientToggleStatusApi || "https://appapi.sendzyy.com/api/superadmin/tenants/:id/status").replace(":id", tenantId);
            await axios.post(
              `${import.meta.env.VITE_API_BASE_URL}/api/proxy/external`,
              {
                targetUrl: toggleUrl,
                method: "PATCH",
                headers: { Authorization: `Bearer ${sendzyyToken}` },
                data: { status: "inactive" }
              },
              { headers: { Authorization: `Bearer ${adminToken}` } }
            );
            toast.success("Tenant registered in Sendzyy (Blocked by default)!", { id: toastId });
          } catch (toggleErr) {
            console.error("Error setting tenant status to inactive:", toggleErr);
            toast.success("Tenant registered in Sendzyy (failed to auto-deactivate)!", { id: toastId });
          }
        } else {
          toast.success("Tenant registered & activated in Sendzyy!", { id: toastId });
        }

        setShowManualRegisterModal(false);
        setRegisterForm({ name: "", email: "", password: "", planId: "", paymentReference: "" });
        fetchSendzyyAllData();
      } else {
        toast.error(res.data?.message || res.data?.error || "Action failed", { id: toastId });
      }
    } catch (err) {
      console.error("Tenant registration error:", err);
      toast.error(err.response?.data?.error || err.response?.data?.message || "Action failed", { id: toastId });
    } finally {
      setRegistering(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Actions: Delete Package
  // ---------------------------------------------------------------------------
  const handleDeletePackage = async (pkg) => {
    const pkgId = pkg._id || pkg.id;
    const result = await Swal.fire({
      title: "Delete Plan?",
      text: `Are you sure you want to delete package "${pkg.name}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "rgba(255,255,255,0.1)",
      confirmButtonText: "Yes, Delete",
      background: "#0f172a",
      color: "#fff"
    });

    if (!result.isConfirmed) return;

    const toastId = toast.loading("Deleting package...");
    try {
      const adminToken = localStorage.getItem("adminToken") || sessionStorage.getItem("adminToken");
      const deleteUrl = (software.packageDeleteApi || "https://appapi.sendzyy.com/api/superadmin/packages/:id").replace(":id", pkgId);

      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/proxy/external`,
        {
          targetUrl: deleteUrl,
          method: "DELETE",
          headers: isSendzyy ? { Authorization: `Bearer ${sendzyyToken}` } : {}
        },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );

      if (res.data?.success || res.status === 200) {
        toast.success("Package deleted successfully!", { id: toastId });
        isSendzyy ? fetchSendzyyAllData() : fetchExternalData();
      } else {
        toast.error(res.data?.error || res.data?.message || "Failed to delete package", { id: toastId });
      }
    } catch (err) {
      console.error("Delete package error:", err);
      if (err.response?.status === 409 || err.response?.data?.activeTenantCount) {
        const count = err.response.data.activeTenantCount || "several";
        Swal.fire({
          title: "Cannot Delete Plan",
          text: `This package cannot be deleted because ${count} active tenant(s) are currently subscribed to it.`,
          icon: "error",
          background: "#0f172a",
          color: "#fff"
        });
        toast.dismiss(toastId);
      } else {
        toast.error(err.response?.data?.error || "Failed to delete package", { id: toastId });
      }
    }
  };

  const testApi = async (url, method = 'GET') => {
    if (!url) return toast.error("API endpoint not defined in registry");
    const testUrl = url.includes(':id') ? url.replace(':id', 'test-id') : url;
    const toastId = toast.loading(`Testing ${method} connection (via Proxy)...`);
    try {
      const token = localStorage.getItem("adminToken") || sessionStorage.getItem("adminToken");
      const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/proxy/external`, {
        targetUrl: testUrl,
        method,
        headers: isSendzyy ? { Authorization: `Bearer ${sendzyyToken}` } : {}
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
          isSendzyy ? fetchSendzyyAllData() : fetchExternalData();
        }}
      />
    );
  }

  // Filter clients
  const filteredClients = clients.filter(c => {
    const matchesSearch = 
      c.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.ownerName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (statusFilter === "all") return matchesSearch;
    if (statusFilter === "active") return matchesSearch && c.computedStatus === "active";
    if (statusFilter === "inactive") return matchesSearch && c.computedStatus === "inactive";
    if (statusFilter === "expired") return matchesSearch && (c.computedStatus === "expired" || c.subscription?.isExpired);
    return matchesSearch;
  });

  const activeClientsCount = clients.filter(c => c.computedStatus === 'active' || c.isActive).length;
  const expiredClientsCount = clients.filter(c => c.computedStatus === 'expired' || c.subscription?.isExpired).length;

  return (
    <div className="management-content">
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div className="title-group">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 className="page-title">{software.name} Module</h1>
            {isSendzyy && (
              <span className={`status-pill ${authStatus === 'authenticated' ? 'active' : 'inactive'}`} style={{
                background: authStatus === 'authenticated' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: authStatus === 'authenticated' ? '#10b981' : '#ef4444',
                border: `1px solid ${authStatus === 'authenticated' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '700',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: authStatus === 'authenticated' ? '#10b981' : '#ef4444'
                }}></span>
                {authStatus === 'authenticated' 
                  ? `Super Admin Connected (${sendzyyAdminInfo?.email || 'superadmin@sendzyy.com'})`
                  : authStatus === 'authenticating' ? 'Authenticating with Sendzyy...' : 'Authentication Failed'}
              </span>
            )}
          </div>
          <p className="page-description">
            {isSendzyy 
              ? "Official Super Admin integration portal — Real-time auto-authenticated JWT control"
              : (software.description || 'Developer-defined integration dashboard')}
          </p>
        </div>
        
        <div className="header-actions" style={{ display: 'flex', gap: '12px' }}>
          {isSendzyy && (
            <button 
              className="btn-secondary"
              onClick={performSendzyyAutoLogin}
              title="Re-authenticate JWT Token with Sendzyy Super Admin"
            >
              🔄 Refresh Token
            </button>
          )}
          <button 
            className={`btn-secondary ${showDevApis ? 'active' : ''}`} 
            onClick={() => setShowDevApis(!showDevApis)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6"></polyline>
              <polyline points="8 6 2 12 8 18"></polyline>
            </svg>
            {showDevApis ? "Hide APIs" : "Show APIs"}
          </button>
          <button 
            className="btn-secondary" 
            onClick={() => isSendzyy ? fetchSendzyyAllData() : fetchExternalData()} 
            title="Sync Data"
          >
            Sync Data
          </button>
        </div>
      </div>

      {/* Sendzyy Super Admin Stats Cards (If Available) */}
      {isSendzyy && dashboardStats && (
        <div className="stats-grid" style={{ marginBottom: '28px', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px' }}>
          <div className="stat-card" style={{ padding: '20px', gap: '12px' }}>
            <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', width: '48px', height: '48px', minWidth: '48px', borderRadius: '12px', fontSize: '20px' }}>🏢</div>
            <div className="stat-info" style={{ minWidth: 0 }}>
              <div className="stat-value" style={{ fontSize: '26px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dashboardStats.totalTenants ?? clients.length}</div>
              <div className="stat-label" style={{ fontSize: '13px' }}>Total Tenants</div>
            </div>
          </div>

          <div className="stat-card" style={{ padding: '20px', gap: '12px' }}>
            <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', width: '48px', height: '48px', minWidth: '48px', borderRadius: '12px', fontSize: '20px' }}>✅</div>
            <div className="stat-info" style={{ minWidth: 0 }}>
              <div className="stat-value" style={{ fontSize: '26px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dashboardStats.activeTenants ?? activeClientsCount}</div>
              <div className="stat-label" style={{ fontSize: '13px' }}>Active Tenants</div>
            </div>
          </div>

          <div className="stat-card" style={{ padding: '20px', gap: '12px' }}>
            <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', width: '48px', height: '48px', minWidth: '48px', borderRadius: '12px', fontSize: '20px' }}>⚠️</div>
            <div className="stat-info" style={{ minWidth: 0 }}>
              <div className="stat-value" style={{ fontSize: '26px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dashboardStats.expiredSubscriptions ?? expiredClientsCount}</div>
              <div className="stat-label" style={{ fontSize: '13px' }}>Expired Subscriptions</div>
            </div>
          </div>

          <div className="stat-card" style={{ padding: '20px', gap: '12px' }}>
            <div className="stat-icon" style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7', width: '48px', height: '48px', minWidth: '48px', borderRadius: '12px', fontSize: '20px' }}>📦</div>
            <div className="stat-info" style={{ minWidth: 0 }}>
              <div className="stat-value" style={{ fontSize: '26px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dashboardStats.totalActivePackages ?? packages.length}</div>
              <div className="stat-label" style={{ fontSize: '13px' }}>Active Plans</div>
            </div>
          </div>

          <div className="stat-card" style={{ padding: '20px', gap: '12px' }}>
            <div className="stat-icon" style={{ background: 'rgba(6, 182, 212, 0.1)', color: '#06b6d4', width: '48px', height: '48px', minWidth: '48px', borderRadius: '12px', fontSize: '20px' }}>💰</div>
            <div className="stat-info" style={{ minWidth: 0 }}>
              <div className="stat-value" style={{ fontSize: '20px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={`₹${(dashboardStats.revenue?.totalINR || 0).toLocaleString('en-IN')}`}>₹{(dashboardStats.revenue?.totalINR || 0).toLocaleString('en-IN')}</div>
              <div className="stat-label" style={{ fontSize: '13px' }}>Total Revenue</div>
            </div>
          </div>
        </div>
      )}

      {!isSendzyy && (
        <div className="stats-grid" style={{ marginBottom: '32px', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>👥</div>
            <div className="stat-info">
              <div className="stat-value">{clients.length}</div>
              <div className="stat-label">Total Clients</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>✅</div>
            <div className="stat-info">
              <div className="stat-value">{activeClientsCount}</div>
              <div className="stat-label">Active Clients</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' }}>📦</div>
            <div className="stat-info">
              <div className="stat-value">{packages.length}</div>
              <div className="stat-label">Package Plans</div>
            </div>
          </div>
        </div>
      )}

      {/* Developer APIs Debug Section */}
      {showDevApis && (
        <div className="form-card" style={{ marginBottom: '32px', border: '1px solid rgba(168, 85, 247, 0.3)', background: 'rgba(15, 23, 42, 0.6)' }}>
          <h2 className="section-subtitle" style={{ color: 'var(--accent-secondary)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            Integration API Registry Config (Read-Only)
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { label: "Super Admin Login (POST)", value: software.loginApi, method: "POST" },
              { label: "Tenants / Clients (GET)", value: software.clientsGetApi, method: "GET" },
              { label: "Manual Register (POST)", value: software.clientSignupApi, method: "POST" },
              { label: "Tenant Status Toggle (PATCH)", value: software.clientToggleStatusApi, method: "PATCH" },
              { label: "Packages List (GET)", value: software.packageGetApi, method: "GET" },
              { label: "Package Create (POST)", value: software.packagePostApi, method: "POST" },
              { label: "Package Update (PUT)", value: software.packagePutApi, method: "PUT" },
              { label: "Package Delete (DELETE)", value: software.packageDeleteApi, method: "DELETE" },
              { label: "Dashboard Stats (GET)", value: software.dashboardStatsApi, method: "GET" }
            ].map((api, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '240px 1fr auto', gap: '16px', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>{api.label}</span>
                <span style={{ fontFamily: 'monospace', fontSize: '12px', wordBreak: 'break-all', color: 'var(--text-primary)', background: 'rgba(0,0,0,0.2)', padding: '6px 12px', borderRadius: '4px' }}>
                  {api.value || "Not Configured"}
                </span>
                <button 
                  type="button" 
                  className="btn-test-connection" 
                  style={{ padding: '6px 16px', fontSize: '12px' }}
                  onClick={() => testApi(api.value, api.method)}
                  disabled={!api.value}
                >
                  Test Connection
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter and Search Bar for Tenants */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {["all", "active", "inactive", "expired"].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`btn-secondary ${statusFilter === st ? 'active' : ''}`}
              style={{
                textTransform: 'capitalize',
                padding: '6px 16px',
                fontSize: '13px',
                fontWeight: statusFilter === st ? '700' : '500',
                background: statusFilter === st ? 'rgba(0, 200, 255, 0.15)' : 'rgba(255,255,255,0.03)',
                borderColor: statusFilter === st ? 'var(--accent-primary)' : 'rgba(255,255,255,0.08)'
              }}
            >
              {st === 'all' ? `All Tenants (${clients.length})` : `${st} (${clients.filter(c => st === 'expired' ? (c.computedStatus === 'expired' || c.subscription?.isExpired) : c.computedStatus === st).length})`}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search tenant by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(15, 23, 42, 0.8)',
              color: '#fff',
              fontSize: '13px',
              width: '260px'
            }}
          />

          {isSendzyy ? (
            <div style={{ display: 'flex', gap: '8px' }}>
              {/* <button className="btn-add-mini" onClick={() => {
                setRegisterMode("manual");
                setInviteResult(null);
                setRegisterForm({ name: "", email: "", password: "", planId: "", paymentReference: "" });
                setShowManualRegisterModal(true);
              }}>
                + Register Tenant
              </button> */}
              <button className="btn-add-mini" onClick={() => setShowAddClient(true)}>
                + New Client
              </button>
            </div>
          ) : (
            <button className="btn-add-mini" onClick={() => setShowAddClient(true)}>
              + New Client
            </button>
          )}
        </div>
      </div>

      {/* Main Layout (Side by Side client and package views) */}
      <div className="software-detail-layout">
        
        {/* Clients/Tenants List Section */}
        <section className="detail-main-section">
          <div className="section-header-inline" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h2 className="section-subtitle">{isSendzyy ? "Registered Tenants" : "Subscribed Clients"}</h2>
              <span className="badge-count">{filteredClients.length} Displayed</span>
            </div>
          </div>

          {loadingClients ? (
            <div className="no-data-card">Connecting to {software.name} API...</div>
          ) : clientError ? (
            <div className="connection-error-card">
              <h3 className="error-title">Connection Failed</h3>
              <p className="text-secondary">Unable to reach tenant list API. Verify connectivity under APIs.</p>
              <button className="btn-secondary" style={{ marginTop: '16px' }} onClick={() => isSendzyy ? fetchSendzyyAllData() : fetchExternalData()}>Retry Sync</button>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="no-data-card">No tenants found matching criteria.</div>
          ) : (
            <div className="client-cards-grid">
              {filteredClients.map((client, index) => {
                const computedState = client.computedStatus || (client.isActive ? "active" : "inactive");
                const stateColor = computedState === "active" ? "#10b981" : (computedState === "pending" ? "#00c8ff" : (computedState === "expired" ? "#f59e0b" : "#ef4444"));

                return (
                  <div 
                    key={client._id || index} 
                    className="client-card-premium"
                    onClick={() => setSelectedTenantDetails(client)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="client-card-header" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', minWidth: 0, alignItems: 'center', gap: '12px' }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', minWidth: 0, flex: 1 }}>
                        <div className="client-avatar-small" style={{ background: `linear-gradient(135deg, ${stateColor}, #3b82f6)`, flexShrink: 0 }}>
                          {(client.businessName || 'B').charAt(0).toUpperCase()}
                        </div>
                        <div className="client-card-title" style={{ minWidth: 0, flex: 1 }}>
                            <h3 style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', margin: 0 }}>{client.businessName}</h3>
                            <p className="text-accent" style={{ wordBreak: 'break-all', margin: '2px 0 0 0', fontSize: '12px' }}>{client.ownerName !== client.businessName ? client.ownerName : client.email}</p>
                        </div>
                      </div>

                      <span style={{
                        background: `rgba(${computedState === 'active' ? '16, 185, 129' : computedState === 'pending' ? '0, 200, 255' : computedState === 'expired' ? '245, 158, 11' : '239, 68, 68'}, 0.15)`,
                        color: stateColor,
                        border: `1px solid rgba(${computedState === 'active' ? '16, 185, 129' : computedState === 'pending' ? '0, 200, 255' : computedState === 'expired' ? '245, 158, 11' : '239, 68, 68'}, 0.3)`,
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        flexShrink: 0,
                        marginLeft: '8px'
                      }}>
                        {computedState}
                      </span>
                    </div>
                    
                    <div className="client-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px 0' }}>
                      <div className="client-info-row">
                          <span>Email</span>
                          <span style={{ color: 'var(--text-primary)', wordBreak: 'break-all', textAlign: 'right', marginLeft: '12px', flex: 1 }}>{client.email}</span>
                      </div>

                      {client.whatsappConfig && (client.whatsappConfig.displayPhone || client.whatsappConfig.phoneStatus) && (
                        <div className="client-info-row">
                            <span>WhatsApp</span>
                            <span style={{ color: client.whatsappConfig.verified ? '#10b981' : 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '4px', wordBreak: 'break-all', textAlign: 'right', marginLeft: '12px', flex: 1, justifyContent: 'flex-end' }}>
                              {client.whatsappConfig.verified ? '✅ ' : ''}{client.whatsappConfig.displayPhone || client.whatsappConfig.phoneStatus || 'Not Connected'}
                            </span>
                        </div>
                      )}
                      
                      <div style={{ margin: '8px 0', padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                          <div className="client-info-row">
                              <span>Subscription Plan</span>
                              <span style={{ color: 'var(--accent-secondary)', fontWeight: '600', wordBreak: 'break-all', textAlign: 'right', marginLeft: '12px', flex: 1 }}>
                                {client.packageName || client.subscription?.planName || 'Custom Plan'}
                              </span>
                          </div>
                          {client.packageEndDate && (
                            <div className="client-info-row" style={{ marginTop: '4px' }}>
                                <span>Expiry Date</span>
                                <span style={{ fontSize: '12px', color: client.subscription?.isExpired ? '#ef4444' : 'var(--text-primary)', wordBreak: 'break-all', textAlign: 'right', marginLeft: '12px', flex: 1 }}>
                                  {new Date(client.packageEndDate).toLocaleDateString('en-GB')}
                                  {client.daysRemaining !== null && ` (${client.daysRemaining} days left)`}
                                </span>
                            </div>
                          )}
                          {client.subscription?.price && (
                            <div className="client-info-row" style={{ marginTop: '4px' }}>
                                <span>Plan Price</span>
                                <span style={{ fontSize: '12px', fontWeight: '700', wordBreak: 'break-all', textAlign: 'right', marginLeft: '12px', flex: 1 }}>₹{client.subscription.price}</span>
                            </div>
                          )}
                      </div>
                    </div>

                    <div className="client-card-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <div className="client-info-row" style={{ margin: 0 }}>
                          <span>Access Status</span>
                          <span className={`status-text`} style={{ color: client.computedStatus === 'active' ? '#34c759' : (client.computedStatus === 'pending' ? '#00c8ff' : '#ff3b30'), fontWeight: 600 }}>
                              {client.computedStatus === 'active' ? 'Allowed' : (client.computedStatus === 'pending' ? 'Pending Payment' : 'Blocked')}
                          </span>
                      </div>
                      
                      {client.computedStatus !== 'pending' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleToggleTenantStatus(client); }}
                          style={{
                            background: client.computedStatus === 'active' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                            color: client.computedStatus === 'active' ? '#ef4444' : '#10b981',
                            border: `1px solid ${client.computedStatus === 'active' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                            padding: '6px 12px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          {client.computedStatus === 'active' ? 'Block Access' : 'Unblock Access'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Packages Section */}
        <aside className="detail-sidebar-section">
          <div className="section-header-inline" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
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
                    <div key={pkg._id || pkg.id || index} className="package-card-compact" style={{ opacity: pkg.isActive === false ? 0.6 : 1 }}>
                        <div className="pkg-header-mini">
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                    <h3 style={{ margin: 0, fontSize: '15px' }}>{pkg.name}</h3>
                                    <span style={{ 
                                        background: 'rgba(168, 85, 247, 0.1)', 
                                        color: 'var(--accent-secondary)', 
                                        padding: '2px 8px', 
                                        borderRadius: '4px', 
                                        fontSize: '12px', 
                                        fontWeight: '700',
                                        border: '1px solid rgba(168, 85, 247, 0.2)'
                                    }}>
                                        {pkg.panelDays ? `${pkg.panelDays} Days` : (pkg.durationDays ? `${pkg.durationDays} Days` : `${pkg.duration?.value || pkg.durationValue || '0'} ${pkg.duration?.unit || 'days'}`)}
                                    </span>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span className="pkg-price-mini" style={{ fontSize: '16px', fontWeight: '800' }}>
                                    ₹{pkg.totalPrice ?? pkg.price ?? pkg.basePrice ?? 0}
                                  </span>
                                  {pkg.basePrice && pkg.gstPercent && (
                                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                                      (Base ₹{pkg.basePrice} + {pkg.gstPercent}% GST)
                                    </span>
                                  )}
                                </div>
                            </div>
                            
                            <div className="pkg-actions-mini" style={{ display: 'flex', gap: '6px', marginLeft: '12px' }}>
                                <button className="btn-icon-mini" onClick={() => setEditingPackage(pkg)} title="Edit Plan">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                </button>
                                <button className="btn-icon-mini delete" onClick={() => handleDeletePackage(pkg)} title="Delete Plan">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path></svg>
                                </button>
                            </div>
                        </div>

                        {pkg.planId && (
                          <div style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                            Plan ID: {pkg.planId}
                          </div>
                        )}

                        <p className="pkg-desc-mini" style={{ margin: '8px 0', fontSize: '12px' }}>{pkg.description || 'No description provided.'}</p>
                        
                        {pkg.services && Array.isArray(pkg.services) && pkg.services.length > 0 && (
                            <div className="pkg-services-list" style={{ marginTop: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
                                <p style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '6px', fontWeight: '600' }}>Features:</p>
                                <div className="pkg-meta-tags">
                                    {pkg.services.map((s, i) => (
                                        <span key={i} className="mini-badge" style={{ borderColor: 'var(--accent-primary)', opacity: 0.8 }}>
                                            {typeof s === 'string' ? s : (s.name || 'Feature')}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ))
            )}
          </div>
        </aside>

      </div>

      {/* Modal: Sendzyy Manual Registration */}
      {showManualRegisterModal && (
        <div className="drawer-overlay active" onClick={() => setShowManualRegisterModal(false)}>
          <div className="side-drawer active" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="drawer-header">
              <h2 className="drawer-title">
                Register Tenant in Sendzyy
              </h2>
              <button className="close-drawer" onClick={() => setShowManualRegisterModal(false)}>&times;</button>
            </div>
            
            <form onSubmit={handleRegisterManualTenant} className="drawer-body">
              <div className="form-grid single-column" style={{ gap: '16px' }}>
                <div className="form-group">
                  <label>Business Name <span className="required">*</span></label>
                  <input
                    type="text"
                    placeholder="e.g. Care Plus Clinic"
                    value={registerForm.name}
                    onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Tenant Email <span className="required">*</span></label>
                  <input
                    type="email"
                    placeholder="e.g. careplus@gmail.com"
                    value={registerForm.email}
                    onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Temporary Password <span className="required">*</span></label>
                  <input
                    type="text"
                    placeholder="e.g. TempPass123!"
                    value={registerForm.password}
                    onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                    required
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                    Will be emailed to the tenant for first login.
                  </span>
                </div>

                <div className="form-group">
                  <label>Subscription Package Plan <span className="required">*</span></label>
                  <select
                    className="filter-select"
                    style={{ width: '100%', padding: '12px', marginTop: '6px' }}
                    value={registerForm.planId}
                    onChange={(e) => setRegisterForm({ ...registerForm, planId: e.target.value })}
                    required
                  >
                    <option value="">Select Plan...</option>
                    {packages.map(p => (
                      <option key={p._id || p.id || p.planId} value={p.planId || p._id}>
                        {p.name} (₹{p.totalPrice || p.price || p.basePrice}) — {p.panelDays || 30} Days
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginTop: '24px', padding: '12px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <p style={{ fontSize: '12px', color: '#10b981', margin: 0, lineHeight: 1.5 }}>
                  ⚡ This manual registration creates a tenant account directly in Sendzyy (Blocked by default). 
                  <br /><br />
                  <strong>Note:</strong> It does NOT send a payment link. To email a secure payment link and activate them automatically on payment, close this modal and click <strong>+ New Client</strong> instead.
                </p>
              </div>

              <div className="drawer-actions" style={{ marginTop: '24px', padding: 0 }}>
                <button type="submit" className="btn-primary" disabled={registering}>
                  {registering ? "Processing..." : "Register Tenant"}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowManualRegisterModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddClient && (
        <AddNewClient
          initialSoftware={software}
          onClose={() => setShowAddClient(false)}
          onSuccess={() => {
            setShowAddClient(false);
            isSendzyy ? fetchSendzyyAllData() : fetchExternalData();
          }}
        />
      )}

      {/* Tenant Details Side Drawer */}
      {selectedTenantDetails && (
        <div className="drawer-overlay" onClick={() => setSelectedTenantDetails(null)}>
          <div className="side-drawer" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
            <div className="drawer-header">
              <h2 className="drawer-title">Tenant Profile & History</h2>
              <button className="close-drawer" onClick={() => setSelectedTenantDetails(null)}>×</button>
            </div>
            
            <div className="drawer-body">
              {loadingTenantDetails ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', color: '#64748b' }}>
                  Loading details...
                </div>
              ) : (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#3b82f6' }}>Tenant Information</h4>
                      <p style={{ margin: '6px 0', fontSize: '13px', color: '#e2e8f0' }}><strong>Business:</strong> {selectedTenantDetails.businessName}</p>
                      <p style={{ margin: '6px 0', fontSize: '13px', color: '#e2e8f0' }}><strong>Owner:</strong> {selectedTenantDetails.ownerName}</p>
                      <p style={{ margin: '6px 0', fontSize: '13px', color: '#e2e8f0' }}><strong>Email:</strong> {selectedTenantDetails.email}</p>
                      <p style={{ margin: '6px 0', fontSize: '13px', color: '#e2e8f0' }}><strong>WhatsApp:</strong> {selectedTenantDetails.phoneNumber || '—'}</p>
                      {tenantLocalRecord?.createdByReseller && (
                        <p style={{ margin: '6px 0', fontSize: '13px', color: '#ffc107', fontWeight: 600 }}>
                          <strong>Reseller Partner:</strong> {tenantLocalRecord.createdByReseller.companyName || tenantLocalRecord.createdByReseller.name}
                          {tenantLocalRecord.createdByResellerEmployee && ` (${tenantLocalRecord.createdByResellerEmployee.name})`}
                        </p>
                      )}
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#10b981' }}>Subscription Status</h4>
                      <p style={{ margin: '6px 0', fontSize: '13px', color: '#e2e8f0' }}>
                        <strong>Current Plan:</strong> <span style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>{selectedTenantDetails.packageName || '—'}</span>
                      </p>
                      <p style={{ margin: '6px 0', fontSize: '13px', color: '#e2e8f0' }}>
                        <strong>Expiry Date:</strong> {selectedTenantDetails.packageEndDate ? new Date(selectedTenantDetails.packageEndDate).toLocaleDateString('en-GB') : 'No Expiry'}
                      </p>
                      <p style={{ margin: '6px 0', fontSize: '13px', color: '#e2e8f0' }}>
                        <strong>Days Left:</strong> {selectedTenantDetails.daysRemaining !== null ? `${selectedTenantDetails.daysRemaining} Days` : 'N/A'}
                      </p>
                      <p style={{ margin: '6px 0', fontSize: '13px', color: '#e2e8f0' }}>
                       <strong>Access Status:</strong> <span style={{ color: selectedTenantDetails.isActive ? '#10b981' : (selectedTenantDetails.computedStatus === 'pending' ? '#00c8ff' : '#ef4444'), fontWeight: 'bold' }}>{selectedTenantDetails.computedStatus === 'active' ? 'Allowed' : (selectedTenantDetails.computedStatus === 'pending' ? 'Pending Payment' : 'Blocked')}</span>
                      </p>
                    </div>
                  </div>

                  {tenantLocalRecord && (
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '24px' }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#f59e0b' }}>Local Account & Payment Info</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <p style={{ margin: '2px 0', fontSize: '13px', color: '#e2e8f0' }}><strong>Payment Status:</strong> <span style={{ background: (razorpayDetails?.status || tenantLocalRecord.paymentStatus) === 'completed' || (razorpayDetails?.status || tenantLocalRecord.paymentStatus) === 'captured' || (razorpayDetails?.status || tenantLocalRecord.paymentStatus) === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: (razorpayDetails?.status || tenantLocalRecord.paymentStatus) === 'completed' || (razorpayDetails?.status || tenantLocalRecord.paymentStatus) === 'captured' || (razorpayDetails?.status || tenantLocalRecord.paymentStatus) === 'success' ? '#10b981' : '#ef4444', borderRadius: '12px', fontSize: '11px', padding: '2px 6px' }}>{razorpayDetails?.status || tenantLocalRecord.paymentStatus || 'pending'}</span></p>
                        <p style={{ margin: '2px 0', fontSize: '13px', color: '#e2e8f0' }}><strong>Transaction ID:</strong> <span style={{ fontFamily: 'monospace', color: '#94a3b8' }}>{razorpayDetails?.id || tenantLocalRecord.transactionId || '—'}</span></p>
                        <p style={{ margin: '2px 0', fontSize: '13px', color: '#e2e8f0' }}><strong>Payment Amount:</strong> ₹{razorpayDetails?.amount ?? tenantLocalRecord.paymentAmount ?? '—'}</p>
                        <p style={{ margin: '2px 0', fontSize: '13px', color: '#e2e8f0' }}><strong>Payment Method:</strong> {razorpayDetails?.method || tenantLocalRecord.paymentMethod || '—'}</p>
                        {(razorpayDetails?.created_at || tenantLocalRecord.paymentDate) && (
                          <p style={{ margin: '2px 0', fontSize: '13px', gridColumn: 'span 2', color: '#e2e8f0' }}>
                            <strong>Payment Date:</strong> {razorpayDetails?.created_at ? new Date(razorpayDetails.created_at * 1000).toLocaleString('en-GB') : new Date(tenantLocalRecord.paymentDate).toLocaleString('en-GB')}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'white', margin: '24px 0 12px 0', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px' }}>Payment History</h3>
                  
                  <div className="table-container" style={{ overflowX: 'auto' }}>
                    <table className="data-table history-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.02)', textAlign: 'left' }}>
                          <th style={{ padding: '10px', fontSize: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#64748b' }}>Date</th>
                          <th style={{ padding: '10px', fontSize: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#64748b' }}>Package</th>
                          <th style={{ padding: '10px', fontSize: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#64748b' }}>Amount</th>
                          <th style={{ padding: '10px', fontSize: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#64748b' }}>Transaction ID</th>
                          <th style={{ padding: '10px', fontSize: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#64748b', textAlign: 'right' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const displayHistory = tenantHistory.length > 0 
                            ? tenantHistory.map(tx => {
                                const sanitizedTxId = tx.paymentId || tx.transactionId;
                                const isRpMatch = razorpayDetails && sanitizedTxId &&
                                  sanitizedTxId.replace(/\s+/g, "").toLowerCase() === razorpayDetails.id.toLowerCase();
                                return {
                                  ...tx,
                                  amount: isRpMatch ? razorpayDetails.amount : (tx.amount ?? '—'),
                                  paymentId: isRpMatch ? razorpayDetails.id : (tx.paymentId || tx.transactionId || '—')
                                };
                              })
                            : (tenantLocalRecord
                                ? [{
                                    _id: 'synth-local',
                                    paymentDate: tenantLocalRecord.paymentDate || tenantLocalRecord.createdAt,
                                    packageName: tenantLocalRecord.packageName || selectedTenantDetails.packageName,
                                    amount: razorpayDetails ? razorpayDetails.amount : (tenantLocalRecord.paymentAmount ?? '—'),
                                    paymentId: razorpayDetails ? razorpayDetails.id : (tenantLocalRecord.transactionId || 'MANUAL'),
                                    status: razorpayDetails ? razorpayDetails.status : (tenantLocalRecord.paymentStatus || 'completed')
                                  }]
                                : (selectedTenantDetails?.packageName && selectedTenantDetails.packageName !== '—'
                                    ? [{
                                        _id: 'synth-1',
                                        paymentDate: selectedTenantDetails.createdAt,
                                        packageName: selectedTenantDetails.packageName,
                                        amount: selectedTenantDetails.subscription?.price ?? selectedTenantDetails.subscription?.totalPrice ?? '—',
                                        paymentId: selectedTenantDetails.subscription?.transactionId || 'MANUAL/EXTERNAL',
                                        status: 'completed'
                                      }]
                                    : []
                                  )
                              );

                          if (displayHistory.length === 0) {
                            return (
                              <tr>
                                <td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>No payment history found.</td>
                              </tr>
                            );
                          }

                          return displayHistory.map((tx, idx) => (
                            <tr key={tx._id || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                              <td style={{ padding: '10px', fontSize: '12px', color: '#94a3b8' }}>
                                {tx.paymentDate || tx.createdAt ? new Date(tx.paymentDate || tx.createdAt).toLocaleDateString('en-GB') : '—'}
                              </td>
                              <td style={{ padding: '10px', fontSize: '12px', color: 'white', fontWeight: 500 }}>
                                {tx.packageName || tx.packageId?.name || '—'}
                              </td>
                              <td style={{ padding: '10px', fontSize: '12px', color: '#10b981', fontWeight: 600 }}>
                                ₹{tx.amount ?? '—'}
                              </td>
                              <td style={{ padding: '10px', fontSize: '12px', fontFamily: 'monospace', color: '#64748b' }}>
                                {tx.paymentId || tx.transactionId || '—'}
                              </td>
                              <td style={{ padding: '10px', fontSize: '12px', textAlign: 'right' }}>
                                <span style={{ background: (tx.status || 'success') === 'success' || (tx.status || 'success') === 'completed' || (tx.status || 'success') === 'captured' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: (tx.status || 'success') === 'success' || (tx.status || 'success') === 'completed' || (tx.status || 'success') === 'captured' ? '#10b981' : '#ef4444', borderRadius: '4px', fontSize: '10px', padding: '2px 6px', fontWeight: 'bold' }}>
                                  {tx.status || 'success'}
                                </span>
                              </td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="drawer-actions">
              <button className="btn-secondary" onClick={() => setSelectedTenantDetails(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .drawer-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(8px);
          z-index: 2000;
          display: flex;
          justify-content: flex-end;
          transition: all 0.3s ease;
        }
        .side-drawer {
          width: 100%;
          max-width: 520px;
          height: 100vh;
          background: #0b0f19;
          border-left: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          flex-direction: column;
          animation: slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: -20px 0 50px rgba(0,0,0,0.6);
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .drawer-header {
          padding: 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .drawer-title {
          font-size: 1.25rem;
          font-weight: 700;
          margin: 0;
          color: white;
        }
        .close-drawer {
          background: none;
          border: none;
          color: var(--text-tertiary);
          font-size: 32px;
          cursor: pointer;
          line-height: 1;
          transition: color 0.2s;
        }
        .close-drawer:hover {
          color: #ff3b30;
        }
        .drawer-body {
          flex: 1;
          overflow-y: auto;
          padding: 32px 24px;
        }
        .drawer-actions {
          padding: 24px;
          border-top: 1px solid rgba(255,255,255,0.05);
          display: flex;
          gap: 12px;
        }
      `}</style>
    </div>
  );
};

export default SoftwareModulePage;
