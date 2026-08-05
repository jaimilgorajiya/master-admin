import { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";

const EditStaff = ({ staff, onBack, onSuccess }) => {
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [filteredPositions, setFilteredPositions] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    profilePicture: staff.profilePicture || "",
    iiplId: staff.iiplId || "",
    name: staff.name || "",
    email: staff.email || "",
    mobile: staff.mobile || "",
    gender: staff.gender || "Male",
    departmentId: staff.departmentId?._id || "",
    positionId: staff.positionId?._id || "",
  });

  useEffect(() => {
    fetchDepartments();
    fetchPositions();
  }, []);

  useEffect(() => {
    if (formData.departmentId) {
      setFilteredPositions(positions.filter(p => p.departmentId?._id === formData.departmentId && p.isActive));
    } else {
      setFilteredPositions([]);
    }
  }, [formData.departmentId, positions]);

  const fetchDepartments = async () => {
    try {
      const token = localStorage.getItem("adminToken") || sessionStorage.getItem("adminToken");
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/department/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        setDepartments(response.data.departments.filter(d => d.isActive));
      }
    } catch (err) {
      console.error("Failed to load departments");
    }
  };

  const fetchPositions = async () => {
    try {
      const token = localStorage.getItem("adminToken") || sessionStorage.getItem("adminToken");
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/position/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        setPositions(response.data.positions);
      }
    } catch (err) {
      console.error("Failed to load positions");
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file");
        return;
      }
      if (file.size > 500 * 1024) { // 500KB limit
         toast.error("Image size should be less than 500KB");
         return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, profilePicture: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem("adminToken") || sessionStorage.getItem("adminToken");
      const response = await axios.put(
        `${import.meta.env.VITE_API_BASE_URL}/api/staff/update/${staff._id}`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        onSuccess("Employee updated successfully!");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update employee");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-center">
      <div className="form-card glass-card">
        <div className="page-header">
          <h2 className="page-title">Edit Staff</h2>
          <button className="btn-secondary" onClick={onBack} disabled={loading}>Back</button>
        </div>
        
        <form onSubmit={handleSubmit} className="clean-form-layout">
          
          {/* Profile Picture Block */}
          <div className="profile-section-clean">
            <div className={`profile-uploader-clean ${!formData.profilePicture ? 'empty' : ''}`}>
              <div className="image-preview-area">
                {formData.profilePicture ? (
                  <img src={formData.profilePicture} alt="Profile" className="preview-img" />
                ) : (
                  <span className="placeholder-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                  </span>
                )}
                <label className="upload-overlay">
                   <input type="file" accept="image/*" onChange={handleFileChange} className="hidden-input" />
                   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                </label>
              </div>
              <div className="uploader-text">
                <span className="main-text">Profile Photo</span>
                <span className="sub-text">Max 500KB</span>
              </div>
            </div>
          </div>

          <div className="fields-grid-2">
            {/* Full Name */}
            <div className="form-group">
              <label>Full Name <span className="required">*</span></label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="form-input"
              />
            </div>

            {/* Gender Toggle */}
            <div className="form-group">
              <label>Gender <span className="required">*</span></label>
              <div className="gender-toggle-wrapper">
                <button 
                  type="button"
                  className={`gender-btn ${formData.gender === 'Male' ? 'active' : ''}`}
                  onClick={() => setFormData({ ...formData, gender: 'Male' })}
                >
                  Male
                </button>
                <button 
                  type="button"
                  className={`gender-btn ${formData.gender === 'Female' ? 'active' : ''}`}
                  onClick={() => setFormData({ ...formData, gender: 'Female' })}
                >
                  Female
                </button>
              </div>
            </div>

            {/* Email */}
            <div className="form-group">
              <label>Email Address <span className="required">*</span></label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="form-input"
                pattern="^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
                title="Please enter a valid email address"
                style={formData.email.length > 0 && !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.email) ? { borderColor: "#ff4d4d" } : {}}
              />
              {formData.email.length > 0 && !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.email) && (
                 <span style={{ fontSize: "11px", color: "#ff4d4d", marginTop: "4px", display: "block" }}>Enter a valid email address</span>
              )}
            </div>

            {/* Mobile */}
            <div className="form-group">
              <label>Mobile Number <span className="required">*</span></label>
              <div className={`phone-wrapper ${formData.mobile.length > 0 && formData.mobile.length < 10 ? "invalid-border" : ""}`}>
                <span className="prefix">+91</span>
                <input
                  type="text"
                  value={formData.mobile}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setFormData({ ...formData, mobile: val });
                  }}
                  required
                  placeholder="9876543210"
                  className="form-input phone-input"
                  title="Mobile number must be exactly 10 digits"
                />
              </div>
              {formData.mobile.length > 0 && formData.mobile.length < 10 && (
                 <span style={{ fontSize: "11px", color: "#ff4d4d", marginTop: "4px" }}>Must be 10 digits</span>
              )}
            </div>

            {/* IIPL ID (Read Only) */}
            <div className="form-group">
              <label>IIPL ID <span className="required">*</span></label>
              <input
                type="text"
                value={formData.iiplId}
                onChange={(e) => setFormData({ ...formData, iiplId: e.target.value })}
                required
                className="form-input"
              />
            </div>

            {/* Department */}
            <div className="form-group">
              <label>Department <span className="required">*</span></label>
              <select
                value={formData.departmentId}
                onChange={(e) => setFormData({ ...formData, departmentId: e.target.value, positionId: "" })}
                required
                className="form-select"
              >
                <option value="">Select Department</option>
                {departments.map(dept => (
                  <option key={dept._id} value={dept._id}>{dept.name}</option>
                ))}
              </select>
            </div>

            {/* Position */}
            <div className="form-group">
              <label>Position <span className="required">*</span></label>
              <select
                value={formData.positionId}
                onChange={(e) => setFormData({ ...formData, positionId: e.target.value })}
                required
                disabled={!formData.departmentId}
                className="form-select"
              >
                <option value="">Select Position</option>
                {filteredPositions.map(pos => (
                  <option key={pos._id} value={pos._id}>{pos.name}</option>
                ))}
              </select>
            </div>
            
             {/* Empty div to balance grid if needed, or CSS grid handles it */}
            <div></div>

          </div>

          <div className="form-actions-right">
            <button type="button" className="action-btn cancel" onClick={onBack} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Updating..." : "Update Employee"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditStaff;
