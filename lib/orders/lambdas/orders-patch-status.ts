import * as AWS from "aws-sdk";
import { APIGatewayProxyResult, APIGatewayEvent } from "aws-lambda";
import { OrderType } from "./common/types";
import { ORDER_STATUS } from "./common/enums";
import commonResponse from "./common/commonResponse";

const TABLE_NAME = process.env.TABLE_NAME || "";

const db = new AWS.DynamoDB.DocumentClient();

export const handler = async (
  event: APIGatewayEvent
): Promise<APIGatewayProxyResult> => {
  console.debug(`event`, JSON.stringify(event, undefined, 2));

  const restaurantID = event.pathParameters?.restaurantID;
  if (!restaurantID)
    return commonResponse(400, "You are missing the restaurantID");

  const { body } = event;
  if (!body) return commonResponse(400, "You are missing the Order Item");

  let item: OrderType = JSON.parse(body);
  if (!item.restaurantID || item.restaurantID !== restaurantID)
    return commonResponse(400, "Incorrect restaurantID");
  if (!item.menuID) return commonResponse(400, "You are missing the menuID");
  if (!item.orderID) return commonResponse(400, "You are missing the orderID");
  if (!item.status) return commonResponse(400, "You are missing the status");

  const statuses = Object.values(ORDER_STATUS);
  if (!statuses.includes(item.status))
    return commonResponse(409, JSON.stringify("Status does not exist"));

  const queryParams = {
    TableName: TABLE_NAME,
    Key: {
      restaurantID: item.restaurantID,
      orderID: item.orderID,
    },
    ProjectionExpression: "#status",
    ExpressionAttributeNames: { "#status": "status" },
  };
  try {
    const queryResponse = await db.get(queryParams).promise();
    const actualStatus = queryResponse?.Item?.status || null;
    if (!actualStatus || actualStatus === item.status)
      return commonResponse(409, JSON.stringify("Same status"));
  } catch (error) {
    return commonResponse(500, JSON.stringify(error));
  }

  const dateNow = Date.now().toString();

  const params = {
    TableName: TABLE_NAME,
    Key: {
      restaurantID: item.restaurantID,
      orderID: item.orderID,
    },
    UpdateExpression: "set #status = :status, #updatedAt = :updatedAt",
    ExpressionAttributeValues: {
      ":status": item.status,
      ":updatedAt": dateNow,
    },
    ExpressionAttributeNames: {
      "#status": "status",
      "#updatedAt": "updatedAt",
    },
    ReturnValues: "ALL_NEW",
  };
  console.debug(`params`, JSON.stringify(params, undefined, 2));

  try {
    const response = await db.update(params).promise();
    return commonResponse(200, JSON.stringify(response));
  } catch (error) {
    console.error(`error`, JSON.stringify(error, undefined, 2));
    return commonResponse(500, JSON.stringify(error));
  }
};
