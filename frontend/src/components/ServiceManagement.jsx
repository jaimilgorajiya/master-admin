import { useState, useEffect, useContext } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import toast from "react-hot-toast";
import AddService from "./AddService";
import EditService from "./EditService";
import { SocketContext } from "../context/SocketContext";

const ServiceManagement = ({ initialShowAddForm, onFormClose }) => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(initialShowAddForm || false);
  const [editingService, setEditingService] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchServices();
  }, []);

  useEffect(() => {
    if (initialShowAddForm) {
        setShowAddForm(true);
    }
  }, [initialShowAddForm]);

  const socket = useContext(SocketContext);

  useEffect(() => {
    if (!socket) return;

    const handleServiceChange = (data) => {
        // console.log("Service Update Received:", data);
        fetchServices();
    };

    socket.on("service_data_change", handleServiceChange);

    return () => {
        socket.off("service_data_change", handleServiceChange);
    };
  }, [socket]);

  const fetchServices = async () => {
    try {
      const token = localStorage.getItem("adminToken") || sessionStorage.getItem("adminToken");
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/service/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setServices(response.data.services);
      }
    } catch (error) {
      console.error("Error fetching services:", error);
      toast.error("Failed to load services");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    try {
        const token = localStorage.getItem("adminToken") || sessionStorage.getItem("adminToken");
        const response = await axios.patch(
            `${import.meta.env.VITE_API_BASE_URL}/api/service/toggle-status/${id}`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
        );

        if (response.data.success) {
            toast.success(response.data.message);
            fetchServices();
        }
    } catch (error) {
        console.error("Error toggling status:", error);
        toast.error("Failed to update status");
    }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Delete Service?",
      text: "Are you sure you want to delete this service? This action cannot be undone.",
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
        confirmButton: "premium-swal-confirm-danger",
        cancelButton: "premium-swal-cancel",
      }
    });

    if (result.isConfirmed) {
      try {
        const token = localStorage.getItem("adminToken") || sessionStorage.getItem("adminToken");
        await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/api/service/delete/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        toast.success("Service deleted successfully");
        fetchServices();
      } catch (error) {
        toast.error("Failed to delete service");
      }
    }
  };

  const handleSuccess = (msg) => {
    toast.success(msg);
    setShowAddForm(false);
    setEditingService(null);
    if (onFormClose) onFormClose();
    fetchServices();
  };

  if (showAddForm) {
    return (
      <AddService
        onBack={() => {
            setShowAddForm(false);
            if(onFormClose) onFormClose();
        }}
        onSuccess={handleSuccess}
      />
    );
  }

  if (editingService) {
    return (
      <EditService
        service={editingService}
        onBack={() => setEditingService(null)}
        onSuccess={handleSuccess}
      />
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Service Management</h1>
        <button
          className="btn-primary"
          onClick={() => setShowAddForm(true)}
        >
          + Add New Service
        </button>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Service Name</th>
              <th>Description</th>
              <th>Price</th>
              <th>Duration</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="4" className="text-center">
                  Loading...
                </td>
              </tr>
            ) : services.length === 0 ? (
              <tr>
                <td colSpan="4" className="text-center">
                  No services found
                </td>
              </tr>
            ) : (
              services.map((service) => (
                <tr key={service._id}>
                  <td>{service.name}</td>
                  <td>{service.description || "-"}</td>
                  <td>₹{service.price || 0}</td>
                  <td>
                    {service.durationUnit === 'one-time' ? 'One-Time' :
                     service.durationUnit === 'lifetime' ? 'Lifetime' :
                     service.duration ? `${service.duration} Month${service.duration > 1 ? 's' : ''}` : '—'}
                  </td>
                  <td>
                     <label className="switch">
                        <input
                            type="checkbox"
                            checked={service.isActive}
                            onChange={() => handleToggleStatus(service._id, service.isActive)}
                        />
                        <span className="slider round"></span>
                    </label>
                  </td>
                  <td>
                    <div className="action-buttons">
                        <button 
                            className="btn-icon"
                            onClick={() => setEditingService(service)}
                            title="Edit"
                        >
                             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </button>
                      <button
                        className="btn-icon delete"
                        onClick={() => handleDelete(service._id)}
                        title="Delete"
                      >
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
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

export default ServiceManagement;
