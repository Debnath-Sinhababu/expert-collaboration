export const PROJECT_TYPES = [
  'guest_lecture',
  'fdp', 
  'workshop',
  'curriculum_dev',
  'research_collaboration',
  'training_program',
  'consultation',
  'other'
] as const;

export const EXPERTISE_DOMAINS = [
  {
    name: "Computer Science & IT",
    subskills: [
      "Software Development",
      "Web Development (Frontend, Backend, Fullstack)",
      "Mobile App Development",
      "Cloud Computing (AWS, Azure, GCP)",
      "Cybersecurity",
      "Networking & Systems Administration",
      "Database Management (SQL, NoSQL)",
      "Operating Systems (Linux, Windows)",
      "DevOps & CI/CD",
      "IT Support / Helpdesk"
    ]
  },
  {
    name: "Engineering",
    subskills: [
      "Mechanical Design (CAD, SolidWorks, AutoCAD)",
      "Electrical Systems",
      "Civil & Structural Engineering",
      "Chemical Engineering",
      "Electronics & Embedded Systems",
      "Robotics & Automation",
      "Materials Science",
      "Industrial & Manufacturing Engineering",
      "Environmental Engineering",
      "Aerospace Engineering"
    ]
  },
  {
    name: "Business & Management",
    subskills: [
      "Strategic Management",
      "Project Management (Agile, Scrum, PMP)",
      "Human Resources (Recruitment, Training, HRM)",
      "Operations Management",
      "Supply Chain & Logistics",
      "Leadership & Organizational Behavior",
      "Entrepreneurship & Startups",
      "Corporate Governance",
      "Business Analytics",
      "Negotiation & Conflict Resolution"
    ]
  },
  {
    name: "Finance & Economics",
    subskills: [
      "Financial Accounting",
      "Corporate Finance",
      "Investment Banking",
      "Auditing & Compliance",
      "Risk Management",
      "Taxation",
      "Economics (Micro, Macro, Development)",
      "Financial Modeling & Valuation",
      "FinTech & Digital Payments",
      "Behavioral Economics"
    ]
  },
  {
    name: "Healthcare & Medicine",
    subskills: [
      "General Medicine",
      "Nursing & Midwifery",
      "Public Health",
      "Pharmacology",
      "Medical Research",
      "Healthcare Management",
      "Nutrition & Dietetics",
      "Psychology & Mental Health",
      "Dentistry",
      "Alternative Medicine (Ayurveda, Homeopathy, Yoga Therapy)"
    ]
  },
  {
    name: "Education & Training",
    subskills: [
      "Pedagogy & Teaching Methods",
      "Curriculum Design",
      "Educational Technology (EdTech, LMS)",
      "Assessment & Evaluation",
      "Special Education",
      "Teacher Training / Faculty Development",
      "e-Learning Development",
      "Adult Education & Lifelong Learning",
      "Classroom Management",
      "Educational Leadership"
    ]
  },
  {
    name: "Research & Development",
    subskills: [
      "Academic Research",
      "Literature Review & Publication",
      "Research Methodology",
      "Data Collection & Survey Design",
      "Experimental Design",
      "Lab Techniques (Biotech, Chemistry, Physics)",
      "Patent Writing & IP Management",
      "Research Grants & Proposal Writing",
      "Innovation & Prototyping",
      "Cross-disciplinary Collaboration"
    ]
  },
  {
    name: "Marketing & Sales",
    subskills: [
      "Digital Marketing (SEO, SEM, Content Marketing)",
      "Social Media Marketing",
      "Brand Management",
      "Consumer Behavior",
      "Sales Strategy & Negotiation",
      "Market Research & Analytics",
      "Advertising & Media Planning",
      "Business Development",
      "Product Marketing",
      "Public Relations"
    ]
  },
  {
    name: "Data Science & Analytics",
    subskills: [
      "Python / R Programming",
      "Machine Learning",
      "Deep Learning",
      "Natural Language Processing (NLP)",
      "Computer Vision",
      "Data Visualization (Tableau, PowerBI, D3.js)",
      "Big Data (Hadoop, Spark)",
      "Statistical Modeling",
      "AI Ethics & Governance",
      "MLOps"
    ]
  },
  {
    name: "Design & Creative",
    subskills: [
      "Graphic Design (Photoshop, Illustrator)",
      "UI/UX Design",
      "Animation & Motion Graphics",
      "3D Modeling & CAD",
      "Industrial/Product Design",
      "Interior Design",
      "Game Design",
      "Photography & Videography",
      "Creative Writing",
      "Art & Illustration"
    ]
  },
  {
    name: "Law & Legal",
    subskills: [
      "Corporate Law",
      "Intellectual Property (IPR)",
      "Contract Law",
      "Labor & Employment Law",
      "Tax Law",
      "International Law",
      "Criminal Law",
      "Civil Law",
      "Arbitration & Mediation",
      "Legal Research & Writing"
    ]
  },
  {
    name: "Other",
    subskills: [
      "Languages & Linguistics",
      "Social Sciences (Sociology, Political Science, Anthropology)",
      "Environmental Studies",
      "Humanities (History, Philosophy, Literature)",
      "Agriculture & Forestry",
      "Architecture & Urban Planning",
      "Hospitality & Tourism",
      "Sports & Physical Education",
      "Media & Communication",
      "Emerging/Niche Skills (Custom free-text input)"
    ]
  }
] as const;
