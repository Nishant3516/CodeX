import Image from "next/image";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <Image
        src="/next.svg"
        alt="Logo"
        width={100}
        height={100}
        priority
      />
      <h1 className="text-4xl font-bold mt-4">Page Not Found</h1>
      <p className="mt-2 text-lg text-gray-600">
        Oops! The page you’re looking for does not exist.
      </p>
      <Link href="/" className="mt-4 text-blue-500 hover:underline">
        Go back home
      </Link>
    </div>
  );
}
