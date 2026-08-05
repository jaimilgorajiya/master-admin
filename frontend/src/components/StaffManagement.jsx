import { useState, useEffect, useContext } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import toast from "react-hot-toast";
import { TableSkeleton } from "./LoadingSkeleton";
import AddStaff from "./AddStaff";
import EditStaff from "./EditStaff";
import { SocketContext } from "../context/SocketContext";

const StaffManagement = ({ initialShowAddForm = false, onFormClose }) => {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(initialShowAddForm);
  const [editingStaff, setEditingStaff] = useState(null);

  useEffect(() => {
    fetchStaff();
  }, []);

  const socket = useContext(SocketContext);

  useEffect(() => {
    if (!socket) return;

    const handleStaffChange = (data) => {
        // console.log("Staff Update Received:", data);
        fetchStaff();
    };

    socket.on("staff_data_change", handleStaffChange);

    return () => {
        socket.off("staff_data_change", handleStaffChange);
    };
  }, [socket]);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("adminToken") || sessionStorage.getItem("adminToken");
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/staff/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        setStaffList(response.data.staffList);
      }
    } catch (err) {
      toast.error("Failed to load staff list");
    } finally {
      setLoading(false);
    }
  };

  const handleAddSuccess = (msg) => {
    setShowAddForm(false);
    if (onFormClose) onFormClose();
    fetchStaff();
    Swal.fire({
      title: "Success!",
      text: msg,
      icon: "success",
      showConfirmButton: false,
      timer: 2000,
      background: "#0f172a",
      color: "#fff",
      customClass: {
        popup: "premium-swal-popup"
      }
    });
  };

  const handleEditSuccess = (msg) => {
    toast.success(msg);
    setEditingStaff(null);
    fetchStaff();
  };

  const handleToggleStatus = async (id, name, currentStatus) => {
    try {
      const token = localStorage.getItem("adminToken") || sessionStorage.getItem("adminToken");
      const response = await axios.patch(
        `${import.meta.env.VITE_API_BASE_URL}/api/staff/toggle-status/${id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) {
        toast.success(`Employee ${!currentStatus ? 'activated' : 'deactivated'}`);
        fetchStaff();
      }
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async (id, name) => {
    const result = await Swal.fire({
      title: "Delete Staff?",
      html: `You are about to delete <strong>${name}</strong> permanently.<br>This action cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#00c8ff",
      cancelButtonColor: "rgba(255,255,255,0.05)",
      confirmButtonText: "Yes, delete!",
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
        await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/api/staff/delete/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success("Employee deleted successfully");
        fetchStaff();
      } catch (err) {
        toast.error("Failed to delete employee");
      }
    }
  };

  const handleResetPassword = async (id, name) => {
    const result = await Swal.fire({
      title: "Reset Password",
      html: `<div style="margin-top: 10px; color: rgba(255,255,255,0.7);">
          Enter a new password for <strong>${name}</strong> or leave blank to auto-generate.
        </div>`,
      input: "text",
      inputPlaceholder: "New Password",
      showCancelButton: true,
      confirmButtonColor: "#00c8ff",
      cancelButtonColor: "rgba(255,255,255,0.05)",
      confirmButtonText: "Reset & Send",
      cancelButtonText: "Cancel",
      background: "#0f172a",
      color: "#fff",
      customClass: {
        popup: "premium-swal-popup",
        confirmButton: "premium-swal-confirm",
        cancelButton: "premium-swal-cancel",
        input: 'swal2-input-custom' 
      },
      preConfirm: (value) => {
        return value; 
      }
    });

    if (result.isConfirmed) {
      try {
        const token = localStorage.getItem("adminToken") || sessionStorage.getItem("adminToken");
        await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/staff/reset-password/${id}`, 
          { manualPassword: result.value }, 
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success("Password reset and emailed successfully");
      } catch (err) {
        toast.error("Failed to reset password");
      }
    }
  };

  if (showAddForm) {
    return <AddStaff onBack={() => { setShowAddForm(false); if (onFormClose) onFormClose(); }} onSuccess={handleAddSuccess} />;
  }

  if (editingStaff) {
    return <EditStaff staff={editingStaff} onBack={() => setEditingStaff(null)} onSuccess={handleEditSuccess} />;
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Employee Management</h1>
        <button className="btn-primary" onClick={() => setShowAddForm(true)}>+ Add New Employee</button>
      </div>

      {loading ? (
        <TableSkeleton rows={5} columns={8} />
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Profile</th>
                <th>IIPL ID</th>
                <th>Name</th>
                <th>Contact</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {staffList.length === 0 ? (
                <tr><td colSpan="7" className="no-data">No employee found.</td></tr>
              ) : (
                staffList.map((staff) => (
                  <tr key={staff._id}>
                    <td>
                      <div style={{ position: 'relative', width: '45px', height: '45px' }}>
                      {staff.profilePicture ? (
                         <img src={staff.profilePicture} alt="Profile" style={{ width: '100%', height: '100%', borderRadius: '12px', objectFit: 'cover', border: '2px solid var(--glass-border)', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', borderRadius: '12px', background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)', border: '2px solid var(--glass-border)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '18px', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' }}>
                          {staff.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      </div>
                    </td>
                    <td className="font-semibold">{staff.iiplId}</td>
                    <td>
                      <div>{staff.name}</div>
                      <div className="text-small">{staff.gender}</div>
                    </td>
                    <td>
                      <div>{staff.email}</div>
                      <div className="text-small">{staff.mobile}</div>
                    </td>
                    <td>
                      <div>{staff.positionId?.name || "N/A"}</div>
                      <div className="text-small">{staff.departmentId?.name || "N/A"}</div>
                    </td>
                    <td>
                      <label className="toggle-switch" style={{display:'flex', alignItems: 'center', gap: '8px'}}>
                        <input
                          type="checkbox"
                          checked={staff.isActive}
                          onChange={() => handleToggleStatus(staff._id, staff.name, staff.isActive)}
                        />
                        <span className="toggle-slider"></span>
                        <span style={{fontSize:'12px', color: staff.isActive ? '#34c759' : 'var(--text-tertiary)'}}>
                          {staff.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </label>
                    </td>
                    <td>
                      <button className="btn-icon btn-edit" onClick={() => setEditingStaff(staff)} title="Edit Details">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button className="btn-icon" onClick={() => handleResetPassword(staff._id, staff.name)} title="Reset Password" style={{color: '#f59e0b'}}>
                         <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                      </button>
                      <button className="btn-icon btn-delete" onClick={() => handleDelete(staff._id, staff.name)} title="Delete Staff">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                      </button>
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

export default StaffManagement;
