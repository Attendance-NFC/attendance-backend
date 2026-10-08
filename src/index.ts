import express, { type Request, type Response } from "express";
import bcrypt from "bcrypt";
import jwt from 'jsonwebtoken';
import cors from 'cors';

const app = express();
const PORT = 3000;

//testing email and password:
//testing@gmail.com
//testingPassword

let testPassword = 'testingPassword'
let hashedPassword = await bcrypt.hash(testPassword, 10);

app.use(express.json());
app.use(cors({ origin: "http://localhost:5173" }));

app.get("/", (req: Request, res: Response) => {
  res.send("Hello World!");
  console.log("Response sent");
});

async function startServer() {
  const hashedPassword = await bcrypt.hash(testPassword, 10);

  app.post("/login", async (req: Request, res: Response) => {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    if (!(await bcrypt.compare(password, hashedPassword)) || email != 'testing@gmail.com') {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign({ foo: "bar" }, "privateKey", { expiresIn: "2h" });

    return res.json({ token });
  });

  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer();