import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin — Dragica Pršo",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="admin-shell text-[#2c242c]">{children}</div>;
}
