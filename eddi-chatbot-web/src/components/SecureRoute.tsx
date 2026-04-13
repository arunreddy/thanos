import { Outlet } from "react-router";

// Authentication bypassed for local development
export const RequiredAuth = () => {
  // Bypass authentication - go directly to the app
  return <Outlet />;
};
