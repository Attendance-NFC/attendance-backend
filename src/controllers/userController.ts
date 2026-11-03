import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import type { Request, Response } from "express";
import { docClient } from "../db.js"
import { PutCommand, QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb"
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
        const usersResponse = await docClient.send(new PutCommand({
            TableName: "users_table",
            Item: {
                user_id: generatedUUID,
                name: name,
                email: normalizedEmail,
                password_hash: hashedPassword,
                role: role,
                status: cardStatus
            }
        }))

        const cardsResponse = await docClient.send(new PutCommand({
            TableName: "cards_table",
            Item:{
                card_id: cardId,
                status: cardStatus,
                user_id: generatedUUID
            }
        }))

        console.log("Success:", usersResponse, cardsResponse);
        return res.status(201).json({ success: true, user_id: generatedUUID, card_id: cardId});

    } catch (err){
        console.error("createUser failed:", err);
        return res.status(500).json({ error: "Internal server error"})
    }
}

export async function getTeachers(req: Request, res: Response){
    try{
        const command = new QueryCommand({
            TableName: "users_table",
            IndexName: "role_index",
            KeyConditionExpression: "#role = :role",
            ExpressionAttributeNames: { "#role": "role"},
            ExpressionAttributeValues: { ":role": "teacher" }
        })
        
        const result = await docClient.send(command);
        const teachers = (result.Items ?? []).map(({ user_id, name }) => ({ user_id, name }));
        return res.json(teachers);        
    } catch(err) {
        console.error("getTeachers failed:", err);
        return res.status(500).json({ error: "Internal server error"})
    }

}

export async function getUsers(req: Request, res: Response) {
  try {
    const usersResult = await docClient.send(new ScanCommand({ TableName: "users_table" }));
    const users = usersResult.Items ?? [];

    // For each user, look up their card and flatten it onto the response.
    const usersWithCards = await Promise.all(
      users.map(async (user) => {
        const cardResult = await docClient.send(
          new QueryCommand({
            TableName: "cards_table",
            IndexName: "user_card_index",
            KeyConditionExpression: "user_id = :userId",
            ExpressionAttributeValues: { ":userId": user.user_id },
          })
        );
        const card = cardResult.Items?.[0];
        return {
          user_id: user.user_id,
          name: user.name,
          email: user.email,
          role: user.role,
          card_id: card?.card_id ?? null,
          card_status: card?.status ?? null,
        };
      })
    );

    return res.status(200).json(usersWithCards);
  } catch (err) {
    console.error("getUsers failed:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}