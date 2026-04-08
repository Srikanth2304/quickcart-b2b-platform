import RoleSidebarLayout from "../../components/layout/RoleSidebarLayout";

export default function AdminDashboard() {
  return (
    <RoleSidebarLayout role="ADMIN" title="Admin Dashboard">
      <p>Welcome ADMIN. Use the sidebar to manage catalog manager accounts.</p>
    </RoleSidebarLayout>
  );
}
