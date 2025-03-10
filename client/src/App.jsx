import { BrowserRouter, Route, Routes} from "react-router-dom"
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import { Toaster } from "react-hot-toast";
import HomePage from "./pages/HomePage";
import PrivateRoute from "./components/PrivateRoute";

function App() {
  return (
    <>
    <Toaster position="top-center" />
    <BrowserRouter>
      <Routes>
        <Route path="/" element={
          < LoginPage />
        } />

        <Route path="/signup" element={
          < SignupPage />
        } />

        <Route path="/homePage" element={
          <PrivateRoute>
            < HomePage />
          </PrivateRoute>
        } />
      </Routes>
    </BrowserRouter>
    </>
  );
}

export default App;