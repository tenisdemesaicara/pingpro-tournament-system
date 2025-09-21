import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./utils/dynamicTitle";

createRoot(document.getElementById("root")!).render(<App />);
