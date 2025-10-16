import Image from 'next/image'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'header'
  className?: string
}

export default function Logo({ size = 'md', className = '' }: LogoProps) {
  // Header size: optimized for 64px (h-16) headers
  const dimensions = {
    sm: { width: 80, height: 32 },
    md: { width: 120, height: 48 },
    lg: { width: 200, height: 80 },
    header: { width: 140, height: 10 } // Perfect for h-16 headers
  }

  const { width, height } = dimensions[size]

  return (
    <div className={`flex items-center leading-none h-4 ${className}`}>
      <Image
        src="/images/calxmap.png"
        alt="CalXMap Logo"
        width={width}
        height={height}
        className="object-contain transition-all duration-300 scale-150"
        priority
      />
    </div>
  )
}
