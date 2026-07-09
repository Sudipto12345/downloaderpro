import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Seo } from "@/components/Seo";
import { AdminShell, type AdminTab } from "@/components/admin/layout/AdminShell";
import AdminAnalytics from "@/components/admin/AdminAnalytics";
import AdminGeo from "@/components/admin/AdminGeo";
import AdminUsers from "@/components/admin/AdminUsers";
import AdminAds from "@/components/admin/AdminAds";
import AdminMenus from "@/components/admin/AdminMenus";
import AdminPages from "@/components/admin/AdminPages";
import AdminSeo from "@/components/admin/AdminSeo";
import AdminAppearance from "@/components/admin/AdminAppearance";
import AdminDeveloper from "@/components/admin/AdminDeveloper";
import AdminSearchConsole from "@/components/admin/AdminSearchConsole";
import AdminTools from "@/components/admin/AdminTools";
import AdminSitemap from "@/components/admin/AdminSitemap";

export default function AdminPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user || user.role !== "admin") {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      <Seo title="Admin Portal" description="Administration dashboard." path="/admin" noindex />
      <AdminShell
        activeTab={activeTab}
        onTabChange={setActiveTab}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        onMobileOpen={() => setMobileOpen(true)}
      >
        {activeTab === "overview" && <AdminAnalytics />}
        {activeTab === "geo" && <AdminGeo />}
        {activeTab === "users" && <AdminUsers />}
        {activeTab === "ads" && <AdminAds />}
        {activeTab === "menus" && <AdminMenus />}
        {activeTab === "pages" && <AdminPages />}
        {activeTab === "seo" && <AdminSeo />}
        {activeTab === "appearance" && <AdminAppearance />}
        {activeTab === "tools" && <AdminTools />}
        {activeTab === "sitemap" && <AdminSitemap />}
        {activeTab === "searchconsole" && <AdminSearchConsole />}
        {activeTab === "developer" && user.isDeveloper && <AdminDeveloper />}
      </AdminShell>
    </>
  );
}
