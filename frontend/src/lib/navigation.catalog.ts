// Centralized navigation catalog for the Solutions screen
// Do not confuse with lib/servicelist.js (header mega menu). This file powers
// the multi-level collapsible sidebar on the Solutions page.

export type Renderer = 'experts' | 'students' | 'programs' | 'marketplace';

export interface NavItem {
  id: string;
  label: string;
  renderer: Renderer;
}

export interface Category {
  id: string;
  label: string;
  items?: NavItem[];
}

export interface NavGroup {
  id: string;
  label: string;
  categories: Category[];
}

// Derived from the 12 reference images shared
export const NAV_CATALOG: NavGroup[] = [
  {
    id: 'expert_solutions',
    label: 'Expert Solutions',
    categories: [
      {
        id: 'faculty_expert',
        label: 'Faculty & Expert',
        items: [
          { id: 'guest_faculty', label: 'Guest Faculty', renderer: 'experts' },
          { id: 'visiting_faculty', label: 'Visiting Faculty', renderer: 'experts' },
          { id: 'industry_experts', label: 'Industry Experts', renderer: 'experts' },
        ],
      },
      {
        id: 'training_development',
        label: 'Training & Development',
        items: [
          { id: 'integrated_programs', label: 'Integrated Programs', renderer: 'programs' },
        ],
      },
    ],
  },
  {
    id: 'corporate_solutions',
    label: 'Corporate Solutions',
    categories: [
      {
        id: 'hiring_workforce',
        label: 'Hiring & Workforce',
        items: [
          { id: 'student_fresher', label: 'Student & Fresher', renderer: 'students' },
          // Per requirement: Freelance should show student cards for now
          { id: 'freelance', label: 'Freelance', renderer: 'students' },
          { id: 'on_demand_experts', label: 'On-Demand Experts', renderer: 'experts' },
        ],
      },
      {
        id: 'professional_advisory',
        label: 'Professional & Advisory',
        items: [
          { id: 'advisory_general', label: 'Advisory', renderer: 'experts' },
        ],
      },
      {
        id: 'employee_development',
        label: 'Employee Development',
        items: [
          { id: 'employee_programs', label: 'Programs', renderer: 'programs' },
        ],
      },
    ],
  },
  {
    id: 'student_marketplace',
    label: 'Student Marketplace',
    categories: [
      {
        id: 'student_marketplace_root',
        label: 'Marketplace',
        items: [
          { id: 'for_students', label: 'For Students', renderer: 'marketplace' },
          { id: 'for_companies', label: 'For Companies', renderer: 'marketplace' },
          { id: 'for_universities', label: 'For Universities', renderer: 'marketplace' },
        ],
      },
    ],
  },
];


