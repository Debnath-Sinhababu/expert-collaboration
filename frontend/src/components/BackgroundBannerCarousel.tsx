'use client'

import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel'
import Autoplay from 'embla-carousel-autoplay'

interface Banner {
  src: string
  alt: string
  gradient: string
}

const banners: Banner[] = [
  {
    src: "https://images.unsplash.com/photo-1562774053-701939374585?w=1200&h=600&fit=crop&crop=center",
    alt: "University Campus Background",
    gradient: "from-blue-500/20 to-transparent"
  },
  {
    src: "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
    alt: "Professional meeting with presenter at board and team with laptops",
    gradient: "from-indigo-500/20 to-transparent"
  },
  {
    src: "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=1200&h=600&fit=crop&crop=center",
    alt: "Research Institute Background",
    gradient: "from-purple-500/20 to-transparent"
  },
  {
    src: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1200&h=600&fit=crop&crop=center",
    alt: "Modern Office Complex Background",
    gradient: "from-cyan-500/20 to-transparent"
  },
 
]

type BackgroundBannerCarouselProps = {
  foreground?: boolean
  className?: string
}

export default function BackgroundBannerCarousel({ foreground = false, className = '' }: BackgroundBannerCarouselProps) {
  return (
    <div className={`${foreground ? 'relative w-full h-full overflow-hidden' : 'absolute inset-0 overflow-hidden opacity-10'} ${className}`}>
      <Carousel
        opts={{ align: 'start', loop: true }}
        plugins={[Autoplay({ delay: 4000 })]}
        className="w-full h-full"
      >
        <CarouselContent className="h-48 sm:h-64 md:h-80 lg:h-96">
          {banners.map((banner, index) => (
            <CarouselItem key={index} className="h-48 sm:h-64 md:h-80 lg:h-96">
              <div className="relative w-full h-full">
                <img
                  src={banner.src}
                  alt={banner.alt}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className={`absolute inset-0 bg-gradient-to-br ${banner.gradient}`}></div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </div>
  )
}
