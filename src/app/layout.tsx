import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'HD Translators API',
  description: 'Human Design Profile Extraction API',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}