import { dataTableRecords, filesData, invoicesData, userData } from '@/assets/data/other';
import { productData } from '@/assets/data/products';
import { sleep } from '@/utils/promise';

// export const getBrandsList = async (): Promise<BrandListType[]> => {
//   await sleep()
//   return brandListData
// }
export const getUserData = async () => {
  await sleep();
  return userData;
};
export const getAllFiles = async () => {
  const data = filesData.map(item => {
    const user = userData.find(user => user.id == item.userId);
    return {
      ...item,
      user
    };
  });
  await sleep();
  return data;
};
export const getAllInvoices = async () => {
  const data = invoicesData.map(item => {
    const users = userData.find(user => user.id === item.userId);
    const products = productData.find(product => product.id === item.productId);
    return {
      ...item,
      users,
      products
    };
  });
  await sleep();
  return data;
};
export const getAllDataTableRecords = async () => {
  await sleep();
  return dataTableRecords;
};