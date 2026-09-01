import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pizza Vizza Register',
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-stone-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-xl">{children}</div>
    </div>
  );
}
