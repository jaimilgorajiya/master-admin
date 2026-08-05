import { useState, useEffect, useContext } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import Swal from "sweetalert2";
import AddPackage from "./AddPackage";
import EditPackage from "./EditPackage";
import { TableSkeleton } from "./LoadingSkeleton";
import { SocketContext } from "../context/SocketContext";
import DetailViewModal from "./DetailViewModal";

const PackageManagement = ({ initialShowAddForm, onFormClose }) => {
    const [packages, setPackages] = useState([]);
    const [filteredPackages, setFilteredPackages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(initialShowAddForm || false);
    const [editingPackageId, setEditingPackageId] = useState(null);
    const [selectedDetailItem, setSelectedDetailItem] = useState(null); 
    
    const [searchTerm, setSearchTerm] = useState("");

    const socket = useContext(SocketContext);

    // Fetch Initial Data
    const fetchData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("adminToken");
            const headers = { Authorization: `Bearer ${token}` };
            const pkgRes = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/package/all`, { headers });
            if (pkgRes.data.success) {
                setPackages(pkgRes.data.packages);
                setFilteredPackages(pkgRes.data.packages);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
            toast.error("Failed to load packages");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Socket Listener
    useEffect(() => {
        if (!socket) return;
        const handleChange = () => fetchData();
        socket.on("package_data_updated", handleChange);
        return () => socket.off("package_data_updated", handleChange);
    }, [socket]);


    // Filter Logic
    useEffect(() => {
        let result = packages;

        // Only show Service Packages (packages with serviceIds)
        result = result.filter(p => p.serviceIds && p.serviceIds.length > 0);

        // Filter by Search
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            result = result.filter(p => p.name.toLowerCase().includes(lowerTerm));
        }

        setFilteredPackages(result);
    }, [packages, searchTerm]);


    const handleToggleStatus = async (pkg) => {
        try {
            const token = localStorage.getItem("adminToken");
            await axios.patch(
                `${import.meta.env.VITE_API_BASE_URL}/api/package/update/${pkg._id}`, 
                { isActive: !pkg.isActive },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success("Status updated");
            // Update local state
            setPackages(prev => prev.map(p => p._id === pkg._id ? { ...p, isActive: !p.isActive } : p));
        } catch (error) {
            toast.error("Failed to update status");
        }
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: 'Delete Package?',
            text: "This action cannot be undone. Are you sure you want to delete this package?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: 'rgba(255,255,255,0.05)',
            confirmButtonText: 'Yes, Delete Package',
            cancelButtonText: 'Cancel',
            background: '#0f172a',
            color: '#ffffff',
            customClass: {
                popup: 'premium-swal-popup',
                confirmButton: 'premium-swal-confirm-danger',
                cancelButton: 'premium-swal-cancel',
            },
        });

        if (result.isConfirmed) {
            try {
                const token = localStorage.getItem("adminToken");
                await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/api/package/delete/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toast.success("Package deleted");
                setPackages(prev => prev.filter(p => p._id !== id));
            } catch (error) {
                toast.error("Failed to delete package");
            }
        }
    };

    const openDetailView = (pkg) => {
        setSelectedDetailItem(pkg);
    };
  
    const closeDetailView = () => {
        setSelectedDetailItem(null);
    };

    if (showForm) {
        return <AddPackage onBack={() => setShowForm(false)} onSuccess={() => { setShowForm(false); fetchData(); if (onFormClose) onFormClose(); }} />;
        // Note: Reload is a crude way to refresh, but matches implicit previous behavior if refresh logic wasn't passed
    }

    if (editingPackageId) {
       const pkgToEdit = packages.find(p => p._id === editingPackageId);
       return <EditPackage pkg={pkgToEdit} onClose={() => setEditingPackageId(null)} onPackageUpdated={() => window.location.reload()} />;
    }

    return (
        <div className="card-container">
            {/* Detail Modal */}
            {selectedDetailItem && (
                <DetailViewModal 
                    item={selectedDetailItem} 
                    type="package" 
                    onClose={closeDetailView} 
                />
            )}

            <div className="page-header">
                <h1 className="page-title">Service Package Management</h1>
                <button className="btn-primary" onClick={() => setShowForm(true)}>
                    + Add New Package
                </button>
            </div>

            {/* Filters */}
            <div className="search-filter-section" style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '20px' }}>
                <div className="search-box" style={{ flex: 1 }}>
                    <input 
                        type="text" 
                        placeholder="Search service packages..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                    <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
                        <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                </div>
            </div>


            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Package Name</th>
                            <th>Services</th>
                            <th>Duration</th>
                            <th>Price</th>
                            <th>Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                             <tr><td colSpan="6" style={{textAlign: 'center'}}><TableSkeleton columns={6} rows={5}/></td></tr>
                        ) : filteredPackages.length === 0 ? (
                            <tr>
                                <td colSpan="6" style={{ textAlign: "center", padding: "2rem" }}>No packages found</td>
                            </tr>
                        ) : (
                            filteredPackages.map(pkg => (
                                <tr key={pkg._id}>
                                    <td 
                                        className="font-semibold"
                                        onClick={() => openDetailView(pkg)}
                                        style={{ cursor: 'pointer', color: 'var(--text-primary)', textDecoration: 'underline', textDecorationColor: 'var(--accent-primary)', textUnderlineOffset: '4px' }}
                                        onMouseEnter={(e) => e.target.style.color = 'var(--accent-primary)'}
                                        onMouseLeave={(e) => e.target.style.color = 'var(--text-primary)'}
                                        title="Click to view full details"
                                    >
                                        {pkg.name}
                                    </td>
                                    <td>
                                        {pkg.serviceIds?.length > 0 
                                            ? pkg.serviceIds.map(s => s.name).join(', ') 
                                            : "No Services"}
                                    </td>
                                    <td >{pkg.durationDays} {pkg.unit || 'Days'}</td>
                                    <td>₹{pkg.price}</td>
                                    <td>
                                        <label className="toggle-switch">
                                            <input 
                                                type="checkbox" 
                                                checked={pkg.isActive} 
                                                onChange={() => handleToggleStatus(pkg)} 
                                            />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'start' }}>
                                            <button className="btn-icon" onClick={() => setEditingPackageId(pkg._id)} title="Edit">
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                                </svg>
                                            </button>
                                            <button className="btn-icon btn-delete" onClick={() => handleDelete(pkg._id)} title="Delete">
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="3 6 5 6 21 6"></polyline>
                                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PackageManagement;
