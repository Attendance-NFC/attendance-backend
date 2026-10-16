import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

// No accessKeyId/secretAccessKey here — the SDK finds your credentials
// automatically via the default credential provider chain (the same
// identity your AWS CLI is already using).
const client = new DynamoDBClient({
  region: process.env.AWS_REGION ?? "us-east-2", // match the region you created your tables in
});

export const ddb = DynamoDBDocumentClient.from(client);

//can use .env variables
export const TEST_TABLE = 'insert-read-testing'