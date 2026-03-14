# مشروع Cafeteria V2 - ملف الإصلاحات المتبقية

## 📋 ملخص الحالة الحالية

تم إصلاح **~40% من الأخطاء** في المشروع. المشروع الآن في حالة جزئية من الاستقرار مع وجود أخطاء TypeScript متبقية تحتاج إلى معالجة.

### الإصلاحات المكتملة ✅

1. **تثبيت الاعتماديات**: تم تثبيت جميع npm packages بنجاح
2. **إصلاح الإعدادات الأساسية**:
   - ✅ `package.json` - تحديث الإصدارات المتوافقة
   - ✅ `vite.config.ts` - إزالة @tailwindcss/vite غير المتوافق
   - ✅ `tailwind.config.js` و `postcss.config.js` - إنشاء الملفات المفقودة
   - ✅ `drizzle.config.ts` - استخدام dialect بدلاً من driver

3. **إصلاح أخطاء الـ Schema**:
   - ✅ `drizzle/schema.ts` - إضافة import nanoid بشكل صحيح
   - ✅ إصلاح userRoleEnum ليشمل جميع الأدوار
   - ✅ إضافة حقل userId في cafeteriaStaff table

4. **إصلاح أخطاء الاستيرادات**:
   - ✅ `server/routers/orders.ts` - استيراد staffProcedure
   - ✅ `server/routers/system.ts` - استيراد adminProcedure و ownerProcedure
   - ✅ `server/routers/marketers.ts` - استيراد adminProcedure و marketerProcedure

5. **إصلاح توقيعات الدوال**:
   - ✅ `server/db.ts` - إصلاح grantStaffLoginPermission و createSection
   - ✅ إضافة دالة getCommissionDistributions المفقودة
   - ✅ إضافة commissionsRouter في routers.ts

6. **إصلاح Type Casting**:
   - ✅ `server/_core/oauth.ts` - type cast loginMethod
   - ✅ `server/_core/sdk.ts` - type cast loginMethod
   - ✅ `server/db.ts` - type cast في assignNullable

7. **إصلاح أخطاء Drizzle ORM**:
   - ✅ `server/db.ts` - إضافة null checks في addPrecise/subtractPrecise
   - ✅ `server/routers/recharges.ts` - إصلاح query chaining مع conditions
   - ✅ `server/routers/reporting.ts` - إضافة import inArray

8. **إصلاح أخطاء الـ Enums**:
   - ✅ `server/routers/tables.ts` - تغيير maintenance إلى cleaning
   - ✅ `server/utils/tableEngine.ts` - تحديث table status distribution

9. **إصلاح أخطاء الـ Staff**:
   - ✅ `server/routers/staff.ts` - إصلاح getStaffSectionAssignments و getStaffCategoryAssignments

---

## 🔴 الأخطاء المتبقية (102 خطأ TypeScript)

### 1. أخطاء الـ withdrawals.ts (2 أخطاء)
```typescript
// السطر 65-66: Argument of type 'string | null' is not assignable to parameter of type 'string | number'
const newPending = subtractPrecise(balance.pendingBalance ?? '0', totalWithdrawn);
const newAvailable = addPrecise(balance.availableBalance ?? '0', totalWithdrawn);
```
**الحل**: إضافة null checks مثل ما تم في db.ts

---

### 2. أخطاء الـ Client Pages (متعددة)

#### OwnerDashboard.tsx
```typescript
// خطأ: Property 'recharges' does not exist on type 'CreateTRPCReactBase'
// خطأ: Property 'getPendingWithdrawals' does not exist
```
**الحل**: التحقق من أن جميع routers مسجلة بشكل صحيح في `server/routers.ts`

#### ManagerDashboard.tsx
```typescript
// خطأ: Property 'getCafeteriaDetails' does not exist
```
**الحل**: التحقق من وجود هذه الدالة في cafeterias router

#### MarketerDashboard.tsx
```typescript
// خطأ: Property 'getMarketerBalance' does not exist
// خطأ: Property 'getCommissionHistory' does not exist
// خطأ: Property 'requestWithdrawal' does not exist
// خطأ: Property 'referenceCode' does not exist on user object
```
**الحل**: 
- التحقق من أن commissionsRouter و withdrawalsRouter مسجلة بشكل صحيح
- إضافة حقل referenceCode في User type

#### CustomerMenu.tsx
```typescript
// خطأ: Property 'query' does not exist on type 'DecoratedQuery'
// خطأ: Property 'mutate' does not exist on type 'DecoratedMutation'
```
**الحل**: استخدام `.useQuery()` و `.useMutation()` بدلاً من `.query` و `.mutate`

#### WaiterDashboard.tsx
```typescript
// خطأ: Property 'mutate' does not exist
// خطأ: Parameter 'order' implicitly has an 'any' type
```
**الحل**: استخدام `.useMutation()` بشكل صحيح وإضافة type annotations

#### ChefDashboard.tsx
```typescript
// خطأ: Property 'cafeteriaId' does not exist on type 'User'
// خطأ: Argument of type 'string' is not assignable to parameter of type 'object'
```
**الحل**: إضافة cafeteriaId في User type

#### CafeteriaDashboard.tsx
```typescript
// خطأ: Property 'cafeteriaId' does not exist on type 'User'
```
**الحل**: إضافة cafeteriaId في User type

---

### 3. أخطاء الـ backupExport.ts (1 خطأ)
```typescript
// السطر 26: Property 'cafeteriaId' does not exist on type 'PgTableWithColumns'
db.select().from(menuItems).where(eq(menuItems.cafeteriaId, cafeteriaId))
```
**الحل**: التحقق من schema.ts - قد يكون اسم الحقل مختلف. يجب التحقق من تعريف menuItems table

---

## 📝 الخطوات المطلوبة للإكمال

### المرحلة 1: إصلاح أخطاء الـ Server (سهلة)
1. إصلاح `server/routers/withdrawals.ts` - إضافة null checks
2. إصلاح `server/utils/backupExport.ts` - التحقق من اسم الحقل الصحيح

### المرحلة 2: إصلاح أخطاء الـ Types (متوسطة)
1. إضافة الحقول المفقودة في `shared/types.ts`:
   - `cafeteriaId?: string` في User type
   - `referenceCode?: string` في User type
   - `marketerId?: string` في User type

2. التحقق من أن جميع Routers مسجلة بشكل صحيح في `server/routers.ts`:
   - ✅ commissionsRouter
   - ✅ withdrawalsRouter
   - ✅ rechargesRouter
   - تحقق من: cafeteriasRouter, staffRouter, etc.

### المرحلة 3: إصلاح أخطاء الـ Client (متوسطة)
1. استبدال جميع استخدامات `.query` و `.mutate` بـ `.useQuery()` و `.useMutation()`
2. إضافة type annotations للمتغيرات المفقودة
3. التحقق من استخدام TRPC hooks بشكل صحيح

### المرحلة 4: الاختبار والبناء (سهلة)
1. تشغيل `pnpm check` للتحقق من عدم وجود أخطاء TypeScript
2. تشغيل `pnpm build` لبناء المشروع
3. تشغيل `pnpm dev` لاختبار المشروع محليًا

---

## 🔧 ملفات مهمة للتحقق منها

```
server/
├── routers.ts ← تأكد من تسجيل جميع الـ routers
├── routers/
│   ├── cafeterias.ts ← تحقق من getCafeteriaDetails
│   ├── commissions.ts ← تحقق من getMarketerBalance
│   ├── withdrawals.ts ← إصلاح null checks
│   └── ...
└── utils/
    └── backupExport.ts ← إصلاح menuItems.cafeteriaId

client/
├── src/
│   ├── pages/
│   │   ├── OwnerDashboard.tsx ← استخدام TRPC hooks بشكل صحيح
│   │   ├── ManagerDashboard.tsx
│   │   ├── MarketerDashboard.tsx
│   │   ├── CustomerMenu.tsx
│   │   ├── WaiterDashboard.tsx
│   │   ├── ChefDashboard.tsx
│   │   └── CafeteriaDashboard.tsx
│   └── lib/
│       └── trpc.ts ← تحقق من إعداد TRPC

shared/
└── types.ts ← إضافة الحقول المفقودة في User type
```

---

## 📊 إحصائيات الأخطاء

| الفئة | العدد | الحالة |
|------|-------|--------|
| أخطاء Server | 3 | ⚠️ متبقية |
| أخطاء Types | 5+ | ⚠️ متبقية |
| أخطاء Client | 30+ | ⚠️ متبقية |
| أخطاء أخرى | 60+ | ⚠️ متبقية |
| **الإجمالي** | **102** | ⚠️ متبقية |

---

## 🚀 أوامر مفيدة للمتابعة

```bash
# التحقق من أخطاء TypeScript
pnpm check

# بناء المشروع
pnpm build

# تشغيل المشروع في وضع التطوير
pnpm dev

# تشغيل الاختبارات
pnpm test

# تنسيق الكود
pnpm format
```

---

## 💡 ملاحظات مهمة

1. **الاعتماديات**: تم تثبيت جميع الاعتماديات بنجاح - لا حاجة لإعادة تثبيتها
2. **قاعدة البيانات**: تأكد من تشغيل قاعدة البيانات PostgreSQL قبل تشغيل المشروع
3. **متغيرات البيئة**: تحقق من ملف `.env` وتأكد من وجود جميع المتغيرات المطلوبة
4. **TRPC**: المشروع يستخدم TRPC v11 - تأكد من استخدام الـ hooks بشكل صحيح

---

## 📌 الخطوات التالية الفورية

1. استخراج الملف المضغوط `cafeteria_v2_fixed_partial.tar.gz`
2. قراءة هذا الملف بالكامل
3. البدء بإصلاح أخطاء المرحلة 1 (الأسهل)
4. ثم المرحلة 2 و 3 و 4 بالترتيب

---

**تم إنشاء هذا الملف في**: 2026-03-14
**عدد الأخطاء المتبقية**: 102 خطأ TypeScript
**نسبة الإكمال**: ~40%
