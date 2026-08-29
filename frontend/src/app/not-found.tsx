import Link from "next/link";

export default function NotFound() {
  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-black">
      <video
        src="/video/404.mp4"
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* Optional dark overlay */}
      <div className="absolute inset-0 bg-black/30" />

      {/* Content over video */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center text-center text-white px-6">
        
       <p>          </p>
       <br />
        
        <Link
          href="/"
          className="absolute left-6 top-6 z-20 rounded-xl bg-white/90 px-5 py-3 text-sm font-semibold text-black shadow-lg backdrop-blur-sm transition-all duration-300 hover:bg-white hover:-translate-y-0.5"
      >
          Back to Home
        </Link>
      </div>
    </main>
  );
}