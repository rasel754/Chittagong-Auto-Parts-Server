import { Schema, model } from 'mongoose';
import bcrypt from 'bcryptjs';
import { IUserDocument } from './user.interface.js';
import { UserRole } from '../../common/constants/roles.constant.js';
import { CommonStatus } from '../../common/constants/status.constant.js';

const userSchema = new Schema<IUserDocument>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      trim: true,
      index: true
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false // Never return password hash in queries by default
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.STAFF,
      required: true
    },
    permittedShopIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Shop'
      }
    ],
    status: {
      type: String,
      enum: Object.values(CommonStatus),
      default: CommonStatus.ACTIVE,
      required: true
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = ret._id ? (ret._id as { toString(): string }).toString() : undefined;
        delete ret._id;
        delete ret.__v;
        delete ret.passwordHash;
        return ret;
      }
    }
  }
);

userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

export const UserModel = model<IUserDocument>('User', userSchema);
