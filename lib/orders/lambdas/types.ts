import { ORDER_STATUS } from "./enums";

export type OrderItems = {
  quantity: number;
  productID: string;
  name: string;
  value: number;
}

export type ItemType = {
  restaurantID: string;
  menuID: string;
  orderItems: OrderItems[];
  total: string;
  orderID: string;
  orderNumber: number;
  status: ORDER_STATUS;
  createdAt: string;
  updatedAt: string;
}