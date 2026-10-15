import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
// Testing email and password:
// testing@gmail.com
// testingPassword
const testPassword = "testingPassword";
const testEmail = "testing@gmail.com";
// Computed once when this module is first loaded, not on every request.
let hashedPasswordPromise = null;
function getHashedTestPassword() {
    if (!hashedPasswordPromise) {
        hashedPasswordPromise = bcrypt.hash(testPassword, 10);
    }
    return hashedPasswordPromise;
}
export async function login(req, res) {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
    }
    const hashedPassword = await getHashedTestPassword();
    const passwordMatches = await bcrypt.compare(password, hashedPassword);
    if (!passwordMatches || email !== testEmail) {
        return res.status(401).json({ error: "Invalid email or password" });
    }
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
        throw new Error("JWT_SECRET environment variable is not set");
    }
    const token = jwt.sign({ foo: "bar" }, JWT_SECRET, { expiresIn: "2h" });
    return res.json({ token });
}
//# sourceMappingURL=loginController.js.map