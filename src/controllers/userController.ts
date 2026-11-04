import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import type { Request, Response } from "express";
import { docClient } from "../db.js"
import { PutCommand, QueryCommand, ScanCommand, BatchGetCommand, GetCommand } from "@aws-sdk/lib-dynamodb"
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

export async function getStudents(req: Request, res: Response){
    try {
        const command = new QueryCommand({
            TableName: "users_table",
            IndexName: "role_index",
            KeyConditionExpression: "#role = :role",
            ExpressionAttributeNames: { "#role": "role"},
            ExpressionAttributeValues: { ":role": "student" }
        })
        
        const result = await docClient.send(command);
        const students = (result.Items ?? []).map(({ user_id, name }) => ({ user_id, name }));
        return res.json(students);        
    } catch (err){
        console.error("getStudents failed:", err);
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

export async function getUserById(req: Request, res: Response) {
  try {
    const { userId } = req.params;
 
    if (!userId) {
      return res.status(400).json({ error: "Missing user id" });
    }
 
    // 1. The user record itself.
    const userResult = await docClient.send(
      new GetCommand({
        TableName: 'users_table',
        Key: { user_id: userId },
      })
    );
 
    if (!userResult.Item) {
      return res.status(404).json({ error: "User not found" });
    }
 
    // 2. Their card, via the UserCardIndex GSI (Cards is keyed by card_id,
    //    not user_id, on the base table).
    const cardResult = await docClient.send(
      new QueryCommand({
        TableName: 'cards_table',
        IndexName: "user_card_index",
        KeyConditionExpression: "user_id = :userId",
        ExpressionAttributeValues: { ":userId": userId },
      })
    );
    const card = cardResult.Items?.[0] ?? null;
 
    // 3. Which classrooms they're enrolled in, via the UserClassroomsIndex
    //    GSI (Enrollments is keyed by classroom_id on the base table).
    const enrollmentsResult = await docClient.send(
      new QueryCommand({
        TableName: 'enrollments_table',
        IndexName: "user_classrooms_index",
        KeyConditionExpression: "user_id = :userId",
        ExpressionAttributeValues: { ":userId": userId },
      })
    );
    const classroomIds: string[] = [
      ...new Set(enrollmentsResult.Items?.map((item) => item.classroom_id) ?? []),
    ];
 
    let classrooms: {
      classroom_id: string;
      class_name: string;
      room_id: string;
      day_of_week: string;
      start_time: string;
      end_time: string;
    }[] = [];
 
    if (classroomIds.length > 0) {
      // 4. Classroom names, fetched in one batch rather than one call each.
      const classroomsResult = await docClient.send(
        new BatchGetCommand({
          RequestItems: {
            ['classrooms_table']: {
              Keys: classroomIds.map((id) => ({ classroom_id: id })),
            },
          },
        })
      );
      const classroomsById = Object.fromEntries(
        (classroomsResult.Responses?.['classrooms_table'] ?? []).map((c) => [
          c.classroom_id,
          c,
        ])
      );
 
      // 5. Every scheduled meeting time for each classroom, via the
      //    ClassroomScheduleIndex GSI — a class meeting multiple times a
      //    week returns multiple items here, all handled below.
      const scheduleResults = await Promise.all(
        classroomIds.map((id) =>
          docClient.send(
            new QueryCommand({
              TableName: 'schedules_table',
              IndexName: "classroom_schedule_index",
              KeyConditionExpression: "classroom_id = :id",
              ExpressionAttributeValues: { ":id": id },
            })
          )
        )
      );
 
      // flatMap: one row per scheduled meeting, not one row per classroom —
      // this is what makes a twice-a-week class show up as two rows.
      classrooms = classroomIds.flatMap((id, i) => {
        const scheduleResult = scheduleResults[i];
        if (!scheduleResult) {
            console.error(`No schedule result at index ${i} for classroom ${id}`);
            return []; // skip this classroom's schedule rather than crash the whole request
        }

        const className = classroomsById[id]?.class_name ?? "Unknown";
        const scheduleItems = scheduleResult.Items ?? [];
 
        return scheduleItems.map((s) => ({
          classroom_id: id,
          class_name: className,
          room_id: s.room_id,
          day_of_week: s.day_time?.split("#")[0] ?? "—",
          start_time: s.start_time ?? "—",
          end_time: s.end_time ?? "—",
        }));
      });
    }
 
    return res.status(200).json({
      user: {
        user_id: userResult.Item.user_id,
        name: userResult.Item.name,
        email: userResult.Item.email,
        role: userResult.Item.role,
        status: userResult.Item.status,
        // password_hash deliberately excluded — never sent to the frontend
      },
      card,
      classrooms,
    });
  } catch (err) {
    console.error("getUserById failed:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}