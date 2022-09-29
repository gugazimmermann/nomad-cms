import { ItemType } from "./common/types";
import { ORDER_STATUS } from "./common/enums";

export const handler = async (event: ItemType) => {
  const order: ItemType = { ...event };
  const simulatePaymentStatus = [
    ORDER_STATUS.PAYMENT_SUCCESS,
    ORDER_STATUS.PAYMENT_SUCCESS,
    ORDER_STATUS.PAYMENT_SUCCESS,
    ORDER_STATUS.PAYMENT_SUCCESS,
    ORDER_STATUS.PAYMENT_SUCCESS,
    ORDER_STATUS.PAYMENT_SUCCESS,
    ORDER_STATUS.PAYMENT_FAILURE,
    ORDER_STATUS.PAYMENT_FAILURE,
    ORDER_STATUS.PAYMENT_DECLINED,
    ORDER_STATUS.PAYMENT_DECLINED,
  ];
  const status = simulatePaymentStatus.sort(() => Math.random() - 0.5)[0];
  order.status = status;
  console.debug("order", order);
  return {
    statusCode: 200,
    body: order,
  };
};
