export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="px-10 py-10 max-w-7xl mx-auto">{children}</div>
  );
}
