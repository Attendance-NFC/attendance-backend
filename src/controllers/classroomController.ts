import type { Request, Response } from "express";
import { docClient } from "../db.js"
import { PutCommand, ScanCommand, BatchWriteCommand } from "@aws-sdk/lib-dynamodb"
import { randomUUID } from "crypto"
import type { AuthenticatedRequest } from "./tokenController.js";

export async function createClassroom(req: Request, res: Response){
    try{
        const { name, teacherId } = req.body as { name: string; teacherId: string; }
        
        if (!name || !teacherId) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const generatedUUID = randomUUID();
        const command = new PutCommand({
            TableName: "classrooms_table",
            Item: {
                classroom_id: generatedUUID,
                class_name: name,
                teacher_id: teacherId
            }
        })

        const response = await docClient.send(command);
        console.log("Success:", response);
        return res.status(201).json({ success: true, classroom_id: generatedUUID });        
    } catch(err){
        console.error("Create classroom error:", err);
        return res.status(500).json({ error: "Something went wrong. Try again." });
    }


}


export async function getClassrooms(req: Request, res: Response){
    try{
        const command = new ScanCommand({
            TableName: "classrooms_table",
        })

        const result = await docClient.send(command);
        console.log("Success:", result);
        return res.status(200).json(result.Items ?? []);

    } catch (err){
        console.error("Get classrooms failed:", err);
        return res.status(500).json({ error: "Something went wrong. Try again." });
    }
}


