import "./globals.css";

export const metadata = {
  title: "Relay",
  description: "One campaign, multiple ad platforms.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}