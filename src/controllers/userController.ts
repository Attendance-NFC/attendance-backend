import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import type { Request, Response } from "express";
import { docClient } from "../db.js"
import { PutCommand } from "@aws-sdk/lib-dynamodb"
import { randomUUID } from "crypto"

export async function createUser(req: Request, res: Response){
    try{
        const { name, email, password, role, cardId, cardStatus } = req.body as { name?: string; email: string; password: string; role: string; cardId: string; cardStatus: string;  }

        if (!name?.trim() || !email?.trim() || !password || !cardId?.trim()) {
        return res.status(400).json({ error: "Missing required fields" });
        }

        const normalizedEmail = email.trim().toLowerCase();
        if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
        return res.status(400).json({ error: "Invalid email" });
        }

        if (password.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters" });
        }

        if (!["admin", "teacher", "student"].includes(role)) {
        return res.status(400).json({ error: "Invalid role" });
        }

        const generatedUUID = randomUUID();
        const hashedPassword = await bcrypt.hash(password, 10);
        const command = new PutCommand({
            TableName: "users_table",
            Item: {
                user_id: generatedUUID,
                name: name,
                email: email,
                password_hash: hashedPassword,
                role: role,
                status: cardStatus
            }
        })

        const response = await docClient.send(command);
        console.log("Success:", response);
        return res.status(201).json({ success: true, user_id: generatedUUID });

    } catch (err){
        console.error("createUser failed:", err);
        return res.status(500).json({ error: "Internal server error"})
    }
}