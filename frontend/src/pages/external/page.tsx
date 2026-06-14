import { Navigate } from "react-router-dom";

export default function ExternalPage() {
  return <Navigate to="/home" replace />;
}
