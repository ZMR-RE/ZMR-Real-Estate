import { useAccountSecurity } from './useAccountSecurity'

// Roadmap 12.2, merged into Settings (12.1) — this was previously a
// closable sidebar popover (AccountSecurityMenu/AccountSecurityPanel,
// now removed); the content is unchanged, just rendered as a permanent
// section on the Settings page instead, matching 12.1's original spec
// which named security as one of Settings' intended sections.
export function AccountSecuritySection() {
  const {
    factors,
    loadingFactors,
    error,
    resetState,
    sendResetEmail,
    enrollData,
    enrolling,
    startEnroll,
    cancelEnroll,
    verifyCode,
    setVerifyCode,
    verifying,
    submitVerifyCode,
    removingFactorId,
    removeFactor,
  } = useAccountSecurity()

  const verifiedFactors = factors.filter((f) => f.status === 'verified')

  return (
    <section>
      <h2>Account &amp; security</h2>

      {error && <p role="alert">{error}</p>}

      <section>
        <h3>Password</h3>
        <p>Send yourself a password reset link by email.</p>
        <button type="button" onClick={sendResetEmail} disabled={resetState === 'sending'}>
          {resetState === 'sending' ? 'Sending…' : 'Send password reset email'}
        </button>
        {resetState === 'sent' && <p>Reset email sent — check your inbox.</p>}
      </section>

      <section>
        <h3>Two-factor authentication</h3>

        {loadingFactors ? (
          <p>Loading…</p>
        ) : verifiedFactors.length > 0 ? (
          <ul>
            {verifiedFactors.map((factor) => (
              <li key={factor.id}>
                {factor.friendly_name ?? 'Authenticator app'}
                <button
                  type="button"
                  onClick={() => removeFactor(factor.id)}
                  disabled={removingFactorId === factor.id}
                >
                  {removingFactorId === factor.id ? 'Removing…' : 'Remove'}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p>Two-factor authentication is not enabled.</p>
        )}

        {!enrollData && verifiedFactors.length === 0 && (
          <button type="button" onClick={startEnroll} disabled={enrolling}>
            {enrolling ? 'Starting…' : 'Enable two-factor authentication'}
          </button>
        )}

        {enrollData && (
          <div className="account-security-enroll">
            <p>Scan this QR code with an authenticator app (e.g. Google Authenticator, 1Password):</p>
            <img src={enrollData.qrCode} alt="Two-factor authentication QR code" width={180} height={180} />
            <p>Or enter this code manually: {enrollData.secret}</p>

            <label htmlFor="mfa_enroll_code">Enter the 6-digit code from your app</label>
            <input
              id="mfa_enroll_code"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value)}
            />
            <button type="button" onClick={submitVerifyCode} disabled={verifying || verifyCode.trim().length === 0}>
              {verifying ? 'Verifying…' : 'Verify & enable'}
            </button>
            <button type="button" onClick={cancelEnroll} disabled={verifying}>
              Cancel
            </button>
          </div>
        )}
      </section>
    </section>
  )
}
