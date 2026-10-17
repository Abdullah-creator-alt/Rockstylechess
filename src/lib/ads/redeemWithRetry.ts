// Google's server-side-verification callback can land a second or two AFTER the
// on-device "reward earned" event, so the first redeem right after an ad closes
// may answer 'ad-not-verified'. Retry that one error a few times; every other
// error (daily cap, network, ...) is surfaced to the caller immediately.
const RETRY_DELAYS_MS = [1_000, 2_000, 3_000];

export async function redeemWithRetry<T>(redeem: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await redeem();
    } catch (error) {
      const retryable = error instanceof Error && error.message === 'ad-not-verified';
      if (!retryable || attempt >= RETRY_DELAYS_MS.length) throw error;
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
    }
  }
}
