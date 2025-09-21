import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export function serveStatic(app: Express) {
  const distPath = path.resolve("dist/public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the frontend build! Did you forget to run the build command?`
    );
  }

  // Serve static files from the built dist directory
  app.use(express.static(distPath));
  
  // Serve uploaded files (favicon, etc.) from uploads directory
  const uploadsPath = path.resolve("client/public/uploads");
  if (fs.existsSync(uploadsPath)) {
    app.use("/uploads", express.static(uploadsPath));
  }

  app.get("*", async (_req, res) => {
    try {
      // Ler o arquivo HTML
      const htmlPath = path.resolve(distPath, "index.html");
      let htmlContent = fs.readFileSync(htmlPath, 'utf-8');
      
      // Importar storage dinamicamente para evitar dependências circulares
      const { storage } = await import("./storage");
      
      // Buscar o título personalizado do sistema
      const siteTitleSetting = await storage.getSystemSetting('site_title');
      const customTitle = siteTitleSetting?.value || 'PingPong Pro - Gestão de Tênis de Mesa';
      
      // Substituir o título no HTML
      htmlContent = htmlContent.replace(
        /<title>.*?<\/title>/i,
        `<title>${customTitle}</title>`
      );
      
      // Enviar o HTML modificado
      res.send(htmlContent);
    } catch (error) {
      console.error('Error serving HTML with dynamic title:', error);
      // Fallback para arquivo original
      res.sendFile(path.resolve(distPath, "index.html"));
    }
  });
}