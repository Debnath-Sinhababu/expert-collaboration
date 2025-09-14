import Image from 'next/image'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function Logo({ size = 'md', className = '' }: LogoProps) {

  return (
    <div className={`flex items-center justify-center leading-none ${className}`}>
      {/* Logo Image Only - No Circle Background */}
      <div className={`relative group overflow-hidden ${size === 'sm' ? 'w-10 h-10' : size === 'md' ? 'w-20 h-20' : 'w-52 h-20'}`}>
        {/* Your actual logo image */}
    
  <Image
    src="/images/calxmaplogo.png"
    alt="Calxmap Logo"
    width={size === 'sm' ? 28 : size === 'md' ? 40 : 204}
    height={size === 'sm' ? 28 : size === 'md' ? 40 : 64}
    className="block w-full h-full object-cover transition-all duration-300 rounded-md"
    priority
  />



      </div>


    </div>
  )
}
