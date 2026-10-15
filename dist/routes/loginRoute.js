import express from 'express';
import { login } from '../controllers/loginController.js';
export const loginRouter = express.Router();
loginRouter.post('/login', login);
//# sourceMappingURL=loginRoute.js.map