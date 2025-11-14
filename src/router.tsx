import { createBrowserRouter } from "react-router-dom"
import Layout from "@/pages/_layout"
import HomePage from "@/pages/home"
import GuidePage from "@/pages/guide"
import DesignShowcasePage from "@/pages/design-examples"
import FeedbackPage from "@/pages/feedback"
import NotFoundPage from "@/pages/not-found"

// IMPORTANT: Do not remove or modify the code below!
// Normalize basename when hosted in Power Apps
let BASENAME = "/"
try {
  const url = new URL(".", location.href)
  BASENAME = url.pathname
  if (location.pathname.endsWith("/index.html")) {
    history.replaceState(null, "", BASENAME + location.search + location.hash);
  }
} catch {
  // Fallback to root if URL parsing fails
  BASENAME = "/"
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout showHeader={true} />,
    errorElement: <NotFoundPage />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "guide", element: <GuidePage /> },
      { path: "design-examples", element: <DesignShowcasePage /> },
      { path: "feedback", element: <FeedbackPage /> },
    ],
  },
], {
  basename: BASENAME // IMPORTANT: Set basename for proper routing when hosted in Power Apps
})
