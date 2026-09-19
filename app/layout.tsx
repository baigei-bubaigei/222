import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "isobar. · 天气预报",
  description: "看见温度、风、雨和空气质量，把每天的出门决定变得更轻。",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

/** 提供全站 HTML 外壳、语言设置、全局样式和页面元数据。 */
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
