import * as AWS from "aws-sdk";
import { APIGatewayProxyResult, APIGatewayEvent } from "aws-lambda";

const TABLE_NAME = process.env.TABLE_NAME || "";

const db = new AWS.DynamoDB.DocumentClient();

export const handler = async (
  event: APIGatewayEvent
): Promise<APIGatewayProxyResult> => {
  const restaurantID = event.pathParameters?.restaurantID;
  const menuID = event.pathParameters?.menuID;

  const headers = { 'Access-Control-Allow-Origin': '*' }
  if (!restaurantID || !menuID) return { statusCode: 400, headers, body: JSON.stringify("Error: You are missing the restaurantID or menuID") };
  const params = {
    TableName: TABLE_NAME,
    IndexName: 'byMenuID',
    KeyConditionExpression: 'restaurantID = :restaurantID and menuID = :menuID',
    ExpressionAttributeValues: { ":restaurantID": restaurantID, ":menuID": menuID },
    ProjectionExpression: "#productID, #name, #image, #value",
    ExpressionAttributeNames: { "#productID": "productID", "#name": "name", "#image": "image", "#value": "value",  },
  };
  try {
    const response = await db.query(params).promise();
    return { statusCode: 200, headers, body: JSON.stringify(response.Items) };
  } catch (dbError) {
    return { statusCode: 500, headers, body: JSON.stringify(dbError) };
  }
};
