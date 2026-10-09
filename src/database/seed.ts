import bcrypt from 'bcryptjs';
import { connectDatabase, disconnectDatabase } from './connection.js';
import { ShopModel } from '../modules/shops/shop.model.js';
import { UserModel } from '../modules/users/user.model.js';
import { ProductModel } from '../modules/products/product.model.js';
import { InventoryModel } from '../modules/inventory/inventory.model.js';
import { StockEntryModel } from '../modules/stock-entries/stock-entry.model.js';
import { SaleModel } from '../modules/sales/sale.model.js';
import { StockMovementModel } from '../modules/stock-movements/stock-movement.model.js';
import { UserRole } from '../common/constants/roles.constant.js';
import { CommonStatus } from '../common/constants/status.constant.js';
import { StockEntryService } from '../modules/stock-entries/stock-entry.service.js';
import { SaleService } from '../modules/sales/sale.service.js';
import { logger } from '../common/logger.js';

async function seed(): Promise<void> {
  logger.info('🌱 Starting database seed process...');
  await connectDatabase();

  try {
    // Clear existing records
    logger.info('Clearing existing collections...');
    await Promise.all([
      ShopModel.deleteMany({}),
      UserModel.deleteMany({}),
      ProductModel.deleteMany({}),
      InventoryModel.deleteMany({}),
      StockEntryModel.deleteMany({}),
      SaleModel.deleteMany({}),
      StockMovementModel.deleteMany({})
    ]);

    // 1. Create Shops
    logger.info('Creating shops...');
    const ctgShop = await ShopModel.create({
      name: 'সিলেট শপ',
      code: 'sylhet-shop',
      address: 'জিন্দাবাজার বাণিজ্যিক এলাকা, সিলেট',
      phone: '01811112233',
      status: CommonStatus.ACTIVE
    });

    const dhakaShop = await ShopModel.create({
      name: 'ঢাকা শপ',
      code: 'dhaka-shop',
      address: 'বাংলামোটর অটো পার্টস হাব, ঢাকা',
      phone: '01711223344',
      status: CommonStatus.ACTIVE
    });


    // 2. Create Users
    logger.info('Creating users...');
    const salt = await bcrypt.genSalt(10);
    const adminPasswordHash = await bcrypt.hash('AdminPassword123!', salt);
    const staffPasswordHash = await bcrypt.hash('StaffPassword123!', salt);

    const admin = await UserModel.create({
      name: 'System Administrator',
      phone: '01811000000',
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
      permittedShopIds: [ctgShop._id, dhakaShop._id],
      status: CommonStatus.ACTIVE
    });

    const ctgStaff = await UserModel.create({
      name: 'Chittagong Storekeeper',
      phone: '01811222333',
      passwordHash: staffPasswordHash,
      role: UserRole.STAFF,
      permittedShopIds: [ctgShop._id],
      status: CommonStatus.ACTIVE
    });

    const dhakaStaff = await UserModel.create({
      name: 'Dhaka Storekeeper',
      phone: '01711222333',
      passwordHash: staffPasswordHash,
      role: UserRole.STAFF,
      permittedShopIds: [dhakaShop._id],
      status: CommonStatus.ACTIVE
    });

    // 3. Create Sample Products
    logger.info('Creating auto parts catalog...');
    const productsData = [
      {
        name: 'Toyota Corolla Ceramic Brake Pads (Front)',
        sku: 'BRK-TOY-001',
        description: 'OEM-grade front ceramic brake pad set for Corolla 2015-2022'
      },
      {
        name: 'Denso Iridium Spark Plug IK20',
        sku: 'SPK-DEN-002',
        description: 'High performance iridium spark plug for Japanese petrol engines'
      },
      {
        name: 'Bosch Genuine Oil Filter Premium',
        sku: 'FLT-BOS-003',
        description: 'Heavy duty spin-on oil filter with silicone anti-drain valve'
      },
      {
        name: 'KYB Excel-G Gas Shock Absorber (Rear)',
        sku: 'SHK-KYB-004',
        description: 'Twin-tube gas shock absorber for rear suspension'
      },
      {
        name: 'Continental V-Ribbed Timing Belt 135T',
        sku: 'BLT-CON-005',
        description: 'High tensile heat-resistant engine timing belt'
      }
    ];

    const products = await Promise.all(
      productsData.map((p) =>
        ProductModel.create({
          name: p.name,
          normalizedName: p.name.toLowerCase(),
          sku: p.sku,
          description: p.description
        })
      )
    );

    // 4. Record Initial Stock Entries for Chittagong Shop
    logger.info('Recording incoming stock for Chittagong Shop...');
    // Product 0: 50 pcs @ 1200 BDT
    await StockEntryService.create(ctgShop._id.toString(), admin._id.toString(), {
      productId: products[0]._id.toString(),
      supplierName: 'Pacific Auto Importers, Japan',
      quantityReceived: 50,
      buyingRatePerPiece: 1200,
      sellingRatePerPiece: 1650,
      notes: 'Initial stock intake batch #1'
    });

    // Product 1: 100 pcs @ 400 BDT
    await StockEntryService.create(ctgShop._id.toString(), admin._id.toString(), {
      productId: products[1]._id.toString(),
      supplierName: 'Nippon Spark Spares Co.',
      quantityReceived: 100,
      buyingRatePerPiece: 400,
      sellingRatePerPiece: 600,
      notes: 'Initial stock intake batch #1'
    });

    // Product 2: 80 pcs @ 350 BDT
    await StockEntryService.create(ctgShop._id.toString(), admin._id.toString(), {
      productId: products[2]._id.toString(),
      supplierName: 'Bosch Bangladesh Distributor',
      quantityReceived: 80,
      buyingRatePerPiece: 350,
      sellingRatePerPiece: 550,
      notes: 'Initial stock intake batch #1'
    });

    // 5. Record Initial Stock Entries for Dhaka Shop
    logger.info('Recording incoming stock for Dhaka Shop...');
    // Product 0: 30 pcs @ 1250 BDT
    await StockEntryService.create(dhakaShop._id.toString(), admin._id.toString(), {
      productId: products[0]._id.toString(),
      supplierName: 'Pacific Auto Importers, Japan',
      quantityReceived: 30,
      buyingRatePerPiece: 1250,
      sellingRatePerPiece: 1700,
      notes: 'Dhaka hub initial replenishment'
    });

    // Product 3: 20 pcs @ 3200 BDT
    await StockEntryService.create(dhakaShop._id.toString(), admin._id.toString(), {
      productId: products[3]._id.toString(),
      supplierName: 'Tokyo Suspension Works Ltd.',
      quantityReceived: 20,
      buyingRatePerPiece: 3200,
      sellingRatePerPiece: 4200,
      notes: 'Heavy shock absorber shipment'
    });

    // Product 4: 40 pcs @ 750 BDT
    await StockEntryService.create(dhakaShop._id.toString(), admin._id.toString(), {
      productId: products[4]._id.toString(),
      supplierName: 'Continental BD Agent',
      quantityReceived: 40,
      buyingRatePerPiece: 750,
      sellingRatePerPiece: 1100,
      notes: 'Timing belts batch #2'
    });

    // 6. Record Subsequent Stock Entry to test Weighted-Average Costing in Chittagong
    logger.info('Adding second stock entry with new price to verify weighted-average cost...');
    // Added 50 more pcs of Brake Pads @ 1400 BDT (Was 50 @ 1200, New avg should be (50*1200 + 50*1400)/100 = 1300 BDT)
    await StockEntryService.create(ctgShop._id.toString(), ctgStaff._id.toString(), {
      productId: products[0]._id.toString(),
      supplierName: 'Pacific Auto Importers, Japan',
      quantityReceived: 50,
      buyingRatePerPiece: 1400,
      sellingRatePerPiece: 1800,
      notes: 'Second batch purchase at higher import tariff'
    });

    // 7. Record Realistic Customer Sales in Chittagong Shop
    logger.info('Recording sales in Chittagong Shop...');
    await SaleService.create(ctgShop._id.toString(), ctgStaff._id.toString(), {
      productId: products[0]._id.toString(),
      quantitySold: 10,
      sellingRatePerPiece: 1800,
      notes: 'Sale to City Garage Agrabad'
    });

    await SaleService.create(ctgShop._id.toString(), ctgStaff._id.toString(), {
      productId: products[1]._id.toString(),
      quantitySold: 16,
      sellingRatePerPiece: 600,
      notes: 'Cash sale to retail customer'
    });

    // 8. Record Sales in Dhaka Shop
    logger.info('Recording sales in Dhaka Shop...');
    await SaleService.create(dhakaShop._id.toString(), dhakaStaff._id.toString(), {
      productId: products[0]._id.toString(),
      quantitySold: 5,
      sellingRatePerPiece: 1700,
      notes: 'Sale to Motijheel Workshop'
    });

    await SaleService.create(dhakaShop._id.toString(), dhakaStaff._id.toString(), {
      productId: products[3]._id.toString(),
      quantitySold: 4,
      sellingRatePerPiece: 4200,
      notes: 'KYB shock pair sale'
    });

    logger.info('✅ Database seeded successfully with test data!');
    logger.info('----------------------------------------------------');
    logger.info('Admin Login: Phone: 01811000000 | Password: AdminPassword123!');
    logger.info('CTG Staff:   Phone: 01811222333 | Password: StaffPassword123!');
    logger.info('Dhaka Staff: Phone: 01711222333 | Password: StaffPassword123!');
    logger.info('----------------------------------------------------');
  } catch (error) {
    logger.error({ error }, '❌ Seed failed');
    process.exit(1);
  } finally {
    await disconnectDatabase();
  }
}

seed();
