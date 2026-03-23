export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="px-4 py-6 sm:px-6 md:px-8 lg:px-10 lg:py-10 max-w-7xl mx-auto">{children}</div>
  );
}
