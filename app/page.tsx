import { chatGPTSignInPath, chatGPTSignOutPath, getChatGPTUser } from "./chatgpt-auth";
import WeatherDashboard from "./weather-dashboard";

export const dynamic = "force-dynamic";

/** 页面入口读取当前可选登录身份，再把安全的登录地址交给客户端天气工作台。 */
export default async function Home() {
  const user = await getChatGPTUser();

  return (
    <WeatherDashboard
      user={user ? { displayName: user.displayName, email: user.email } : null}
      signInHref={chatGPTSignInPath("/")}
      signOutHref={chatGPTSignOutPath("/")}
    />
  );
}
