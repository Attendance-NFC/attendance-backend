
import 'dotenv/config'
import cookieParser from "cookie-parser";
import express, { type Express, type Request, type Response } from "express";
import cors from 'cors';
import serverless from "serverless-http";
import rateLimit from "express-rate-limit";
import { loginRouter } from './routes/loginRoute.js';
import { adminRouter } from './routes/adminRoute.js';
import { studentRouter } from './routes/studentRoute.js';

const app: Express = express();

const PORT = process.env.PORT || 3000;
const CORS_ORIGIN = process.env.CORS_ORIGIN;

// Middleware
app.use(express.json());
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(cookieParser());

const globalRateLimit = rateLimit({
    windowMs: 60 * 1000, // 1 minute
	limit: 100, // Limit each IP to 100 requests per `window`.
	standardHeaders: 'draft-8', // draft-6: `RateLimit-*` headers; draft-7 & draft-8: combined `RateLimit` header
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
})
app.use(globalRateLimit)

// Health check
app.get("/", (req: Request, res: Response) => {
    res.send("Hello World!");
    console.log("Response sent");
});

// Register routes
app.use("/", loginRouter);
app.use("/admin", adminRouter);
app.use("/student", studentRouter)

app.get('/api/users', (req: Request, res: Response) => {
    res.json({ message: "Success" });
});

// API Gateway-prefixed routes
const API_PREFIX = "/Attendance-Backend";

app.use(API_PREFIX, loginRouter);
app.use(`${API_PREFIX}/admin`, adminRouter);
app.use(`${API_PREFIX}/student`, studentRouter);

app.get(`${API_PREFIX}/api/users`, (req: Request, res: Response) => {
    res.json({ message: "Success" });
});

// Handle invalid routes
app.use((req: Request, res: Response) => {
    res.status(404).json({
        error: "Route not found",
        path: req.originalUrl
    });
});

// Lambda entry point
export const handler = serverless(app);

// Only start an HTTP server when running locally
if (!process.env.AWS_LAMBDA_FUNCTION_NAME) {
    app.listen(PORT, (): void => {
        console.log(`Server listening on port ${PORT}`);
    });
}
