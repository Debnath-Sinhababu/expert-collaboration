import Image from 'next/image'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function Logo({ size = 'md', className = '' }: LogoProps) {

  return (
    <div className={`flex items-center mt-1 justify-center ${className}`}>
      {/* Logo Image Only - No Circle Background */}
      <div className={`relative group`}>
        {/* Your actual logo image */}
        <div className={`inline-flex rounded-full overflow-hidden bg-black ${size==='sm'?'w-8 h-8': size==='md'?'w-12 h-12': 'w-20 h-20'}  transform group-hover:scale-105`}>
  <Image
    src="/images/logo.png"
    alt="Calxmap Logo"
    width={size === 'sm' ? 32 : size === 'md' ? 48 : 80}
    height={size === 'sm' ? 32 : size === 'md' ? 48 : 80}
    className="object-contain transition-all duration-300"
    priority
  />
</div>


      </div>


    </div>
  )
}
