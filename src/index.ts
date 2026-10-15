import 'dotenv/config'
import express, { type Express, type Request, type Response } from "express";
import cors from 'cors';
import serverless from "serverless-http"
import { loginRouter } from './routes/loginRoute.js'

const app:Express = express();
const PORT = process.env.PORT;
const CORS_ORIGIN = process.env.CORS_ORIGIN;

app.use(express.json());
app.use(cors({ origin: CORS_ORIGIN }));

app.get("/", (req: Request, res: Response) => {
  res.send("Hello World!");
  console.log("Response sent");
});

app.use("/", loginRouter)

// Lambda entry point — API Gateway invokes this directly
export const handler = serverless(app);

// Only bind to a port when running locally, not inside Lambda
if (!process.env.AWS_LAMBDA_FUNCTION_NAME) {
  app.listen(PORT, (): void => {
    console.log(`Server listening on port ${PORT}`);
  });
}