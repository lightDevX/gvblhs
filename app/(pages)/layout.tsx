import Header from "@/components/layout/Header";
import { ReactNode } from "react";

export default function PagesLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      {children}
    </>
  );
}
