// app/sitemap.ts
import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.calxmap.in";

  const routes = [
    // Home page - highest priority
    { path: "/", priority: 1.0 },
    
    // Main public pages
    { path: "/solutions", priority: 0.9 },
    { path: "/contact-us", priority: 0.9 },
    { path: "/requirements", priority: 0.9 },
    
    // Authentication pages
    { path: "/auth/signup", priority: 0.8 },
    { path: "/auth/login", priority: 0.8 },
    { path: "/auth/forgot-password", priority: 0.7 },
    { path: "/auth/reset-password", priority: 0.7 },
    
    // Expert pages
    { path: "/expert/home", priority: 0.8 },
    { path: "/expert/dashboard", priority: 0.7 },
    { path: "/expert/profile", priority: 0.7 },
    { path: "/expert/profile/edit", priority: 0.6 },
    { path: "/expert/profile-setup", priority: 0.6 },
    
    // Student pages
    { path: "/student/home", priority: 0.8 },
    { path: "/student/dashboard", priority: 0.7 },
    { path: "/student/profile", priority: 0.7 },
    { path: "/student/profile/edit", priority: 0.6 },
    { path: "/student/profile-setup", priority: 0.6 },
    { path: "/student/freelance", priority: 0.7 },
    { path: "/student/freelance/dashboard", priority: 0.6 },
    { path: "/student-feedback", priority: 0.7 },
    { path: "/student-feedback/form", priority: 0.6 },
    { path: "/student-feedback/complete", priority: 0.6 },
    
    // Institution pages
    { path: "/institution/home", priority: 0.8 },
    { path: "/institution/dashboard", priority: 0.7 },
    { path: "/institution/profile", priority: 0.7 },
    { path: "/institution/profile/edit", priority: 0.6 },
    { path: "/institution/profile-setup", priority: 0.6 },
    { path: "/institution/post-requirement", priority: 0.7 },
    { path: "/institution/internships", priority: 0.7 },
    { path: "/institution/internships/create", priority: 0.6 },
    { path: "/institution/internships/dashboard", priority: 0.6 },
    { path: "/institution/internships/opportunities", priority: 0.7 },
    { path: "/institution/internships/select-institutions", priority: 0.6 },
    { path: "/institution/freelance/create", priority: 0.6 },
    { path: "/institution/freelance/dashboard", priority: 0.6 },
    
    // Other pages
    { path: "/confirmemail", priority: 0.6 },
    { path: "/coming-soon/corporate", priority: 0.5 },
    
    // Admin pages (lower priority as they're not public)
    { path: "/admin/profiles", priority: 0.5 },
    { path: "/admin/requirements-tracking", priority: 0.5 },
    { path: "/admin/contact-analytics", priority: 0.5 },
    { path: "/admin/feedback-analytics", priority: 0.5 },
  ];

  const lastModified = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  return routes.map((route) => ({
    url: `${siteUrl}${route.path}`,
    lastModified,
    changeFrequency: "weekly",
    priority: route.priority,
  }));
}




