import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Autoplay, EffectFade } from "swiper/modules";
import Button from "../ui/button/Button";
import {  PlaneTakeoff } from "lucide-react";
import { Link } from "react-router";

const slides = [
    {
        image: "https://wallpapercat.com/w/full/b/d/2/293739-2048x1365-desktop-hd-paris-background-image.jpg",
        title: "Apa Itu Aplikasi SI-BIMA UINSU?",
        description: "Sistem Informasi Bimbingan Akademik adalah aplikasi untuk mengelola proses Bimbingan Akademik. Dengan adanya SI-BIMA, maka proses Bimbingan Akademik akan lebih mudah dan terstruktur bagi Mahsiswa & Dosen UIN Sumatera Utara.",
        link: "/tutorial"
    },
    {
        image: "https://c4.wallpaperflare.com/wallpaper/218/185/82/eiffel-tower-nature-paris-wallpaper-preview.jpg",
        title: "Tips Untuk Mahasiswa",
        description: "Jika Anda Sudah Mendaftar Antrian, Jangan Keluar Dari Halaman antrian dosen tersebut sampai dosen memanggil Anda. Pastikan Perangkat Anda Selalu Terkoneksi!",
        link: "/tutorial"
    },
    {
        image: "https://statik.tempo.co/data/2023/12/14/id_1263069/1263069_720.jpg",
        title: "Tentang Aplikasi SI-BIMA UINSU",
        description: "SI-BIMA UINSU Saat ini berada di Versi 1.0. Akan ada perbaikan & pengembangan aplikasi kedepannya. Mari Kita Tunggu Update & Upgrade terbaru dari SI-BIMA UINSU..",
        link: "/tutorial"
    },
    {
        image: "https://i.pinimg.com/736x/83/a6/66/83a6667103a915a1414090ae942a90be.jpg",
        title: "Fitur SI-BIMA UINSU",
        description: "Coba & Gunakan Semua Fitur SI-BIMA UINSU, Mulai dari Informasi Ketersediaan Dosen, Daftar Dosen, Antrian Online, Riwayat Antrian, Kalender, Tema Dark & Light Mode, dan lainnya.",
        link: "/tutorial"
    },
    {
        image: "https://media.istockphoto.com/id/689383558/photo/tower-near-park-in-paris.jpg?s=612x612&w=0&k=20&c=n5fBGoxmUnbL_BWfGDbNnD2-MFZeURso_BgXy2yJZic=",
        title: "Kunjungi Tutorial",
        description: "Jika anda baru pertama kali menggunakan SI-BIMA UINSU, Silahkan kunjungi Tutorial untuk mempelajari lebih lanjut tentang aplikasi SI-BIMA UINSU.",
        link: "/tutorial"
    }
];
export default function Slider() {
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
                {slides.map((slide, index) => (
                    <SwiperSlide key={index}>
                        <div className="relative h-[300px] md:h-[400px] w-full">
                            <img
                                src={slide.image}
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
                                <Link className="mt-4" to={`/mahasiswa${slide.link}`}>
                                    <Button size="sm" variant="outline" className="w-full">
                                        <PlaneTakeoff className="w-4 h-4" /> Kunjung Tutorial
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </SwiperSlide>
                ))}
            </Swiper>
        </div>
    );
}
