import authRoutes from "./modules/auth/auth.routes";
import express, { Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import morgan from "morgan";
import dashboardRoutes from "./modules/dashboard/dashboard.routes";
import departmentRoutes from "./modules/departments/department.routes";
import designationRoutes from "./modules/designations/designation.routes";
import officeLocationRoutes from "./modules/office-locations/officeLocation.routes";
import employeeRoutes from "./modules/employees/employee.routes";
import roleRoutes from "./modules/roles/role.routes";
import attendanceRoutes from "./modules/attendance/attendance.routes";
import projectRoutes from "./modules/projects/project.routes";
import taskRoutes from "./modules/tasks/task.routes";
import reportRoutes from "./modules/reports/report.routes";

const app = express();

/**
 * Security middleware
 * Helmet helps secure Express apps by setting HTTP response headers.
 */
app.use(helmet());

/**
 * CORS configuration
 * Frontend currently runs on http://localhost:3000
 */
const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:9000",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);
/**
 * Request logger
 * Useful during development to see API requests in terminal.
 */
app.use(morgan("dev"));

/**
 * Body parsers
 * JSON limit is increased because attendance/photo related payloads
 * may need larger data later, though file uploads will use multipart.
 */
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

/**
 * Health route
 * This confirms that API server is running.
 */
app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "WorkSync HRMS API is running successfully",
    version: "1.0.0",
  });
  
});
app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/designations", designationRoutes);
app.use("/api/office-locations", officeLocationRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/reports", reportRoutes);
export default app;