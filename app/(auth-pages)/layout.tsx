export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-start justify-center p-4 pt-20">
      <div className="w-full max-w-md">
        <div className="bg-black/95 backdrop-blur-md border border-gray-800/50 rounded-xl p-8 shadow-xl color-changing-border">
          {children}
        </div>
      </div>
    </div>
  );
}
