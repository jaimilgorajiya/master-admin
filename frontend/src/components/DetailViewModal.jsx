import React from 'react';

const DetailViewModal = ({ item, type, onClose }) => {
  if (!item) return null;

  const isSoftware = type === 'software';
  const isActive = item.isActive !== false; // Default to true if undefined for some logic, but usually explicit

  // Format Date Helper
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(8px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 0.2s ease-out'
    }}>
      <div className="modal-content glass-card" onClick={e => e.stopPropagation()} style={{
          width: '100%',
          maxWidth: '650px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--card-shadow)',
          animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          overflow: 'hidden'
      }}>
        
        {/* Header */}
        <div className="modal-header" style={{
            padding: '30px',
            borderBottom: '1px solid var(--glass-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            background: 'var(--bg-secondary)'
        }}>
            <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <h2 style={{ fontSize: '26px', fontWeight: '800', color: '#fff', margin: 0, letterSpacing: '-0.5px' }}>
                        {item.name}
                    </h2>
                    <span style={{
                        backgroundColor: isActive ? 'rgba(74, 222, 128, 0.1)' : 'rgba(248, 113, 113, 0.1)',
                        color: isActive ? '#4ade80' : '#f87171',
                        border: `1px solid ${isActive ? 'rgba(74, 222, 128, 0.2)' : 'rgba(248, 113, 113, 0.2)'}`,
                        padding: '2px 10px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        textTransform: 'uppercase',
                        fontWeight: 'bold',
                        letterSpacing: '0.05em'
                    }}>
                        {isActive ? 'Active' : 'Inactive'}
                    </span>
                    <span style={{
                        background: '#333',
                        color: '#aaa',
                        padding: '2px 10px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        textTransform: 'uppercase',
                        fontWeight: '600',
                        letterSpacing: '0.05em'
                    }}>
                        {isSoftware ? 'Software' : item.packageType === 'service' ? 'Service Package' : 'Software Package'}
                    </span>
                </div>
            </div>
            <button onClick={onClose} style={{
                background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', padding: '4px'
            }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>

        {/* Scrollable Body */}
        <div className="modal-body" style={{
            padding: '24px',
            overflowY: 'auto',
            color: '#e5e5e5'
        }}>
            
            {/* Formatted Description */}
            <div style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-tertiary)', letterSpacing: '1px', marginBottom: '14px', fontWeight: 700 }}>Description</h3>
                <div style={{ 
                    fontSize: '15px', 
                    lineHeight: '1.7', 
                    color: 'var(--text-primary)', 
                    whiteSpace: 'pre-wrap', 
                    background: 'var(--bg-secondary)', 
                    padding: '20px', 
                    borderRadius: '12px',
                    border: '1px solid var(--glass-border)'
                }}>
                    {item.description || "No description provided."}
                </div>
            </div>

            {/* Details Grid */}
            <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#666', letterSpacing: '0.05em', marginBottom: '16px', fontWeight: 600 }}>Details</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', fontSize: '14px' }}>
                
                {isSoftware ? (
                     // Software Details
                     <>
                        <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                            <span style={{color: '#888', fontSize: '12px'}}>Category / Type</span>
                            <span style={{color: '#fff', fontWeight: 500}}>Software Application</span>
                        </div>
                        <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                            <span style={{color: '#888', fontSize: '12px'}}>Created Date</span>
                            <span style={{color: '#fff', fontWeight: 500}}>{formatDate(item.createdAt)}</span>
                        </div>
                     </>
                ) : (
                    // Package Details
                    <>
                         <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                            <span style={{color: '#888', fontSize: '12px'}}>Price</span>
                            <span style={{color: '#00c8ff', fontWeight: 600, fontSize: '16px'}}>₹{item.price?.toLocaleString()}</span>
                        </div>
                         <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                            <span style={{color: '#888', fontSize: '12px'}}>Validity / Duration</span>
                            <span style={{color: '#fff', fontWeight: 500}}>{item.durationDays} {item.unit || 'Days'}</span>
                        </div>
                        
                        <div style={{display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: '1 / -1'}}>
                            <span style={{color: '#888', fontSize: '12px'}}>Included Services</span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                                {item.serviceIds && item.serviceIds.length > 0 ? (
                                    item.serviceIds.map((s, i) => (
                                        <span key={i} style={{ background: '#333', padding: '4px 10px', borderRadius: '4px', fontSize: '13px' }}>
                                            {s.name}
                                        </span>
                                    ))
                                ) : <span style={{color: '#666', fontStyle: 'italic'}}>None</span>}
                            </div>
                        </div>
                        <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                            <span style={{color: '#888', fontSize: '12px'}}>Created Date</span>
                            <span style={{color: '#fff', fontWeight: 500}}>{formatDate(item.createdAt)}</span>
                        </div>
                    </>
                )}
            </div>

        </div>
      </div>
    </div>
  );
};

export default DetailViewModal;
