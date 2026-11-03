import type { Request, Response } from "express";
import { BatchWriteCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "../db.js";

const ENROLLMENTS_TABLE = process.env.ENROLLMENTS_TABLE ?? "enrollments_table";
const CLASSROOMS_TABLE = process.env.CLASSROOMS_TABLE ?? "classrooms_table";

const BATCH_LIMIT = 25; // DynamoDB's BatchWriteCommand hard limit per request

export async function createEnrollments(req: Request, res: Response) {
  try {
    const { classroomId, studentIds } = req.body as {
      classroomId?: string;
      studentIds?: string[];
    };

    if (!classroomId || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Confirm the classroom actually exists before enrolling anyone into it.
    const classroomResult = await docClient.send(
      new GetCommand({
        TableName: CLASSROOMS_TABLE,
        Key: { classroom_id: classroomId },
      })
    );
    if (!classroomResult.Item) {
      return res.status(400).json({ error: "Classroom not found" });
    }

    // Chunk into groups of 25 — BatchWriteCommand rejects anything larger.
    const chunks: string[][] = [];
    for (let i = 0; i < studentIds.length; i += BATCH_LIMIT) {
      chunks.push(studentIds.slice(i, i + BATCH_LIMIT));
    }

    for (const chunk of chunks) {
      await docClient.send(
        new BatchWriteCommand({
          RequestItems: {
            [ENROLLMENTS_TABLE]: chunk.map((userId) => ({
              PutRequest: {
                Item: { classroom_id: classroomId, user_id: userId },
              },
            })),
          },
        })
      );
    }

    return res.status(201).json({ success: true, enrolled: studentIds.length });
  } catch (err) {
    console.error("createEnrollments failed:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}