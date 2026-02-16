import HeroSection from '@/components/landing/HeroSection';
import StatsBar from '@/components/landing/StatsBar';
import FeaturesGrid from '@/components/landing/FeaturesGrid';
import HowItWorks from '@/components/landing/HowItWorks';
import Testimonials from '@/components/landing/Testimonials';
import ComingSoon from '@/components/landing/ComingSoon';
import CTABanner from '@/components/landing/CTABanner';

export default function Home() {
  return (
    <>
      <HeroSection />
      <StatsBar />
      <FeaturesGrid />
      <HowItWorks />
      <Testimonials />
      <ComingSoon />
      <CTABanner />
    </>
  );
}
