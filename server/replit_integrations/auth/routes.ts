import type { Express } from "express";
import { authStorage } from "./storage";
import { isAuthenticated, isLoggedIn } from "./replitAuth";

export function registerAuthRoutes(app: Express): void {
  app.get("/api/auth/user", isLoggedIn, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const email = req.user.claims.email;
      const user = await authStorage.getUser(userId);

      const { storage } = await import("../../storage");
      const adminCount = await storage.getAdminUserCount();
      const isAdmin = adminCount === 0 || (email ? await storage.isAdminUser(email) : false);

      res.json({ ...user, isAdmin });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
}
