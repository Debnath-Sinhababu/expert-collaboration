// app/sitemap.ts
import { MetadataRoute } from "next";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const siteUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || "https://www.calxmap.in";

async function getDynamicUrls() {
  const urls: MetadataRoute.Sitemap = [];
  
  try {
    // Fetch experts (public endpoint - works without auth)
    try {
      const expertsRes = await fetch(`${API_BASE_URL}/api/experts?limit=1000`, {
        next: { revalidate: 3600 } // Revalidate every hour
      });
      if (expertsRes.ok) {
        const experts = await expertsRes.json();
        const expertsList = Array.isArray(experts) ? experts : (experts?.data || []);
        expertsList.forEach((expert: any) => {
          if (expert.id) {
            urls.push({
              url: `${siteUrl}/experts/${expert.id}`,
              lastModified: expert.updated_at || new Date(),
              changeFrequency: 'weekly' as const,
              priority: 0.8,
            });
          }
        });
      }
    } catch (e) {
      console.error('Error fetching experts for sitemap:', e);
    }

    // Fetch internships (public endpoint)
    try {
      const internshipsRes = await fetch(`${API_BASE_URL}/api/internships/visible?limit=1000`, {
        next: { revalidate: 3600 }
      });
      if (internshipsRes.ok) {
        const internships = await internshipsRes.json();
        const internshipsList = Array.isArray(internships) ? internships : (internships?.data || []);
        internshipsList.forEach((internship: any) => {
          if (internship.id && internship.visibility_scope === 'public' && internship.status === 'open') {
            urls.push({
              url: `${siteUrl}/requirements/internship/${internship.id}`,
              lastModified: internship.updated_at || new Date(),
              changeFrequency: 'weekly' as const,
              priority: 0.8,
            });
          }
        });
      }
    } catch (e) {
      console.error('Error fetching internships for sitemap:', e);
    }

    // Fetch freelance projects (public endpoint)
    try {
      const freelanceRes = await fetch(`${API_BASE_URL}/api/freelance/projects/visible?limit=1000`, {
        next: { revalidate: 3600 }
      });
      if (freelanceRes.ok) {
        const freelance = await freelanceRes.json();
        const freelanceList = Array.isArray(freelance) ? freelance : (freelance?.data || []);
        freelanceList.forEach((project: any) => {
          if (project.id && project.status === 'open') {
            urls.push({
              url: `${siteUrl}/requirements/freelance/${project.id}`,
              lastModified: project.updated_at || new Date(),
              changeFrequency: 'weekly' as const,
              priority: 0.8,
            });
          }
        });
      }
    } catch (e) {
      console.error('Error fetching freelance projects for sitemap:', e);
    }

    // Fetch contract projects (public endpoint)
    try {
      const projectsRes = await fetch(`${API_BASE_URL}/api/projects?limit=1000&status=open`, {
        next: { revalidate: 3600 }
      });
      if (projectsRes.ok) {
        const projects = await projectsRes.json();
        const projectsList = Array.isArray(projects) ? projects : (projects?.data || []);
        projectsList.forEach((project: any) => {
          if (project.id) {
            urls.push({
              url: `${siteUrl}/requirements/contract/${project.id}`,
              lastModified: project.updated_at || new Date(),
              changeFrequency: 'weekly' as const,
              priority: 0.8,
            });
          }
        });
      }
    } catch (e) {
      console.error('Error fetching projects for sitemap:', e);
    }
  } catch (error) {
    console.error('Error generating dynamic sitemap URLs:', error);
  }

  return urls;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date().toISOString().split("T")[0];

  // Static routes - only public pages
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}/`,
      lastModified,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${siteUrl}/requirements`,
      lastModified,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${siteUrl}/solutions`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${siteUrl}/contact-us`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${siteUrl}/auth/signup`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${siteUrl}/auth/login`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
  ];

  // Dynamic routes - fetch from API
  const dynamicRoutes = await getDynamicUrls();

  return [...staticRoutes, ...dynamicRoutes];
}




