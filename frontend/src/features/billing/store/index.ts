import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import type {
  PlanInterval,
  Currency,
  CheckoutFormData,
  BillingAddress,
  Coupon,
  CouponValidation,
} from '../types';

interface BillingState {
  checkout: {
    planId: string | null;
    interval: PlanInterval;
    couponCode: string;
    couponValidation: CouponValidation | null;
    paymentMethodId: string | null;
    billingAddress: BillingAddress | null;
    step: 'plan' | 'payment' | 'review' | 'processing' | 'complete' | 'failed';
  };
  preferences: {
    currency: Currency;
    defaultInterval: PlanInterval;
  };
  ui: {
    showCouponInput: boolean;
    billingCycle: PlanInterval;
  };
}

interface BillingActions {
  setPlan: (planId: string) => void;
  setInterval: (interval: PlanInterval) => void;
  setCouponCode: (code: string) => void;
  setCouponValidation: (validation: CouponValidation | null) => void;
  setPaymentMethod: (id: string) => void;
  setBillingAddress: (address: BillingAddress) => void;
  setCheckoutStep: (step: BillingState['checkout']['step']) => void;
  resetCheckout: () => void;

  setCurrency: (currency: Currency) => void;
  setDefaultInterval: (interval: PlanInterval) => void;
  setBillingCycle: (cycle: PlanInterval) => void;
  setShowCouponInput: (show: boolean) => void;

  reset: () => void;
}

const initialCheckout: BillingState['checkout'] = {
  planId: null,
  interval: 'monthly',
  couponCode: '',
  couponValidation: null,
  paymentMethodId: null,
  billingAddress: null,
  step: 'plan',
};

const initialState: BillingState = {
  checkout: initialCheckout,
  preferences: {
    currency: 'USD',
    defaultInterval: 'monthly',
  },
  ui: {
    showCouponInput: false,
    billingCycle: 'monthly',
  },
};

export const useBillingStore = create<BillingState & BillingActions>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,

        setPlan: (planId) =>
          set((state) => ({
            checkout: { ...state.checkout, planId },
          })),

        setInterval: (interval) =>
          set((state) => ({
            checkout: { ...state.checkout, interval },
          })),

        setCouponCode: (couponCode) =>
          set((state) => ({
            checkout: { ...state.checkout, couponCode },
          })),

        setCouponValidation: (validation) =>
          set((state) => ({
            checkout: { ...state.checkout, couponValidation: validation },
          })),

        setPaymentMethod: (id) =>
          set((state) => ({
            checkout: { ...state.checkout, paymentMethodId: id },
          })),

        setBillingAddress: (address) =>
          set((state) => ({
            checkout: { ...state.checkout, billingAddress: address },
          })),

        setCheckoutStep: (step) =>
          set((state) => ({
            checkout: { ...state.checkout, step },
          })),

        resetCheckout: () =>
          set((state) => ({
            checkout: initialCheckout,
          })),

        setCurrency: (currency) =>
          set((state) => ({
            preferences: { ...state.preferences, currency },
          })),

        setDefaultInterval: (interval) =>
          set((state) => ({
            preferences: { ...state.preferences, defaultInterval: interval },
          })),

        setBillingCycle: (billingCycle) =>
          set((state) => ({
            ui: { ...state.ui, billingCycle },
          })),

        setShowCouponInput: (showCouponInput) =>
          set((state) => ({
            ui: { ...state.ui, showCouponInput },
          })),

        reset: () => set(initialState),
      }),
      {
        name: 'mailsavior-billing',
        partialize: (state) => ({
          preferences: state.preferences,
          ui: { billingCycle: state.ui.billingCycle },
        }),
      }
    ),
    { name: 'BillingStore' }
  )
);

export const selectCheckout = (state: BillingState) => state.checkout;
export const selectPreferences = (state: BillingState) => state.preferences;
export const selectUI = (state: BillingState) => state.ui;
