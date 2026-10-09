import bcrypt from 'bcryptjs';
import { UserModel } from '../modules/users/user.model.js';
import { ShopModel } from '../modules/shops/shop.model.js';
import { env } from '../config/env.js';
import { logger } from '../common/logger.js';
import { PhoneUtil } from '../common/utils/phone.util.js';
import { SlugUtil } from '../common/utils/slug.util.js';
import { UserRole } from '../common/constants/roles.constant.js';
import { CommonStatus } from '../common/constants/status.constant.js';

export async function bootstrapSystem(): Promise<void> {
  try {
    // 1. Bootstrap Initial Shops if not present
    const initialShops = [
      {
        name: 'সিলেট শপ',
        code: SlugUtil.create('sylhet-shop'),
        address: 'জিন্দাবাজার বাণিজ্যিক এলাকা, সিলেট',
        phone: '01811112233',
        status: CommonStatus.ACTIVE
      },
      {
        name: 'ঢাকা শপ',
        code: SlugUtil.create('dhaka-shop'),
        address: 'বাংলামোটর অটো পার্টস হাব, ঢাকা',
        phone: '01711223344',
        status: CommonStatus.ACTIVE
      }
    ];

    // Also update any existing Chittagong shops to Sylhet
    await ShopModel.updateMany(
      {
        $or: [
          { name: { $in: ['চিটাগং শপ', 'চিটাগং', 'Chittagong Shop', 'চট্টগ্রাম শপ', 'চিটাগং '] } },
          { code: 'chittagong-shop' }
        ]
      },
      {
        $set: {
          name: 'সিলেট শপ',
          code: 'sylhet-shop'
        }
      }
    );

    for (const shopData of initialShops) {
      const existingShop = await ShopModel.findOne({
        $or: [{ code: shopData.code }, { name: shopData.name }]
      });
      if (!existingShop) {
        await ShopModel.create(shopData);
        logger.info(`Bootstrapped initial shop: ${shopData.name} (${shopData.code})`);
      }
    }


    // 2. Bootstrap Initial Administrator if not present
    const normalizedAdminPhone = PhoneUtil.normalize(env.BOOTSTRAP_ADMIN_PHONE);
    const existingAdmin = await UserModel.findOne({ phone: normalizedAdminPhone });

    if (!existingAdmin) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(env.BOOTSTRAP_ADMIN_PASSWORD, salt);

      const allShops = await ShopModel.find({}, { _id: 1 });
      const shopIds = allShops.map((s) => s._id);

      await UserModel.create({
        name: env.BOOTSTRAP_ADMIN_NAME,
        phone: normalizedAdminPhone,
        passwordHash,
        role: UserRole.ADMIN,
        permittedShopIds: shopIds,
        status: CommonStatus.ACTIVE
      });

      logger.info(
        `Bootstrapped initial Administrator: Phone: ${normalizedAdminPhone}, Name: ${env.BOOTSTRAP_ADMIN_NAME}`
      );
    }
  } catch (error) {
    logger.error({ error }, 'Error during system bootstrap');
    throw error;
  }
}
