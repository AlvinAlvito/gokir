import { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Autoplay, EffectFade } from "swiper/modules";
import Button from "../ui/button/Button";
import { PlaneTakeoff } from "lucide-react";
import { Link } from "react-router";

type Announcement = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  link?: string | null;
};

const API_URL = import.meta.env.VITE_API_URL as string;

export default function Slider() {
  const [slides, setSlides] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await fetch(`${API_URL}/announcements?role=CUSTOMER`, { credentials: "include" });
        const json = await r.json();
        if (!r.ok || json?.ok === false) throw new Error(json?.error?.message || "Gagal mengambil pengumuman");
        setSlides(json?.data ?? json);
      } catch (e: any) {
        setError(e.message || "Gagal mengambil pengumuman");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const renderLink = (link?: string | null) => {
    if (!link) return null;
    const isExternal = /^https?:\/\//i.test(link);
    if (isExternal) {
      return (
        <a href={link} target="_blank" rel="noreferrer" className="mt-4 inline-flex justify-center">
          <Button size="sm" variant="outline" className="w-full">
            <PlaneTakeoff className="w-4 h-4" /> Kunjungi
          </Button>
        </a>
      );
    }
    return (
      <Link className="mt-4" to={link}>
        <Button size="sm" variant="outline" className="w-full">
          <PlaneTakeoff className="w-4 h-4" /> Kunjungi
        </Button>
      </Link>
    );
  };

  const buildImage = (url: string) => {
    if (/^https?:\/\//i.test(url)) return url;
    return `${API_URL}${url.startsWith("/") ? "" : "/"}${url}`;
  };

  if (loading) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">Memuat pengumuman...</p>;
  }

  if (error || slides.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">{error || "Belum ada pengumuman."}</p>;
  }

  return (
    <div className="w-full h-full">
      <Swiper
        modules={[Pagination, Autoplay, EffectFade]}
        pagination={{ clickable: true }}
        autoplay={{ delay: 10000 }}
        loop={true}
        spaceBetween={30}
        effect="fade"
        className="rounded-2xl overflow-hidden shadow-xl"
      >
        {slides.map((slide) => (
          <SwiperSlide key={slide.id}>
            <div className="relative h-[300px] md:h-[400px] w-full">
              <img
                src={buildImage(slide.imageUrl)}
                alt={slide.title}
                className="w-full h-full object-cover brightness-75"
                loading="lazy"
              />
              <div className="absolute inset-0 flex flex-col justify-center items-center text-center px-4">
                <h2 className="text-white text-2xl sm:text-xl md:text-3xl font-semibold drop-shadow-md">
                  {slide.title}
                </h2>
                <p className="text-gray-100 text-base sm:text-sm md:text-md mt-2 drop-shadow-sm max-w-xl">
                  {slide.description}
                </p>
                {renderLink(slide.link)}
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
