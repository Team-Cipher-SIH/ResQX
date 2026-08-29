"use client";

export default function ErrorPage({
  reset,
}: {
  reset: () => void;
}) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center">
      <video
        src="/videos/404.mp4"
        autoPlay
        loop
        muted
        playsInline
        className="w-80"
      />

      <h1 className="text-4xl font-bold mt-4">
        Something went wrong
      </h1>

      <p className="mt-2 text-gray-600">
        We couldn&apos;t process your request.
      </p>

      <button
        onClick={() => reset()}
        className="mt-6 rounded-lg bg-blue-600 px-5 py-3 text-white"
      >
        Try Again
      </button>
    </main>
  );
}