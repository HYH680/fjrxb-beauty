import { z, type ZodError } from "zod";

export function firstZodError(error: ZodError): string {
  return error.issues[0]?.message ?? "输入无效";
}

export const registerSchema = z.object({
  name: z.string().min(2, "姓名至少 2 个字符").max(50),
  email: z.string().email("请输入有效的邮箱地址"),
  password: z
    .string()
    .min(8, "密码至少 8 位")
    .regex(/[A-Za-z]/, "密码需包含字母")
    .regex(/[0-9]/, "密码需包含数字"),
  /** Optional preset path `/avatars/presets/avatar-NN.png` */
  avatarUrl: z.string().max(200).optional(),
});

export const avatarUrlSchema = z.object({
  avatarUrl: z.string().min(1).max(200),
});

export const loginSchema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
  password: z.string().min(1, "请输入密码"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
});

export const verifyCodeSchema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
  code: z.string().length(6, "验证码为 6 位数字"),
});

export const resetPasswordSchema = z.object({
  resetToken: z.string().min(1, "重置令牌无效"),
  password: z
    .string()
    .min(8, "密码至少 8 位")
    .regex(/[A-Za-z]/, "密码需包含字母")
    .regex(/[0-9]/, "密码需包含数字"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "两次输入的密码不一致",
  path: ["confirmPassword"],
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "请输入当前密码"),
  password: z
    .string()
    .min(8, "密码至少 8 位")
    .regex(/[A-Za-z]/, "密码需包含字母")
    .regex(/[0-9]/, "密码需包含数字"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "两次输入的密码不一致",
  path: ["confirmPassword"],
});

export const checkoutSchema = z.object({
  paymentMethod: z.enum(["sandbox", "wechat", "alipay", "paypal", "card", "stripe"], {
    message: "请选择支付方式",
  }),
  productIds: z.array(z.string().min(1)).min(1, "服务单是空的").max(50),
});

export const cartSchema = z.object({
  productIds: z.array(z.string().min(1)).max(50),
});

export const catalogPatchSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  description: z.string().min(4).max(200).optional(),
  longDescription: z.string().min(4).max(2000).optional(),
  price: z.number().int().min(0).max(100000).optional(),
  unit: z.string().min(1).max(20).optional(),
  badge: z.string().max(20).nullable().optional(),
  pricingNote: z.string().max(200).optional(),
  published: z.boolean().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type VerifyCodeInput = z.infer<typeof verifyCodeSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
