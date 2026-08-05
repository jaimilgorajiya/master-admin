import { useState, useEffect, useContext } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { TableSkeleton } from "./LoadingSkeleton";
import { SocketContext } from "../context/SocketContext";

const EmployeeServiceManagement = () => {
    const [services, setServices] = useState([]);
    const [filteredServices, setFilteredServices] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Filters
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        fetchServices();
    }, []);

    const socket = useContext(SocketContext);

    useEffect(() => {
        if (!socket) return;

        const handleServiceChange = (data) => {
            // console.log("Employee Service Update:", data);
            fetchServices();
        };

        socket.on("service_data_change", handleServiceChange);

        return () => {
            socket.off("service_data_change", handleServiceChange);
        };
    }, [socket]);

    useEffect(() => {
        filterServices();
        // eslint-disable-next-line
    }, [services, searchTerm]);

    const fetchServices = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("employeeToken");
            const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/service/all`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if(res.data.success) {
                setServices(res.data.services);
            }
        } catch (error) {
            console.error("Fetch services error", error);
            toast.error("Failed to load services");
        } finally {
            setLoading(false);
        }
    };

    const filterServices = () => {
        let filtered = [...services];

        if (searchTerm.trim()) {
            const lowerSearch = searchTerm.toLowerCase();
            filtered = filtered.filter(s => 
                s.name.toLowerCase().includes(lowerSearch) ||
                (s.description && s.description.toLowerCase().includes(lowerSearch))
            );
        }

        setFilteredServices(filtered);
    };

    return (
        <div className="card-container">
            <div className="page-header">
                <h1 className="page-title">Service Management</h1>
            </div>

            {/* Filters */}
             <div className="search-filter-section">
                <div className="search-box">
                    <input 
                        type="text" 
                        placeholder="Search services..." 
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
                            <th>Service Name</th>
                            <th>Description</th>
                            <th>Price</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                             <tr><td colSpan="4" style={{textAlign: 'center'}}><TableSkeleton columns={4} rows={5}/></td></tr>
                        ) : filteredServices.length === 0 ? (
                            <tr>
                                <td colSpan="4" style={{ textAlign: "center", padding: "2rem" }}>No services found</td>
                            </tr>
                        ) : (
                            filteredServices.map(service => (
                                <tr key={service._id}>
                                    <td className="font-semibold">{service.name}</td>
                                    <td>{service.description || "N/A"}</td>
                                    <td>₹{service.price}</td>
                                    <td>
                                        <span 
                                            className="status-badge"
                                            style={{
                                                backgroundColor: service.isActive ? 'rgba(74, 222, 128, 0.1)' : 'rgba(248, 113, 113, 0.1)',
                                                color: service.isActive ? '#4ade80' : '#f87171',
                                                border: `1px solid ${service.isActive ? 'rgba(74, 222, 128, 0.2)' : 'rgba(248, 113, 113, 0.2)'}`,
                                                padding: '4px 12px',
                                                borderRadius: '20px',
                                                fontSize: '12px',
                                                fontWeight: 600,
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px'
                                            }}
                                        >
                                            {service.isActive ? 'Active' : 'Inactive'}
                                        </span>
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

export default EmployeeServiceManagement;
