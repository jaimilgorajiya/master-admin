const TableSkeleton = ({ rows = 5, columns = 6 }) => {
  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            {[...Array(columns)].map((_, i) => (
              <th key={i}>
                <div className="skeleton skeleton-text" style={{ width: "80%" }}></div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...Array(rows)].map((_, rowIndex) => (
            <tr key={rowIndex}>
              {[...Array(columns)].map((_, colIndex) => (
                <td key={colIndex}>
                  <div className="skeleton skeleton-text"></div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const StatsSkeleton = () => {
  return (
    <div className="stats-grid">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="stat-card">
          <div className="skeleton skeleton-icon"></div>
          <div className="stat-info">
            <div className="skeleton skeleton-text" style={{ width: "60px", height: "32px" }}></div>
            <div className="skeleton skeleton-text" style={{ width: "120px", marginTop: "8px" }}></div>
          </div>
        </div>
      ))}
    </div>
  );
};

export { TableSkeleton, StatsSkeleton };
