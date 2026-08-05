import { useState, useEffect } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import toast from "react-hot-toast";
import { TableSkeleton } from "./LoadingSkeleton";

const DepartmentManagement = ({ onDepartmentChange }) => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [formData, setFormData] = useState({ name: "" });

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("adminToken") || sessionStorage.getItem("adminToken");
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/department/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        setDepartments(response.data.departments);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load departments");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("adminToken") || sessionStorage.getItem("adminToken");
      const url = editingDepartment 
        ? `${import.meta.env.VITE_API_BASE_URL}/api/department/update/${editingDepartment._id}`
        : `${import.meta.env.VITE_API_BASE_URL}/api/department/create`;
      
      const method = editingDepartment ? "put" : "post";
      
      const response = await axios[method](url, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        toast.success(response.data.message);
        fetchDepartments();
        handleCloseForm();
        onDepartmentChange?.();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Operation failed");
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      const token = localStorage.getItem("adminToken") || sessionStorage.getItem("adminToken");
      const response = await axios.patch(
        `${import.meta.env.VITE_API_BASE_URL}/api/department/toggle-status/${id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) {
        toast.success("Status updated");
        fetchDepartments();
        onDepartmentChange?.();
      }
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const handleEdit = (dept) => {
    setEditingDepartment(dept);
    setFormData({ name: dept.name });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Delete Department?",
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
        await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/api/department/delete/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success("Department deleted");
        fetchDepartments();
        onDepartmentChange?.();
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to delete");
      }
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingDepartment(null);
    setFormData({ name: "" });
  };

  if (showForm) {
    return (
      <div className="form-center">
        <div className="form-card">
          <div className="page-header">
            <h2 className="page-title">{editingDepartment ? "Edit Department" : "Add Department"}</h2>
            <button className="btn-secondary" onClick={handleCloseForm}>Back</button>
          </div>
          <form onSubmit={handleSubmit} className="form-layout">
            <div className="form-group">
              <label>Department Name <span className="required">*</span></label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="e.g. Engineering, HR"
              />
            </div>
            <button type="submit" className="btn-primary">
              {editingDepartment ? "Update Department" : "Create Department"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="module-card">
      <div className="module-header">
        <h2 className="module-title">Departments</h2>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          + Add New Department
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '20px' }}>
          <TableSkeleton rows={5} columns={3} />
        </div>
      ) : (
        <div className="table-container" style={{ border: 'none', borderRadius: 0, boxShadow: 'none' }}>
          <table className="data-table compact">
            <thead>
              <tr style={{textAlign: 'left'}}>
                <th style={{ width: "50%" }}>Name</th>
                <th style={{ width: "25%" }}>Status</th>
                <th style={{ width: "25%" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {departments.length === 0 ? (
                <tr><td colSpan="3" className="no-data" style={{ padding: '30px' }}>No departments found.</td></tr>
              ) : (
                departments.map((dept) => (
                  <tr key={dept._id}>
                    <td className="font-semibold align-middle">{dept.name}</td>
                    <td className="text-center align-middle">
                      <div style={{ display: 'flex', justifyContent: 'start' }}>
                        <label className="toggle-switch small">
                          <input
                            type="checkbox"
                            checked={dept.isActive}
                            onChange={() => handleToggleStatus(dept._id)}
                            disabled={loading}
                          />
                          <span className="toggle-slider"></span>
                        </label>
                      </div>
                    </td>
                    <td className="text-right align-middle">
                      <div className="actions-cell">
                        <button className="btn-icon btn-edit" onClick={() => handleEdit(dept)} title="Edit">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button className="btn-icon btn-delete" onClick={() => handleDelete(dept._id)} title="Delete">
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

export default DepartmentManagement;
