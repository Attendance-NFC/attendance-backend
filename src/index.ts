import 'dotenv/config'
import express, { type Express, type Request, type Response } from "express";
import cors from 'cors';
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


app.listen(PORT, ():void => {
  console.log(`Server listening on port ${PORT}`);
});
