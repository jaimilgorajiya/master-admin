import React, { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import ResellerMarginConfig from "./ResellerMarginConfig";

const EditResellerMargin = ({ reseller, onClose, onSuccess }) => {
    const [submitting, setSubmitting] = useState(false);
    const [config, setConfig] = useState(reseller.marginConfig || { mode: 'overall', overall: { type: 'percentage', value: 0 } });

    const handleSave = async () => {
        setSubmitting(true);
        try {
            const token = localStorage.getItem("adminToken") || sessionStorage.getItem("adminToken");
            await axios.put(`${import.meta.env.VITE_API_BASE_URL}/api/reseller-earnings/margin-config/${reseller._id}`, {
                marginConfig: config
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Margin configuration updated!");
            onSuccess();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to update config");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="right-sidebar-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="right-sidebar-container">
                <button className="sidebar-close-btn" onClick={onClose}>&times;</button>
                
                <div className="right-sidebar-header">
                    <h2 className="right-sidebar-title">Manage Commission</h2>
                    <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '8px' }}>
                        Updating strategy for: <strong style={{ color: 'white' }}>{reseller.companyName}</strong>
                    </p>
                </div>

                <div className="right-sidebar-body">
                    <ResellerMarginConfig 
                        initialConfig={config}
                        allowedSoftwareIds={reseller.allowedSoftware?.map(s => s._id || s)}
                        allowedServiceIds={reseller.allowedServices?.map(s => s._id || s)}
                        onChange={setConfig}
                    />
                </div>

                <div className="right-sidebar-footer">
                    <button className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
                    <button className="btn-primary" onClick={handleSave} disabled={submitting} style={{ flex: 2 }}>
                        {submitting ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditResellerMargin;
