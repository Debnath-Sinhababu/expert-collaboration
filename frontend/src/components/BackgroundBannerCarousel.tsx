'use client'

import { useState, useEffect } from 'react'

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
    src: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&h=600&fit=crop&crop=center",
    alt: "Corporate Buildings Background",
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
  {
    src: "https://images.unsplash.com/photo-1523050854058-8df90110c9e1?w=1200&h=600&fit=crop&crop=center",
    alt: "Academic Library Background",
    gradient: "from-pink-500/20 to-transparent"
  }
]

export default function BackgroundBannerCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % banners.length)
    }, 4000) // Change banner every 4 seconds

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="absolute inset-0 opacity-10 overflow-hidden">
      {banners.map((banner, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
            index === currentIndex ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className={`absolute inset-0 bg-gradient-to-br ${banner.gradient}`}>
            <img 
              src={banner.src}
              alt={banner.alt}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      ))}
    </div>
  )
}
