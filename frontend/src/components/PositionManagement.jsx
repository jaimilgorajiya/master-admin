import { useState, useEffect } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import toast from "react-hot-toast";
import { TableSkeleton } from "./LoadingSkeleton";

const PositionManagement = ({ refreshKey }) => {
  const [positions, setPositions] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPosition, setEditingPosition] = useState(null);
  const [formData, setFormData] = useState({ name: "", departmentId: "" });

  useEffect(() => {
    fetchPositions();
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (refreshKey) fetchDepartments();
  }, [refreshKey]);

  const fetchPositions = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("adminToken") || sessionStorage.getItem("adminToken");
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/position/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        setPositions(response.data.positions);
      }
    } catch (err) {
      toast.error("Failed to load positions");
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const token = localStorage.getItem("adminToken") || sessionStorage.getItem("adminToken");
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/department/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        // Filter only active departments for dropdown
        setDepartments(response.data.departments.filter(d => d.isActive));
      }
    } catch (err) {
      console.error("Failed to load departments");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("adminToken") || sessionStorage.getItem("adminToken");
      const url = editingPosition 
        ? `${import.meta.env.VITE_API_BASE_URL}/api/position/update/${editingPosition._id}`
        : `${import.meta.env.VITE_API_BASE_URL}/api/position/create`;
      
      const method = editingPosition ? "put" : "post";
      
      const response = await axios[method](url, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        toast.success(response.data.message);
        fetchPositions();
        handleCloseForm();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Operation failed");
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      const token = localStorage.getItem("adminToken") || sessionStorage.getItem("adminToken");
      const response = await axios.patch(
        `${import.meta.env.VITE_API_BASE_URL}/api/position/toggle-status/${id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) {
        toast.success("Status updated");
        fetchPositions();
      }
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const handleEdit = (pos) => {
    setEditingPosition(pos);
    setFormData({ name: pos.name, departmentId: pos.departmentId?._id || "" });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Delete Position?",
      text: "All associated employee records will be impacted. This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#00c8ff",
      cancelButtonColor: "rgba(255,255,255,0.05)",
      confirmButtonText: "Yes, Delete",
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
        await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/api/position/delete/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success("Position deleted");
        fetchPositions();
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to delete");
      }
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingPosition(null);
    setFormData({ name: "", departmentId: "" });
  };

  if (showForm) {
    return (
      <div className="form-center">
        <div className="form-card">
          <div className="page-header">
            <h2 className="page-title">{editingPosition ? "Edit Position" : "Add Position"}</h2>
            <button className="btn-secondary" onClick={handleCloseForm}>Back</button>
          </div>
          <form onSubmit={handleSubmit} className="form-layout">
            <div className="form-group">
              <label>Position Name <span className="required">*</span></label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="e.g. Senior Developer, HR Manager"
              />
            </div>
            <div className="form-group">
              <label>Department <span className="required">*</span></label>
              <select
                value={formData.departmentId}
                onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                required
              >
                <option value="">Select Department</option>
                {departments.map(dept => (
                  <option key={dept._id} value={dept._id}>{dept.name}</option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn-primary">
              {editingPosition ? "Update Position" : "Create Position"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="module-card">
      <div className="module-header">
        <h2 className="module-title">Positions</h2>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          + Add New Position
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '20px' }}>
          <TableSkeleton rows={5} columns={4} />
        </div>
      ) : (
        <div className="table-container" style={{ border: 'none', borderRadius: 0, boxShadow: 'none' }}>
          <table className="data-table compact">
            <thead>
              <tr>
                <th className="text-left" style={{ width: "35%" }}>Name</th>
                <th className="text-left" style={{ width: "35%" }}>Department</th>
                <th className="text-center" style={{ width: "15%" }}>Status</th>
                <th className="text-right" style={{ width: "15%" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {positions.length === 0 ? (
                <tr><td colSpan="4" className="no-data" style={{ padding: '30px' }}>No positions found.</td></tr>
              ) : (
                positions.map((pos) => (
                  <tr key={pos._id}>
                    <td className="font-semibold align-middle">{pos.name}</td>
                    <td className="align-middle">{pos.departmentId?.name || "N/A"}</td>
                    <td className="text-center align-middle">
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                         <label className="toggle-switch small">
                          <input
                            type="checkbox"
                            checked={pos.isActive}
                            onChange={() => handleToggleStatus(pos._id)}
                            disabled={loading}
                          />
                          <span className="toggle-slider"></span>
                        </label>
                      </div>
                    </td>
                    <td className="text-right align-middle">
                      <div className="actions-cell">
                        <button className="btn-icon btn-edit" onClick={() => handleEdit(pos)} title="Edit">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button className="btn-icon btn-delete" onClick={() => handleDelete(pos._id)} title="Delete">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PositionManagement;
