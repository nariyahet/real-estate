import { Link } from "react-router-dom";
import "./DashboardBackLink.css";

function DashboardBackLink({ label = "← Dashboard", to = "/dashboard", className = "" }) {
  return (
    <Link to={to} className={`dashboard-back-link ${className}`.trim()}>
      {label}
    </Link>
  );
}

export default DashboardBackLink;
