
const corporatesection = () => {
  return (
    <section className="bg-gradient-to-tl from-indigo-900 via-purple-800 to-slate-800 py-20 relative overflow-hidden">
    {/* Background Elements */}

   
    <div className="absolute inset-0">
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-tl from-indigo-600/10 via-purple-600/15 to-slate-600/10"></div>
      <div className="absolute top-20 right-20 w-80 h-80 bg-gradient-to-l from-indigo-400/20 to-purple-400/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 left-20 w-96 h-96 bg-gradient-to-r from-purple-400/20 to-slate-400/20 rounded-full blur-3xl"></div>
    </div>
    
    <div className="container mx-auto px-4 relative z-10">
      <div className="text-center mb-16">
        <h2 className="text-4xl font-bold text-white mb-4">Corporate Partners</h2>
        <p className="text-xl text-indigo-200">
          Leading organizations building strategic partnerships with experts
        </p>
      </div>

      <Carousel
opts={{
align: "start"
}}
plugins={[
Autoplay({
  delay: 2000,
}),
]}

className="w-full max-w-6xl mx-auto mb-12"
>
<CarouselContent>
{/* Infosys */}
<CarouselItem className="basis-full sm:basis-1/2 md:basis-1/3 lg:basis-1/4">
  <Card className="mx-2 hover:shadow-lg transition-shadow">
    <CardContent className="p-6 text-center">
      <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Briefcase className="h-8 w-8 text-orange-600" />
      </div>
      <h3 className="font-bold text-gray-900 mb-2">Infosys</h3>
      <p className="text-sm text-gray-600">
        Technology leadership through expert networks
      </p>
      <p className="text-xs text-gray-500 mt-2">IT Services & Consulting</p>
    </CardContent>
  </Card>
</CarouselItem>

{/* TCS */}
<CarouselItem className="basis-full sm:basis-1/2 md:basis-1/3 lg:basis-1/4">
  <Card className="mx-2 hover:shadow-lg transition-shadow">
    <CardContent className="p-6 text-center">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Award className="h-8 w-8 text-red-600" />
      </div>
      <h3 className="font-bold text-gray-900 mb-2">TCS</h3>
      <p className="text-sm text-gray-600">
        Innovation through strategic expert partnerships
      </p>
      <p className="text-xs text-gray-500 mt-2">Technology Solutions</p>
    </CardContent>
  </Card>
</CarouselItem>

{/* Wipro */}
<CarouselItem className="basis-full sm:basis-1/2 md:basis-1/3 lg:basis-1/4">
  <Card className="mx-2 hover:shadow-lg transition-shadow">
    <CardContent className="p-6 text-center">
      <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Globe className="h-8 w-8 text-indigo-600" />
      </div>
      <h3 className="font-bold text-gray-900 mb-2">Wipro</h3>
      <p className="text-sm text-gray-600">
        Global expertise for digital transformation
      </p>
      <p className="text-xs text-gray-500 mt-2">Digital Services</p>
    </CardContent>
  </Card>
</CarouselItem>

{/* Accenture */}
<CarouselItem className="basis-full sm:basis-1/2 md:basis-1/3 lg:basis-1/4">
  <Card className="mx-2 hover:shadow-lg transition-shadow">
    <CardContent className="p-6 text-center">
      <div className="w-16 h-16 bg-cyan-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Building className="h-8 w-8 text-cyan-600" />
      </div>
      <h3 className="font-bold text-gray-900 mb-2">Accenture</h3>
      <p className="text-sm text-gray-600">
        Professional services and technology solutions
      </p>
      <p className="text-xs text-gray-500 mt-2">Management Consulting</p>
    </CardContent>
  </Card>
</CarouselItem>

{/* Deloitte */}
<CarouselItem className="basis-full sm:basis-1/2 md:basis-1/3 lg:basis-1/4">
  <Card className="mx-2 hover:shadow-lg transition-shadow">
    <CardContent className="p-6 text-center">
      <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Zap className="h-8 w-8 text-pink-600" />
      </div>
      <h3 className="font-bold text-gray-900 mb-2">Deloitte</h3>
      <p className="text-sm text-gray-600">
        Audit, consulting, and advisory services
      </p>
      <p className="text-xs text-gray-500 mt-2">Professional Services</p>
    </CardContent>
  </Card>
</CarouselItem>

{/* KPMG */}
<CarouselItem className="basis-full sm:basis-1/2 md:basis-1/3 lg:basis-1/4">
  <Card className="mx-2 hover:shadow-lg transition-shadow">
    <CardContent className="p-6 text-center">
      <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Award className="h-8 w-8 text-yellow-600" />
      </div>
      <h3 className="font-bold text-gray-900 mb-2">KPMG</h3>
      <p className="text-sm text-gray-600">
        Audit, tax and advisory services
      </p>
      <p className="text-xs text-gray-500 mt-2">Big Four Accounting</p>
    </CardContent>
  </Card>
</CarouselItem>
</CarouselContent>

{/* Navigation buttons */}
<CarouselPrevious />
<CarouselNext />
</Carousel>
    </div>
  </section>
  )
}

export default corporatesection
