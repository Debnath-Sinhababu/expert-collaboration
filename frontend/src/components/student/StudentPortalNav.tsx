import Link from 'next/link'

/** "Internship Dashboard" / "Freelance Dashboard" links shared across the student portal header. Renders bare <Link> elements — wrap in a <nav> where the page doesn't already have one. */
export function StudentPortalNavLinks() {
  return (
    <>
      <Link href="/student/dashboard" className="text-white/80 hover:text-white font-medium transition-colors duration-200 relative group">
        Internship Dashboard
        <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-white transform scale-x-0 group-hover:scale-x-100 transition-transform duration-200"></span>
      </Link>
      <Link href="/student/freelance/dashboard" className="text-white/80 hover:text-white font-medium transition-colors duration-200 relative group">
        Freelance Dashboard
        <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-white transform scale-x-0 group-hover:scale-x-100 transition-transform duration-200"></span>
      </Link>
    </>
  )
}
