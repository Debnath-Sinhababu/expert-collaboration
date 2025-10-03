// Navigation structure for Calxmap header
// Use this to build mega menu / header nav

export const NAVIGATION = [
    {
      label: "Explore Experts",
      type: "megaMenu",
      categories: [
        {
          label: "Education Experts",
          subcategories: [
            {
              label: "Guest Faculty",
              items: [
                "Finance",
                "Marketing",
                "HR",
                "Tech (AI, ML, Blockchain, Cybersecurity)",
                "Law",
                "Soft Skills",
              ],
            },
            {
              label: "Visiting Faculty",
              items: ["Semester-long", "Weekly / Short-term"],
            },
            {
              label: "Industry Experts for Education",
              items: [
                "Business Strategy",
                "Finance",
                "Data Analytics",
                "HR & People Analytics",
                "Digital Transformation",
              ],
            },
            {
              label: "Workshops & Seminars",
              items: [
                "Technical (AI/ML, Blockchain, IoT, AR/VR, Robotics)",
                "Business (Startup Growth, Financial Analytics, Digital Marketing, Leadership)",
                "Career Skills (Communication, Placement Readiness)",
              ],
            },
            {
              label: "Faculty Development Programs (FDPs)",
              items: [
                "Teaching Innovation",
                "Curriculum–Industry Integration",
                "Research & Case Studies",
              ],
            },
            {
              label: "Integrated Programs",
              items: [
                "CA Placement Training",
                "Coding Bootcamps (with YouTubers)",
                "Industry-Endorsed Certifications",
              ],
            },
          ],
        },
        {
          label: "Corporate Experts",
          subcategories: [
            {
              label: "CA Services",
              items: [
                "Taxation & Compliance",
                "Financial Audits",
                "Business Valuation & Fundraising",
              ],
            },
            {
              label: "Lawyer Services",
              items: [
                "Corporate Law & Contracts",
                "Startup Legal Advisory",
                "Intellectual Property & Trademarks",
              ],
            },
            {
              label: "Corporate Trainers & Consultants",
              items: [
                "Leadership Development",
                "Organizational Development & HR Analytics",
                "Strategic Consulting & GTM Advisory",
              ],
            },
          ],
        },
        {
          label: "Content & Media Experts",
          subcategories: [
            { label: "YouTubers & Influencers", items: [] },
            { label: "Content Collaboration (Universities)", items: [] },
            { label: "Case Study & Storytelling Experts", items: [] },
          ],
        },
      ],
    },
    {
      label: "Student Marketplace",
      type: "dropdown",
      categories: [
        {
          label: "Opportunities",
          items: ["Internships (Remote, Hybrid, On-site)", "Projects", "Part-time Jobs"],
        },
        {
          label: "For Companies",
          items: ["Post Internships & Jobs", "Hire Directly (AI Matching)"],
        },
        {
          label: "For Universities",
          items: [
            "Bulk Student Onboarding",
            "Placement Analytics & Reports",
            "Recruiter Invitations",
          ],
        },
        {
          label: "For Students",
          items: [
            "Create Student Profile",
            "1-Click Apply",
            "Priority Badge (Calxmap Certified)",
          ],
        },
      ],
    },
   
   
  ];
  