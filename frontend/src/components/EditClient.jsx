import { useState, useEffect } from "react";
import axios from "axios";

const EditClient = ({ client, onBack, onSuccess }) => {
  const [formData, setFormData] = useState({
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    softwareId: "",
  });
  const [softwareList, setSoftwareList] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSoftware();
    if (client) {
      setFormData({
        clientName: client.clientName,
        clientEmail: client.clientEmail,
        clientPhone: client.clientPhone,
        softwareId: client.softwareId?._id || "",
      });
    }
  }, [client]);

  const fetchSoftware = async () => {
    try {
      const token = localStorage.getItem("adminToken") || sessionStorage.getItem("adminToken");
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

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const token = localStorage.getItem("adminToken") || sessionStorage.getItem("adminToken");
      const response = await axios.put(
        `${import.meta.env.VITE_API_BASE_URL}/api/client/update/${client._id}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.success) {
        onSuccess("Client updated successfully!");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update client");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Edit Client</h1>
        <button className="btn-secondary" onClick={onBack}>
          ← Back to List
        </button>
      </div>

      <div className="form-center">
        <div className="form-card">
          <form onSubmit={handleSubmit} className="form-layout">
            {error && <div className="error-message">{error}</div>}

            <div className="form-group">
              <label htmlFor="clientName">
                Client Name <span className="required">*</span>
              </label>
              <input
                type="text"
                id="clientName"
                name="clientName"
                value={formData.clientName}
                onChange={handleChange}
                placeholder="e.g., John Doe"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="clientEmail">
                Email Address <span className="required">*</span>
              </label>
              <input
                type="email"
                id="clientEmail"
                name="clientEmail"
                value={formData.clientEmail}
                onChange={handleChange}
                placeholder="client@example.com"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="clientPhone">
                Phone Number <span className="required">*</span>
              </label>
              <input
                type="tel"
                id="clientPhone"
                name="clientPhone"
                value={formData.clientPhone}
                onChange={handleChange}
                placeholder="+1234567890"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="softwareId">
                Select Software <span className="required">*</span>
              </label>
              <select
                id="softwareId"
                name="softwareId"
                value={formData.softwareId}
                onChange={handleChange}
                required
              >
                <option value="">-- Select Software --</option>
                {softwareList.map((software) => (
                  <option key={software._id} value={software._id}>
                    {software.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? "Updating..." : "Update Client"}
              </button>
              <button type="button" className="btn-secondary" onClick={onBack}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditClient;
