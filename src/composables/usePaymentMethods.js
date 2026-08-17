import { ref, computed } from "vue";
import api from "@/libs/axios";

/**
 * Shared payment methods configuration for jasa checkout.
 * Uses the same structure as PembayaranProductView.vue for consistency.
 */
export function usePaymentMethods() {
  const paymentFeesLoading = ref(true);

  // Default payment methods list
  const paymentMethodsList = ref([
    // Bayar Tunai
    { id: 'cod', name: 'Bayar Tunai (COD)', type: 'cod', feeType: 'fixed', feeValue: 0, icon: 'pi-money-bill', description: 'Bayar langsung saat layanan selesai' },

    // Rekomendasi Utama
    { id: 'QRIS', name: 'QRIS', type: 'qris', feeType: 'percent', feeValue: 0.007, icon: 'pi-qrcode', description: 'Gopay, OVO, Dana, ShopeePay, dll' },

    // Transfer Bank (Virtual Account)
    { id: 'BCA', name: 'BCA Virtual Account', type: 'va', feeType: 'fixed', feeValue: 4440, icon: 'pi-building', description: 'Biaya admin Rp 4.440' },
    { id: 'BNI', name: 'BNI Virtual Account', type: 'va', feeType: 'fixed', feeValue: 4440, icon: 'pi-building', description: 'Biaya admin Rp 4.440' },
    { id: 'BRI', name: 'BRI Virtual Account', type: 'va', feeType: 'fixed', feeValue: 4440, icon: 'pi-building', description: 'Biaya admin Rp 4.440' },
    { id: 'MANDIRI', name: 'Mandiri Virtual Account', type: 'va', feeType: 'fixed', feeValue: 4440, icon: 'pi-building', description: 'Biaya admin Rp 4.440' },

    // E-Wallet
    { id: 'OVO', name: 'OVO', type: 'ewallet', feeType: 'percent', feeValue: 0.015, icon: 'pi-wallet', description: 'Biaya admin 1.5%' },
    { id: 'DANA', name: 'DANA', type: 'ewallet', feeType: 'percent', feeValue: 0.015, icon: 'pi-wallet', description: 'Biaya admin 1.5%' },
    { id: 'SHOPEEPAY', name: 'ShopeePay', type: 'ewallet', feeType: 'percent', feeValue: 0.02, icon: 'pi-wallet', description: 'Biaya admin 2%' },

    // Gerai Retail
    { id: 'ALFAMART', name: 'Alfamart / Alfamidi', type: 'retail', feeType: 'fixed', feeValue: 5550, icon: 'pi-shopping-bag', description: 'Biaya admin Rp 5.550' },
  ]);

  /**
   * Fetch payment fees from backend and update paymentMethodsList dynamically.
   * Endpoint is optional - if not found, default fees are used.
   */
  async function fetchPaymentFees() {
    try {
      const { data: res } = await api.get('/api/public/home/payment-fees');
      const fees = res?.data || [];
      if (!fees.length) return;

      // Build a lookup: method_code -> { type, value }
      const feeMap = {};
      fees.forEach(f => {
        feeMap[f.method_code] = f;
      });

      // Map backend method_code to frontend payment method IDs
      const codeMapping = {
        'COD': ['cod'],
        'QRIS': ['QRIS'],
        'VA': ['BCA', 'BNI', 'BRI', 'MANDIRI'],
        'EWALLET': ['OVO', 'DANA'],
        'SHOPEEPAY': ['SHOPEEPAY'],
        'RETAIL': ['ALFAMART'],
      };

      const formatDescription = (fee) => {
        if (fee.type === 'percentage') {
          return `Biaya admin ${fee.value}%`;
        }
        return `Biaya admin Rp ${Number(fee.value).toLocaleString('id-ID')}`;
      };

      const updated = paymentMethodsList.value.map(method => {
        for (const [code, ids] of Object.entries(codeMapping)) {
          if (ids.includes(method.id) && feeMap[code]) {
            const f = feeMap[code];
            return {
              ...method,
              feeType: f.type === 'percentage' ? 'percent' : 'fixed',
              feeValue: f.type === 'percentage' ? f.value / 100 : f.value,
              description: method.id === 'cod' ? method.description : formatDescription(f),
            };
          }
        }
        return method;
      });

      paymentMethodsList.value = updated;
    } catch (e) {
      // Endpoint not found (404) or other error - silently use default fees
      // No action needed - default fees are already set
    } finally {
      paymentFeesLoading.value = false;
    }
  }

  /**
   * Filter payment methods based on jasa's enabled payment_methods.
   * @param {string[]} enabledMethods - Array of enabled methods from jasa (e.g., ['cod', 'ONLINE_XENDIT'])
   * @returns {object[]} Filtered payment methods list
   */
  const getFilteredPaymentMethods = (enabledMethods) => {
    if (!enabledMethods || !Array.isArray(enabledMethods) || enabledMethods.length === 0) {
      return [];
    }

    const normalized = enabledMethods.map(m => m.toLowerCase().trim());
    const result = [];

    normalized.forEach(method => {
      if (method === 'cod') {
        // Add COD
        const codMethod = paymentMethodsList.value.find(m => m.id === 'cod');
        if (codMethod) result.push(codMethod);
      } else if (method === 'online_xendit' || method === 'xendit' || method === 'online') {
        // Add all ONLINE_XENDIT sub-methods (QRIS, VA, E-Wallet, Retail)
        const xenditMethods = paymentMethodsList.value.filter(m => m.id !== 'cod');
        result.push(...xenditMethods);
      }
    });

    return result;
  };

  /**
   * Group payment methods by type for display.
   */
  const groupedPaymentMethods = computed(() => {
    const groups = [
      { title: 'Bayar Tunai', type: 'cod', items: [] },
      { title: 'QRIS', type: 'qris', items: [] },
      { title: 'Transfer Bank (Virtual Account)', type: 'va', items: [] },
      { title: 'E-Wallet', type: 'ewallet', items: [] },
      { title: 'Gerai Retail', type: 'retail', items: [] },
    ];

    paymentMethodsList.value.forEach(m => {
      const group = groups.find(g => g.type === m.type);
      if (group) group.items.push(m);
    });

    return groups.filter(g => g.items.length > 0);
  });

  /**
   * Calculate platform fee for a given payment method.
   */
  const calculatePlatformFee = (methodId, grossAmount) => {
    const method = paymentMethodsList.value.find(m => m.id === methodId);
    if (!method || method.id === 'cod') return 0;

    if (method.feeType === 'fixed') {
      return method.feeValue;
    } else if (method.feeType === 'percent') {
      return Math.ceil(grossAmount * method.feeValue);
    }
    return 0;
  };

  /**
   * Get human-readable label for a payment method ID.
   */
  const getPaymentMethodLabel = (methodId) => {
    const method = paymentMethodsList.value.find(m => m.id === methodId);
    return method?.name || methodId;
  };

  /**
   * Check if a payment method is COD.
   */
  const isCodMethod = (methodId) => {
    return methodId === 'cod' || methodId === 'COD';
  };

  /**
   * Normalize payment methods from various formats.
   */
  const normalizePaymentMethods = (value) => {
    if (Array.isArray(value)) return value.map(v => v.toLowerCase().trim());
    if (typeof value === 'string') return value.split(',').map(v => v.trim().toLowerCase()).filter(Boolean);
    return [];
  };

  /**
   * Check if Xendit payment is enabled.
   */
  const isXenditEnabled = (enabledMethods) => {
    const normalized = normalizePaymentMethods(enabledMethods);
    return normalized.some(m => m === 'online_xendit' || m === 'xendit' || m === 'online');
  };

  /**
   * Check if COD is enabled.
   */
  const isCodEnabled = (enabledMethods) => {
    const normalized = normalizePaymentMethods(enabledMethods);
    return normalized.some(m => m === 'cod');
  };

  return {
    paymentMethodsList,
    paymentFeesLoading,
    groupedPaymentMethods,
    fetchPaymentFees,
    getFilteredPaymentMethods,
    calculatePlatformFee,
    getPaymentMethodLabel,
    isCodMethod,
    normalizePaymentMethods,
    isXenditEnabled,
    isCodEnabled,
  };
}