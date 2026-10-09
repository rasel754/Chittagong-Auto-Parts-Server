import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { UserModel } from '../../modules/users/user.model.js';
import { ShopModel } from '../../modules/shops/shop.model.js';
import { ProductModel } from '../../modules/products/product.model.js';
import { UserRole } from '../../common/constants/roles.constant.js';
import { CommonStatus } from '../../common/constants/status.constant.js';

let mongod: MongoMemoryServer | null = null;

export async function setupTestDb(): Promise<void> {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
}

export async function teardownTestDb(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongod) {
    await mongod.stop();
  }
}

export async function clearTestDb(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      if (collection) {
        await collection.deleteMany({});
      }
    }
  }
}

export async function createTestSeedData() {
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('Password123!', salt);

  const ctgShop = await ShopModel.create({
    name: 'Chittagong Shop',
    code: 'chittagong-shop',
    address: 'Agrabad, CTG',
    phone: '01811111111',
    status: CommonStatus.ACTIVE
  });

  const dhakaShop = await ShopModel.create({
    name: 'Dhaka Shop',
    code: 'dhaka-shop',
    address: 'Banglamotor, Dhaka',
    phone: '01711111111',
    status: CommonStatus.ACTIVE
  });

  const inactiveShop = await ShopModel.create({
    name: 'Inactive Shop',
    code: 'inactive-shop',
    status: CommonStatus.INACTIVE
  });

  const admin = await UserModel.create({
    name: 'Admin User',
    phone: '01811000000',
    passwordHash,
    role: UserRole.ADMIN,
    permittedShopIds: [ctgShop._id, dhakaShop._id],
    status: CommonStatus.ACTIVE
  });

  const ctgStaff = await UserModel.create({
    name: 'CTG Staff',
    phone: '01811222222',
    passwordHash,
    role: UserRole.STAFF,
    permittedShopIds: [ctgShop._id],
    status: CommonStatus.ACTIVE
  });

  const dhakaStaff = await UserModel.create({
    name: 'Dhaka Staff',
    phone: '01711222222',
    passwordHash,
    role: UserRole.STAFF,
    permittedShopIds: [dhakaShop._id],
    status: CommonStatus.ACTIVE
  });

  const inactiveStaff = await UserModel.create({
    name: 'Inactive Staff',
    phone: '01911999999',
    passwordHash,
    role: UserRole.STAFF,
    permittedShopIds: [ctgShop._id],
    status: CommonStatus.INACTIVE
  });

  const brakePad = await ProductModel.create({
    name: 'Ceramic Brake Pads',
    normalizedName: 'ceramic brake pads',
    sku: 'BRK-001'
  });

  const sparkPlug = await ProductModel.create({
    name: 'Iridium Spark Plug',
    normalizedName: 'iridium spark plug',
    sku: 'SPK-002'
  });

  return {
    shops: { ctgShop, dhakaShop, inactiveShop },
    users: { admin, ctgStaff, dhakaStaff, inactiveStaff },
    products: { brakePad, sparkPlug }
  };
}
