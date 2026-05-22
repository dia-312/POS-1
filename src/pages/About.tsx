import React from "react";

const About: React.FC = () => {
  return (
    <div style={{
      fontFamily: "'Inter', sans-serif",
      maxWidth: "800px",
      margin: "2rem auto",
      padding: "2rem",
      background: "rgba(255,255,255,0.1)",
      backdropFilter: "blur(10px)",
      borderRadius: "12px",
      boxShadow: "0 4px 30px rgba(0,0,0,0.1)",
      color: "#fff"
    }}>
      <h1 style={{ textAlign: "center", marginBottom: "1rem" }}>POS SYSTEM - DEVELOPER INFO</h1>
      <pre style={{ whiteSpace: "pre-wrap", lineHeight: "1.6" }}>
Application Name: POS System
Developer: Dia'a Arar
Version: 1.0.0

Technologies Used:
- React + Vite
- TypeScript
- Tauri
- SQLite
- TailwindCSS

Copyright © 2026 All Rights Reserved.

This software was developed by Dia'a Arar.
Unauthorized copying, modification, resale,
reverse engineering, or redistribution of
this software without permission is prohibited.

Contact:
Email: diaararx@gmail.com
Phone: +972568207267
      </pre>
    </div>
  );
};

export default About;
